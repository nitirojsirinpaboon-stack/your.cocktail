// server.js (Backend)

// ***************************************************************
// *** 1. Modules ที่จำเป็น ***
// ***************************************************************
const express = require('express');
const cors = require('cors'); 
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000; 

// ***************************************************************
// *** 2. การตั้งค่า User History และการโหลดข้อมูลหลัก ***
// ***************************************************************
app.use(cors()); 
app.use(express.json()); 

const ALL_LEVELS = new Set(['0', '1', '2', '3', '4']); 
const USER_HISTORY_DIR = path.join(__dirname, 'user_history'); 

// โหลดข้อมูล JSON หลักจากไฟล์ (user.json)
const dataPath = path.join(__dirname, 'data', 'user.json'); 
let cocktailData = []; 
// สร้าง Map สำหรับค้นหาเมนูจาก ID อย่างรวดเร็ว
let cocktailMap = new Map();

try {
    const data = fs.readFileSync(dataPath, 'utf8');
    cocktailData = JSON.parse(data);
    
    // สร้าง Map สำหรับค้นหาเมนูจาก ID
    cocktailData.forEach(item => {
        if (item.id) {
            cocktailMap.set(String(item.id), item);
        }
    });

    console.log(`✅ Loaded ${cocktailData.length} records from JSON (data/user.json).`);

    // สร้างโฟลเดอร์เก็บประวัติผู้ใช้หากยังไม่มี (อาจถูกลบเมื่อ Render รีสตาร์ท)
    if (!fs.existsSync(USER_HISTORY_DIR)) {
        fs.mkdirSync(USER_HISTORY_DIR);
        console.log(`💡 Created directory: ${USER_HISTORY_DIR}`);
    }
} catch (error) {
    console.error('❌ Error loading critical data:', error);
    console.error(`*** CRITICAL: Could not find data file at: ${dataPath} ***`); 
}


// ***************************************************************
// *** 3. ฟังก์ชันจัดการประวัติผู้ใช้ (Load/Save) ***
// ***************************************************************

const getUserHistory = (userId) => {
    const userFilePath = path.join(USER_HISTORY_DIR, `${userId}.json`);
    try {
        const data = fs.readFileSync(userFilePath, 'utf8');
        const history = JSON.parse(data);
        // เก็บเฉพาะ ID เมนูที่ได้รับแล้วเท่านั้น
        return { receivedIds: history.receivedIds || [] };
    } catch (error) {
        return { receivedIds: [] };
    }
};

const saveUserHistory = (userId, history) => {
    const userFilePath = path.join(USER_HISTORY_DIR, `${userId}.json`);
    try {
        // บันทึกเฉพาะ ID เมนู โดยทำให้ค่าไม่ซ้ำกันก่อน
        history.receivedIds = [...new Set(history.receivedIds.map(String))];
        fs.writeFileSync(userFilePath, JSON.stringify(history, null, 2), 'utf8');
    } catch (error) {
        console.error(`❌ WARNING: Failed to save history for user ${userId}.`, error.message);
    }
};


// ***************************************************************
// *** 4. Route หลักสำหรับการค้นหา (Smart Random Logic V5.1) ***
// ***************************************************************

app.post('/search', (req, res) => {
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
        
        const userHistory = getUserHistory(userId);
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
            
            // 2.3 บันทึก ID เมนูนี้ลงในประวัติผู้ใช้
            userHistory.receivedIds.push(String(finalRecommendation.id));
            saveUserHistory(userId, userHistory);
            
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
        // *** (รันเมื่อ unseenCocktails.length เป็น 0) ***
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
// *** 5. เริ่มต้น Server ***
// ***************************************************************
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});