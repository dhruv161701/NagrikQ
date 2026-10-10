require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAadhaarExtraction() {
  const apiKey = process.env.Gemini_Rag_Model_API || process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

  const sampleOcrText = `
GOVERNMENT OF INDIA
UNIQUE IDENTIFICATION AUTHORITY OF INDIA
Enrollment No: 1234/56789/01234
To,
Javiya Dhruvkumar Nikunjbhai
DOB: 16/01/2007
Male
Your Aadhaar No. :
XXXX XXXX 3984
My Aadhaar, My Identity
  `;

  const prompt = `You are an expert official Indian Government Document Inspector for NagrikQ.
Analyze this extracted document text carefully.
Expected category: "Aadhaar Card".

CRITICAL INSTRUCTIONS:
- Aadhaar Card issue date: Extract ONLY if an explicit card issue date is labeled (e.g. Issue Date: DD/MM/YYYY). DO NOT use Date of Birth (DOB) as issue date! If no issue date is labeled on the card, set "issueDate": null.
- Aadhaar Card expiry date: Aadhaar cards carry permanent lifetime validity in India. Set "expiryDate": "LIFETIME", "validityPolicy": "Permanent / Lifetime Validity (UIDAI)".
- Extract holder name, Aadhaar number (mask all but last 4 digits as XXXX-XXXX-####), issuing authority (e.g. Government of India / UIDAI).
- NEVER invent missing dates.

Return ONLY a valid JSON object matching this structure (no markdown fences, no extra text):
{
  "documentType": "Aadhaar Card",
  "isCategoryMatched": true,
  "issueDate": null,
  "expiryDate": "LIFETIME",
  "holderName": "Full name or null",
  "documentNumber": "XXXX-XXXX-####",
  "issuingAuthority": "Government of India (UIDAI)",
  "validityPolicy": "Permanent / Lifetime Validity (UIDAI)",
  "confidenceScore": 0.98,
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

testAadhaarExtraction();
