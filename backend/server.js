const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
 PORT 3000 ใช้สำหรับ Local Development
const PORT = process.env.PORT  3000; 

 กำหนด path สำหรับไฟล์ข้อมูล
const JSON_FILE_PATH = path.join(__dirname, 'data', 'users.json');

let userData = [];

 ฟังก์ชันสำหรับโหลดข้อมูล JSON
const loadUserData = () = {
    try {
        const data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
        userData = JSON.parse(data);
        console.log(`Loaded ${userData.length} records from JSON.`);
    } catch (err) {
        console.error('Error loading JSON data', err);
        userData = []; 
    }
};

 โหลดข้อมูลเมื่อ Server เริ่มต้น
loadUserData();

 Middleware
app.use(cors()); 
app.use(express.json());

 ฟังก์ชันช่วยในการสุ่มเลือก 1 รายการ
const getRandomItem = (array) = {
    if (array.length === 0) return null;
    const randomIndex = Math.floor(Math.random()  array.length);
     ส่งกลับเป็น Array ที่มี 1 รายการ เพื่อให้โครงสร้างของ API Response เหมือนกัน
    return [array[randomIndex]]; 
};


 API Endpoint สำหรับการค้นหา
app.post('search', (req, res) = {
    const { name } = req.body;
    const searchName = name  name.trim().toLowerCase()  '';

    if (!searchName) {
        return res.status(400).json({ message 'กรุณาใส่ชื่อที่ต้องการค้นหา' });
    }

     1. แยกคำค้นหา (Tokenization)
     ใช้ชื่อเต็มและอักษรตัวแรกของคำค้นหาเป็น Token
    const searchTokens = searchName.split('');
    const uniqueSearchTokens = Array.from(new Set([searchName, ...searchTokens]));

    let foundResults = [];

     2. ค้นหาแบบ Any Match
    for (const item of userData) {
        if (item.keyword) {
            const itemKeywords = item.keyword.toLowerCase().split('');

             ตรวจสอบว่ามี Token คำใดคำหนึ่งที่ตรงกับ keyword ใน Array หรือไม่
            const isMatch = uniqueSearchTokens.some(token = 
                itemKeywords.includes(token)
            );

            if (isMatch) {
                foundResults.push(item);
            }
        }
    }
    
    let finalResults = [];
    let message = '';

    if (foundResults.length  0) {
         3. พบผลลัพธ์จากการค้นหา
        finalResults = foundResults;
        message = `พบเมนูที่ตรงกับชื่อ ${name}`;
    } else {
         4. ไม่พบผลลัพธ์, ทำการสุ่ม (Random Fallback)
        finalResults = getRandomItem(userData);
         ตรวจสอบอีกครั้งเพื่อป้องกันกรณีที่ userData ว่างเปล่า
        if (finalResults && finalResults.length  0) {
             message = `ไม่พบเมนูสำหรับชื่อ ${name} จึงแสดงเมนูแนะนำ (สุ่ม)`;
        } else {
             message = `ไม่พบข้อมูลใดๆ ในระบบ`;
        }
    }

     ลบฟิลด์ 'keyword' ออกจากผลลัพธ์สุดท้ายก่อนส่งกลับ
    const output = (finalResults  []).map(({ keyword, ...rest }) = rest);
    
    res.json({ 
        found foundResults.length  0,  ให้ found เป็น true เฉพาะเมื่อค้นหาเจอเท่านั้น
        message message, 
        data output 
    });
});

app.listen(PORT, () = {
    console.log(`Server is running on port ${PORT}`);
});