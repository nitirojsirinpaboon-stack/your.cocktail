require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const { models } = await genAI.listModels();
  for (const model of models) {
    console.log(`- ${model.name}`);
    console.log(`  Supported methods: ${JSON.stringify(model.supportedGenerationMethods)}`);
  }
}

listModels();