import { Response } from 'express';

const SARVAM_MAX_CHARS = 2400;
const CACHE_TEXT_CHARS = 400;
const MAX_CACHED_CLIPS = 300;
const clips = new Map<string, Buffer>();

const DIGITS_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const DIGITS_HI = ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ'];

// Phone number reading format: "+91 9810242841" → "plus nine one, nine, eight, one, zero, two, four, two, eight, four, one"
export const spellPhone = (number: string, isHindi = false): string => {
  const digits = number.replace(/\D/g, '').slice(-10);
  const words = digits.split('').map((d) => (isHindi ? DIGITS_HI[Number(d)] : DIGITS_EN[Number(d)]));
  const prefix = isHindi ? 'प्लस नौ एक, ' : 'plus nine one, ';
  return prefix + words.slice(0, 5).join(', ') + ', ' + words.slice(5).join(', ');
};

export const spellOtp = (code: string, isHindi = false): string => {
  const digits = code.replace(/\D/g, '');
  return digits.split('').map((d) => (isHindi ? DIGITS_HI[Number(d)] : DIGITS_EN[Number(d)])).join(', ');
};

/** Text formatting for speech: removes markdown, emojis, asterisks, fixes pronunciation of abbreviations & brand names */
export const forSpeech = (raw: string): string => {
  const isGurmukhi = /[\u0A00-\u0A7F]/.test(raw);
  const isGujarati = /[\u0A80-\u0AFF]/.test(raw);
  const isBengali = /[\u0980-\u09FF]/.test(raw);
  const isDevanagari = /[\u0900-\u097F]/.test(raw);

  const brandName = isGurmukhi ? 'ਐਨਸਿਸ' : isGujarati ? 'એન્સિસ' : isBengali ? 'এনসিস' : isDevanagari ? 'एन्सिस' : 'Ensis';
  const brandAssist = isGurmukhi ? 'ਐਨਸਿਸ ਅਸਿਸਟ' : isGujarati ? 'એન્સિસ આસિસ્ટ' : isBengali ? 'এনসিস অ্যাসিস্ট' : isDevanagari ? 'एन्सिस असिस्ट' : 'Ensis Assist';
  const domainPronounce = isDevanagari ? 'एन्सिस डॉट इन' : isGurmukhi ? 'ਐਨਸਿਸ ਡਾਟ ਇਨ' : 'Ensis dot in';

  const word = (hi: string, en: string) => (isDevanagari ? hi : en);

  return String(raw || '')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) → link text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1') // Strip markdown **bold** or *italic* text
    .replace(/\*+/g, ' ') // Strip any remaining asterisks so Sarvam TTS never speaks "तारंकन" (tarankan)
    .replace(/[•●▪■◆★☆✓✔☑]/g, ' ') // Strip bullet points and symbols
    .replace(/\bPvt\.?\s*Ltd\b\.?/gi, word('प्राइवेट लिमिटेड', 'Private Limited'))
    .replace(/\bPvt\b\.?/gi, word('प्राइवेट', 'Private'))
    .replace(/\bLtd\b\.?/gi, word('लिमिटेड', 'Limited'))
    .replace(/\bhttps?:\/\/(?:www\.)?ensis\.in\b/gi, domainPronounce)
    .replace(/\bensis\.in\b/gi, domainPronounce)
    .replace(/\bEnsis Assist\b/gi, brandAssist)
    .replace(/\bEnsis\b/gi, brandName)
    .replace(/\bensis\b/gi, brandName)
    .replace(/(?:\+?91[\s-]*)?\b[6-9]\d{9}\b|(?:\+?91[\s-]*)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, (m) => spellPhone(m, isDevanagari))
    .replace(/\b\d{6}\b/g, (m) => spellOtp(m, isDevanagari))
    .replace(/([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)/g, (_, name, domain) => `${name} ${word('एट', 'at')} ${domain.replace(/\./g, ` ${word('डॉट', 'dot')} `)}`)
    .replace(/(\d)\s*[–-]\s*(\d)/g, `$1 ${word('से', 'to')} $2`)
    .replace(/(\d)\+/g, `$1 ${word('से ज़्यादा', 'plus')}`)
    .replace(/\s&\s/g, ` ${word('और', 'and')} `)
    .replace(/\n+/g, '. ')
    .replace(/([.!?।,:])\s*\.(\s|$)/g, '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 2000);
};

export const detectSarvamLang = (text: string): string => {
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Punjabi
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0B00-\u0B7F]/.test(text)) return 'od-IN'; // Odia
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\b(आहे|आहेत|काय|कुठे|कसे|माझे|तुमचे|नाही|झाले|पाहिजे|हवे)\b/.test(text)) return 'mr-IN';
    return 'hi-IN';
  }
  return 'en-IN';
};

export const detectOpenAiVoiceInstructions = (text: string): string => {
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return 'Voice: a friendly native Punjabi speaker with authentic, warm Punjabi pronunciation, rhythm and intonation. Tone: polite, smiling, natural.';
  }
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'Voice: a friendly native Gujarati speaker with authentic Gujarati pronunciation. Tone: polite, warm, natural.';
  }
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'Voice: a friendly native Bengali speaker with sweet, melodic, authentic Bengali pronunciation. Tone: warm, polite.';
  }
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\b(आहे|आहेत|काय|कुठे|कसे|माझे|तुमचे|नाही|झाले|पाहिजे|हवे)\b/.test(text)) {
      return 'Voice: a friendly native Marathi speaker from Pune/Mumbai with authentic Marathi pronunciation and intonation. Tone: polite, warm.';
    }
    return VOICE_STYLE.hindi;
  }
  return VOICE_STYLE.english;
};

export const VOICE_STYLE = {
  hindi:
    'Voice: a young woman from Delhi, a native Hindi speaker, working as a friendly customer-care executive. Accent: natural North Indian Hindi with authentic Hindi sounds (the hard ट ड and soft त द, a tapped र), with no American or British accent at all. English words are said the way people in India say them in everyday Hindi. Pronounce the brand name simply as "Ensis" (or "एन्सिस" in Hindi), clean and natural without pause or explanation. Tone: warm, polite, smiling. Pace: relaxed and conversational, with natural pauses at commas and full stops, never robotic and never rushed.',
  english:
    'Voice: a young woman from Delhi who speaks Indian English natively, working as a friendly customer-care executive. Accent: clearly Indian English, the way an educated Indian professional speaks, with Indian rhythm and intonation and a light retroflex t and d, not American or British. Pronounce the brand name simply as "Ensis", clean and natural. Say Indian names and places with their Indian pronunciation. Tone: warm, polite, smiling. Pace: relaxed and conversational, with natural pauses at commas and full stops, never robotic and never rushed.',
};

export const sarvamVoiceEnabled = (): boolean =>
  process.env.CHAT_TTS_PROVIDER !== 'openai' && Boolean(process.env.SARVAM_API_KEY);

const sarvamPieces = (text: string): string[] => {
  const pieces: string[] = [];
  let rest = text.trim();
  while (rest.length > SARVAM_MAX_CHARS) {
    const window = rest.slice(0, SARVAM_MAX_CHARS);
    const cut = Math.max(window.lastIndexOf('। '), window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
    const end = cut > SARVAM_MAX_CHARS / 2 ? cut + 1 : SARVAM_MAX_CHARS;
    pieces.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
};

/** Synthesize speech using Sarvam AI Bulbul TTS */
export const synthesizeSarvamSpeech = async (text: string, signal?: AbortSignal): Promise<Buffer> => {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error('SARVAM_API_KEY is not configured');

  const parts: Buffer[] = [];
  const clean = forSpeech(text);

  for (const piece of sarvamPieces(clean)) {
    const langCode = detectSarvamLang(piece);
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: piece,
        language_code: langCode,
        model: process.env.SARVAM_TTS_MODEL || 'bulbul:v3',
        speaker: process.env.SARVAM_TTS_SPEAKER || 'priya',
        pace: Number(process.env.SARVAM_TTS_PACE) || 1.0,
        output_audio_codec: 'mp3',
        speech_sample_rate: 24000,
      }),
      signal,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const json = (await res.json()) as any;
        detail = json?.error?.message || json?.message || '';
      } catch {
        // Not JSON
      }
      throw new Error(`Sarvam speech failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as any;
    const audios: string[] = json?.audios || [];
    audios.forEach((audioBase64) => parts.push(Buffer.from(audioBase64, 'base64')));
  }

  if (!parts.length) throw new Error('Sarvam returned no audio segments');
  return Buffer.concat(parts);
};

/** Synthesize speech using OpenAI TTS matching Design House (gpt-4o-mini-tts / marin) */
export const synthesizeOpenAiSpeech = async (text: string, signal?: AbortSignal): Promise<Buffer> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  const voice = process.env.OPENAI_TTS_VOICE || 'marin';
  const clean = forSpeech(text);

  // 1. Try Design House configuration (gpt-4o-mini-tts with marin & VOICE_STYLE instructions)
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: clean,
        instructions: detectOpenAiVoiceInstructions(clean),
        response_format: 'mp3',
      }),
      signal,
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (err: any) {
    if (signal?.aborted) throw err;
  }

  // 2. Fallback to standard OpenAI audio speech (tts-1 with nova or shimmer)
  const fallbackRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: process.env.OPENAI_TTS_VOICE || 'marin',
      input: clean,
      response_format: 'mp3',
    }),
    signal,
  });

  if (!fallbackRes.ok) {
    const errText = await fallbackRes.text().catch(() => '');
    throw new Error(`OpenAI TTS fallback failed (${fallbackRes.status}): ${errText.slice(0, 200)}`);
  }

  const arrayBuffer = await fallbackRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

/** Stream MP3 audio to HTTP response matching Design House (OpenAI TTS gpt-4o-mini-tts / marin + Sarvam Bulbul) */
export const streamSpeech = async (text: string, res: Response): Promise<void> => {
  const clean = forSpeech(text);
  const cached = clips.get(clean);
  if (cached) {
    res.type('audio/mpeg').set('Cache-Control', 'no-store').send(cached);
    return;
  }

  // If Sarvam explicitly preferred (CHAT_TTS_PROVIDER=sarvam) or OpenAI key missing
  if (sarvamVoiceEnabled()) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 60000);
    res.on('close', () => abort.abort());

    try {
      const audio = await synthesizeSarvamSpeech(clean, abort.signal);
      if (clean.length <= CACHE_TEXT_CHARS) {
        clips.set(clean, audio);
        if (clips.size > MAX_CACHED_CLIPS) {
          const first = clips.keys().next().value;
          if (first) clips.delete(first);
        }
      }
      res.type('audio/mpeg').set('Cache-Control', 'no-store').send(audio);
      return;
    } catch (error: any) {
      if (abort.signal.aborted) {
        res.destroy();
        return;
      }
      console.warn('[chatbot] Sarvam speech failed, falling back to OpenAI TTS:', error?.message || error);
    } finally {
      clearTimeout(timer);
    }
  }

  // Primary Design House TTS: OpenAI TTS (gpt-4o-mini-tts / marin)
  if (process.env.OPENAI_API_KEY) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 60000);
    res.on('close', () => abort.abort());

    try {
      const audio = await synthesizeOpenAiSpeech(clean, abort.signal);
      if (clean.length <= CACHE_TEXT_CHARS) {
        clips.set(clean, audio);
        if (clips.size > MAX_CACHED_CLIPS) {
          const first = clips.keys().next().value;
          if (first) clips.delete(first);
        }
      }
      res.type('audio/mpeg').set('Cache-Control', 'no-store').send(audio);
      return;
    } catch (error: any) {
      if (abort.signal.aborted) {
        res.destroy();
        return;
      }
      console.error('[chatbot] OpenAI TTS failed, trying Sarvam fallback if available:', error?.message || error);
      if (process.env.SARVAM_API_KEY) {
        try {
          const audio = await synthesizeSarvamSpeech(clean, abort.signal);
          res.type('audio/mpeg').set('Cache-Control', 'no-store').send(audio);
          return;
        } catch {}
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (!res.headersSent) {
    res.status(502).json({ success: false, message: 'Speech synthesis error' });
  } else {
    res.destroy();
  }
};

