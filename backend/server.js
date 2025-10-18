const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; 

const JSON_FILE_PATH = path.join(__dirname, 'data', 'user.json');
let userData = [];

// ✅ โหลดข้อมูล JSON
const loadUserData = () => {
    try {
        const data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
        userData = JSON.parse(data);
        console.log(`✅ Loaded ${userData.length} records from JSON.`);
    } catch (err) {
        console.error('❌ Error loading JSON data:', err);
        userData = []; 
    }
};

loadUserData();
app.use(cors()); 
app.use(express.json());

// ✅ ฟังก์ชันสุ่มเลือก 1 รายการ
const getRandomItem = (array) => {
    if (!array || array.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * array.length);
    return [array[randomIndex]]; 
};

// ✅ Endpoint: /search
app.post('/search', (req, res) => {
    const { name } = req.body;
    const searchName = name ? name.trim().toLowerCase() : '';

    if (!searchName) {
        return res.status(400).json({ message: 'กรุณาใส่ชื่อที่ต้องการค้นหา' });
    }

    const searchTokens = searchName.split('');
    const uniqueSearchTokens = Array.from(new Set([searchName, ...searchTokens]));

    let foundResults = [];

    for (const item of userData) {
        if (item.keyword) {
            const itemKeywords = item.keyword.toLowerCase().split('|');
            const isMatch = uniqueSearchTokens.some(token => itemKeywords.includes(token));
            if (isMatch) foundResults.push(item);
        }
    }

    let finalResults = [];
    let message = '';
    let found = false;

    if (foundResults.length > 0) {
        // ✅ ถ้ามีหลายอัน → สุ่มมาแค่ 1
        const randomIndex = Math.floor(Math.random() * foundResults.length);
        finalResults = [foundResults[randomIndex]];
        message = `พบเมนูที่ตรงกับชื่อ: ${name}`;
        found = true;
    } else {
        // ❌ ไม่พบ → สุ่มจากทั้งหมด
        const randomIndex = Math.floor(Math.random() * userData.length);
        finalResults = [userData[randomIndex]];
        message = `ไม่พบเมนูสำหรับชื่อ "${name}" จึงแสดงเมนูแนะนำ (สุ่ม)`;
        found = false;
    }

    const output = (finalResults || []).map(({ keyword, ...rest }) => rest);

    res.json({ 
        found: found,
        message: message,
        data: output
    });
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
