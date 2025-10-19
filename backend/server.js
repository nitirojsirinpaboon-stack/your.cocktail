// server.js (Backend: Logic V7.1 - บังคับ Level ไม่ซ้ำ + Message มาตรฐาน)

// ***************************************************************
// *** 1. Modules ที่จำเป็น ***
// ***************************************************************
const express = require('express');
const cors = require('cors'); 
const path = require('path');
const fs = require('fs'); 
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 10000; 

// ***************************************************************
// *** 2. การตั้งค่า Redis Client (ใช้ Internal Host) ***
// ***************************************************************
let redisClient;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

if (REDIS_HOST && REDIS_PASSWORD) {
    const INTERNAL_REDIS_URL = `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`;

    redisClient = redis.createClient({
        url: INTERNAL_REDIS_URL
    });

    redisClient.connect()
        .then(() => console.log('✅ Connected to Redis Cache (Using Internal Host).'))
        .catch(err => {
            console.error('❌ Failed to connect to Redis (Check Internal Auth/Password):', err.message);
            redisClient = null;
        });
} else {
    console.warn('⚠️ REDIS Environment variables (HOST, PASSWORD) not set. History persistence will fail.');
}

// ***************************************************************
// *** 3. การโหลดข้อมูลหลัก ***
// ***************************************************************
app.use(cors()); 
app.use(express.json()); 

const ALL_LEVELS = ['0', '1', '2', '3', '4']; 

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

const getUserHistory = async (userId) => {
    if (!redisClient) return { receivedIds: [], receivedLevels: [] };

    const key = `history:${userId}`; 
    try {
        const data = await redisClient.get(key);
        if (data) {
            const history = JSON.parse(data);
            return { 
                receivedIds: history.receivedIds || [],
                receivedLevels: history.receivedLevels || [] 
            };
        }
    } catch (error) {
        console.error(`❌ Redis Get Error for ${userId}:`, error.message);
    }
    return { receivedIds: [], receivedLevels: [] };
};

const saveUserHistory = async (userId, history) => {
    if (!redisClient) return;

    const key = `history:${userId}`;
    try {
        history.receivedIds = [...new Set(history.receivedIds.map(String))];
        history.receivedLevels = [...new Set(history.receivedLevels.map(String))]; 

        const jsonString = JSON.stringify(history);
        await redisClient.set(key, jsonString);
    } catch (error) {
        console.error(`❌ Redis Set Error for ${userId}:`, error.message);
    }
};


// ***************************************************************
// *** 5. Route หลักสำหรับการค้นหา (Smart Random Logic V7.1) ***
// ***************************************************************

app.post('/search', async (req, res) => { 
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
        
        const userHistory = await getUserHistory(userId); 
        const receivedIds = new Set(userHistory.receivedIds.map(String));
        const receivedLevels = new Set(userHistory.receivedLevels.map(String));
        
        let finalRecommendation = null;
        
        // ***************************************************************
        // *** PHASE 1: บังคับสุ่ม Level ที่ยังไม่เคยได้รับ (ถ้ายังไม่ครบ) ***
        // ***************************************************************

        let unseenLevels = ALL_LEVELS.filter(level => !receivedLevels.has(level));
        
        if (unseenLevels.length > 0) {
            
            const targetLevel = unseenLevels[0]; 

            let candidates = cocktailData.filter(item => 
                String(item.level) === targetLevel && !receivedIds.has(String(item.id))
            );
            
            if (candidates.length > 0) {
                
                const randomIndex = Math.floor(Math.random() * candidates.length);
                finalRecommendation = candidates[randomIndex];
                
                userHistory.receivedIds.push(String(finalRecommendation.id));
                userHistory.receivedLevels.push(targetLevel);
                await saveUserHistory(userId, userHistory); 
                
                // *** V7.1 FIX: ข้อความมาตรฐานสำหรับการสุ่มสำเร็จ ***
                return res.json({
                    message: `เครื่องดื่มที่เหมาะกับคุณ "${name}" คือ 1 รายการนี้`,
                    data: [finalRecommendation], 
                    found: false
                });

            } else {
                
                // บันทึก Level นี้ว่าถูกสุ่มครบหมดแล้ว เพื่อให้ข้ามไป Level ถัดไป
                userHistory.receivedLevels.push(targetLevel);
                await saveUserHistory(userId, userHistory); 
                
                // *** V7.1 FIX: ข้อความมาตรฐานในกรณีที่เมนู Level ว่าง/มีปัญหา ***
                return res.json({
                    message: `เครื่องดื่มที่เหมาะกับคุณ "${name}" คือ 0 รายการนี้`,
                    data: [], 
                    found: false
                });
            }
        }
        
        // ***************************************************************
        // *** PHASE 2: ครบทุก Level แล้ว (สุ่มวนซ้ำเฉพาะเมนูในประวัติ) ***
        // ***************************************************************
        
        const previouslyReceivedCocktails = userHistory.receivedIds
            .map(id => cocktailMap.get(id))
            .filter(item => item !== undefined); 

        if (previouslyReceivedCocktails.length > 0) {
            
            const randomIndex = Math.floor(Math.random() * previouslyReceivedCocktails.length);
            finalRecommendation = previouslyReceivedCocktails[randomIndex];
            
            // *** V7.1 FIX: ข้อความมาตรฐานสำหรับการสุ่มวนซ้ำสำเร็จ ***
            return res.json({
                message: `เครื่องดื่มที่เหมาะกับคุณ "${name}" คือ`, 
                data: [finalRecommendation], 
                found: false
            });
        }
        
        // กรณีสุดท้าย: ข้อมูลว่างเปล่า
        return res.json({
            message: `เครื่องดื่มที่เหมาะกับคุณ "${name}" คือ 0 รายการนี้`,
            data: [], 
            found: false
        });
    }
    // ***************************************************************

    // ถ้าพบแบบตรงชื่อ (ผลลัพธ์ > 0)
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