import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dx3tt1c5v';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '452682556522892';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'xt4gUzLhHuCkHe1WfIziebRdxZg';

export const uploadToCloudinary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { fileData, fileName, userId: reqUserId, folder: customFolder } = req.body;

    if (!fileData) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'fileData is required.' },
      });
      return;
    }

    // Determine target user folder in Cloudinary
    const targetUserId = req.user?.id || reqUserId || 'user_general';
    // Sanitise folder name to avoid invalid characters
    const cleanUserId = String(targetUserId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = customFolder || `nagrikq/users/${cleanUserId}`;

    const timestamp = Math.floor(Date.now() / 1000);

    // Compute Cloudinary signature: parameters must be in alphabetical order
    const strToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

    // Prepare multipart form data for Cloudinary API
    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      const errMsg = result.error?.message || 'Failed to upload document to Cloudinary.';
      res.status(400).json({
        success: false,
        error: { code: 'CLOUDINARY_UPLOAD_ERROR', message: errMsg },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        secureUrl: result.secure_url,
        url: result.url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        resourceType: result.resource_type,
        folder,
        fileName: fileName || result.original_filename || 'document',
      },
    });
  } catch (err: any) {
    console.error('[Cloudinary Upload Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Server upload failure.' },
    });
  }
};

export const downloadFromCloudinary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const publicId = String(req.query.publicId || req.body.publicId || '');
    const rawFormat = String(req.query.format || req.body.format || 'pdf');
    const fileName = String(req.query.fileName || req.body.fileName || 'document.pdf');
    const resourceType = String(req.query.resourceType || req.body.resourceType || 'image');

    if (!publicId) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'publicId is required for download.' },
      });
      return;
    }

    const format = rawFormat.toLowerCase().replace(/^\./, '');
    const timestamp = Math.floor(Date.now() / 1000);

    // Compute signature for private download
    const strToSign = `format=${format}&public_id=${publicId}&timestamp=${timestamp}&type=upload${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

    const downloadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/download?format=${format}&public_id=${encodeURIComponent(publicId)}&timestamp=${timestamp}&type=upload&api_key=${CLOUDINARY_API_KEY}&signature=${signature}`;

    // Redirect browser to signed Cloudinary download endpoint
    res.redirect(downloadUrl);
  } catch (err: any) {
    console.error('[Cloudinary Download Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Download streaming failure.' },
    });
  }
};

export const deleteFromCloudinary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { publicId, resourceType = 'image' } = req.body;
    if (!publicId) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'publicId is required for deletion.' },
      });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const strToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const destroyUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`;
    const response = await fetch(destroyUrl, { method: 'POST', body: formData });
    const data = await response.json();

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('[Cloudinary Delete Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to delete document from Cloudinary.' },
    });
  }
};
