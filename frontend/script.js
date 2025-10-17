document.getElementById('searchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = 'กำลังค้นหา...';

    // *****************************************************************
    // *** สำคัญ: ต้องเปลี่ยน 'http://localhost:3000' เป็น URL ของ Render Web Service ของคุณ
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
            let html = `<h2>${data.message}</h2>`; 

            if (data.data && data.data.length > 0) {
                data.data.forEach(item => {
                    // ใช้ data.found จาก Backend เพื่อแยกแยะผลลัพธ์ที่พบจริง กับการสุ่ม (fallback)
                    const itemClass = data.found ? 'result-item' : 'result-item random-item';
                    
                    html += `<div class="${itemClass}">
                                <p class="result-name">ชื่อเครื่องดื่ม = ${item.name || 'N/A'}</p>
                                
                                <hr style="border-top: 1px dashed #ccc; margin: 10px 0;">
                                
                                <strong>Description:</strong> ${item.description || 'N/A'}<br>
                                <strong>สี:</strong> ${item.color || 'N/A'}<br>
                                <strong>Level:</strong> ${mapLevel(item.level)}<br>
                                <strong>Base on:</strong> ${item['base on'] || 'N/A'}
                            </div>`;
                });
            } else {
                html = `<p style="color: red;">ไม่พบข้อมูลใดๆ ในระบบ</p>`;
            }
            resultsDiv.innerHTML = html;
        } else {
            resultsDiv.innerHTML = `<p style="color: red;">Error: ${data.message || 'เกิดข้อผิดพลาดกับเซิร์ฟเวอร์'}</p>`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        resultsDiv.innerHTML = '<p style="color: red;">ไม่สามารถเชื่อมต่อกับ Server ได้</p>';
    }
});