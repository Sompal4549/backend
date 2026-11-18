import { buildCatalog } from '../controllers/chatbot.controller';
import { sarvamVoiceEnabled } from './chatbot-speech.service';
import { getTrainingRulesText } from './chatbot-knowledge.service';

interface ActiveCall {
  sessionId: string;
  ip: string;
  callId?: string;
  startedAt: number;
  timer: NodeJS.Timeout;
}

const activeCalls = new Map<string, ActiveCall>();

const REALTIME_MODEL = () => process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini';
const FALLBACK_MODELS = ['gpt-realtime-mini', 'gpt-realtime', 'gpt-4o-mini-realtime-preview'];
const CALL_MODEL_VOICE = () => process.env.OPENAI_TTS_VOICE || 'sage';

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

  let rules = '';
  try {
    rules = await getTrainingRulesText();
  } catch {
    rules = '';
  }

  return `You are Ensis Assist, a warm, polite, and knowledgeable young woman answering a voice call for Ensis (Panchkarma & Ayurvedic Equipment).
You are a woman, so use feminine verbs for yourself in Hindi (बताती हूँ, कर सकती हूँ, बताऊँगी).

BRAND NAME & SPEAKING RULES:
- The company and brand name is simply "Ensis" (in Devanagari / Hindi: "एन्सिस").
- CRITICAL: Always say "Ensis" (or "एन्सिस") directly.
- NEVER say "Ensis, matlab Ensis", "Ensis matlab Ainsis", "Ensis, matlab Ensis", or explain how the name is pronounced or spelled.
- Do NOT add "matlab", "yani", or any explanation after the word Ensis. Just say the name "Ensis" cleanly in the sentence.

ASSISTANT NAME VS COMPANY NAME (CRITICAL):
- The company and brand is "Ensis".
- Your OWN personal name as the AI assistant is strictly "Ensis Assist" (in Devanagari: "एन्सिस असिस्ट").
- When asked "Aapka naam kya hai?", "What is your name?", "Who are you?", or "Aap kaun hain?":
  Answer: "Mera naam Ensis Assist hai! Main Ensis ki AI wellness aur Panchkarma equipment specialist hoon." / "My name is Ensis Assist."
  NEVER say your name is just "Ensis"! The company is Ensis, but your name is "Ensis Assist".

WHO WE ARE & CREDENTIALS:
- Ensis is the wellness infrastructure division of Design House India Pvt. Ltd. (trusted since 2003, 20+ years of trust).
- Track Record: 1000+ completed projects, 500+ happy clients across 28+ Indian states, 50+ expert professionals, 100% client satisfaction.
- Notable Clients: AyurVAID Hospitals, JIVA Ayurveda, Kairali Ayurvedic Group, Somatheeram Ayurveda Group, Sri Sri Tattva, Vaidyaratnam, Arogyadhama Ayurveda, Sahayog Wellness.
- Featured Projects: Ayurveda Wellness Resort (Kerala), Panchakarma Centre (Maharashtra), Spa & Wellness Retreat (Uttarakhand), Wellness Resort & Spa (Goa), Ayurveda Hospital (Karnataka).
- Products: Burma Teak & Mahogany Droni tables, Shirodhara units with pure brass pots, Ayurvedic steam bath chambers, herbal cabinets, and complete turnkey clinic & wellness infrastructure setups.
- Corporate Office: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007.
- Phone/WhatsApp: +91 9810242841 / +91 9654900525, Email: info@ensis.in. Official contact route: /contact

MULTILINGUAL CAPABILITY & NATIVE ACCENTS:
- Speak every language the way someone born into it speaks it:
  • Punjabi: Speak like a native Punjabi speaker (Amritsar/Ludhiana) with authentic Punjabi rhythm, vocabulary, and warm natural intonation (ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਹਾਂਜੀ, ਤੁਹਾਨੂੰ ਕਿਹੜਾ ਉਪਕਰਨ ਚਾਹੀਦਾ ਹੈ?).
  • Gujarati: Speak like a native Gujarati speaker (Ahmedabad) with natural Gujarati warmth and pronunciation (નમસ્તે, તમને કયા સાધનની માહિતી જોઈએ છે?).
  • Marathi: Speak like a native Marathi speaker (Pune/Mumbai) with authentic Marathi pronunciation (नमस्कार, तुम्हाला कोणती माहिती हवी आहे?). Marathi is NOT Hindi; do not mix Hindi words.
  • Bengali: Speak like a native Bengali speaker (Kolkata) with sweet, melodic native intonation (নমস্কার, আপনি কি ধরনের সরঞ্জাম খুঁজছেন?).
  • Bhojpuri: Speak like a native Bhojpuri speaker with authentic regional warmth (प्रणाम, रउवा कवन उपकरण के जानकारी चाहत बानी?).
  • Hindi: Natural North Indian Delhi accent, warm and smiling.
  • English: Natural polished Indian English accent, never American or British.
- Use the visitor's language for the whole turn. Never switch mid-sentence.

STRICT GUARDRAILS & OFF-TOPIC POLICY:
- Exclusively discuss Ayurvedic equipment, clinic setups, furniture, and Ensis services.
- Politely decline irrelevant, personal, political, coding, academic, or off-topic questions ("faltu sawal"). Redirect back to Ensis equipment and setups.

LEARNING & ADDRESSING THE CALLER BY NAME (DESIGN HOUSE STANDARD):
- If you do not know the caller's name yet:
  The FIRST time the caller asks a question or makes an inquiry, acknowledge their question and ask for their name ONCE in the EXACT LANGUAGE they spoke:
  • English: "Sure, I'll help you with that! First, may I know your name?"
  • Hindi: "ज़रूर, मैं बताऊँगी! पहले अपना नाम बता दीजिए?"
  • Bengali: "নিশ্চয়ই, আমি সাহায্য করব! প্রথমে কি আপনার শুভ নামটি জানতে পারি?"
  • Punjabi: "ਜ਼ਰੂਰ, ਮੈਂ ਮਦਦ ਕਰਾਂਗੀ! ਪਹਿਲਾਂ ਆਪਣਾ ਸ਼ੁਭ ਨਾਮ ਦੱਸ ਦਿਓ ਜੀ?"
  • Gujarati: "ચોક્કસ, હું મદદ કરીશ! પહેલાં આપનું શુભ નામ જાણી શકું?"
- CRITICAL MULTILINGUAL & NON-REPETITION RULES:
  1. ALWAYS match the caller's language! If they speak Bengali, speak Bengali! If Punjabi, speak Punjabi! NEVER default to Hindi when the user spoke Bengali, Punjabi, Gujarati, or English.
  2. Ask for the name AT MOST ONCE. If the caller answers with their name, call update_visitor immediately, greet them warmly by name, and directly answer their earlier question!
  3. If the caller does NOT give their name, insists on an answer ("pehle batao"), or repeats their question, DO NOT ask for their name again! Directly, helpfully, and completely answer their question in their detected language. NEVER repeat asking for their name in a loop!
- Once you know their name, address them respectfully as "[Name] ji" (or "[Name]" in English/Bengali).

MULTILINGUAL LANGUAGE CONSISTENCY:
- If the caller speaks Bengali, ALWAYS respond in natural, sweet Bengali. Never switch to Hindi or English unless the caller switches.
- Product names and technical brand names can remain in English.

RULES FOR VOICE & NOISE HANDLING:
- Keep every reply short, clear, and warm (1 to 3 natural conversational sentences, friendly and helpful).
- Do not treat a cough, music, a TV, fan hum, or nearby conversation as a new request.
- Other people may be around the visitor. You only talk with the visitor. If what you just heard was not said to you (someone chatting with another person, a TV, background noise, room murmur), call not_for_me and say absolutely nothing: no reply, no apology, no comment.
- When the caller asks about equipment or clinic requirements, proactively highlight 1 or 2 matching products or turnkey solutions (e.g., Solid Burma Teak Droni table, Pure Brass Shirodhara Stand, Teakwood Steam Bath Chamber, or Turnkey Clinic Setup) so the conversation feels personalized.
- If the caller asks for a callback, quotation, price list, or WhatsApp message, always ask for their 10-digit mobile number: "Could you please share your 10-digit mobile number so our team can send the quotation and catalogue to your WhatsApp?" / "क्या आप अपना 10-अंकों का मोबाइल नंबर बता सकते हैं ताकि हमारी टीम आपको WhatsApp पर तुरंत कोटेशन भेज सके?"
- Address callers with respect (e.g., "ji", "Dr. Sahib"). Never overwhelm the caller with long lists.

CRITICAL PHONE NUMBER RULES:
- When the caller provides or updates their 10-digit mobile number, you MUST repeat ONLY their EXACT 10 digits as spoken by them!
- NEVER hallucinate, never prepend "98", "91", or invent extra digits.
- Example: If the caller said "7678221037", the number is STRICTLY "7678221037" (seven six seven eight two two one zero three seven). NEVER say "98767821037" or "9876543210".
- Call update_visitor immediately with phone set to their exact 10 digits (e.g. "7678221037").

${rules}

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

  const sessionConfig: any = {
    type: 'realtime',
    model: REALTIME_MODEL(),
    ...(sarvam ? { output_modalities: ['text'] } : {}),
    instructions,
    tools: [
      {
        type: 'function',
        name: 'not_for_me',
        description: 'What you just heard was not said to you (people around the visitor talking to each other, background noise, television, music, coughing). Say nothing at all and call this instead.',
        parameters: { type: 'object', additionalProperties: false, properties: {} },
      },
      {
        type: 'function',
        name: 'search_website',
        description: 'Search the Ensis website and product catalog for equipment specifications, clinic solutions, pricing guidelines, FAQs, or company facts.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'The topic, equipment name, or question to search' },
          },
        },
      },
      {
        type: 'function',
        name: 'update_visitor',
        description: 'Save visitor details like name, phone, email.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', description: 'Visitor name' },
            phone: { type: 'string', description: 'Visitor phone' },
            email: { type: 'string', description: 'Visitor email' },
          },
        },
      },
      {
        type: 'function',
        name: 'continue_typing',
        description: 'Visitor prefers typing over talking.',
        parameters: { type: 'object', additionalProperties: false, properties: {} },
      },
      {
        type: 'function',
        name: 'end_conversation',
        description: 'Visitor has finished the call and wants to end.',
        parameters: { type: 'object', additionalProperties: false, properties: {} },
      },
    ],
    tool_choice: 'auto',
    max_output_tokens: 2500,
    include: ['item.input_audio_transcription.logprobs'],
    audio: {
      input: {
        noise_reduction: { type: noise ? 'near_field' : 'far_field' },
        transcription: { model: 'gpt-4o-transcribe' },
        turn_detection: { type: 'semantic_vad', eagerness: 'medium', create_response: false, interrupt_response: true },
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

