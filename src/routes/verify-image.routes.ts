import { Router, Request, Response } from 'express';
import multer from 'multer';
import { asyncHandler } from '../utils/async-handler';
import { verifyCandidateProfilePhoto } from '../services/ai-profile-photo.service';

export const verifyImageRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/v1/verify-image
 * Supports:
 * 1. Multipart/form-data: file field "photo" or "image", with candidateGender, candidateAge, candidateDob, candidateName
 * 2. JSON: { imageBase64: "data:image/...;base64,...", gender, age, dateOfBirth, candidateName }
 */
verifyImageRouter.post(
  '/',
  upload.single('photo'),
  asyncHandler(async (req: Request, res: Response) => {
    let buffer: Buffer | null = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body?.imageBase64 && typeof req.body.imageBase64 === 'string') {
      const raw = req.body.imageBase64;
      const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        // Raw base64 string without data prefix
        buffer = Buffer.from(raw, 'base64');
      }
    }

    if (!buffer || buffer.length === 0) {
      res.status(400).json({
        success: false,
        ok: false,
        approved: false,
        reason: 'Please upload a valid JPG, PNG or WEBP image file.',
        rejection_reasons: ['No valid image data provided.'],
      });
      return;
    }

    if (buffer.length > MAX_BYTES) {
      res.status(400).json({
        success: false,
        ok: false,
        approved: false,
        reason: 'Photo is too large. Please upload one under 10 MB.',
        rejection_reasons: ['File size exceeds 10 MB limit.'],
      });
      return;
    }

    const candidateGender = (req.body?.candidateGender || req.body?.gender || '').trim();
    const candidateAge = req.body?.candidateAge || req.body?.age || '';
    const candidateDob = (req.body?.candidateDob || req.body?.dateOfBirth || '').trim();
    const candidateName = (req.body?.candidateName || req.body?.name || '').trim();

    const result = await verifyCandidateProfilePhoto(buffer, mimeType, {
      candidateGender,
      candidateAge,
      candidateDob,
      candidateName,
    });

    // Provide both new schema and backward-compatible fields
    res.json({
      success: result.approved,
      ok: result.approved,
      approved: result.approved,
      photoUrl: result.photoUrl,
      confidence: result.confidence,
      detected: result.detected,
      checks: result.checks,
      rejection_reasons: result.rejection_reasons,
      reason: result.rejection_reasons[0] || (result.approved ? '' : result.feedback),
      feedback: result.feedback,
    });
  })
);
