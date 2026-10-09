import { apiClient } from './apiClient';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dx3tt1c5v';
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '452682556522892';
const CLOUDINARY_API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'xt4gUzLhHuCkHe1WfIziebRdxZg';

export interface CloudinaryUploadResult {
  secureUrl: string;
  url?: string;
  publicId: string;
  bytes: number;
  fileName: string;
  folder: string;
  resourceType?: string;
}

/**
 * Helper to compute SHA-1 hash in browser for direct Cloudinary upload fallback.
 */
async function computeSha1(str: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(str));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts a browser File object to a base64 Data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a document to Cloudinary under the specific user's folder:
 * `nagrikq/users/{userId}`
 *
 * Tries the backend proxy endpoint first, and automatically falls back to
 * direct browser-signed Cloudinary upload for maximum reliability.
 */
export async function uploadDocumentToCloudinary(
  file: File,
  userId?: string
): Promise<CloudinaryUploadResult> {
  const cleanUserId = (userId || 'user_general').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFolder = `nagrikq/users/${cleanUserId}`;

  // 1. Try Backend Upload Endpoint
  try {
    const fileData = await fileToDataUrl(file);
    const apiRes = await apiClient.post<CloudinaryUploadResult>('/upload/cloudinary', {
      fileData,
      fileName: file.name,
      userId: cleanUserId,
      folder: targetFolder,
    });

    if (apiRes.success && apiRes.data?.secureUrl) {
      return apiRes.data;
    }
  } catch (backendErr) {
    console.warn('[Cloudinary Service] Backend upload skipped/failed, using direct fallback:', backendErr);
  }

  // 2. Direct Signed Upload to Cloudinary (Fallback)
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `folder=${targetFolder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = await computeSha1(stringToSign);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', targetFolder);
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to upload document to Cloudinary.');
  }

  return {
    secureUrl: data.secure_url,
    url: data.url,
    publicId: data.public_id,
    bytes: data.bytes,
    fileName: file.name,
    folder: targetFolder,
    resourceType: data.resource_type,
  };
}

/**
 * Returns a fast download endpoint URL for a Cloudinary asset.
 * If publicId is available, downloads through signed proxy or direct signed download.
 */
export function getCloudinaryDownloadUrl(
  publicId?: string,
  fileName?: string,
  format: string = 'pdf'
): string {
  if (!publicId) return '';
  const cleanPublicId = publicId.replace(/\.[^/.]+$/, '');
  const cleanFormat = format.replace(/^\./, '') || 'pdf';
  return `/api/upload/cloudinary/download?publicId=${encodeURIComponent(cleanPublicId)}&format=${cleanFormat}&fileName=${encodeURIComponent(fileName || 'document.pdf')}`;
}

/**
 * Deletes a document from Cloudinary using the backend destroy route.
 */
export async function deleteCloudinaryDocument(
  publicId: string,
  resourceType: string = 'image'
): Promise<boolean> {
  try {
    const cleanPublicId = publicId.replace(/\.[^/.]+$/, '');
    const res = await apiClient.post('/upload/cloudinary/delete', {
      publicId: cleanPublicId,
      resourceType,
    });
    return res.success;
  } catch (err) {
    console.warn('[Cloudinary Delete Failed]', err);
    return false;
  }
}

/**
 * Transforms Cloudinary URLs for seamless on-page display.
 * When a PDF is hosted on Cloudinary, converting the extension to .png renders
 * the first page as an image, avoiding browser PDF 401 delivery restrictions.
 */
export function getCloudinaryViewUrl(fileUrl?: string): string {
  if (!fileUrl) return '';
  if (fileUrl.includes('res.cloudinary.com') && fileUrl.toLowerCase().endsWith('.pdf')) {
    return fileUrl.replace(/\.pdf$/i, '.png');
  }
  return fileUrl;
}

