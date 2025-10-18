// frontend/script.js

const BACKEND_URL = 'https://ur-cocktail.onrender.com'; // **ตรวจสอบให้แน่ใจว่า URL นี้ถูกต้อง**

document.addEventListener('DOMContentLoaded', () => {
    const cocktailNameInput = document.getElementById('cocktailName');
    const searchButton = document.getElementById('searchButton');
    const messageDisplay = document.getElementById('messageDisplay');
    const cocktailDetailsDiv = document.getElementById('cocktailDetails');

    searchButton.addEventListener('click', searchCocktail);
    cocktailNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCocktail();
        }
    });

    async function searchCocktail() {
        const name = cocktailNameInput.value;
        messageDisplay.textContent = 'กำลังค้นหา...';
        cocktailDetailsDiv.innerHTML = ''; // เคลียร์ผลลัพธ์เก่า

        try {
            const response = await fetch(`${BACKEND_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'เกิดข้อผิดพลาดในการค้นหา');
            }

            const data = await response.json();

            messageDisplay.textContent = data.message;

            if (data.data && data.data.length > 0) {
                const cocktail = data.data[0]; // เราสุ่มมา 1 รายการจาก Backend แล้ว
                cocktailDetailsDiv.innerHTML = `
                    <h3>${cocktail.name}</h3>
                    <p><strong>ประเภท:</strong> ${cocktail.category}</p>
                    <p><strong>ส่วนผสม:</strong> ${cocktail.ingredients}</p>
                    <p><strong>คำแนะนำ:</strong> ${cocktail.instructions}</p>
                `;
            } else {
                cocktailDetailsDiv.innerHTML = '<p>ไม่พบข้อมูลเมนูที่ต้องการแสดง</p>';
            }

        } catch (error) {
            messageDisplay.textContent = `ข้อผิดพลาด: ${error.message}`;
            console.error('Fetch error:', error);
        }
    }
});