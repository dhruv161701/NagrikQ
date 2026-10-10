require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testPdfModels() {
  const apiKey = process.env.Gemini_Rag_Model_API || process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

  // A tiny valid PDF
  const pdfBytes = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 712 Td
(Hello PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
310
%%EOF`;
  const base64Pdf = Buffer.from(pdfBytes).toString('base64');

  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent([
        'Read this document and say what it contains:',
        { inlineData: { data: base64Pdf, mimeType: 'application/pdf' } }
      ]);
      console.log(`Model ${m}: SUCCESS! Output: ${res.response.text().trim()}`);
      break;
    } catch (e) {
      console.log(`Model ${m}: FAILED - ${e.message.substring(0, 120)}`);
    }
  }
}

testPdfModels();
