const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Debug log: ตรวจสอบว่าโหลด API key ได้ไหม
console.log("OPENAI_API_KEY loaded?", !!process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Route ทดสอบ
app.get("/", (req, res) => {
  res.send("Cocktail Generator API is running!");
});

// Route generate cocktail
app.post("/generate", async (req, res) => {
  const { name } = req.body;

  const prompt = `
  สร้างข้อมูลค็อกเทลในรูปแบบ JSON โดยใช้ชื่อ "${name}" เป็นแรงบันดาลใจ
  ข้อมูลต้องมีฟิลด์ดังนี้:
  - "name": ชื่อค็อกเทลที่สร้างสรรค์เป็นภาษาไทย
  - "reason": เหตุผลที่ตั้งชื่อนั้น (ไม่เกิน 2-3 บรรทัด)
  - "color": สีของค็อกเทลเป็นภาษาอังกฤษ (เช่น "Red", "Blue", "Green")
  - "alcoholLevel": ระดับแอลกอฮอล์ ("Low", "Medium", "High")
  - "taste": รสชาติ ("Sweet", "Sour", "Bitter", "Fru
