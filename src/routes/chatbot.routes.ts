import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';

export const chatbotRouter = Router();

const ENSIS_SYSTEM_PROMPT = `You are the Senior Wellness & Technical Space Advisor for "Ensis" (ensis.in).
Ensis is India's premier manufacturer and turnkey architect of Ayurvedic, Panchkarma, Spa & Wellness spaces.

Company Core Strengths & Offerings:
1. Solid Burma Teak Handcrafted Droni (Treatment tables), Motorized & Hydraulic Panchkarma tables with medical-grade oil resistance.
2. Precision Shirodhara stands, brass & copper vessels with automated temperature and flow controls.
3. Swedana Steam Chambers (handcrafted cedar wood and fiber models).
4. Turnkey Ayurvedic Clinic & Wellness Resort setups (Space planning, 2D/3D layouts, NABH compliance, complete interior, 30-45 day delivery).
5. Doctor & Vaidya clinical setup consultancy (SOPs, therapist training, space sizing).
6. Warranty & Shipping: 5-Year Structural Warranty, Pan-India & Global shipping with on-site installation by Ensis engineers.
7. Helpline & Contact: Phone/WhatsApp +91 9654900525 | Email: support@ensis.in

Guidelines:
- Tone: Warm, prestigious, knowledgeable, respectful (use "Namaste", "Vaidya ji", or polite professional tone).
- Languages: Answer naturally in the language user asks (Hindi, English, or Hinglish).
- Keep answers structured, practical, and concise (2-4 paragraphs max).
- If the user asks for pricing, custom layout estimation, or quotation, invite them to share their contact details for a free customized 2D layout and 2026 architecture catalog.`;

chatbotRouter.post(
  '/message',
  asyncHandler(async (req: Request, res: Response) => {
    const { message, history, userName, language } = req.body;
    const userMessage = typeof message === 'string' ? message.trim() : '';

    if (!userMessage) {
      const greeting = language === 'hi'
        ? (userName ? `नमस्ते ${userName} जी! आज मैं आपकी क्या सहायता कर सकता हूँ?` : "नमो नमः! आज मैं आपके आयुर्वेदिक क्लिनिक या पंचकर्म सेटअप में क्या सहायता कर सकता हूँ?")
        : (userName ? `Namaste ${userName} ji! How may I assist you today?` : "Namaste! How may I assist you with your Ayurvedic clinic, wellness center, or Panchkarma equipment setup today?");
      return successResponse(res, {
        reply: greeting,
      });
    }

    const nameInstruction = userName ? `\nClient Name: "${userName}". Greet or address them respectfully by name (e.g., "${userName} ji" or "Dr. ${userName}").` : '';
    const langInstruction = language === 'hi'
      ? '\nLanguage Instruction: The user has chosen Hindi language mode. Please reply entirely in polite, respectful, and polished Hindi (Devanagari script) using appropriate Ayurvedic terms.'
      : '';
    const dynamicSystemPrompt = `${ENSIS_SYSTEM_PROMPT}${nameInstruction}${langInstruction}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. Try OpenAI if key is configured
    if (openaiKey) {
      try {
        const openAiMessages = [
          { role: 'system', content: dynamicSystemPrompt },
          ...(Array.isArray(history)
            ? history.map((h: any) => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: String(h.content || ''),
              }))
            : []),
          { role: 'user', content: userMessage },
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: openAiMessages,
            temperature: 0.7,
            max_tokens: 600,
          }),
          signal: AbortSignal.timeout(6000),
        });

        const data: any = await response.json();
        if (response.ok && data?.choices?.[0]?.message?.content) {
          return successResponse(res, {
            reply: data.choices[0].message.content,
            provider: 'openai',
          });
        }
      } catch {
        // Fall through to Gemini
      }
    }

    // 2. Try Google Gemini if key is configured
    if (geminiKey) {
      try {
        const contents: any[] = [];

        // Add history if present
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: String(item.content || '') }],
            });
          }
        }

        // Add user prompt combined with system prompt for strong instruction following
        contents.push({
          role: 'user',
          parts: [{ text: `${dynamicSystemPrompt}\n\nUser Question: ${userMessage}` }],
        });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
            signal: AbortSignal.timeout(6000),
          }
        );

        const data: any = await response.json();
        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return successResponse(res, {
            reply: data.candidates[0].content.parts[0].text,
            provider: 'gemini',
          });
        }
      } catch {
        // Fall through to fallback
      }
    }

    // 3. Fallback Ensis Knowledge-Base Reply
    const fallbackReply =
      "Namaste! Ensis specializes in Turnkey Panchkarma setups, Handcrafted Solid Teak Droni, Automated Shirodhara units, and Ayurvedic clinic consultancy.\n\nFor a customized 2D layout and 2026 catalog, please contact our team directly at +91 9654900525 or leave your phone number.";

    return successResponse(res, {
      reply: fallbackReply,
      provider: 'fallback',
    });
  })
);
