// frontend/script.js

// ... (โค้ดส่วนบน mapLevel และ BACKEND_URL) ...

// ฟังก์ชันสำหรับสร้าง HTML ไอคอนสี
const getColorIconHtml = (colorName) => {
    // แปลงชื่อสีให้เป็น class ที่ใช้ได้ใน CSS
    const safeColorName = colorName ? colorName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'default';
    
    // ตรวจสอบสีพิเศษ
    if (safeColorName.includes('แดง')) return `<span class="color-icon color-red" title="สีแดง"></span> สีแดง`;
    if (safeColorName.includes('ฟ้า')) return `<span class="color-icon color-blue" title="สีฟ้า"></span> สีฟ้า`;
    if (safeColorName.includes('น้ำเงิน')) return `<span class="color-icon color-blue" title="สีน้ำเงิน"></span> สีน้ำเงิน`;
    if (safeColorName.includes('เขียว')) return `<span class="color-icon color-green" title="สีเขียว"></span> สีเขียว`;
    if (safeColorName.includes('เหลือง')) return `<span class="color-icon color-yellow" title="สีเหลือง"></span> สีเหลือง`;
    if (safeColorName.includes('ส้ม')) return `<span class="color-icon color-orange" title="สีส้ม"></span> สีส้ม`;
    if (safeColorName.includes('ม่วง')) return `<span class="color-icon color-purple" title="สีม่วง"></span> สีม่วง`;
    if (safeColorName.includes('ชมพู')) return `<span class="color-icon color-pink" title="สีชมพู"></span> สีชมพู`;
    if (safeColorName.includes('ขาว')) return `<span class="color-icon color-white" title="สีขาว"></span> สีขาว`;
    if (safeColorName.includes('ดำ')) return `<span class="color-icon color-black" title="สีดำ"></span> สีดำ`;
    if (safeColorName.includes('ใส')) return `<span class="color-icon color-transparent" title="สีใส"></span> สีใส`; // สำหรับไม่มีสี
    if (safeColorName.includes('น้ำตาล')) return `<span class="color-icon color-brown" title="สีน้ำตาล"></span> สีน้ำตาล`;
    if (safeColorName.includes('เทา')) return `<span class="color-icon color-gray" title="สีเทา"></span> สีเทา`;
    // สามารถเพิ่มสีอื่น ๆ ได้ตามต้องการ
    
    // ถ้าไม่ตรงกับสีที่กำหนด ให้แสดงเป็นชื่อสีธรรมดา
    return colorName || 'N/A';
};

document.addEventListener('DOMContentLoaded', () => {
    const cocktailNameInput = document.getElementById('cocktailName');
    const searchButton = document.getElementById('searchButton');
    const messageDisplay = document.getElementById('messageDisplay');
    const cocktailDetailsDiv = document.getElementById('cocktailDetails');

    if (!cocktailNameInput || !searchButton) {
        return;
    }
    
    searchButton.addEventListener('click', searchCocktail);
    cocktailNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCocktail();
        }
    });

    async function searchCocktail(event) {
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
                        const levelText = mapLevel(item.level); // ใช้ mapLevel เหมือนเดิม
                        const colorHtml = getColorIconHtml(item.color); // ใช้ฟังก์ชันใหม่สำหรับสี

                        html += `<div class="${itemClass}">
                                    <h3 class="neon-result-name">${item.name || 'N/A'}</h3>
                                    <hr class="neon-divider">
                                    <p><strong>Description:</strong> ${item.description || 'N/A'}</p>
                                    <p><strong>สี:</strong> ${colorHtml}</p> 
                                    <p><strong>Level:</strong> ${levelText}</p>
                                    <p><strong>Base on:</strong> ${item['base on'] || 'N/A'}</p>
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