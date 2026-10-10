import {
  extractDocumentMetadataWithGemini,
  validateFileSignature,
  extractTextFromPdfBuffer,
  checkIsExpired,
  verifyAndProcessDocument,
  calculateDocumentValidity,
} from '../src/services/documentVerificationService';

async function runVaultTests() {
  console.log('===========================================================');
  console.log('🧪 NAGRIKQ DOCUMENT VAULT OCR & VERIFICATION TEST SUITE');
  console.log('===========================================================\n');

  let passed = 0;
  let total = 0;

  function assertTest(condition: boolean, name: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (detail) console.log(`   ↳ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (detail) console.error(`   ↳ ${detail}`);
      process.exitCode = 1;
    }
  }

  // 1. File Signature Validation
  console.log('--- 1. File Signatures & Size Bounds ---');
  const validPdfBuf = Buffer.from('%PDF-1.4 sample content');
  const pdfSig = validateFileSignature(validPdfBuf, 'sample.pdf');
  assertTest(pdfSig.isValid && pdfSig.detectedMime === 'application/pdf', 'Valid PDF Signature Recognized');

  const validPngBuf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
  const pngSig = validateFileSignature(validPngBuf, 'photo.png');
  assertTest(pngSig.isValid && pngSig.detectedMime === 'image/png', 'Valid PNG Signature Recognized');

  const validJpgBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  const jpgSig = validateFileSignature(validJpgBuf, 'card.jpg');
  assertTest(jpgSig.isValid && jpgSig.detectedMime === 'image/jpeg', 'Valid JPEG Signature Recognized');

  const corruptedBuf = Buffer.from('corrupted random header text');
  const corruptSig = validateFileSignature(corruptedBuf, 'corrupt.pdf');
  assertTest(!corruptSig.isValid, 'Corrupted / Invalid Signature Rejected');

  const emptyBuf = Buffer.alloc(0);
  const emptySig = validateFileSignature(emptyBuf, 'empty.pdf');
  assertTest(!emptySig.isValid, 'Empty File (0 bytes) Rejected');

  // 2. PDF Stream Text Extraction
  console.log('\n--- 2. PDF Native Stream Text Extraction ---');
  const zlib = require('zlib');
  const textStream = 'BT /F1 12 Tf (Government of Gujarat) Tj ( Revenue Department) Tj ( Income Certificate) Tj ET';
  const deflated = zlib.deflateSync(Buffer.from(textStream, 'utf8'));
  const mockPdf = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Length ${deflated.length} /Filter /FlateDecode >>\nstream\n` + deflated.toString('binary') + '\nendstream\nendobj\n%%EOF', 'binary');
  const extractedPdfText = extractTextFromPdfBuffer(mockPdf);
  assertTest(
    extractedPdfText.includes('Income Certificate') && extractedPdfText.includes('Government of Gujarat'),
    'PDF Flate Stream Successfully Decompressed & Extracted',
    `Extracted: "${extractedPdfText}"`
  );

  // 3. Category Validation & Expiry Rules
  console.log('\n--- 3. Category Classifications & Expiry Calculations ---');
  // Aadhaar
  const aadhaarPayload = Buffer.from('UNIQUE IDENTIFICATION AUTHORITY OF INDIA GOVERNMENT OF INDIA AADHAAR DOB: 16/01/2007 9876 5432 1098').toString('base64');
  const aadhaarRes = await extractDocumentMetadataWithGemini(aadhaarPayload, 'Aadhaar Card', 'aadhaar.pdf');
  assertTest(aadhaarRes.isCategoryMatched, 'Aadhaar Card Matched', `Type: ${aadhaarRes.documentType}`);
  assertTest(aadhaarRes.issueDate === null, 'Aadhaar DOB NOT confused with Issue Date', `Issue Date: ${aadhaarRes.issueDate}`);
  assertTest(aadhaarRes.expiryDate === 'LIFETIME', 'Aadhaar Lifetime Rule Enforced', `Expiry: ${aadhaarRes.expiryDate}`);

  // Income Certificate with explicitly stated issue date
  const incomeWithDatePayload = Buffer.from('GOVERNMENT OF GUJARAT REVENUE DEPARTMENT MAMLATDAR OFFICE INCOME CERTIFICATE Date of Issue: 19/04/2024 Cert No: 9564/2024').toString('base64');
  const incomeWithDateRes = await extractDocumentMetadataWithGemini(incomeWithDatePayload, 'Income Certificate', 'income.pdf');
  assertTest(incomeWithDateRes.isCategoryMatched, 'Income Certificate Matched', `Type: ${incomeWithDateRes.documentType}`);
  assertTest(incomeWithDateRes.issueDate === '2024-04-19', 'Income Certificate Issue Date Extracted', `Issue: ${incomeWithDateRes.issueDate}`);
  assertTest(incomeWithDateRes.expiryDate === '2027-04-19', 'Income Certificate 3-Year Expiry from Issue Date Calculated', `Expiry: ${incomeWithDateRes.expiryDate}`);

  // Income Certificate without issue date (must NOT invent today's date!)
  const incomeNoDatePayload = Buffer.from('GOVERNMENT OF GUJARAT REVENUE DEPARTMENT MAMLATDAR OFFICE INCOME CERTIFICATE').toString('base64');
  const incomeNoDateRes = await extractDocumentMetadataWithGemini(incomeNoDatePayload, 'Income Certificate', 'income_nodate.pdf');
  assertTest(incomeNoDateRes.isCategoryMatched, 'Income Certificate without date matched', `Type: ${incomeNoDateRes.documentType}`);
  assertTest(incomeNoDateRes.issueDate === null, 'Missing Issue Date set to null (Never invented today)', `Issue: ${incomeNoDateRes.issueDate}`);
  assertTest(incomeNoDateRes.expiryDate === null, 'Missing Expiry Date set to null (Needs review)', `Expiry: ${incomeNoDateRes.expiryDate}`);

  // Caste Certificate (Lifetime)
  const castePayload = Buffer.from('SOCIAL JUSTICE AND EMPOWERMENT DEPARTMENT CASTE CERTIFICATE SEBC').toString('base64');
  const casteRes = await extractDocumentMetadataWithGemini(castePayload, 'Caste Certificate', 'caste.pdf');
  assertTest(casteRes.isCategoryMatched, 'Caste Certificate Matched', `Type: ${casteRes.documentType}`);
  assertTest(casteRes.expiryDate === 'LIFETIME', 'Caste Certificate Lifetime Rule Enforced', `Expiry: ${casteRes.expiryDate}`);

  // Domicile / Residence Certificate (Lifetime)
  const domicilePayload = Buffer.from('OFFICE OF THE COLLECTOR DOMICILE CERTIFICATE RESIDENCE CERTIFICATE GUJARAT').toString('base64');
  const domicileRes = await extractDocumentMetadataWithGemini(domicilePayload, 'Residence Certificate', 'domicile.pdf');
  assertTest(domicileRes.isCategoryMatched, 'Residence / Domicile Certificate Matched', `Type: ${domicileRes.documentType}`);
  assertTest(domicileRes.expiryDate === 'LIFETIME', 'Residence Certificate Lifetime Rule Enforced', `Expiry: ${domicileRes.expiryDate}`);

  // Category Mismatch Rejection
  const electricityPayload = Buffer.from('UTTAR GUJARAT VIJ COMPANY LIMITED UGVCL ELECTRICITY BILL Consumer No 987654').toString('base64');
  const mismatchRes = await extractDocumentMetadataWithGemini(electricityPayload, 'Aadhaar Card', 'bill.jpg');
  assertTest(!mismatchRes.isCategoryMatched, 'Category Mismatch Correctly Flagged', `Expected Aadhaar, detected: ${mismatchRes.documentType}`);

  // Expiry check
  assertTest(checkIsExpired('2020-01-01') === true, 'Past Date Correctly Marked Expired (2020-01-01)');
  assertTest(checkIsExpired('2029-12-31') === false, 'Future Date Correctly Marked Active (2029-12-31)');
  assertTest(checkIsExpired('LIFETIME') === false, 'Lifetime Date Correctly Marked Non-Expired');

  // Validity Calculation Tests
  console.log('\n--- 4. Backend Dynamic Validity Calculations ---');
  const aadhaarVal = calculateDocumentValidity('Aadhaar Card', null, 'LIFETIME');
  assertTest(aadhaarVal.remainingValidity === 'Lifetime Validity' && !aadhaarVal.isExpired, 'Aadhaar Validity: Lifetime Non-Expired');

  const incomeVal = calculateDocumentValidity('Income Certificate', '2024-04-19', '2027-04-19');
  assertTest(!incomeVal.isExpired && incomeVal.remainingValidity.includes('month'), 'Income Certificate Validity: Accurate Remaining Time (NOT guessed 3 years from today)', `Remaining: ${incomeVal.remainingValidity}`);

  const expiredVal = calculateDocumentValidity('Income Certificate', '2020-01-01', '2023-01-01');
  assertTest(expiredVal.isExpired && expiredVal.remainingValidity === 'Expired', 'Expired Certificate Validity: Correctly marked Expired');

  const missingVal = calculateDocumentValidity('Income Certificate', null, null);
  assertTest(missingVal.remainingValidity === 'Needs review' && !missingVal.isExpired, 'Missing Dates: Correctly marked Needs review');

  // 5. End-to-End Pipeline Guard: Invalid Signature Rejection
  console.log('\n--- 5. Pipeline Rejections & Cloudinary Guard ---');
  const fakePayload = 'data:application/pdf;base64,' + Buffer.from('invalid file header without pdf signature').toString('base64');
  const fakeRes = await verifyAndProcessDocument(fakePayload, 'Aadhaar Card', 'test-user', 'test.pdf');
  assertTest(
    fakeRes.isVerified === false && fakeRes.verificationStatus === 'INVALID_FILE',
    'Invalid File Signature Blocked from Cloudinary Upload',
    `Status: ${fakeRes.verificationStatus}, Code: ${fakeRes.errorCode}`
  );

  console.log('\n===========================================================');
  console.log(`🏁 VAULT TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('===========================================================');
}

runVaultTests().catch((err) => {
  console.error('Fatal Vault Test Error:', err);
  process.exit(1);
});
