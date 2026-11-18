import { buildCatalog } from '../controllers/chatbot.controller';
import { sarvamVoiceEnabled } from './chatbot-speech.service';

interface ActiveCall {
  sessionId: string;
  ip: string;
  callId?: string;
  startedAt: number;
  timer: NodeJS.Timeout;
}

const activeCalls = new Map<string, ActiveCall>();

const REALTIME_MODEL = () => process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini';
const FALLBACK_MODELS = [
  'gpt-realtime-mini',
  'gpt-realtime',
  'gpt-4o-mini-realtime-preview',
  'gpt-4o-realtime-preview',
];
const CALL_MODEL_VOICE = () => process.env.OPENAI_TTS_VOICE || 'marin';

const MAX_CALL_MINUTES = 10;

export const isCallLive = (sessionId: string, ip?: string): boolean => {
  const call = activeCalls.get(sessionId);
  if (!call) return false;
  if (ip && call.ip && call.ip !== ip) return false;
  return true;
};

export const endActiveCall = (sessionId: string): void => {
  const call = activeCalls.get(sessionId);
  if (!call) return;
  activeCalls.delete(sessionId);
  clearTimeout(call.timer);

  if (call.callId && process.env.OPENAI_API_KEY) {
    fetch(`https://api.openai.com/v1/realtime/calls/${call.callId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    }).catch(() => {});
  }
};

const getCallInstructions = async (): Promise<string> => {
  let catalog = '';
  try {
    catalog = await buildCatalog();
  } catch {
    catalog = '';
  }

  return `You are Ensis Assist, a warm, polite, and knowledgeable young woman answering a voice call for Ensis (Panchkarma & Ayurvedic Equipment).
You are a woman, so use feminine verbs for yourself in Hindi (बताती हूँ, कर सकती हूँ, बताऊँगी).

PRONUNCIATION:
- Pronounce "Ensis" strictly as "एन्सिस" (En-sis), with crisp "एन" and "सिस". Never mispronounce as "इन्सिस", "इन-सिस", or "एनसिज़".

WHO WE ARE & CREDENTIALS:
- Ensis is the wellness infrastructure division of Design House India Pvt. Ltd. (trusted since 2003, 20+ years of trust).
- Track Record: 1000+ completed projects, 500+ happy clients across 28+ Indian states, 50+ expert professionals, 100% client satisfaction.
- Notable Clients: AyurVAID Hospitals, JIVA Ayurveda, Kairali Ayurvedic Group, Somatheeram Ayurveda Group, Sri Sri Tattva, Vaidyaratnam, Arogyadhama Ayurveda, Sahayog Wellness.
- Featured Projects: Ayurveda Wellness Resort (Kerala), Panchakarma Centre (Maharashtra), Spa & Wellness Retreat (Uttarakhand), Wellness Resort & Spa (Goa), Ayurveda Hospital (Karnataka).
- Products: Burma Teak & Mahogany Droni tables, Shirodhara units with pure brass pots, Ayurvedic steam bath chambers, herbal cabinets, and complete turnkey clinic & wellness infrastructure setups.
- Corporate Office: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007.
- Phone/WhatsApp: +91 9810242841 / +91 9654900525, Email: info@ensis.in. Official contact route: /contact

MULTILINGUAL CAPABILITY:
- Fluently converse in Hindi, English, Punjabi, Marathi, Gujarati, etc.
- If the caller speaks Punjabi, reply warmly in Punjabi! If they speak Hindi or Hinglish, reply in Hindi/Hinglish. If in English, reply in professional Indian English.

STRICT GUARDRAILS & OFF-TOPIC POLICY:
- Exclusively discuss Ayurvedic equipment, clinic setups, furniture, and Ensis services.
- Politely decline irrelevant, personal, political, coding, academic, or off-topic questions ("faltu sawal"). Redirect back to Ensis equipment and setups.

RULES FOR VOICE:
- Keep every reply concise (1 to 3 natural spoken sentences).
- If caller asks for a callback, quotation, or WhatsApp message, ask for their 10-digit mobile number so our team can send details immediately.
- If caller asks about products or equipment, recommend matching items from the catalog.

${catalog}`;
};

export const startWebRtcCall = async ({
  sdp,
  sessionId,
  lang = 'en',
  noise = true,
  ip = '',
}: {
  sdp: string;
  sessionId: string;
  lang?: string;
  noise?: boolean;
  ip?: string;
}): Promise<{
  sdp: string;
  sessionId: string;
  lang: string;
  greeting: string;
  choiceGreeting: string;
  history: any[];
  maxSeconds: number;
  knowsName: boolean;
  voiceStyle: string;
  voice?: 'sarvam';
}> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  endActiveCall(sessionId);

  const instructions = await getCallInstructions();
  const sarvam = sarvamVoiceEnabled();

  const sessionConfig = {
    type: 'realtime',
    model: REALTIME_MODEL(),
    ...(sarvam ? { output_modalities: ['text'] } : {}),
    instructions,
    max_output_tokens: 2000,
    audio: {
      input: {
        noise_reduction: { type: noise ? 'near_field' : 'far_field' },
        transcription: { model: 'gpt-4o-transcribe' },
        turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 600, create_response: true },
      },
      output: { voice: CALL_MODEL_VOICE() },
    },
  };

  let openedSdp = '';
  let callId: string | undefined;
  let lastError: any = null;

  const modelsToTry = [...new Set([sessionConfig.model, ...FALLBACK_MODELS])];

  for (const model of modelsToTry) {
    try {
      // 1. Try Design House format with FormData to /realtime/calls
      const form = new FormData();
      form.set('sdp', sdp);
      form.set('session', JSON.stringify({ ...sessionConfig, model }));
      let res = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(20000),
      });

      // 2. If rejected or not found, try direct SDP to /realtime?model=
      if (!res.ok) {
        res = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/sdp',
          },
          body: sdp,
          signal: AbortSignal.timeout(20000),
        });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI Realtime failed (${res.status}): ${text.slice(0, 300)}`);
      }

      openedSdp = await res.text();
      callId = (res.headers.get('location') || '').split('/').pop();
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!openedSdp) {
    throw lastError || new Error('Failed to open WebRTC call with OpenAI');
  }

  const timer = setTimeout(() => {
    endActiveCall(sessionId);
  }, MAX_CALL_MINUTES * 60 * 1000);

  activeCalls.set(sessionId, {
    sessionId,
    ip,
    callId,
    startedAt: Date.now(),
    timer,
  });

  const greeting =
    lang === 'hi'
      ? 'नमस्ते! एन्सिस पंचकर्म में आपका स्वागत है। मैं आपकी क्या मदद कर सकती हूँ?'
      : 'Hello! Welcome to Ensis Panchkarma. How can I assist you with our equipment or clinic setups today?';

  const choiceGreeting =
    lang === 'hi'
      ? 'नमस्ते! एन्सिस में आपका स्वागत है। क्या आप बोलकर बात करना चाहेंगे या चैट में लिखकर?'
      : 'Hello! Welcome to Ensis. Would you like to talk or would you prefer typing in the chat?';

  return {
    sdp: openedSdp,
    sessionId,
    lang,
    greeting,
    choiceGreeting,
    history: [],
    maxSeconds: MAX_CALL_MINUTES * 60,
    knowsName: false,
    voiceStyle: '',
    ...(sarvam ? { voice: 'sarvam' } : {}),
  };
};

