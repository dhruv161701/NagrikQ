import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../config/supabase';

export interface VerificationResult {
  isVerified: boolean;
  verificationStatus: 'VERIFIED' | 'EXPIRED' | 'REJECTED' | 'DUPLICATE' | 'NEEDS_REVIEW';
  failureReason?: string;
  extractedInfo?: {
    documentType: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    holderName?: string | null;
    documentNumber?: string | null;
    confidenceScore: number;
  };
  fileHash: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}

const getGeminiApiKey = (): string => {
  return process.env.GEMINI_API_KEY || '';
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
export const parseToIsoDate = (dateStr: string): string | null => {
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
 * Checks if an extracted expiry date is prior to current date (2026-10-09).
 */
export const checkIsExpired = (expiryDateStr: string | null | undefined): boolean => {
  if (!expiryDateStr || expiryDateStr === 'LIFETIME' || /lifetime|permanent/i.test(expiryDateStr)) {
    return false;
  }
  const isoDate = parseToIsoDate(expiryDateStr);
  if (!isoDate || isoDate === 'LIFETIME') return false;

  const today = new Date().toISOString().split('T')[0]; // Current local date e.g. 2026-10-09
  return isoDate < today;
};

/**
 * Analyzes document image / PDF base64 using Gemini AI Flash model to extract structured metadata.
 */
export const extractDocumentMetadataWithGemini = async (
  fileData: string,
  expectedCategory: string,
  fileName: string
): Promise<{
  documentType: string;
  isCategoryMatched: boolean;
  issueDate: string | null;
  expiryDate: string | null;
  holderName: string | null;
  documentNumber: string | null;
  confidenceScore: number;
  extractedText?: string;
}> => {
  const apiKey = getGeminiApiKey();

  // Standard category normalization mapping
  const normalizeCategory = (cat: string) => cat.toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
    ];

    // Clean base64 and mime type
    let mimeType = 'image/jpeg';
    if (fileData.startsWith('data:')) {
      const mimeMatch = fileData.match(/^data:([^;]+);base64,/);
      if (mimeMatch) mimeType = mimeMatch[1];
    } else if (fileName.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (fileName.endsWith('.png')) {
      mimeType = 'image/png';
    }

    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');

    const prompt = `
You are an expert official Indian Government Document Inspector for the NagrikQ platform.
Analyze this document image/file carefully.
Expected document category selected by citizen: "${expectedCategory}".

CRITICAL INSTRUCTION:
Do NOT trust or use the file name "${fileName}" to determine the document type.
Inspect ONLY the visual content, headers, seal, government stamps, and text printed inside the document image/PDF payload.

Examples:
- If the image shows "Aadhaar", "Unique Identification Authority of India", "UIDAI", 12-digit UID number -> documentType is "Aadhaar Card".
- If the image shows "Income Certificate", "Tehsildar", "Annual Family Income", "Revenue Department" -> documentType is "Income Certificate".
- If the image shows "Caste Certificate", "Sub-Divisional Officer", "Category" -> documentType is "Caste Certificate".
- If the image shows "Domicile Certificate" or "Residence Certificate" -> documentType is "Domicile Certificate".

If the detected documentType does NOT match the expected category "${expectedCategory}", set "isCategoryMatched": false.

Return ONLY a valid JSON object matching this structure (no markdown fences, no extra text):
{
  "documentType": "Detected actual document title from visual inspection",
  "isCategoryMatched": true/false (true ONLY if visual document matches expected category "${expectedCategory}"),
  "issueDate": "YYYY-MM-DD or DD/MM/YYYY or null if not found",
  "expiryDate": "YYYY-MM-DD or DD/MM/YYYY or 'Lifetime' or null if not found",
  "holderName": "Full name of certificate/card holder or null if not found",
  "documentNumber": "Unique certificate ID/number or Aadhaar last 4 digits or null if not found",
  "confidenceScore": number between 0.0 and 1.0 (confidence score based strictly on visual inspection),
  "summary": "Short 1-line description of the visual content found"
}
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    let responseText = '';
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, imagePart]);
        responseText = result.response.text();
        if (responseText) break;
      } catch (modelErr: any) {
        console.warn(`[Gemini OCR Note] ${modelName} note (${modelErr?.status || modelErr?.message}), trying candidate...`);
      }
    }

    if (responseText) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Normalize and verify category match strictly
        const detectedType = parsed.documentType || 'Unknown Document';
        const normDetected = normalizeCategory(detectedType);
        const normExpected = normalizeCategory(expectedCategory);
        const isMatchedStrict = Boolean(parsed.isCategoryMatched) && (normDetected.includes(normExpected) || normExpected.includes(normDetected));

        return {
          documentType: detectedType,
          isCategoryMatched: isMatchedStrict,
          issueDate: parseToIsoDate(parsed.issueDate),
          expiryDate: parseToIsoDate(parsed.expiryDate),
          holderName: parsed.holderName || null,
          documentNumber: parsed.documentNumber || null,
          confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.9,
          extractedText: parsed.summary,
        };
      }
    }
  } catch (err: any) {
    console.warn('[Gemini Document Extraction Note]', err?.message || err);
  }

  // Safe fallback if Gemini API is unreachable or unreadable:
  // NEVER trust filename to approve a document! Require explicit visual match!
  return {
    documentType: 'Unverified Document',
    isCategoryMatched: false,
    issueDate: null,
    expiryDate: null,
    holderName: null,
    documentNumber: null,
    confidenceScore: 0.0,
    extractedText: 'AI Vision OCR was unable to confirm category match. Document rejected.',
  };
};

/**
 * Main Verification Workflow & Cloudinary Guard:
 * Performs duplicate check, category verification, and expiry validation.
 * ONLY uploads to Cloudinary when ALL checks pass!
 */
export const verifyAndProcessDocument = async (
  fileData: string,
  expectedCategory: string,
  userId: string,
  fileName: string
): Promise<VerificationResult> => {
  // Step 1: Compute unique SHA-256 hash of file content
  const fileHash = computeFileHash(fileData);

  // Step 2: Duplicate Check against existing user documents
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
        failureReason: `Duplicate document upload detected. An identical verified document (${existingDoc.requirement_name || fileName}) is already registered for your account.`,
        fileHash,
      };
    }
  } catch (dbErr) {
    console.warn('[Duplicate Check Note]', dbErr);
  }

  // Step 3: AI Document Extraction via Gemini AI
  const extracted = await extractDocumentMetadataWithGemini(fileData, expectedCategory, fileName);

  // Step 4: Validate Expiry Date
  const isExpired = checkIsExpired(extracted.expiryDate);

  if (isExpired) {
    return {
      isVerified: false,
      verificationStatus: 'EXPIRED',
      failureReason: `Document verification failed: The uploaded ${extracted.documentType} expired on ${extracted.expiryDate}. Expired documents cannot be accepted or marked as verified.`,
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

  // Step 5: Validate Category Match & Confidence Score
  if (!extracted.isCategoryMatched || extracted.confidenceScore < 0.5) {
    return {
      isVerified: false,
      verificationStatus: 'REJECTED',
      failureReason: `Document category mismatch: Uploaded file does not match expected category "${expectedCategory}". Detected document type: "${extracted.documentType}".`,
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

  // Step 6: All Mandatory Checks Passed! Proceed to Cloudinary Upload
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

    // Step 7: Record verified document entry in DB
    try {
      await supabaseAdmin.from('documents').insert({
        user_id: userId,
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
          confidenceScore: extracted.confidenceScore,
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
        confidenceScore: extracted.confidenceScore,
      },
      fileHash,
    };
  } catch (err: any) {
    return {
      isVerified: false,
      verificationStatus: 'REJECTED',
      failureReason: `Storage Upload Error: ${err.message || 'Failed to upload verified asset to Cloudinary.'}`,
      fileHash,
    };
  }
};
