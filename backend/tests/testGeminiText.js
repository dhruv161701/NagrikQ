require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiExtraction() {
  const apiKey = process.env.Gemini_Rag_Model_API || process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

  const sampleOcrText = `
GOVERNMENT OF GUJARAT
REVENUE DEPARTMENT
MAMLATDAR OFFICE, RAJKOT CITY(EAST)
INCOME CERTIFICATE
Certificate No: 9564/2024
Date of Issue: 19/04/2024
This is to certify that Shri Nikunjkumar Bhupatbhai Javiya, residing at Rajkot, Gujarat.
Annual Family Income: Rs. 1,20,000/- (Rupees One Lakh Twenty Thousand Only).
This certificate is valid for 3 years from the date of issue as per Gujarat Government Revenue Department Resolution.
Mamlatdar, Rajkot City(East)
  `;

  const prompt = `You are an expert official Indian Government Document Inspector for NagrikQ.
Analyze this extracted document text carefully.
Expected category: "Income Certificate".

CRITICAL INSTRUCTIONS:
- Extract the actual issue date (labeled as Date of Issue, Issue Date, Issued on, etc.). DO NOT confuse with date of birth or application date. Format as YYYY-MM-DD.
- Extract the explicit expiry date if stated or applicable under authority policy (e.g. for Gujarat Income Certificate, 3 years from issue date). Format as YYYY-MM-DD or 'LIFETIME'. If not available, set null.
- Extract holder name, certificate/document number, issuing authority, and validity policy.
- NEVER invent missing dates. If a date cannot be identified reliably, set it to null.

Return ONLY a valid JSON object matching this structure (no markdown fences, no extra text):
{
  "documentType": "Income Certificate",
  "isCategoryMatched": true,
  "issueDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or 'LIFETIME' or null",
  "holderName": "Full name or null",
  "documentNumber": "Certificate number or null",
  "issuingAuthority": "Office or Authority name or null",
  "validityPolicy": "Description of validity policy or null",
  "confidenceScore": 0.95,
  "summary": "Short 1-line summary"
}`;

  try {
    const res = await model.generateContent([prompt, sampleOcrText]);
    console.log('Gemini Extraction Result:');
    console.log(res.response.text());
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testGeminiExtraction();
