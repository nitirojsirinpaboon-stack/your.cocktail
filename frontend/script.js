// frontend/script.js

// *****************************************************************
// *** สำคัญ: URL ของ Render Web Service ของคุณ
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

// ฟังก์ชันสำหรับสร้าง HTML ไอคอนสี (คืนค่าเฉพาะไอคอนเท่านั้น เพื่อป้องกันการแสดงชื่อสีซ้ำซ้อน)
const getColorIconHtml = (colorName) => {
    const safeColorName = colorName ? colorName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'default';
    
    // ตรวจสอบสีสำคัญ (ใช้คำที่อยู่ในข้อมูลของคุณ)
    if (safeColorName.includes('แดง')) return `<span class="color-icon color-red" title="สีแดง"></span>`;
    if (safeColorName.includes('ฟ้า') || safeColorName.includes('น้ำเงิน')) return `<span class="color-icon color-blue" title="สีฟ้า/น้ำเงิน"></span>`;
    if (safeColorName.includes('เขียว')) return `<span class="color-icon color-green" title="สีเขียว"></span>`;
    if (safeColorName.includes('เหลือง')) return `<span class="color-icon color-yellow" title="สีเหลือง"></span>`;
    if (safeColorName.includes('ส้ม')) return `<span class="color-icon color-orange" title="สีส้ม"></span>`;
    if (safeColorName.includes('ม่วง')) return `<span class="color-icon color-purple" title="สีม่วง"></span>`;
    if (safeColorName.includes('ชมพู')) return `<span class="color-icon color-pink" title="สีชมพู"></span>`;
    if (safeColorName.includes('ขาว')) return `<span class="color-icon color-white" title="สีขาว"></span>`;
    if (safeColorName.includes('ดำ')) return `<span class="color-icon color-black" title="สีดำ"></span>`;
    if (safeColorName.includes('ใส')) return `<span class="color-icon color-transparent" title="สีใส"></span>`;
    if (safeColorName.includes('น้ำตาล')) return `<span class="color-icon color-brown" title="สีน้ำตาล"></span>`;
    if (safeColorName.includes('เทา')) return `<span class="color-icon color-gray" title="สีเทา"></span>`;
    
    // คืนค่าว่างเปล่าถ้าไม่ตรงกับสีที่กำหนด
    return ''; 
};

document.addEventListener('DOMContentLoaded', () => {
    // เลือก Element ID ตามโครงสร้าง UI นีออน
    const cocktailNameInput = document.getElementById('cocktailName');
    const searchButton = document.getElementById('searchButton');
    const messageDisplay = document.getElementById('messageDisplay');
    const cocktailDetailsDiv = document.getElementById('cocktailDetails');

    if (!cocktailNameInput || !searchButton) {
        console.error("Missing required HTML elements.");
        return;
    }
    
    // ผูก Event Listener
    searchButton.addEventListener('click', searchCocktail);
    cocktailNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCocktail();
        }
    });

    async function searchCocktail() {
        const name = cocktailNameInput.value;
        messageDisplay.textContent = 'กำลังค้นหา...';
        cocktailDetailsDiv.innerHTML = ''; 

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
                body: JSON.stringify({ name }),
            });

            const data = await response.json();

            if (response.ok) {
                messageDisplay.textContent = data.message;
                let html = ''; 

                if (data.data && data.data.length > 0) {
                    data.data.forEach(item => {
                        const itemClass = data.found ? 'cocktail-item found-match' : 'cocktail-item random-item';
                        const levelText = mapLevel(item.level); 
                        const colorHtml = getColorIconHtml(item.color); // ไอคอนสี
                        
                        // แสดงผลลัพธ์: ไอคอนสี (ถ้ามี) ตามด้วยชื่อสีจริงจาก item.color
                        html += `<div class="${itemClass}">
                                    <h3 class="neon-result-name">${item.name || 'N/A'}</h3>
                                    <hr class="neon-divider">
                                    <p><strong>Description:</strong> ${item.description || 'N/A'}</p>
                                    <p><strong>สี:</strong> ${colorHtml} ${item.color || 'N/A'}</p> 
                                    <p><strong>Level:</strong> ${levelText}</p>
                                    <p><strong>Base on:</strong> ${item['base on'] || 'N/A'}</p>
                                    <p><strong>ส่วนผสม:</strong> ${item.ingredients || 'N/A'}</p>
                                    <p><strong>คำแนะนำ:</strong> ${item.instructions || 'N/A'}</p>
                                </div>`;
                    });
                } else {
                    html = `<p class="neon-error-message">ไม่พบข้อมูลใดๆ ในระบบ</p>`;
                }
                
                cocktailDetailsDiv.innerHTML = html; 
                
            } else {
                messageDisplay.textContent = `Error: ${data.message || 'เกิดข้อผิดพลาดกับเซิร์ฟเวอร์'}`;
            }
        } catch (error) {
            console.error('Fetch error:', error);
            messageDisplay.textContent = 'ไม่สามารถเชื่อมต่อกับ Server ได้';
            cocktailDetailsDiv.innerHTML = ''; 
        }
    }
});