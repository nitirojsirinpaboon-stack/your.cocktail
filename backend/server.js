const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
// Render จะส่ง PORT มาให้โดยอัตโนมัติ
const PORT = process.env.PORT || 3000;

// 📁 path ของโฟลเดอร์ frontend
const FRONTEND_PATH = path.join(__dirname, '../frontend');

// 📁 path ของไฟล์ข้อมูล
const JSON_FILE_PATH = path.join(__dirname, 'data', 'user.json');

// โหลดข้อมูล
let userData = [];
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

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Serve หน้าเว็บ (frontend)
app.use(express.static(FRONTEND_PATH));

// 🔍 API: ค้นหาเมนูค็อกเทล
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
        finalResults = foundResults;
        message = `พบเมนูที่ตรงกับชื่อ: ${name}`;
        found = true;
    } else {
        const randomIndex = Math.floor(Math.random() * userData.length);
        finalResults = [userData[randomIndex]];
        message = `ไม่พบเมนูสำหรับชื่อ "${name}" จึงแสดงเมนูแนะนำ (สุ่ม)`;
        found = false;
    }

    const output = finalResults.map(({ keyword, ...rest }) => rest);
    res.json({ found, message, data: output });
});

// ✅ fallback ให้หน้า index.html แสดงได้เสมอ
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
