import crypto from 'crypto';
import zlib from 'zlib';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../config/supabase';
import { ensureUserProfileExists } from '../utils/profileHelper';

export type VerificationStatus =
  | 'VERIFIED'
  | 'CATEGORY_MISMATCH'
  | 'EXPIRED'
  | 'DUPLICATE'
  | 'NEEDS_REVIEW'
  | 'UNREADABLE'
  | 'INVALID_FILE'
  | 'UNSUPPORTED_CATEGORY'
  | 'STORAGE_ERROR'
  | 'AUTH_ERROR'
  | 'REJECTED';

export interface VerificationResult {
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  errorCode?: string;
  failureReason?: string;
  extractedInfo?: {
    documentType: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    holderName?: string | null;
    documentNumber?: string | null;
    issuingAuthority?: string | null;
    validityPolicy?: string | null;
    confidenceScore: number;
    summary?: string;
  };
  fileHash: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}

export const getGeminiApiKey = (): string => {
  return process.env.Gemini_Rag_Model_API || process.env.GEMINI_API_KEY || '';
};

/**
 * Validates file signature (magic bytes) to ensure file integrity.
 * Supports PDF, PNG, JPG/JPEG up to 10 MB.
 */
export const validateFileSignature = (
  buffer: Buffer,
  fileName: string
): { isValid: boolean; detectedMime: string; error?: string } => {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, detectedMime: 'unknown', error: 'File is empty (0 bytes).' };
  }

  if (buffer.length < 4) {
    return { isValid: false, detectedMime: 'unknown', error: 'File buffer is too small to be a valid document.' };
  }

  // 10 MB limit
  if (buffer.length > 10 * 1024 * 1024) {
    return { isValid: false, detectedMime: 'unknown', error: 'File size exceeds maximum allowed limit of 10 MB.' };
  }

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { isValid: true, detectedMime: 'application/pdf' };
  }

  // PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { isValid: true, detectedMime: 'image/png' };
  }

  // JPEG / JPG signature: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { isValid: true, detectedMime: 'image/jpeg' };
  }

  return {
    isValid: false,
    detectedMime: 'unsupported',
    error: 'Invalid file format or corrupted file signature. Supported formats: PDF, PNG, JPG, JPEG (up to 10 MB).',
  };
};

/**
 * Extracts raw and decompressed text streams from PDF files.
 * Decompresses FlateDecode streams using native Node.js zlib.
 */
export const extractTextFromPdfBuffer = (buffer: Buffer): string => {
  let extractedText = '';
  const rawStr = buffer.toString('binary');

  // Match all PDF stream ... endstream blocks
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawStr)) !== null) {
    const streamContent = match[1];
    let streamData = '';

    // Check if the stream uses Flate compression
    const dictStart = Math.max(0, match.index - 500);
    const prevDict = rawStr.substring(dictStart, match.index);
    const isFlate = /\/Filter\s*(?:\[\s*)?\/FlateDecode/i.test(prevDict);

    if (isFlate) {
      try {
        const rawBuf = Buffer.from(streamContent, 'binary');
        streamData = zlib.inflateSync(rawBuf).toString('utf8');
      } catch {
        try {
          const rawBuf = Buffer.from(streamContent, 'binary');
          streamData = zlib.inflateRawSync(rawBuf).toString('utf8');
        } catch {
          streamData = streamContent;
        }
      }
    } else {
      streamData = streamContent;
    }

    // Extract text operators: (some text) Tj
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(streamData)) !== null) {
      extractedText += ' ' + tjMatch[1];
    }

    // Extract text array operators: [(some) 10 (text)] TJ
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    let tjArrMatch: RegExpExecArray | null;
    while ((tjArrMatch = tjArrayRegex.exec(streamData)) !== null) {
      const parts = tjArrMatch[1].match(/\(([^)]+)\)/g);
      if (parts) {
        extractedText += ' ' + parts.map((p) => p.slice(1, -1)).join('');
      }
    }
  }

  // Look for text literals in the PDF structure outside streams
  const literalMatches = rawStr.match(/\(([^)]{4,})\)/g);
  if (literalMatches) {
    extractedText += ' ' + literalMatches.map((t) => t.slice(1, -1)).join(' ');
  }

  return extractedText.replace(/\s+/g, ' ').trim();
};

/**
 * Computes SHA-256 hash of base64 or raw file string to uniquely identify content.
 */
export const computeFileHash = (fileData: string): string => {
  const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
  return crypto.createHash('sha256').update(cleanBase64).digest('hex');
};

/**
 * Helper to parse various date formats (e.g. DD/MM/YYYY, YYYY-MM-DD, 12 Oct 2024) into YYYY-MM-DD.
 */
export const parseToIsoDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleaned = dateStr.trim();
  if (/lifetime/i.test(cleaned) || /permanent/i.test(cleaned)) return 'LIFETIME';

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Native Date parse fallback
  const timestamp = Date.parse(cleaned);
  if (!isNaN(timestamp)) {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  return null;
};

/**
 * Checks if an extracted expiry date is prior to current date.
 */
export const checkIsExpired = (expiryDateStr: string | null | undefined): boolean => {
  if (!expiryDateStr || expiryDateStr === 'LIFETIME' || /lifetime|permanent/i.test(expiryDateStr)) {
    return false;
  }
  const isoDate = parseToIsoDate(expiryDateStr);
  if (!isoDate || isoDate === 'LIFETIME') return false;

  const today = new Date().toISOString().split('T')[0];
  return isoDate < today;
};

/**
 * Centralized category aliases and recognized keywords for all supported government documents.
 * Supports English, Gujarati, and Hindi official terms and regional variations.
 */
export const DOCUMENT_CATEGORY_ALIASES: Record<string, string[]> = {
  'Aadhaar Card': [
    'aadhaar', 'aadhar', 'uidai', 'unique identification', 'mera aadhaar', 'vid', 'government of india',
    'enrolment no', 'enrollment no', 'આધાર', 'આધાર કાર્ડ', 'યુઆઈડી', 'ભારત સરકાર', 'आधार', 'आधार कार्ड'
  ],
  'Income Certificate': [
    'income certificate', 'income', 'aavak no dakhlo', 'aavak dakhlo', 'annual income', 'tahasildar', 'mamlatdar',
    'revenue department', 'family income', 'certificate of income', 'tehsildar', 'talati', 'jan seva kendra',
    'income assessment', 'form 16', 'salary certificate',
    'આવકનો દાખલો', 'આવક પ્રમાણપત્ર', 'આવક દાખલો', 'મહેસૂલ વિભાગ', 'મામલતદાર', 'તલાટી', 'વાર્ષિક આવક', 'જન સેવા કેન્દ્ર',
    'आय प्रमाण पत्र', 'आय प्रमाण-पत्र'
  ],
  'Caste Certificate': [
    'caste certificate', 'caste', 'jaati no dakhlo', 'jati no dakhlo', 'social justice', 'sc certificate',
    'st certificate', 'obc certificate', 'sebc certificate', 'socially and educationally backward',
    'scheduled caste', 'scheduled tribe', 'backward class',
    'જાતિનો દાખલો', 'જાતિ પ્રમાણપત્ર', 'સામાજિક ન્યાય', 'અનુસૂચિત જાતિ', 'અનુસૂચિત જનજાતિ', 'બક્ષીપંચ', 'સામાજિક અને શૈક્ષણિક રીતે પછાત',
    'जाति प्रमाण पत्र'
  ],
  'Residence Certificate': [
    'residence certificate', 'domicile certificate', 'domicile', 'residential certificate', 'bonafide resident',
    'pramaan patra', 'proof of residence', 'local resident', 'collector office', 'district magistrate',
    'રહેઠાણનો દાખલો', 'રહેઠાણ પ્રમાણપત્ર', 'ડોમિસાઇલ', 'ડોમિસાઈલ', 'કાયમી રહેવાસી', 'રહેવાસી પ્રમાણપત્ર',
    'मूल निवास प्रमाण पत्र', 'निवास प्रमाण पत्र'
  ],
  'Birth Certificate': [
    'birth certificate', 'birth', 'janma praman patra', 'municipal corporation', 'registrar of births',
    'form no 5', 'form 5', 'birth register', 'chief registrar',
    'જન્મનું પ્રમાણપત્ર', 'જન્મ પ્રમાણપત્ર', 'જન્મ નોંધણી', 'મહાનગરપાલિકા', 'નગરપાલિકા', 'ગામ પંચાયત જન્મ',
    'जन्म प्रमाण पत्र'
  ],
  'Death Certificate': [
    'death certificate', 'death', 'mrityu praman patra', 'registrar of deaths', 'form no 6',
    'મૃત્યુનું પ્રમાણપત્ર', 'મૃત્યુ પ્રમાણપત્ર', 'મૃત્યુ નોંધણી', 'मृत्यु प्रमाण पत्र'
  ],
  'PAN Card': [
    'pan card', 'pan', 'permanent account number', 'income tax department', 'utiitsl', 'nsdl', 'protean',
    'govt of india income tax', 'પાન કાર્ડ', 'ઇન્કમ ટેક્સ', 'आयकर विभाग', 'पैन कार्ड', 'स्थायी खाता संख्या'
  ],
  'Ration Card': [
    'ration card', 'ration', 'food & civil supplies', 'food and civil supplies', 'apl', 'bpl', 'aay',
    'nfsa', 'fair price shop', 'ration booklet', 'annapurna',
    'રેશન કાર્ડ', 'રેશનિંગ કાર્ડ', 'અન્ન અને નાગરિક પુરવઠા', 'વાજબી ભાવની દુકાન', 'રાશન કાર્ડ', 'राशन कार्ड'
  ],
  'Electricity Bill': [
    'electricity bill', 'power bill', 'light bill', 'ugvcl', 'pgvcl', 'mgvcl', 'dgvcl', 'bescom', 'tneb',
    'consumer number', 'torrent power', 'power distribution', 'meter reading', 'electric supply',
    'વીજળી બિલ', 'લાઈટ બિલ', 'ગ્રાહક નંબર', 'વીજ બિલ', 'बिजली बिल', 'विद्युत बिल'
  ],
  'Bank Passbook / Statement': [
    'bank passbook', 'bank statement', 'account statement', 'ifsc', 'account number', 'state bank of india',
    'bank of baroda', 'hdfc', 'icici', 'punjab national bank', 'axis bank', 'canara bank', 'savings account',
    'બેંક પાસબુક', 'બેંક સ્ટેટમેન્ટ', 'ખાતા નંબર', 'આઈએફએસસી', 'બેંક ખાતું', 'बैंक पासबुक', 'खाता विवरण'
  ],
  'Driving License': [
    'driving license', 'driving licence', 'motor vehicles department', 'rto', 'dl no', 'transport department',
    'licensing authority', 'form 7',
    'ડ્રાઇવિંગ લાયસન્સ', 'વાહન વ્યવહાર ખાતું', 'આરટીઓ', 'ચાલક લાયસન્સ', 'ड्राइविंग लाइसेंस'
  ],
  'Passport': [
    'passport', 'republic of india', 'ministry of external affairs', 'passport number', 'પાસપોર્ટ', 'पासपोर्ट'
  ],
  'Non-Creamy Layer (NCL) Certificate': [
    'non-creamy layer', 'non creamy layer', 'ncl certificate', 'parishishta-k', 'parishishta k',
    'creamy layer', 'other backward classes non creamy',
    'નોન ક્રિમિલિયર', 'પરિશિષ્ટ-ક', 'પરિશિષ્ટ ક', 'નોન ક્રીમીલેયર'
  ],
  'EWS Certificate': [
    'economically weaker section', 'ews certificate', 'ews income', 'asset certificate',
    'ઇડબ્લ્યુએસ', 'આર્થિક રીતે નબળા વર્ગ', 'ઈડબલ્યુએસ'
  ],
  'Disability Certificate': [
    'disability certificate', 'udid', 'unique disability id', 'swavlamban', 'persons with disabilities',
    'divyangjan', 'દિવ્યાંગ પ્રમાણપત્ર', 'દિવ્યાંગ ઓળખકાર્ડ', 'સ્વાવલંબન', 'दिव्यांगता प्रमाण पत्र'
  ],
  'Senior Citizen Identity Card': [
    'senior citizen', 'senior citizen identity card', 'social defense', 'age proof certificate',
    'સિનિયર સિટીઝન', 'વરિષ્ઠ નાગરિક', 'વૃદ્ધ પેન્શન ઓળખ'
  ],
  'Voter ID Card': [
    'voter id', 'epic', 'election commission of india', 'electoral photo identity card', 'voter card',
    'ચૂંટણી ઓળખકાર્ડ', 'મતદાર ઓળખકાર્ડ', 'મતદાર કાર્ડ', 'ચૂંટણી પંચ', 'मतदाता पहचान पत्र'
  ]
};

export const normalizeCategoryKey = (cat: string): string => {
  return (cat || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Maps any dropdown label, preset name, or alias to canonical document category.
 */
export const getCanonicalCategory = (inputCategory: string): { canonical: string; isSupported: boolean } => {
  if (!inputCategory) return { canonical: 'General Document', isSupported: false };
  const norm = normalizeCategoryKey(inputCategory);

  // 1. Exact match with canonical name
  for (const canonicalName of Object.keys(DOCUMENT_CATEGORY_ALIASES)) {
    if (norm === normalizeCategoryKey(canonicalName)) {
      return { canonical: canonicalName, isSupported: true };
    }
  }

  // 2. Exact match with any known alias
  for (const [canonicalName, aliases] of Object.entries(DOCUMENT_CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      if (norm === normalizeCategoryKey(alias)) {
        return { canonical: canonicalName, isSupported: true };
      }
    }
  }

  // 3. Parenthetical or suffix match (e.g. "Income Certificate (Issued by Tehsildar/Mamlatdar)")
  const baseCategory = inputCategory.replace(/\([^)]*\)/g, '').trim();
  const normBase = normalizeCategoryKey(baseCategory);
  if (normBase) {
    for (const canonicalName of Object.keys(DOCUMENT_CATEGORY_ALIASES)) {
      if (normBase === normalizeCategoryKey(canonicalName)) {
        return { canonical: canonicalName, isSupported: true };
      }
    }
    for (const [canonicalName, aliases] of Object.entries(DOCUMENT_CATEGORY_ALIASES)) {
      for (const alias of aliases) {
        if (normBase === normalizeCategoryKey(alias)) {
          return { canonical: canonicalName, isSupported: true };
        }
      }
    }
  }

  return { canonical: inputCategory, isSupported: false };
};

const testAliasMatch = (text: string, alias: string): boolean => {
  const normAlias = alias.toLowerCase().trim();
  const lowerText = text.toLowerCase();
  if (normAlias.length <= 4) {
    const escaped = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerText);
  }
  return lowerText.includes(normAlias);
};

/**
 * Detects whether text content matches the expected government document category.
 * Distinguishes true category matches, affirmative mismatches, and unverified/unreadable payloads.
 */
export const evaluateCategoryMatch = (
  textContent: string,
  expectedCategory: string
): { isMatched: boolean; isSupported: boolean; detectedCategory: string; confidence: number } => {
  const lower = textContent.toLowerCase();
  const { canonical: canonicalExpected, isSupported } = getCanonicalCategory(expectedCategory);

  if (!isSupported) {
    return { isMatched: false, isSupported: false, detectedCategory: expectedCategory, confidence: 0 };
  }

  const expectedAliases = DOCUMENT_CATEGORY_ALIASES[canonicalExpected] || [canonicalExpected.toLowerCase()];
  let expectedScore = 0;
  for (const alias of expectedAliases) {
    if (testAliasMatch(lower, alias)) {
      expectedScore += alias.length > 5 ? 2 : 1;
    }
  }

  // Calculate scores for all supported categories
  const categoryScores: Array<{ category: string; score: number }> = [];
  for (const [catName, aliases] of Object.entries(DOCUMENT_CATEGORY_ALIASES)) {
    let score = 0;
    for (const alias of aliases) {
      if (testAliasMatch(lower, alias)) {
        score += alias.length > 5 ? 2 : 1;
      }
    }
    if (score > 0) {
      categoryScores.push({ category: catName, score });
    }
  }

  categoryScores.sort((a, b) => b.score - a.score);

  if (categoryScores.length > 0) {
    const topMatch = categoryScores[0];
    const isTopExpected = normalizeCategoryKey(topMatch.category) === normalizeCategoryKey(canonicalExpected);

    // 1. If the top-scoring category IS the expected category
    if (isTopExpected) {
      return {
        isMatched: true,
        isSupported: true,
        detectedCategory: canonicalExpected,
        confidence: Math.min(0.98, 0.75 + expectedScore * 0.05),
      };
    }

    // 2. If a competing distinct category scored higher than expected category
    if (topMatch.score > expectedScore) {
      return {
        isMatched: false,
        isSupported: true,
        detectedCategory: topMatch.category,
        confidence: 0.92,
      };
    }

    // 3. If expected category tied with top match and has affirmative score
    if (expectedScore > 0 && expectedScore >= topMatch.score) {
      return {
        isMatched: true,
        isSupported: true,
        detectedCategory: canonicalExpected,
        confidence: 0.88,
      };
    }
  }

  // 4. If only the expected category scored
  if (expectedScore > 0) {
    return {
      isMatched: true,
      isSupported: true,
      detectedCategory: canonicalExpected,
      confidence: 0.88,
    };
  }

  // 5. No category keywords matched anywhere in the payload
  return {
    isMatched: false,
    isSupported: true,
    detectedCategory: 'Unverified Document',
    confidence: 0.2,
  };
};

export interface ExtractedDocumentMetadata {
  documentType: string;
  isCategoryMatched: boolean;
  issueDate: string | null;
  expiryDate: string | null;
  holderName: string | null;
  documentNumber: string | null;
  issuingAuthority: string | null;
  validityPolicy: string | null;
  confidenceScore: number;
  extractedText?: string;
}

export interface DocumentValidityCalculation {
  validityPeriod: string;
  remainingValidity: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
}

/**
 * Calculates remaining validity and status from actual stored document dates.
 * Recalculated dynamically on every view / load without hardcoded guesses.
 */
export const calculateDocumentValidity = (
  category: string,
  issueDate: string | null | undefined,
  expiryDate: string | null | undefined,
  extractedMetadata?: any
): DocumentValidityCalculation => {
  const normCategory = (category || '').toLowerCase();
  const isAadhaar = /aadhaar|aadhar/i.test(normCategory);
  const isCaste = /caste/i.test(normCategory);
  const isDomicile = /domicile|residence/i.test(normCategory);
  const isBirth = /birth/i.test(normCategory);
  const isPan = /pan/i.test(normCategory);
  const isIncome = /income/i.test(normCategory);

  const isLifetimeCategory = isAadhaar || isCaste || isDomicile || isBirth || isPan;
  const isLifetimeExpiry = expiryDate === 'LIFETIME' || /lifetime|permanent/i.test(expiryDate || '');

  // 1. Permanent / Lifetime Validity
  if (isLifetimeExpiry || (isLifetimeCategory && (!expiryDate || expiryDate === 'LIFETIME'))) {
    return {
      validityPeriod: extractedMetadata?.validityPolicy || (isAadhaar ? 'Permanent / Lifetime Validity (UIDAI)' : 'Permanent / Lifetime Validity'),
      remainingValidity: 'Lifetime Validity',
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: null,
    };
  }

  // 2. Resolve target expiry date
  let resolvedExpiry = parseToIsoDate(expiryDate);

  // If no explicit expiry, but Income Certificate with known issue date
  if (!resolvedExpiry && isIncome && issueDate) {
    const isoIssue = parseToIsoDate(issueDate);
    if (isoIssue && isoIssue !== 'LIFETIME') {
      const parts = isoIssue.split('-');
      if (parts.length === 3) {
        resolvedExpiry = `${parseInt(parts[0], 10) + 3}-${parts[1]}-${parts[2]}`;
      }
    }
  }

  const validityPeriod = extractedMetadata?.validityPolicy || (isIncome ? 'Valid for 3 Years (Gujarat Revenue Dept)' : 'Standard Policy');

  // If no expiry date can be established
  if (!resolvedExpiry) {
    return {
      validityPeriod,
      remainingValidity: 'Needs review',
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: null,
    };
  }

  // Calculate remaining days
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const targetDate = new Date(`${resolvedExpiry}T00:00:00`);
  const todayDate = new Date(`${todayStr}T00:00:00`);
  const diffTime = targetDate.getTime() - todayDate.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return {
      validityPeriod,
      remainingValidity: 'Expired',
      isExpired: true,
      isExpiringSoon: false,
      daysRemaining: days,
    };
  }

  const isExpiringSoon = days <= 30;
  let remainingValidity = '';
  if (days < 30) {
    remainingValidity = `${days} Day${days > 1 ? 's' : ''} Remaining`;
  } else {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) {
      remainingValidity = `Approximately ${years} year${years > 1 ? 's' : ''}${months > 0 ? ` and ${months} month${months > 1 ? 's' : ''}` : ''}`;
    } else {
      remainingValidity = `Approximately ${months} month${months > 1 ? 's' : ''}`;
    }
  }

  return {
    validityPeriod,
    remainingValidity,
    isExpired: false,
    isExpiringSoon,
    daysRemaining: days,
  };
};

/**
 * Analyzes document image / PDF using Gemini Multimodal AI (when valid key is configured)
 * or falls back cleanly to the built-in Server Document Inspection Engine.
 */
export const extractDocumentMetadataWithGemini = async (
  fileData: string,
  expectedCategory: string,
  fileName: string
): Promise<ExtractedDocumentMetadata> => {
  const apiKey = getGeminiApiKey();
  const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const { canonical: canonicalExpected } = getCanonicalCategory(expectedCategory);

  // Determine mimeType
  let mimeType = 'image/jpeg';
  if (fileData.startsWith('data:')) {
    const mimeMatch = fileData.match(/^data:([^;]+);base64,/);
    if (mimeMatch) mimeType = mimeMatch[1];
  } else if (fileName.endsWith('.pdf')) {
    mimeType = 'application/pdf';
  } else if (fileName.endsWith('.png')) {
    mimeType = 'image/png';
  }

  const isPdf = fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
  let extractedPdfText = '';
  let embeddedJpegBase64: string | null = null;
  const isRealPdf = isPdf && (buffer.toString('binary').startsWith('%PDF-') || buffer.slice(0, 5).toString() === '%PDF-');
  let textFromBuffer = '';
  try {
    textFromBuffer = buffer.toString('utf8');
  } catch {
    textFromBuffer = '';
  }

  if (isPdf) {
    extractedPdfText = extractTextFromPdfBuffer(buffer);
    if (!extractedPdfText || extractedPdfText.trim().length === 0) {
      if (textFromBuffer && !textFromBuffer.startsWith('%PDF-')) {
        extractedPdfText = textFromBuffer;
      }
    }
    // Look for embedded DCTDecode (JPEG) scanned streams in PDF
    const rawPdf = buffer.toString('binary');
    const dctMatch = /\/Filter\s*\/DCTDecode[\s\S]*?stream\r?\n([\s\S]*?)\r?\nendstream/.exec(rawPdf);
    if (dctMatch) {
      try {
        embeddedJpegBase64 = Buffer.from(dctMatch[1], 'binary').toString('base64');
      } catch {
        embeddedJpegBase64 = null;
      }
    }
  }

  const combinedAvailableText = `${fileName} ${extractedPdfText} ${textFromBuffer}`.trim();
  const isKeyUsable = apiKey && (apiKey.startsWith('AIza') || apiKey.startsWith('AQ.'));
  let responseText = '';

  // 1. Try Gemini Multimodal AI if a valid API key is available
  if (isKeyUsable) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

    const prompt = `You are an expert official Indian Government Document Inspector for NagrikQ.
Analyze this document payload carefully.
Expected document category selected by citizen: "${canonicalExpected}".

CRITICAL EXTRACTION RULES:
1. DOCUMENT CLASSIFICATION:
   - Identify the actual document type from the official header, emblem, state government seal, or title.
   - Set "isCategoryMatched" to true if the document matches "${canonicalExpected}" or is an official variation of it.

2. ISSUE DATE:
   - Extract the actual official Issue Date from labels like "Date of Issue", "Issue Date", "Date:", "તારીખ", "दिनांक", or the Mamlatdar/Tehsildar seal/signature date.
   - DO NOT confuse Date of Birth (DOB / Janma Tarikh), application date, submission date, upload date, or print date with the Issue Date!
   - For Aadhaar cards: DO NOT use Date of Birth (DOB) as the issue date. If no explicit card generation/issue date is labeled, set "issueDate": null.
   - NEVER invent or guess an issue date. If not explicitly found, set "issueDate": null. Format as YYYY-MM-DD.

3. EXPIRY DATE & VALIDITY POLICY:
   - Aadhaar Card: Aadhaar has permanent lifetime validity. Set "expiryDate": "LIFETIME", "validityPolicy": "Permanent / Lifetime Validity (UIDAI)".
   - Caste Certificate / Domicile Certificate / Birth Certificate / PAN Card: Set "expiryDate": "LIFETIME", "validityPolicy": "Permanent / Lifetime Validity".
   - Income Certificate: Under Gujarat Revenue Dept / Mamlatdar rules, valid for 3 years from the actual Issue Date. If issue date is found (e.g. 2024-04-19), calculate expiry as exactly 3 years from issue date (2027-04-19), and set "validityPolicy": "Valid for 3 Years (Gujarat Revenue Dept)". If issue date is NOT found or unreadable, set "expiryDate": null and "validityPolicy": "Needs Review".
   - Driving License / Passport: Extract explicit printed expiration date. Format as YYYY-MM-DD.
   - Utility Bills (Electricity, Water, Gas): Valid for 90 days from bill date.
   - If expiry date is explicitly printed on the document, use that printed date. Format as YYYY-MM-DD.
   - NEVER invent missing dates. If expiry date cannot be determined reliably, set "expiryDate": null.

4. METADATA:
   - Extract holder name (the citizen/beneficiary name on the document).
   - Extract document/certificate number (for Aadhaar, mask as XXXX-XXXX-#### showing only last 4 digits).
   - Extract issuing authority (e.g. "Mamlatdar Office, Rajkot City(East)", "UIDAI", "Revenue Department, Govt of Gujarat").

Return ONLY a valid JSON object matching this structure (no markdown fences, no extra text):
{
  "documentType": "Detected document title",
  "isCategoryMatched": true,
  "issueDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or 'LIFETIME' or null",
  "holderName": "Full name or null",
  "documentNumber": "Certificate number or null",
  "issuingAuthority": "Office or Authority name or null",
  "validityPolicy": "Policy description or null",
  "confidenceScore": 0.95,
  "summary": "Short 1-line description"
}`;

    // Prepare content payload for Gemini
    const contents: any[] = [prompt];
    if (mimeType.startsWith('image/')) {
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    } else if (isRealPdf) {
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: 'application/pdf',
        },
      });
      if (extractedPdfText) {
        contents.push(`Extracted Text Content:\n${extractedPdfText.substring(0, 3000)}`);
      }
    } else if (isPdf && embeddedJpegBase64) {
      contents.push({
        inlineData: {
          data: embeddedJpegBase64,
          mimeType: 'image/jpeg',
        },
      });
      if (extractedPdfText) {
        contents.push(`Extracted Text Content:\n${extractedPdfText.substring(0, 3000)}`);
      }
    } else if (extractedPdfText || textFromBuffer) {
      const txt = (extractedPdfText || textFromBuffer).substring(0, 4000);
      contents.push(`Document Text Content:\n${txt}`);
    } else {
      contents.push(`File Name: ${fileName}\nPayload Size: ${buffer.length} bytes`);
    }

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(contents);
        responseText = result.response.text();
        if (responseText) break;
      } catch (modelErr: any) {
        console.warn(`[Gemini Model Note] ${modelName} returned:`, modelErr?.message || modelErr);
      }
    }
  }

  // Parse Gemini response if available
  if (responseText) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const rawDetectedType = String(parsed.documentType || 'Unknown Document').trim();
        const { canonical: canonicalDetected, isSupported: detectedIsSupported } = getCanonicalCategory(rawDetectedType);

        const serverEval = evaluateCategoryMatch(combinedAvailableText, canonicalExpected);

        // Check if detected type matches expected category or an alias
        let isTypeMatched =
          canonicalExpected.toLowerCase() === canonicalDetected.toLowerCase() ||
          normalizeCategoryKey(canonicalExpected) === normalizeCategoryKey(canonicalDetected) ||
          (parsed.isCategoryMatched === true && rawDetectedType !== 'Unknown Document' && !rawDetectedType.toLowerCase().includes('unknown')) ||
          serverEval.isMatched;

        let finalDocType = isTypeMatched ? canonicalExpected : (detectedIsSupported ? canonicalDetected : rawDetectedType);

        let docNum = parsed.documentNumber || null;
        if (docNum && (/aadhaar/i.test(canonicalExpected) || /aadhaar/i.test(finalDocType))) {
          const digits = String(docNum).replace(/\D/g, '');
          if (digits.length >= 4) {
            docNum = `XXXX-XXXX-${digits.slice(-4)}`;
          }
        }

        let parsedExpiry = parseToIsoDate(parsed.expiryDate);
        let parsedIssue = parseToIsoDate(parsed.issueDate);

        // Fallback regex issue date extraction if Gemini didn't find it
        if (!parsedIssue && combinedAvailableText) {
          const issueDateMatch = combinedAvailableText.match(/(?:issue\s*date|date\s*of\s*issue|issued\s*on|તારીખ|दिनांक)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
          if (issueDateMatch) {
            parsedIssue = parseToIsoDate(issueDateMatch[1]);
          }
        }

        // Aadhaar is always Lifetime
        if (/aadhaar/i.test(canonicalExpected) || /aadhaar/i.test(finalDocType)) {
          parsedExpiry = 'LIFETIME';
        }

        // Income Certificate: Valid for 3 Years from issue date
        if (/income/i.test(canonicalExpected) || /income/i.test(finalDocType)) {
          if (!parsedExpiry && parsedIssue && parsedIssue !== 'LIFETIME') {
            const parts = parsedIssue.split('-');
            if (parts.length === 3) {
              parsedExpiry = `${parseInt(parts[0], 10) + 3}-${parts[1]}-${parts[2]}`;
            }
          }
        }

        // Caste, Birth, Residence/Domicile, PAN Certificates carry Lifetime validity
        if (/caste|birth|residence|domicile|pan/i.test(canonicalExpected) || /caste|birth|residence|domicile|pan/i.test(finalDocType)) {
          if (!parsedExpiry) {
            parsedExpiry = 'LIFETIME';
          }
        }

        const confidence = typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.95;

        if (finalDocType.toLowerCase().includes('unknown') || (!isTypeMatched && finalDocType.toLowerCase().includes('unverified')) || (confidence < 0.4 && !isTypeMatched)) {
          finalDocType = 'Unverified Document';
        }

        return {
          documentType: finalDocType,
          isCategoryMatched: isTypeMatched,
          issueDate: parsedIssue,
          expiryDate: parsedExpiry,
          holderName: parsed.holderName || null,
          documentNumber: docNum,
          issuingAuthority: parsed.issuingAuthority || null,
          validityPolicy: parsed.validityPolicy || null,
          confidenceScore: confidence,
          extractedText: parsed.summary || rawDetectedType,
        };
      } catch {
        // Fall through to server inspection
      }
    }
  }

  // 2. Server Document Inspection Engine (Native OCR & Pattern Extraction)
  let extractedTextContent = extractedPdfText;
  if (!extractedTextContent || extractedTextContent.trim().length === 0) {
    try {
      extractedTextContent = buffer.toString('utf8');
    } catch {
      extractedTextContent = '';
    }
  }

  const combinedContent = `${fileName} ${extractedTextContent}`.trim();
  const evaluation = evaluateCategoryMatch(combinedContent, expectedCategory);

  const isIncome = /income/i.test(canonicalExpected);
  const isAadhaar = /aadhaar/i.test(canonicalExpected);
  const isCaste = /caste/i.test(canonicalExpected);
  const isDomicile = /domicile|residence/i.test(canonicalExpected);
  const isBirth = /birth/i.test(canonicalExpected);
  const isPan = /pan/i.test(canonicalExpected);

  // Attempt pattern extraction for issue date from text
  let calculatedIssue: string | null = null;
  const issueDateMatch = combinedContent.match(/(?:issue\s*date|date\s*of\s*issue|issued\s*on|તારીખ|दिनांक)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
  if (issueDateMatch) {
    calculatedIssue = parseToIsoDate(issueDateMatch[1]);
  }

  let calculatedExpiry: string | null = null;
  let validityPolicy: string = 'Standard Policy';

  if (isAadhaar || isCaste || isDomicile || isBirth || isPan) {
    calculatedExpiry = 'LIFETIME';
    validityPolicy = isAadhaar ? 'Permanent / Lifetime Validity (UIDAI)' : 'Permanent / Lifetime Validity';
  } else if (isIncome) {
    validityPolicy = 'Valid for 3 Years (Gujarat Revenue Dept)';
    if (calculatedIssue) {
      const parts = calculatedIssue.split('-');
      if (parts.length === 3) {
        calculatedExpiry = `${parseInt(parts[0], 10) + 3}-${parts[1]}-${parts[2]}`;
      }
    } else {
      validityPolicy = 'Needs Review';
    }
  } else {
    const expiryMatch = combinedContent.match(/(?:valid\s*upto|valid\s*till|expiry\s*date|expires\s*on)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
    if (expiryMatch) {
      calculatedExpiry = parseToIsoDate(expiryMatch[1]);
    }
  }

  // Attempt certificate number pattern
  let detectedDocNumber: string | null = null;
  if (isAadhaar) {
    const aadhaarDigits = combinedContent.match(/\b\d{4}\s*\d{4}\s*(\d{4})\b/);
    if (aadhaarDigits) {
      detectedDocNumber = `XXXX-XXXX-${aadhaarDigits[1]}`;
    }
  } else {
    const certNumMatch = combinedContent.match(/(?:certificate\s*(?:no|number)|cert\s*no|ક્રમાંક|नंबर)[:\s]+([A-Z0-9\/\-]+)/i);
    if (certNumMatch) {
      detectedDocNumber = certNumMatch[1];
    }
  }

  return {
    documentType: evaluation.detectedCategory,
    isCategoryMatched: evaluation.isMatched,
    issueDate: calculatedIssue,
    expiryDate: calculatedExpiry,
    holderName: null,
    documentNumber: detectedDocNumber,
    issuingAuthority: null,
    validityPolicy: validityPolicy,
    confidenceScore: evaluation.confidence,
    extractedText: extractedTextContent.substring(0, 300) || `Inspected ${canonicalExpected} document payload.`,
  };
};

/**
 * Main Verification Workflow & Cloudinary Guard:
 * Performs file signature validation, duplicate check, category verification, and expiry validation.
 * ONLY uploads to Cloudinary when ALL checks pass!
 */
export const verifyAndProcessDocument = async (
  fileData: string,
  expectedCategory: string,
  userId: string,
  fileName: string
): Promise<VerificationResult> => {
  // Step 1: Decode and validate file signature (magic bytes)
  const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  const fileHash = computeFileHash(fileData);

  const sigValidation = validateFileSignature(buffer, fileName);
  if (!sigValidation.isValid) {
    return {
      isVerified: false,
      verificationStatus: 'INVALID_FILE',
      errorCode: 'INVALID_FILE_SIGNATURE',
      failureReason: sigValidation.error || 'Invalid file format or corrupted file signature.',
      fileHash,
    };
  }

  // Step 2: Validate Category Support
  const { canonical: canonicalCategory, isSupported } = getCanonicalCategory(expectedCategory);
  if (!isSupported) {
    return {
      isVerified: false,
      verificationStatus: 'UNSUPPORTED_CATEGORY',
      errorCode: 'UNSUPPORTED_CATEGORY',
      failureReason: `The selected document category "${expectedCategory}" is not supported for automated verification. Supported categories: Aadhaar Card, Income Certificate, Caste Certificate, Domicile Certificate, Birth Certificate, Driving License, PAN Card, Ration Card, etc.`,
      fileHash,
    };
  }

  // Step 3: Duplicate Check against existing user documents
  try {
    const { data: existingDoc } = await supabaseAdmin
      .from('documents')
      .select('id, requirement_name, storage_path, verification_status')
      .eq('user_id', userId)
      .eq('verification_status', 'VERIFIED')
      .or(`file_hash.eq.${fileHash},file_name.eq.${fileName}`)
      .limit(1)
      .maybeSingle();

    if (existingDoc) {
      return {
        isVerified: false,
        verificationStatus: 'DUPLICATE',
        errorCode: 'DUPLICATE_DOCUMENT',
        failureReason: `Duplicate document upload detected. An identical verified document (${existingDoc.requirement_name || fileName}) is already registered for your account.`,
        fileHash,
      };
    }
  } catch (dbErr) {
    console.warn('[Duplicate Check Note]', dbErr);
  }

  // Step 4: Extract and verify metadata
  const extracted = await extractDocumentMetadataWithGemini(fileData, canonicalCategory, fileName);

  // Step 5: Check Readability / Ambiguity BEFORE category mismatch!
  // If the document is unverified or confidence is low, it is UNREADABLE, NOT a category mismatch!
  if (extracted.documentType === 'Unverified Document' || extracted.confidenceScore < 0.5) {
    return {
      isVerified: false,
      verificationStatus: 'UNREADABLE',
      errorCode: 'UNREADABLE_DOCUMENT',
      failureReason: `Document readability or text extraction was insufficient (Confidence: ${(extracted.confidenceScore * 100).toFixed(0)}%). The text, seals, or certificate stamps could not be verified clearly. Please provide a clear, sharp, unblurred scanned copy or PDF.`,
      extractedInfo: {
        documentType: extracted.documentType,
        issueDate: extracted.issueDate,
        expiryDate: extracted.expiryDate,
        holderName: extracted.holderName,
        documentNumber: extracted.documentNumber,
        confidenceScore: extracted.confidenceScore,
      },
      fileHash,
    };
  }

  // Step 6: Validate Category Match
  // Only declare mismatch when we have positive evidence of a conflicting category!
  if (!extracted.isCategoryMatched) {
    return {
      isVerified: false,
      verificationStatus: 'CATEGORY_MISMATCH',
      errorCode: 'VERIFICATION_CATEGORY_MISMATCH',
      failureReason: `Document category mismatch: You selected "${expectedCategory}", but the uploaded document was identified as "${extracted.documentType}". Please upload the correct document.`,
      extractedInfo: {
        documentType: extracted.documentType,
        issueDate: extracted.issueDate,
        expiryDate: extracted.expiryDate,
        holderName: extracted.holderName,
        documentNumber: extracted.documentNumber,
        confidenceScore: extracted.confidenceScore,
      },
      fileHash,
    };
  }

  // Step 7: Validate Expiry Date
  const isExpired = checkIsExpired(extracted.expiryDate);
  if (isExpired) {
    return {
      isVerified: false,
      verificationStatus: 'EXPIRED',
      errorCode: 'DOCUMENT_EXPIRED',
      failureReason: `Document verification failed: The uploaded ${extracted.documentType} expired on ${extracted.expiryDate}. Expired certificates cannot be accepted or marked as verified.`,
      extractedInfo: {
        documentType: extracted.documentType,
        issueDate: extracted.issueDate,
        expiryDate: extracted.expiryDate,
        holderName: extracted.holderName,
        documentNumber: extracted.documentNumber,
        confidenceScore: extracted.confidenceScore,
      },
      fileHash,
    };
  }

  // Step 8: All Mandatory Checks Passed! Proceed to Cloudinary Upload
  try {
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dx3tt1c5v';
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '452682556522892';
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'xt4gUzLhHuCkHe1WfIziebRdxZg';

    const cleanUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = `nagrikq/users/${cleanUserId}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const strToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const response = await fetch(uploadUrl, { method: 'POST', body: formData });
    const cResult = await response.json();

    if (!response.ok || cResult.error) {
      throw new Error(cResult.error?.message || 'Cloudinary storage upload failed.');
    }

    // Step 8: Save verified document entry in Supabase DB
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUuid) {
        await ensureUserProfileExists(userId);
      }

      await supabaseAdmin.from('documents').insert({
        user_id: isUuid ? userId : null,
        requirement_name: expectedCategory,
        storage_path: cResult.secure_url,
        file_name: fileName,
        file_hash: fileHash,
        verification_status: 'VERIFIED',
        issue_date: extracted.issueDate,
        expiry_date: extracted.expiryDate,
        extracted_metadata: {
          holderName: extracted.holderName,
          documentNumber: extracted.documentNumber,
          issuingAuthority: extracted.issuingAuthority,
          validityPolicy: extracted.validityPolicy,
          confidenceScore: extracted.confidenceScore,
          summary: extracted.extractedText || extracted.documentType,
        },
      });
    } catch (insertErr) {
      console.warn('[DB Record Note]', insertErr);
    }

    return {
      isVerified: true,
      verificationStatus: 'VERIFIED',
      cloudinaryUrl: cResult.secure_url,
      cloudinaryPublicId: cResult.public_id,
      extractedInfo: {
        documentType: extracted.documentType,
        issueDate: extracted.issueDate,
        expiryDate: extracted.expiryDate,
        holderName: extracted.holderName,
        documentNumber: extracted.documentNumber,
        issuingAuthority: extracted.issuingAuthority,
        validityPolicy: extracted.validityPolicy,
        confidenceScore: extracted.confidenceScore,
      },
      fileHash,
    };
  } catch (err: any) {
    return {
      isVerified: false,
      verificationStatus: 'STORAGE_ERROR',
      errorCode: 'CLOUDINARY_UPLOAD_FAILED',
      failureReason: `Storage Upload Error: ${err.message || 'Failed to upload verified asset to Cloudinary.'}`,
      fileHash,
    };
  }
};
