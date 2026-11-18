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

/** Text formatting for speech: removes markdown, emojis, asterisks, fixes pronunciation of abbreviations & brand names, cleans hyphens before prices, cleans plus before taxes, and removes repetitive link anchors */
export const forSpeech = (raw: string): string => {
  const isGurmukhi = /[\u0A00-\u0A7F]/.test(raw);
  const isGujarati = /[\u0A80-\u0AFF]/.test(raw);
  const isBengali = /[\u0980-\u09FF]/.test(raw);
  const isDevanagari = /[\u0900-\u097F]/.test(raw);

  const brandName = isGurmukhi ? 'ਐਨਸਿਸ' : isGujarati ? 'એન્સਿਸ' : isBengali ? 'এনসিস' : isDevanagari ? 'एन्सिस' : 'Ensis';
  const brandAssist = isGurmukhi ? 'ਐਨਸਿਸ ਅਸਿਸਟ' : isGujarati ? 'ਐਨਸਿਸ ਆਸਿਸਟ' : isBengali ? 'এনসিস অ্যাসিস্ট' : isDevanagari ? 'एन्सिस असिस्ट' : 'Ensis Assist';
  const domainPronounce = isDevanagari ? 'एन्सिस डॉट इन' : isGurmukhi ? 'ਐਨਸਿਸ ਡਾਟ ਇਨ' : 'Ensis dot in';

  const word = (hi: string, en: string) => (isDevanagari ? hi : en);

  // Check if repetitive product detail / CTA links exist (e.g. "[डिटेल्स देखें](url)", "[View Details](url)")
  const hasProductLinks = /\[(?:डिटेल्स देखें|विवरण देखें|details dekhein|view details|learn more|details|click here|dekhein)\]\([^)]+\)/i.test(raw);

  let text = String(raw || '');
  // Deduplicate brand names like "एन्सिस (Ensis)", "Ensis (एन्सिस)", or "एन्सिस एन्सिस" so Ensis is NEVER spoken twice!
  text = text
    .replace(/(?:एन्सिस\s*असिस्ट|এনসিস\s*অ্যাসিস্ট|ਐਨਸਿਸ\s*ਅਸਿਸਟ|Ensis\s*Assist)\s*[\(\[]\s*(?:एन्सिस\s*असिस्ट|এনসিস\s*অ্যাসিস্ট|ਐਨਸਿਸ\s*ਅਸਿਸਟ|Ensis\s*Assist|Ensis|एन्सिस)\s*[\)\]]/gi, brandAssist)
    .replace(/(?:एन्सिस|এনসিস|ਐਨਸਿਸ|એન્સਿਸ|Ensis)\s*[\(\[]\s*(?:Ensis|एन्सिस|এনসিস|ਐਨਸਿਸ|એન્સਿਸ)\s*[\)\]]/gi, brandName)
    .replace(/[\(\[]\s*(?:Ensis|एन्सिस|এনসিস|ਐਨਸਿਸ|એન્સਿਸ)\s*[\)\]]/gi, '')
    .replace(/[\(\[]\s*ensis\.in\s*[\)\]]/gi, '');


  // 1. Strip emojis, markdown images, and icons
  text = text
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Strip repetitive product link calls-to-action so speech doesn't repeat "details dekhein details dekhein"
    .replace(/\[(?:डिटेल्स देखें|विवरण देखें|details dekhein|view details|learn more|details|click here|dekhein)\]\([^)]+\)/gi, '')
    // For normal informative markdown links, keep only the link title text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bare URLs or localhost URLs
    .replace(/https?:\/\/[^\s)]+/gi, '')
    // Strip markdown formatting (*, _, ~)
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/\*+/g, ' ')
    .replace(/[•●▪■◆★☆✓✔☑]/g, ' ');

  // 2. Fix hyphen / dash before currency symbol ₹, Rs or digits so it is NEVER read as "minus" (माइनस)!
  // e.g. "शिरोधारा थेरेपी टेबल - ₹1,25,000" → "शिरोधारा थेरेपी टेबल, ₹1,25,000"
  text = text
    .replace(/\s*[-–—]\s*(?=₹|Rs\b|\d)/gi, ', ')
    // Range between two numbers: "10-12" → "10 से 12"
    .replace(/(\d)\s*[–-]\s*(\d)/g, `$1 ${word('से', 'to')} $2`)
    // Hyphen between words or list items: "टेबल - उच्च गुणवत्ता" → "टेबल, उच्च गुणवत्ता"
    .replace(/(\p{L})\s*[-–—]\s*(\p{L})/gu, '$1, $2');

  // 3. Fix currency symbol ₹ so it is read out as "rupaye" / "rupees" / "taka" instead of being ignored or mangled
  text = text.replace(/₹\s*([\d,]+)/g, (_, amt) => {
    if (isDevanagari) return `${amt} रुपये`;
    if (isBengali) return `${amt} টাকা`;
    if (isGurmukhi) return `${amt} ਰੁਪਏ`;
    if (isGujarati) return `${amt} રૂપિયા`;
    return `${amt} rupees`;
  });

  // 4. Fix "+ 18% GST" or "+ GST" so "+" is NEVER read as "जोड़" (jod)!
  // e.g. "+ 18% GST" → "और 18 प्रतिशत जीएसटी"
  const andWord = isBengali ? 'এবং' : isGurmukhi ? 'ਅਤੇ' : isGujarati ? 'અને' : isDevanagari ? 'और' : 'plus';
  const percentWord = isBengali ? 'শতাংশ' : isGurmukhi ? 'ਫ਼ੀਸਦੀ' : isDevanagari ? 'प्रतिशत' : 'percent';
  const gstWord = isBengali ? 'জিএসটি' : isGurmukhi ? 'ਜੀਐੱਸਟੀ' : isDevanagari ? 'जीएसटी' : 'GST';

  text = text
    .replace(/\s*\+\s*(\d+)%\s*GST\b/gi, ` ${andWord} $1 ${percentWord} ${gstWord}`)
    .replace(/\s*\+\s*GST\b/gi, ` ${andWord} ${gstWord}`)
    .replace(/\s*\+\s*(\d+)%\s*tax\b/gi, ` ${andWord} $1 ${percentWord} tax`)
    .replace(/(\d+)%/g, `$1 ${percentWord}`)
    .replace(/\bGST\b/g, gstWord)
    // "5000+" → "5000 se zyada"
    .replace(/(\d+)\+/g, `$1 ${word('से ज़्यादा', 'plus')}`)
    // Any remaining lone "+"
    .replace(/\s*\+\s*/g, ` ${andWord} `);

  // 5. Fix brand names, phone numbers, emails, domains
  text = text
    .replace(/\bPvt\.?\s*Ltd\b\.?/gi, word('प्राइवेट लिमिटेड', 'Private Limited'))
    .replace(/\bPvt\b\.?/gi, word('प्राइवेट', 'Private'))
    .replace(/\bLtd\b\.?/gi, word('लिमिटेड', 'Limited'))
    .replace(/\bhttps?:\/\/(?:www\.)?ensis\.in\b/gi, domainPronounce)
    .replace(/\bensis\.in\b/gi, domainPronounce)
    .replace(/\bEnsis Assist\b/gi, brandAssist)
    .replace(/\bEnsis\b/gi, brandName)
    .replace(/\bensis\b/gi, brandName);

  // Unicode deduplication of repeated brand words e.g. "एन्सिस एन्सिस", "एन्सिस Ensis"
  const indicOrEn = '(?:एन्सिस|এনসিস|ਐਨਸਿਸ|એન્સਿਸ|Ensis)';
  const dupRegex = new RegExp(`(^|[^\\p{L}\\p{M}])(${indicOrEn})(?:[\\s,]+|\\s*(?:या|or|मतलब)\\s*)(?:${indicOrEn})(?=[^\\p{L}\\p{M}]|$)`, 'giu');
  text = text.replace(dupRegex, '$1$2').replace(dupRegex, '$1$2');

  text = text
    .replace(/(?:\+?91[\s-]*)?\b[6-9]\d{9}\b|(?:\+?91[\s-]*)?\b[6-9]\d{4}[\s-]?[\d]{5}\b/g, (m) => spellPhone(m, isDevanagari))
    .replace(/\b\d{6}\b/g, (m) => spellOtp(m, isDevanagari))
    .replace(/([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)/g, (_, name, domain) => `${name} ${word('एट', 'at')} ${domain.replace(/\./g, ` ${word('डॉट', 'dot')} `)}`)
    .replace(/\s&\s/g, ` ${word('और', 'and')} `)
    .replace(/\n+/g, '. ')
    .replace(/([.!?।,:])\s*\.(\s|$)/g, '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 6. If repetitive product links were stripped, mention once at the end where details are available
  if (hasProductLinks && !/स्क्रीन|screen|লিঙ্ক|ਸਕ੍ਰੀਨ/i.test(text)) {
    if (isBengali) {
      text += '. বিস্তারিত বিবরণ এবং লিঙ্ক স্ক্রিনে দেওয়া আছে।';
    } else if (isGurmukhi) {
      text += '. ਵਿਸਤ੍ਰਿਤ ਜਾਣਕਾਰੀ ਅਤੇ ਲਿੰਕ ਸਕ੍ਰੀਨ ਤੇ ਦਿੱਤੇ ਗਏ ਹਨ।';
    } else if (isDevanagari) {
      text += '. विस्तृत विवरण और लिंक्स स्क्रीन पर दिए गए हैं।';
    } else {
      text += '. Detailed specifications and links are displayed on screen.';
    }
  }

  return text.slice(0, 2000).trim();
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
    return 'Voice: an exceptionally sweet-voiced, warm, and respectful young native Punjabi speaker with soft, melodious Gurmukhi pronunciation and gentle cadence (ਬਹੁਤ ਮਿੱਠੀ ਅਤੇ ਨਿਮਰ ਆਵਾਜ਼). Tone: sweet, polite, smiling, and soothing. Never harsh, never robotic.';
  }
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'Voice: a sweet-voiced, gentle young native Gujarati speaker with soft, melodious, and warm pronunciation. Tone: polite, sweet, and soothing. Never harsh.';
  }
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'Voice: an exceptionally sweet-voiced, melodious young native Bengali speaker with sweet, melodic, authentic pronunciation (খুব মিষ্টি ও মধুর কণ্ঠ). Tone: sweet, polite, warm, and gentle. Never harsh.';
  }
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\b(आहे|आहेत|काय|कुठे|कसे|माझे|तुमचे|नाही|झाले|पाहिजे|हवे)\b/.test(text)) {
      return 'Voice: a sweet-voiced, gentle young native Marathi speaker with soft, polite, and warm pronunciation. Tone: polite, sweet, and soothing.';
    }
    return VOICE_STYLE.hindi;
  }
  return VOICE_STYLE.english;
};

export const VOICE_STYLE = {
  hindi:
    'Voice: an exceptionally sweet-voiced, gentle, and warm young Indian woman with a soft, melodious, and very pleasant voice (बहुत ही मीठी, मधुर और सौम्य आवाज़). Accent: pure, natural North Indian Hindi with soft, clear diction. English words are spoken gently the way educated Indians naturally say them. Pronounce the brand name simply as "Ensis" (or "एन्सिस" in Hindi), soft and clean without pause or explanation. Tone: melodious, smiling, polite, caring, and soothing (madhur, vinamra, and calming), like a caring Ayurvedic wellness specialist. Never harsh, never sharp, never robotic, never rushed. Pace: relaxed, sweet, and comforting with natural pauses.',
  english:
    'Voice: an exceptionally sweet-voiced, gentle, and warm young Indian woman with a soft, melodious, and very pleasant voice. Accent: natural Indian English with a gentle, educated cadence and soft retroflex sounds, never harsh or robotic. Pronounce the brand name simply as "Ensis", soft and clean. Tone: melodious, smiling, polite, caring, and soothing. Pace: relaxed, sweet, and comforting with natural pauses.',
};

export const sarvamVoiceEnabled = (): boolean =>
  process.env.CHAT_TTS_PROVIDER === 'sarvam' && Boolean(process.env.SARVAM_API_KEY);

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
  const voice = process.env.OPENAI_TTS_VOICE || 'sage';
  const clean = forSpeech(text);

  // 1. Try sweet, melodious OpenAI configuration (gpt-4o-mini-tts with sage & sweet VOICE_STYLE instructions)
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

  // 2. Fallback to standard OpenAI audio speech (tts-1 with sage or shimmer)
  const safeVoice =
    process.env.OPENAI_TTS_VOICE && process.env.OPENAI_TTS_VOICE !== 'marin'
      ? process.env.OPENAI_TTS_VOICE
      : 'sage';

  const fallbackRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: safeVoice,
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
        } catch {
          // ignore fallback error
        }
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

