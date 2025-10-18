// frontend/script.js

// *****************************************************************
// *** URL ของ Render Web Service ของคุณ (ได้รับการแก้ไขแล้ว)
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
    // 1. เลือก Element ID ตามโครงสร้าง UI นีออน
    // เนื่องจาก UI ใหม่ใช้ปุ่มและ Input ID ที่ต่างกัน เราจะใช้ ID ของ UI นีออน
    const cocktailNameInput = document.getElementById('cocktailName'); // แทน nameInput
    const searchButton = document.getElementById('searchButton');     // แทน searchForm submit
    const messageDisplay = document.getElementById('messageDisplay'); // สำหรับข้อความแจ้งเตือน
    const cocktailDetailsDiv = document.getElementById('cocktailDetails'); // สำหรับแสดงรายละเอียด

    if (!cocktailNameInput || !searchButton) {
        // อาจมีปัญหาที่ index.html ยังไม่ถูกแก้
        return;
    }
    
    // ผูก Event Listener กับปุ่ม
    searchButton.addEventListener('click', searchCocktail);
    
    // ผูก Event Listener กับ Enter key
    cocktailNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCocktail();
        }
    });

    async function searchCocktail(event) {
        // ไม่ต้องใช้ event.preventDefault() เพราะผูกกับปุ่ม/keypress แทน form submit แล้ว
        
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
                body: JSON.stringify({ name }),
            });

            const data = await response.json();

            // ใช้ Element ที่ถูกสร้างขึ้นใหม่ตาม UI นีออน
            if (response.ok) {
                messageDisplay.textContent = data.message;
                let html = ''; 

                if (data.data && data.data.length > 0) {
                    data.data.forEach(item => {
                        // ใช้ class เพื่อให้เข้ากับ style.css นีออน
                        const itemClass = data.found ? 'cocktail-item found-match' : 'cocktail-item random-item';
                        
                        // ** แสดงผลลัพธ์แบบเต็มตาม Logic เดิม (มีการวนลูป)**
                        html += `<div class="${itemClass}">
                                    <h3 class="neon-result-name">${item.name || 'N/A'}</h3>
                                    <hr class="neon-divider">
                                    <p><strong>Description:</strong> ${item.description || 'N/A'}</p>
                                    <p><strong>สี:</strong> ${item.color || 'N/A'}</p>
                                    <p><strong>Level:</strong> ${mapLevel(item.level)}</p>
                                    <p><strong>Base on:</strong> ${item['base on'] || 'N/A'}</p>
                                </div>`;
                    });
                } else {
                    html = `<p class="neon-error-message">ไม่พบข้อมูลใดๆ ในระบบ</p>`;
                }
                
                cocktailDetailsDiv.innerHTML = html; // แสดงผลลัพธ์ใน div รายละเอียด
                
            } else {
                // กรณี Server ส่ง Error Code กลับมา
                messageDisplay.textContent = `Error: ${data.message || 'เกิดข้อผิดพลาดกับเซิร์ฟเวอร์'}`;
            }
        } catch (error) {
            console.error('Fetch error:', error);
            messageDisplay.textContent = 'ไม่สามารถเชื่อมต่อกับ Server ได้';
            cocktailDetailsDiv.innerHTML = ''; 
        }
    }
});