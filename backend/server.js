// server.js (Backend)

// ***************************************************************
// *** 1. Modules ที่จำเป็น ***
// ***************************************************************
const express = require('express');
const cors = require('cors'); 
const path = require('path');
// ไม่ใช้ fs ในการจัดการประวัติแล้ว แต่ยังคงไว้สำหรับโหลด user.json
const fs = require('fs'); 
// ติดตั้ง 'redis' package สำหรับ External Cache
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 10000; 

// ***************************************************************
// *** 2. การตั้งค่า Redis Client (External Cache) ***
// ***************************************************************
let redisClient;
const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
    // เชื่อมต่อ Redis โดยใช้ Environment Variable REDIS_URL
    redisClient = redis.createClient({
        url: REDIS_URL
    });

    redisClient.connect()
        .then(() => console.log('✅ Connected to Redis Cache.'))
        .catch(err => {
            console.error('❌ Failed to connect to Redis:', err.message);
            redisClient = null; // ปิดการใช้งาน Redis หากเชื่อมต่อไม่ได้
        });
} else {
    console.warn('⚠️ REDIS_URL not set. History persistence will fail upon server restart.');
}

// ***************************************************************
// *** 3. การโหลดข้อมูลหลัก ***
// ***************************************************************
app.use(cors()); 
app.use(express.json()); 

const ALL_LEVELS = new Set(['0', '1', '2', '3', '4']); 

const dataPath = path.join(__dirname, 'data', 'user.json'); 
let cocktailData = []; 
let cocktailMap = new Map();

try {
    const data = fs.readFileSync(dataPath, 'utf8');
    cocktailData = JSON.parse(data);
    
    cocktailData.forEach(item => {
        if (item.id) {
            cocktailMap.set(String(item.id), item);
        }
    });

    console.log(`✅ Loaded ${cocktailData.length} records from JSON (data/user.json).`);

} catch (error) {
    console.error('❌ Error loading critical data:', error);
    console.error(`*** CRITICAL: Could not find data file at: ${dataPath} ***`); 
}


// ***************************************************************
// *** 4. ฟังก์ชันจัดการประวัติผู้ใช้ (Load/Save - ใช้ Redis) ***
// ***************************************************************

// โหลดประวัติผู้ใช้จาก Redis
const getUserHistory = async (userId) => {
    if (!redisClient) return { receivedIds: [] };

    const key = `history:${userId}`;
    try {
        const data = await redisClient.get(key);
        if (data) {
            const history = JSON.parse(data);
            return { receivedIds: history.receivedIds || [] };
        }
    } catch (error) {
        console.error(`❌ Redis Get Error for ${userId}:`, error.message);
    }
    // คืนค่าเริ่มต้นหากหาไม่เจอหรือเกิดข้อผิดพลาด
    return { receivedIds: [] };
};

// บันทึกประวัติผู้ใช้ลง Redis
const saveUserHistory = async (userId, history) => {
    if (!redisClient) return;

    const key = `history:${userId}`;
    try {
        // ทำให้ค่า ID เมนูไม่ซ้ำกันก่อนบันทึก
        history.receivedIds = [...new Set(history.receivedIds.map(String))];
        const jsonString = JSON.stringify(history);
        
        // บันทึกข้อมูลลง Redis
        await redisClient.set(key, jsonString);
    } catch (error) {
        console.error(`❌ Redis Set Error for ${userId}:`, error.message);
    }
};


// ***************************************************************
// *** 5. Route หลักสำหรับการค้นหา (Smart Random Logic V6.0) ***
// ***************************************************************

app.post('/search', async (req, res) => { // เปลี่ยนเป็น async function
    if (cocktailData.length === 0) {
        return res.status(503).json({ 
            message: 'Server Error: ไม่สามารถโหลดข้อมูลค็อกเทลได้',
            data: []
        });
    }
    
    const { name, userId } = req.body;
    
    if (!name || !userId) {
        return res.status(400).json({ 
            message: 'กรุณาระบุชื่อและ User ID',
            data: []
        });
    }

    const searchName = name.toLowerCase().trim();
    let foundMatches = cocktailData.filter(item => 
        item.name && item.name.toLowerCase().includes(searchName)
    );

    // ***************************************************************
    // *** Logic: จัดการการสุ่ม 1 รายการ เมื่อค้นหาไม่เจอ ***
    // ***************************************************************
    if (foundMatches.length === 0) {
        
        const userHistory = await getUserHistory(userId); // ต้อง await
        const receivedIds = new Set(userHistory.receivedIds.map(String));
        let finalRecommendation = null;
        
        // 1. หา Pool เมนูทั้งหมดที่ผู้ใช้ยังไม่เคยได้รับ (ไม่ซ้ำชื่อ)
        let unseenCocktails = cocktailData.filter(item => 
            !receivedIds.has(String(item.id))
        );
        
        // ***************************************************************
        // *** 2. หากยังมีเมนูที่ยังไม่เคยได้รับ (เข้าสู่โหมดสุ่ม Level ใหม่ก่อน) ***
        // ***************************************************************
        if (unseenCocktails.length > 0) {
            
            // หา Level ที่มีเมนูเหลืออยู่ใน unseenCocktails
            let remainingLevels = [...new Set(unseenCocktails.map(item => String(item.level)))];
            
            // 2.1 สุ่มเลือก Level เป้าหมายจาก Level ที่เหลืออยู่
            const targetLevelIndex = Math.floor(Math.random() * remainingLevels.length);
            const targetLevel = remainingLevels[targetLevelIndex];

            // 2.2 กรองเมนูเฉพาะใน Target Level นั้น ที่ยังไม่เคยได้รับ
            const candidates = unseenCocktails.filter(item => String(item.level) === targetLevel);
            
            // สุ่ม 1 เมนูจากกลุ่มเมนู Level เป้าหมายนี้
            const randomIndex = Math.floor(Math.random() * candidates.length);
            finalRecommendation = candidates[randomIndex];
            
            // 2.3 บันทึก ID เมนูนี้ลงในประวัติผู้ใช้ (ใช้ await)
            userHistory.receivedIds.push(String(finalRecommendation.id));
            await saveUserHistory(userId, userHistory); 
            
            const message = remainingLevels.length > 1 
                ? `ไม่พบเมนูที่ตรงกับ "${name}" ลองเมนูแนะนำ ${finalRecommendation.name} (ยังมีเมนูใหม่เหลืออีก ${remainingLevels.length - 1} Level)`
                : `คุณได้ลองครบทุก Level แล้ว! ลองเมนู ${finalRecommendation.name} สิท่าจะดี`;

            return res.json({
                message: message,
                data: [finalRecommendation], 
                found: false
            });
        }
        
        // ***************************************************************
        // *** 3. โหมด: ครบทุก Level แล้ว (สุ่มวนซ้ำเฉพาะเมนูในประวัติ) ***
        // ***************************************************************
        
        // 3.1 ดึงเมนูที่เคยได้รับทั้งหมดจาก ID ที่บันทึกไว้ในประวัติ
        const previouslyReceivedCocktails = userHistory.receivedIds
            .map(id => cocktailMap.get(id))
            .filter(item => item !== undefined); 

        if (previouslyReceivedCocktails.length > 0) {
            // สุ่ม 1 เมนูจาก Pool เมนูที่เคยได้รับไปแล้วเท่านั้น
            const randomIndex = Math.floor(Math.random() * previouslyReceivedCocktails.length);
            finalRecommendation = previouslyReceivedCocktails[randomIndex];
            
            return res.json({
                message: `คุณได้ลองครบทุก Level แล้ว! ลองเมนู ${finalRecommendation.name} ที่สุ่มซ้ำจากประวัติของคุณสิท่าจะดี`, 
                data: [finalRecommendation], 
                found: false
            });
        }
        
        // กรณีสุดท้าย: ข้อมูลว่างเปล่า
        return res.json({
            message: `ไม่พบเมนูที่ตรงกับ "${name}" และไม่มีข้อมูลค็อกเทลในระบบ`,
            data: [], 
            found: false
        });
    }
    // ***************************************************************

    // ถ้าพบแบบตรงชื่อ
    return res.json({
        message: `เครื่องดื่มที่เหมาะกับคุณ "${name}" คือ ${foundMatches.length} รายการนี้`,
        data: foundMatches,
        found: true
    });
});


// ***************************************************************
// *** 6. เริ่มต้น Server ***
// ***************************************************************
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});