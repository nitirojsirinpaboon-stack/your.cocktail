// frontend/script.js

// *****************************************************************
// *** สำคัญ: URL ของ Render Web Service ของคุณ (ได้รับการแก้ไขแล้ว)
// *****************************************************************
const BACKEND_URL = 'https://ur-cocktail.onrender.com';

// ฟังก์ชันสำหรับแปลง Level ให้เป็นข้อความ
const mapLevel = (level) => {
    const levelMap = {
        '0': 'NoL (ไม่มีแอลกอฮอล์)',
        '1': 'Weak (เบาๆ)',
        '2': 'SoSo (กลางๆ)',
        '3': 'Strong (เข้มข้น)',
        '4': 'Hard Core (หนักมาก)'
    };
    return levelMap[String(level)] || 'ไม่ระบุ'; 
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. เลือกองค์ประกอบตาม ID ที่ถูกกำหนดใน index.html (UI นีออน)
    const cocktailNameInput = document.getElementById('cocktailName');
    const searchButton = document.getElementById('searchButton');
    const messageDisplay = document.getElementById('messageDisplay');
    const cocktailDetailsDiv = document.getElementById('cocktailDetails');

    // 2. ตรวจสอบ Event Listener: ผูกกับปุ่มและ Enter Key
    if (searchButton) {
        searchButton.addEventListener('click', searchCocktail);
    }
    if (cocktailNameInput) {
        cocktailNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchCocktail();
            }
        });
    }

    async function searchCocktail() {
        const name = cocktailNameInput.value;
        messageDisplay.textContent = 'กำลังค้นหา...';
        cocktailDetailsDiv.innerHTML = ''; // เคลียร์ผลลัพธ์เก่า

        if (!name.trim()) {
            messageDisplay.textContent = 'กรุณาใส่ชื่อที่ต้องการค้นหา';
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name }),
            });

            const data = await response.json();

            if (response.ok) {
                // แสดงข้อความแจ้งเตือน (พบ/ไม่พบ/สุ่ม)
                messageDisplay.textContent = data.message; 
                
                if (data.data && data.data.length > 0) {
                    const cocktail = data.data[0]; 
                    
                    // กำหนดสีของ Level โดยใช้ CSS class (ใช้สไตล์นีออนที่กำหนดไว้ใน style.css)
                    // ถ้า Backend มีฟิลด์ 'level', ให้แปลงเป็นข้อความ
                    const levelText = mapLevel(cocktail.level);
                    
                    // สร้าง HTML สำหรับแสดงผลลัพธ์เดียว (เพราะ Backend สุ่มมา 1 อัน)
                    cocktailDetailsDiv.innerHTML = `
                        <h3>${cocktail.name || 'N/A'}</h3>
                        <p><strong>Level:</strong> ${levelText}</p>
                        <p><strong>ประเภท:</strong> ${cocktail.category || 'N/A'}</p>
                        <p><strong>สี:</strong> ${cocktail.color || 'N/A'}</p>
                        <p><strong>ส่วนผสม:</strong> ${cocktail.ingredients || 'N/A'}</p>
                        <p><strong>คำแนะนำ:</strong> ${cocktail.instructions || 'N/A'}</p>
                    `;
                    
                } else {
                    cocktailDetailsDiv.innerHTML = '<p>ไม่พบข้อมูลเมนูที่ต้องการแสดง</p>';
                }

            } else {
                // กรณี Server ส่ง Error Code กลับมา (เช่น 400)
                messageDisplay.textContent = `Error: ${data.message || 'เกิดข้อผิดพลาดกับเซิร์ฟเวอร์'}`;
            }

        } catch (error) {
            console.error('Fetch error:', error);
            messageDisplay.textContent = 'ไม่สามารถเชื่อมต่อกับ Server ได้';
            // เคลียร์ข้อมูลเก่า
            cocktailDetailsDiv.innerHTML = ''; 
        }
    }
});