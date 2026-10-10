require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testPdf() {
  const apiKey = process.env.Gemini_Rag_Model_API || process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

  // Test with dummy PDF
  const dummyPdf = Buffer.from('%PDF-1.4 sample content').toString('base64');
  try {
    const res = await model.generateContent([
      'What type of document is this?',
      {
        inlineData: {
          data: dummyPdf,
          mimeType: 'application/pdf',
        },
      },
    ]);
    console.log('PDF inlineData Success:', res.response.text());
  } catch (err) {
    console.error('PDF inlineData Error:', err.message);
  }
}

testPdf();
