// backend/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
// ✅ ใช้ PORT จาก Render หรือ Local 3000
const PORT = process.env.PORT || 3000; 

// ✅ Path สำหรับไฟล์ข้อมูล
const JSON_FILE_PATH = path.join(__dirname, 'data', 'user.json');

let userData = [];

// ✅ โหลดข้อมูล JSON เข้าหน่วยความจำ
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

// โหลดข้อมูลเมื่อเริ่มต้น
loadUserData();

// ✅ Middleware
app.use(cors()); 
app.use(express.json());

// ✅ ฟังก์ชันช่วยในการสุ่มเลือก 1 รายการ
const getRandomItem = (array) => {
    if (array.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * array.length);
    return [array[randomIndex]]; 
};

// ✅ API: /search
app.post('/search', (req
