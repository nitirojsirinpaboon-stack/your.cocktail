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

// ... (ส่วน Try/Catch โหลด cocktailData และสร้าง USER_HISTORY_DIR ยังคงเหมือนเดิม) ...

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
        return JSON.parse(data); 
    } catch (error) {
        return { recommendedLevels: [] }; // คืนค่าเริ่มต้น
    }
};

// บันทึกประวัติผู้ใช้
const saveUserHistory = (userId, history) => {
    const userFilePath = path.join(USER_HISTORY_DIR, `${userId}.json`);
    try {
        fs.writeFileSync(userFilePath, JSON.stringify(history, null, 2), 'utf8');
    } catch (error) {
        console.error(`❌ WARNING: Failed to save history for user ${userId}.`, error.message);
    }
};


// ***************************************************************
// *** 4. Route หลักสำหรับการค้นหา (Smart Random Logic V2.0) ***
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
        const recommendedLevels = new Set(userHistory.recommendedLevels.map(String)); 
        let finalRecommendation = null;
        
        // 1. หา Level ที่ผู้ใช้ยังไม่เคยลอง (Unseen Levels)
        const unseenLevels = [...ALL_LEVELS].filter(level => !recommendedLevels.has(level));
        
        // 2. ถ้ายังมี Level ที่ยังไม่เคยลอง (ยังไม่ครบ 0-4)
        if (unseenLevels.length > 0) {
            
            // กรองเมนูทั้งหมดที่อยู่ใน Level ที่ยังไม่เคยลอง
            const candidates = cocktailData.filter(item => unseenLevels.includes(String(item.level)));
            
            if (candidates.length > 0) {
                // สุ่มเมนูจากกลุ่ม Level ที่ยังไม่เคยลอง
                const randomIndex = Math.floor(Math.random() * candidates.length);
                finalRecommendation = candidates[randomIndex];
                
                // บันทึก Level ที่ถูกแนะนำลงในประวัติผู้ใช้
                const recommendedLevel = String(finalRecommendation.level);
                userHistory.recommendedLevels.push(recommendedLevel);
                saveUserHistory(userId, userHistory);
                
                // คำนวณ Level ที่เหลือ
                const remaining = unseenLevels.length - 1;
                const message = remaining > 0 
                    ? `ไม่พบเมนูที่ตรงกับ "${name}" ลองเมนูแนะนำ (Level ใหม่) ${finalRecommendation.name} สิ! (เหลืออีก ${remaining} Level)`
                    : `คุณได้ลองครบทุก Level แล้ว! ลองเมนู ${finalRecommendation.name} สิท่าจะดี`;

                return res.json({
                    message: message,
                    data: [finalRecommendation], // ส่งกลับเพียง 1 รายการ
                    found: false
                });
            }
        }
        
        // 3. ถ้า Level ครบทุก Level แล้ว (หรือหาเมนูใน Level ที่เหลือไม่เจอ)
        //    สุ่มเมนู 1 รายการจากเมนูทั้งหมด
        if (!finalRecommendation && cocktailData.length > 0) {
            const randomIndex = Math.floor(Math.random() * cocktailData.length);
            finalRecommendation = cocktailData[randomIndex];

            return res.json({
                message: `คุณได้ลองครบทุก Level แล้ว! ลองเมนู ${finalRecommendation.name} ที่สุ่มมาสิท่าจะดี`,
                data: [finalRecommendation], // ส่งกลับเพียง 1 รายการ
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