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

const ALL_LEVELS = new Set(['0', '1', '2', '3', '4']); // Level ที่ต้องการให้ครบถ้วน
const USER_HISTORY_DIR = path.join(__dirname, 'user_history'); 

// โหลดข้อมูล JSON หลักจากไฟล์ (user.json)
const dataPath = path.join(__dirname, 'data', 'user.json'); 
let cocktailData = []; 

try {
    const data = fs.readFileSync(dataPath, 'utf8');
    cocktailData = JSON.parse(data);
    console.log(`✅ Loaded ${cocktailData.length} records from JSON (data/user.json).`);

    // สร้างโฟลเดอร์เก็บประวัติผู้ใช้หากยังไม่มี
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

// โหลดประวัติผู้ใช้
const getUserHistory = (userId) => {
    const userFilePath = path.join(USER_HISTORY_DIR, `${userId}.json`);
    try {
        const data = fs.readFileSync(userFilePath, 'utf8');
        // โครงสร้างใหม่: { triedLevels: [...], receivedIds: [...] }
        const history = JSON.parse(data);
        return {
            triedLevels: history.triedLevels || [],
            receivedIds: history.receivedIds || []
        };
    } catch (error) {
        // คืนค่าเริ่มต้น
        return { triedLevels: [], receivedIds: [] };
    }
};

// บันทึกประวัติผู้ใช้
const saveUserHistory = (userId, history) => {
    const userFilePath = path.join(USER_HISTORY_DIR, `${userId}.json`);
    try {
        // ทำให้ค่า Level และ ID ไม่ซ้ำกันก่อนบันทึก
        history.triedLevels = [...new Set(history.triedLevels.map(String))]; 
        history.receivedIds = [...new Set(history.receivedIds.map(String))];
        fs.writeFileSync(userFilePath, JSON.stringify(history, null, 2), 'utf8');
    } catch (error) {
        console.error(`❌ WARNING: Failed to save history for user ${userId}.`, error.message);
    }
};


// ***************************************************************
// *** 4. Route หลักสำหรับการค้นหา (Smart Random Logic V3.0) ***
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
    
    // ค้นหาแบบตรงชื่อ
    let foundMatches = cocktailData.filter(item => 
        item.name && item.name.toLowerCase().includes(searchName)
    );

    // ***************************************************************
    // *** Logic: จัดการการสุ่ม 1 รายการ เมื่อค้นหาไม่เจอ ***
    // ***************************************************************
    if (foundMatches.length === 0) {
        
        const userHistory = getUserHistory(userId);
        const triedLevels = new Set(userHistory.triedLevels.map(String)); 
        const receivedIds = new Set(userHistory.receivedIds.map(String));
        let finalRecommendation = null;
        
        // 1. หา Level ที่ผู้ใช้ยังไม่เคยลอง (Unseen Levels)
        const unseenLevels = [...ALL_LEVELS].filter(level => !triedLevels.has(level));
        
        // 2. ถ้ายังมี Level ที่ยังไม่เคยลอง (ยังไม่ครบ 0-4)
        if (unseenLevels.length > 0) {
            
            // สุ่ม Level ใหม่ที่จะแนะนำ (จาก Level ที่ยังไม่เคยลอง)
            const targetLevelIndex = Math.floor(Math.random() * unseenLevels.length);
            const targetLevel = unseenLevels[targetLevelIndex];

            // กรองเมนูทั้งหมดที่อยู่ใน Target Level นั้นเท่านั้น
            // *** ไม่ต้องตัด receivedIds ออกในขั้นตอนนี้ เพื่อให้มั่นใจว่าได้ Level ใหม่ ***
            const candidates = cocktailData.filter(item => String(item.level) === targetLevel);
            
            if (candidates.length > 0) {
                // สุ่มเมนูจาก Target Level ที่ถูกเลือก
                const randomIndex = Math.floor(Math.random() * candidates.length);
                finalRecommendation = candidates[randomIndex];
                
                // บันทึก Level ที่ถูกแนะนำ และ ID เมนูลงในประวัติผู้ใช้
                userHistory.triedLevels.push(String(finalRecommendation.level));
                userHistory.receivedIds.push(String(finalRecommendation.id)); // บันทึก ID
                saveUserHistory(userId, userHistory);
                
                const remaining = unseenLevels.length - 1; 
                const message = remaining > 0 
                    ? `ไม่พบเมนูที่ตรงกับ "${name}" ลองเมนูแนะนำ (Level ใหม่) ${finalRecommendation.name} สิท่าจะดี! (เหลืออีก ${remaining} Level)`
                    : `คุณได้ลองครบทุก Level แล้ว! ลองเมนู ${finalRecommendation.name} สิท่าจะดี`;

                return res.json({
                    message: message,
                    data: [finalRecommendation], 
                    found: false
                });
            }
        }
        
        // 3. ถ้า Level ครบทุก Level แล้ว (เข้าสู่โหมดสุ่มเมนูที่ไม่ซ้ำ)
        if (!finalRecommendation && cocktailData.length > 0) {
            
            // กรอง Pool เมนูทั้งหมด ตัดเฉพาะเมนูที่ผู้ใช้เคยได้รับไปแล้ว
            const allUnseenCocktails = cocktailData.filter(item => 
                !receivedIds.has(String(item.id))
            );
            
            let poolToDrawFrom = allUnseenCocktails;
            let messageSuffix = " (เมนูใหม่ที่ไม่ซ้ำ)";
            
            // ถ้าได้รับครบทุกเมนูแล้ว ให้วนกลับมาสุ่มจากทั้งหมด (พร้อมแจ้งเตือน)
            if (poolToDrawFrom.length === 0) {
                poolToDrawFrom = cocktailData;
                messageSuffix = " (เมนูทั้งหมดในระบบ ได้รับครบแล้ว)";
            }
            
            const randomIndex = Math.floor(Math.random() * poolToDrawFrom.length);
            finalRecommendation = poolToDrawFrom[randomIndex];
            
            // บันทึก ID ของเมนูนี้ลงในประวัติ (หากยังไม่เคยได้รับ)
            if (!receivedIds.has(String(finalRecommendation.id))) {
                userHistory.receivedIds.push(String(finalRecommendation.id)); 
                saveUserHistory(userId, userHistory);
            }

            return res.json({
                message: `คุณได้ลองครบทุก Level แล้ว! ลองเมนู ${finalRecommendation.name} ที่สุ่มมา${messageSuffix}สิท่าจะดี`,
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