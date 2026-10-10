require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testSdk() {
  const apiKey = process.env.Gemini_Rag_Model_API || process.env.GEMINI_API_KEY;
  console.log('Testing SDK with key prefix:', apiKey ? apiKey.substring(0, 5) : 'NONE');
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const res = await model.generateContent('Return JSON: {"hello": "world"}');
    console.log('SDK Success! Response:', res.response.text());
  } catch (err) {
    console.error('SDK Error:', err.message);
  }
}

testSdk();
