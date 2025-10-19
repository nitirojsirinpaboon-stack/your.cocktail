// frontend/script.js

// *****************************************************************
// *** สำคัญ: URL ของ Render Web Service ของคุณ
// *****************************************************************
const BACKEND_URL = 'https://ur-cocktail.onrender.com';

// *****************************************************************
// *** 1. User ID Setup (สร้าง/ดึง User ID ชั่วคราวจาก Local Storage) ***
// *****************************************************************
let USER_ID = localStorage.getItem('cocktailUserId');
if (!USER_ID) {
    // สร้าง ID ง่ายๆ เพื่อใช้เป็นชื่อไฟล์ชั่วคราว
    USER_ID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('cocktailUserId', USER_ID);
}
console.log(`Current User ID: ${USER_ID}`);


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

// ฟังก์ชันสำหรับสร้าง HTML ไอคอนสี
const getColorIconHtml = (colorName) => {
    const safeColorName = colorName ? colorName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    if (safeColorName.includes('แดง') || safeColorName.includes('red')) return `<span class="color-icon color-red" title="สีแดง"></span>`;
    if (safeColorName.includes('ฟ้า') || safeColorName.includes('น้ำเงิน') || safeColorName.includes('blue')) return `<span class="color-icon color-blue" title="สีฟ้า/น้ำเงิน"></span>`;
    if (safeColorName.includes('เขียว') || safeColorName.includes('green')) return `<span class="color-icon color-green" title="สีเขียว"></span>`;
    if (safeColorName.includes('เหลือง') || safeColorName.includes('yellow')) return `<span class="color-icon color-yellow" title="สีเหลือง"></span>`;
    if (safeColorName.includes('ส้ม') || safeColorName.includes('orange')) return `<span class="color-icon color-orange" title="สีส้ม"></span>`;
    if (safeColorName.includes('ม่วง') || safeColorName.includes('purple')) return `<span class="color-icon color-purple" title="สีม่วง"></span>`;
    if (safeColorName.includes('ชมพู') || safeColorName.includes('pink')) return `<span class="color-icon color-pink" title="สีชมพู"></span>`; 
    if (safeColorName.includes('ขาว') || safeColorName.includes('white')) return `<span class="color-icon color-white" title="สีขาว"></span>`;
    if (safeColorName.includes('ดำ') || safeColorName.includes('black')) return `<span class="color-icon color-black" title="สีดำ"></span>`;
    if (safeColorName.includes('ใส') || safeColorName.includes('transparent')) return `<span class="color-icon color-transparent" title="สีใส"></span>`;
    if (safeColorName.includes('น้ำตาล') || safeColorName.includes('brown')) return `<span class="color-icon color-brown" title="สีน้ำตาล"></span>`;
    if (safeColorName.includes('เทา') || safeColorName.includes('gray')) return `<span class="color-icon color-gray" title="สีเทา"></span>`;
    
    return ''; 
};

document.addEventListener('DOMContentLoaded', () => {
    const cocktailNameInput = document.getElementById('cocktailName');
    const searchButton = document.getElementById('searchButton');
    const messageDisplay = document.getElementById('messageDisplay');
    const cocktailDetailsDiv = document.getElementById('cocktailDetails');

    if (!cocktailNameInput || !searchButton || !messageDisplay || !cocktailDetailsDiv) {
        if (messageDisplay) messageDisplay.textContent = '❌ Error: ไม่พบส่วนประกอบ HTML (Input/Button/Display)';
        return;
    }
    
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
                body: JSON.stringify({ name, userId: USER_ID }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                messageDisplay.textContent = `Error (${response.status}): ${errorData.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์'}`;
                return;
            }

            const data = await response.json();

            let html = ''; 

            if (data.data && data.data.length > 0) {
                messageDisplay.textContent = data.message;
                
                data.data.forEach(item => {
                    const itemClass = data.found ? 'cocktail-item found-match' : 'cocktail-item random-item';
                    const levelText = mapLevel(item.level); 
                    const colorHtml = getColorIconHtml(item.color);
                    
                    // ***************************************************************
                    // *** ตัดโค้ดแสดงผล Field ที่ไม่ต้องการออกไป (glass, ingredients, tags, instructions) ***
                    // ***************************************************************

                    // แสดงผลลัพธ์
                    html += `
                        <div class="${itemClass}">
                            <h3 class="neon-result-name">${item.name || 'N/A'}</h3>
                            <hr class="neon-divider">

                            <p><strong>Description:</strong> ${item.description || 'N/A'}</p>
                            
                            <p><strong>สี:</strong> ${colorHtml} ${item.color || 'N/A'}</p> 
                            
                            <p><strong>Level:</strong> ${levelText}</p>

                            ${(item['base on'] && item['base on'] !== 'N/A') ? `<p><strong>Base on:</strong> ${item['base on']}</p>` : ''}
                            
                        </div>`;
                });
            } else {
                messageDisplay.textContent = `ไม่พบเมนูสำหรับชื่อ "${name}"`;
                html = `<p class="neon-error-message">ไม่พบข้อมูลใดๆ ในระบบ</p>`;
            }
            
            cocktailDetailsDiv.innerHTML = html; 
            
        } catch (error) {
            console.error('Fetch error:', error);
            messageDisplay.textContent = 'ไม่สามารถเชื่อมต่อกับ Server ได้ (โปรดตรวจสอบ Backend Log)';
            cocktailDetailsDiv.innerHTML = ''; 
        }
    }
});