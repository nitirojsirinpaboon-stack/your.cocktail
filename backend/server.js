// server.js (Backend)

// ***************************************************************
// *** 1. Modules ที่จำเป็น ***
// ***************************************************************
const express = require('express');
const cors = require('cors'); // ใช้สำหรับแก้ไขปัญหา Cross-Origin
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000; // ใช้ port 10000 ตามที่ Render แนะนำ

// ***************************************************************
// *** 2. ตั้งค่า CORS (สำคัญมากในการเชื่อมต่อกับ Static Site) ***
// ***************************************************************
const allowedOrigins = [
    // *** เปลี่ยน URL นี้ให้เป็น URL จริงของ Static Site (Frontend) ของคุณบน Render ***
    'https://your-cocktail-1.onrender.com', 
    'http://localhost:5500', // สำหรับทดสอบบนเครื่องตัวเอง (ถ้าใช้ Live Server)
    'http://localhost:3000', // สำหรับทดสอบบนเครื่องตัวเอง (ถ้าใช้ create-react-app)
];

const corsOptions = {
  origin: (origin, callback) => {
    // อนุญาตให้เรียกจาก origins ที่กำหนด, หรือถ้าไม่มี origin (เช่น Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST',
  credentials: true,
};

app.use(cors(corsOptions)); // ใช้ CORS middleware

// ***************************************************************
// *** 3. Middleware และการโหลดข้อมูล ***
// ***************************************************************

app.use(express.json()); // Middleware สำหรับ Parse JSON body

// โหลดข้อมูล JSON จากไฟล์
const dataPath = path.join(__dirname, 'cocktail_data.json');
let cocktailData = [];

try {
    const data = fs.readFileSync(dataPath, 'utf8');
    cocktailData = JSON.parse(data);
    console.log(`✅ Loaded ${cocktailData.length} records from JSON.`);
} catch (error) {
    console.error('❌ Error loading cocktail data:', error);
}

// ***************************************************************
// *** 4. Route หลักสำหรับการค้นหา ***
// ***************************************************************

app.post('/search', (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({ 
            message: 'กรุณาระบุชื่อค็อกเทลที่ต้องการค้นหา',
            data: []
        });
    }

    const searchName = name.toLowerCase().trim();
    
    // ค้นหาแบบตรงชื่อ
    let foundMatches = cocktailData.filter(item => 
        item.name && item.name.toLowerCase().includes(searchName)
    );

    // ถ้าไม่พบแบบตรงชื่อ ให้สุ่มเมนู 3 รายการ
    if (foundMatches.length === 0) {
        let randomResults = [];
        const maxRandom = Math.min(3, cocktailData.length); // สุ่มสูงสุด 3 เมนู
        
        while (randomResults.length < maxRandom) {
            const randomIndex = Math.floor(Math.random() * cocktailData.length);
            const randomItem = cocktailData[randomIndex];
            
            // ป้องกันการสุ่มเมนูซ้ำ
            if (!randomResults.includes(randomItem)) {
                randomResults.push(randomItem);
            }
        }

        return res.json({
            message: `ไม่พบเมนูที่ตรงกับ "${name}" ลองเมนูแนะนำ 3 รายการนี้สิ!`,
            data: randomResults,
            found: false
        });
    }

    // ถ้าพบแบบตรงชื่อ
    return res.json({
        message: `พบเมนู ${foundMatches.length} รายการที่ตรงกับ "${name}"`,
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