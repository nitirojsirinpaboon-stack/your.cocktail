const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Debug: check if API key is loaded
console.log("OPENAI_API_KEY loaded?", !!process.env.OPENAI_API_KEY);
console.log("First 8 chars:", process.env.OPENAI_API_KEY?.slice(0, 8));

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Cocktail Generator API is running!");
});

app.post("/generate", async (req, res) => {
  const { name } = req.body;

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
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const cocktailData = JSON.parse(response.choices[0].message.content);
    res.json(cocktai
