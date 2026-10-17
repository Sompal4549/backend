import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';

/**
 * POST /verify-image — { imageBase64: "data:image/...;base64,..." }
 * Checks a career applicant's profile photo with Gemini vision: one real adult face, upright,
 * clear and appropriate. Answers { success, reason } in the shape ApplicationFormModal expects.
 */
export const verifyImageRouter = Router();

const MAX_BYTES = 8 * 1024 * 1024;
const AI_TIMEOUT_MS = 20000;

const PROMPT = `You check profile photos for a job application.
Accept only if ALL are true: it is a real photograph (not a drawing, logo, screenshot or document), exactly one adult human face is clearly visible, the face is upright and not heavily covered, the image is reasonably sharp, and the content is appropriate.
Reply with JSON only: {"ok": true} or {"ok": false, "reason": "<one short sentence telling the applicant what to fix>"}`;

verifyImageRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const raw = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
    const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ success: false, reason: 'Please upload a JPG, PNG or WEBP photo.' });
      return;
    }
    const [, mimeType, data] = match;
    if (Buffer.byteLength(data, 'base64') > MAX_BYTES) {
      res.status(400).json({ success: false, reason: 'Photo is too large. Please upload one under 8 MB.' });
      return;
    }

    const key = process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY;
    if (!key) {
      // Without an AI provider only the browser's size and blur checks apply
      res.json({ success: true, checked: false });
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data } }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0 },
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        }
      );
      const body: any = await response.json();
      const text: string = body?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === 'string')?.text || '';
      const verdict = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
      if (verdict?.ok === true) {
        res.json({ success: true, checked: true });
      } else {
        res.json({ success: false, reason: verdict?.reason || 'Please upload a clear, upright photo of your own face.' });
      }
    } catch (error) {
      // The AI being unreachable must not block every applicant; the browser checks still ran
      console.error('[verify-image] AI check failed:', error instanceof Error ? error.message : error);
      res.json({ success: true, checked: false });
    }
  })
);
