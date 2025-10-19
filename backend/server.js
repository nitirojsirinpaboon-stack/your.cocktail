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

// ตำแหน่งเก็บข้อมูลประวัติผู้ใช้ (user_history)
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
        return JSON.parse(data); 
    } catch (error) {
        // หากไฟล์ไม่มีอยู่ หรือเกิด Error ในการอ่าน/Parse
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
// *** 4. Route หลักสำหรับการค้นหา ***
// ***************************************************************

app.post('/search', (req, res) => {
    if (cocktailData.length === 0) {
        return res.status(503).json({ 
            message: 'Server Error: ไม่สามารถโหลดข้อมูลค็อกเทลได้',
            data: []
        });
    }
    
    // ดึง name และ userId
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
    // *** Smart Random Recommendation Logic ***
    // ***************************************************************
    if (foundMatches.length === 0) {
        
        const userHistory = getUserHistory(userId);
        // Level ที่เคยแนะนำให้ผู้ใช้คนนี้ไปแล้ว
        const recommendedLevels = new Set(userHistory.recommendedLevels.map(String)); 
        let randomResults = [];
        let availablePool = [...cocktailData]; // Pool สำหรับสุ่ม
        const maxRandom = 3; 
        
        // 1. กรองเมนูที่มี Level ที่ไม่เคยแนะนำให้ผู้ใช้คนนี้ (Level ที่ยังไม่ได้ลอง)
        const unseenCocktails = availablePool.filter(item => !recommendedLevels.has(String(item.level)));
        
        // 2. ถ้ามีเมนูที่ Level ไม่เคยแนะนำ ให้สุ่มจากกลุ่มนั้นก่อน (เน้นความหลากหลาย)
        if (unseenCocktails.length > 0) {
            let tempUnseen = [...unseenCocktails];
            let levelsFoundInSession = new Set(); // ป้องกันการสุ่ม Level ซ้ำใน 3 รายการนี้
            
            while (randomResults.length < maxRandom && tempUnseen.length > 0) {
                const randomIndex = Math.floor(Math.random() * tempUnseen.length);
                const randomItem = tempUnseen[randomIndex];
                const itemLevel = String(randomItem.level);

                // ถ้า Level นี้ยังไม่เคยถูกแนะนำใน 3 รายการนี้ และยังไม่ได้อยู่ในประวัติ (เงื่อนไขที่ 1)
                if (!levelsFoundInSession.has(itemLevel)) {
                    randomResults.push(randomItem);
                    levelsFoundInSession.add(itemLevel);
                    // บันทึก Level นี้ลงในประวัติผู้ใช้ (เพื่อใช้ในการค้นหาครั้งถัดไป)
                    userHistory.recommendedLevels.push(itemLevel); 
                }
                tempUnseen.splice(randomIndex, 1); // ลบออกจาก pool ชั่วคราว
            }
        }

        // 3. ถ้ายังได้ไม่ครบ 3 (เพราะ Level ไม่ครบลูปแล้ว) ให้สุ่มรายการที่เหลือเข้ามาเติม
        if (randomResults.length < maxRandom) {
            // กรองรายการที่ยังไม่ถูกเลือกเข้ามาใน randomResults
            const remainingPool = availablePool.filter(item => !randomResults.includes(item));
            let tempRemaining = [...remainingPool];
            
            while (randomResults.length < maxRandom && tempRemaining.length > 0) {
                const randomIndex = Math.floor(Math.random() * tempRemaining.length);
                randomResults.push(tempRemaining[randomIndex]);
                tempRemaining.splice(randomIndex, 1);
            }
        }
        
        // 4. บันทึกประวัติผู้ใช้ลงในไฟล์
        saveUserHistory(userId, userHistory);

        return res.json({
            message: `ไม่พบเมนูที่ตรงกับ "${name}" ลองเมนูแนะนำ ${randomResults.length} รายการที่เหมาะกับคุณสิ!`,
            data: randomResults,
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