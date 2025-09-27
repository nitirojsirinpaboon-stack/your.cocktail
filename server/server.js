const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Gemini AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Main endpoint
app.get("/", (req, res) => {
  res.send("Cocktail Generator API is running!");
});

// Endpoint to generate a cocktail
app.post("/generate", async (req, res) => {
  const { name } = req.body;
  
  // Create a prompt for the AI in Thai
  const prompt = `
  สร้างข้อมูลค็อกเทลในรูปแบบ JSON โดยใช้ชื่อ "${name}" เป็นแรงบันดาลใจ
  ข้อมูลต้องมีฟิลด์ดังนี้:
  - "name": ชื่อค็อกเทลที่สร้างสรรค์เป็นภาษาไทย
  - "reason": เหตุผลที่ตั้งชื่อนั้น (ไม่เกิน 2-3 บรรทัด)
  - "color": สีของค็อกเทลเป็นภาษาอังกฤษ (เช่น "Red", "Blue", "Green")
  - "alcoholLevel": ระดับแอลกอฮอล์ ("Low", "Medium", "High")
  - "taste": รสชาติ ("Sweet", "Sour", "Bitter", "Fruity")
  - "recipe": สูตรผสมแบบขั้นตอน (เป็น Array ของ string)

  ตัวอย่าง JSON output:
  {
    "name": "ชื่อค็อกเทล",
    "reason": "เหตุผลที่ตั้งชื่อ",
    "color": "สีของค็อกเทล",
    "alcoholLevel": "ระดับแอลกอฮอล์",
    "taste": "รสชาติ",
    "recipe": [
      "ขั้นตอนที่ 1",
      "ขั้นตอนที่ 2"
    ]
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Remove markdown code block fences if any
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse the JSON string
    const cocktail = JSON.parse(text);
    
    res.json(cocktail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate cocktail. Please try again." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));