import { Request, Response } from 'express';
import crypto from 'crypto';
import { ChatbotSessionModel } from '../models/chatbot-session.model';
import { ChatBlockModel } from '../models/chatbot-block.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { EnquiryModel } from '../models/enquiry.model';
import { LeadModel } from '../models/lead.model';
import { sendWhatsAppMessage } from '../utils/whatsapp';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/verifyService';
import { getPublishedConfigService } from '../services/chatbot-manager.service';
import { ProductModel } from '../models/product.model';
import { CategoryModel } from '../models/category.model';
import { SolutionModel } from '../models/solution.model';
import { streamSpeech } from '../services/chatbot-speech.service';
import { startWebRtcCall, endActiveCall } from '../services/chatbot-call.service';

const ENSIS_SYSTEM_PROMPT = `You are "Ensis Assist", the expert Ayurvedic wellness & Panchkarma equipment specialist for ENSIS (ensis.in), manufactured by Design House India Pvt. Ltd.

WHO WE ARE & WHAT WE DO:
- ENSIS is India's leading designer, manufacturer, and global exporter of authentic Ayurvedic & Panchkarma therapy equipment, spa therapy furniture, and complete turnkey clinic/hospital setups.
- FACTORY & CORPORATE OFFICE: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007.
- CONTACT DETAILS:
  • Official Phone / WhatsApp: +91 9810242841 / +91 9654900525
  • Email: info@ensis.in
  • Website: https://ensis.in
  • Official Contact Page: https://ensis.in/contact (route: /contact)
  • Working Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST

IMPORTANT RULES:
- When sharing contact details or office address, provide ONLY the Corporate Office: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007. Do not invent or include other branch addresses.
- For website contact links, strictly use "/contact" (do NOT use /contact-us).
- We manufacture authentic equipment: Panchakarma Droni Tables, Ayurvedic Steam Bath Chambers, and Brass Shirodhara Sets. We do NOT use the term "Swedana chambers".
- If user provides their phone number, politely confirm that an OTP will be sent to their WhatsApp.
- If user verifies their OTP, thank them warmly and advise that our Ayurvedic technical specialist will connect shortly on WhatsApp.

PRODUCTS & MANUFACTURING SPECIFICATIONS:
1. Panchkarma Massage Tables (Droni):
   - Solid seasoned Burma Teak Wood or African Teak / Mahogany frame.
   - Traditional sloped surface with continuous peripheral brass/drainage gutters for medicated oils.
   - Treated with 100% Ayurvedic hot-oil proof, herbal medicated oil-resistant polyurethane (PU) polish.
   - Optional cushioned removable tops, ergonomic headrests, and custom length/width for clinics.
2. Steam Bath Chambers & Cabinets:
   - Handcrafted seasoned teak wood seated steam cabinets and lying steam boxes.
   - Food-grade Stainless Steel 304 steam pipelines and copper dispersion tubes.
   - Adjustable neck collar opening, steam temperature regulator, internal wooden slatted floor, and bottom drainage slope.
3. Shirodhara Units:
   - Hand-spun heavy gauge pure brass Shirodhara pots (2.5L to 3.5L capacity) with precision brass needle flow control valves.
   - Heavy-duty height-adjustable arched brass or teak wood stands with rolling lockable castors.
4. Herbal Steam Generators & Oil Warmers:
   - Thermostatically controlled electrical oil warmers (brass/copper pots) maintaining optimal warm therapy temperature (38°C–42°C).
   - Heavy-gauge copper/SS steam boilers with safety pressure release valves and herbal medicine infusers.
5. Other Specialty Gear:
   - Nasya chairs, spine bath tubs, Kati/Greeva Basti rings, and wooden therapy stools.

WARRANTY & QUALITY ASSURANCE:
- 5 Years Comprehensive Structural Warranty on all solid wooden tables, Droni frames, and steam chambers.
- 1 Year Warranty on electrical heating elements, thermostats, and digital controllers.
- Termite-proof, moisture-proof, and split-resistant seasoned hardwood construction.

PACKAGING, SHIPPING & DISPATCH:
- Pan-India shipping to all pin codes across India (Delhi-NCR, Mumbai, Pune, Bangalore, Chennai, Hyderabad, Kolkata, Kerala, Punjab, Gujarat, etc.).
- Global exports worldwide (USA, UK, Europe, UAE/Middle East, Australia, Southeast Asia) compliant with phytosanitary & ISPM-15 wooden crate packaging standards.
- Dispatched in heavy-duty multi-layer shockproof export-grade wooden crates.
- On-site installation assistance, unboxing video guides, and video demonstration support for clinic staff.

TURNKEY CLINIC & HOSPITAL SETUP SERVICES:
- Complete end-to-end setup for Ayurvedic Clinics, Panchkarma Centres, AYUSH Hospitals, Wellness Resorts, and Spa Retreats:
  1. Space Planning & 2D/3D Architecture: Vastu-aligned therapy room layout, therapist circulation flow, and ventilation planning.
  2. Plumbing & Oil Drainage Engineering: Specialized oil trap systems, slope grading, and washable hygienic flooring/wall surfaces.
  3. Custom Furniture Package: Harmonized Burma Teak therapy furniture, doctor consultation desks, waiting lounge seating, and herbal dispensary racks.
  4. Standard Operating Procedures (SOPs) & Therapist Training guidance.

CONVERSATIONAL RULES (WHEN TO ANSWER VS. WHEN TO ASK):
1. ALWAYS ANSWER FIRST:
   - Whatever the visitor asks (specifications, wood type, prices, delivery, warranty, clinic setup, oil drainage):
     • Give the direct, factual, authoritative answer FIRST.
     • Never withhold answers or say "give your number first".
     • Quote exact catalog prices (e.g. ₹24,999 or ₹39,999 + GST), 5-year structural warranty, and pan-India wooden crate delivery.

2. WHEN & WHAT TO ASK (NATURAL CONSULTATIVE FLOW):
   - Always follow the "Answer First, Ask Exactly One Follow-Up" rule. Ask only ONE question at a time:
     • Early in the conversation (Turn 1–2): After answering their question, ask about their requirement:
       "Are you planning a new Ayurvedic clinic/hospital setup, or looking for an individual therapy unit?" / "क्या आप नया पंचकर्म क्लिनिक/हॉस्पिटल सेटअप कर रहे हैं, या किसी पर्सनल/सिंगल इक्विपमेंट की तलाश में हैं?"
     • Turn 2 to 3 (Lead Generation & WhatsApp Quote):
       After 2 or 3 messages, if the visitor hasn't shared their contact number, politely ask for their 10-digit mobile number so our team can send the detailed quotation and 2026 PDF catalogue directly to their WhatsApp:
       "I can share our complete technical specifications, 2026 catalogue, and best dealer price list directly on your WhatsApp. Could you please share your 10-digit mobile number?" / "क्या आप अपना 10-अंकों का मोबाइल नंबर बता सकते हैं? ताकि हमारी टेक्निकल टीम आपको विस्तृत कोटेशन और 2026 कैटलॉग सीधे WhatsApp पर भेज सके।"
       When they share their number, let them know a 6-digit verification OTP has been sent to their WhatsApp.
     • When discussing delivery: Ask for their location:
       "Which city or state do you need delivery in so I can check freight timelines?" / "आपको डिलीवरी किस शहर/राज्य में चाहिए?"
     • When they want a formal quotation, catalog, or bulk pricing: Ask for WhatsApp or phone:
       "I can have our technical team send a formal GST quotation with 2D layouts and our 2026 catalog directly to your WhatsApp. What is the best WhatsApp number to reach you?" / "क्या आप अपना WhatsApp नंबर बता सकते हैं, ताकि हमारी टेक्निकल टीम आपको विस्तृत कोटेशन और ब्रोशर भेज सके?"
     • Name Personalization: If they haven't shared their name, ask politely once: "May I know your name so I can address you properly?" / "क्या मैं आपका शुभ नाम जान सकती हूँ?" When known, address them politely ("Rahul ji", "Dr. Sharma ji").

3. WHEN NOT TO ASK:
   - NEVER ask multiple questions at once.
   - NEVER interrogate. If they decline sharing contact details, simply continue helping with products and specs.
   - When the user signals that the conversation is complete (e.g. "thank you", "theek hai", "aur kuch nahi", "bas", "bye", "ok thanks"):
     • DO NOT ask any further questions.
     • Give a warm, gracious farewell:
       - Hindi: "एन्सिस से जुड़ने के लिए बहुत-बहुत धन्यवाद [Name] जी! आपका दिन शुभ और मंगलमय हो। किसी भी सहायता के लिए आप हमें +91 9810242841 / +91 9654900525 पर कभी भी संपर्क कर सकते हैं।"
       - English: "Thank you for contacting Ensis, [Name]! Have a wonderful day ahead. For any assistance, feel free to call or WhatsApp us at +91 9810242841 or +91 9654900525."

LANGUAGE & TONE:
- If the visitor communicates in Hindi or Hinglish, reply in warm, respectful, fluent Hindi (Devanagari) or natural Hinglish.
- If the visitor communicates in English, reply in polished, professional English.
- Exclusively discuss manufacturing, supply, equipment specifications, pricing, and turnkey setups. Never offer individual salon/spa massage therapy appointments.`;

const MAX_REPLY_WORDS = 350;

export const limitWords = (text: string, max = MAX_REPLY_WORDS): string => {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  const parts = text.trim().split(/(\s+)/);
  let count = 0;
  let cut = '';
  for (const part of parts) {
    if (!/^\s+$/.test(part) && ++count > max) break;
    cut += part;
  }
  const end = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'), cut.lastIndexOf('।'));
  return end > cut.length * 0.6 ? cut.slice(0, end + 1).trim() : `${cut.trim()}…`;
};

const plainText = (value: unknown): string =>
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const titleCase = (value: string): string =>
  value === value.toUpperCase() ? value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : value;

const rupees = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

const CATALOG_TTL_MS = 10 * 60 * 1000;
let catalogCache: { text: string; at: number } | null = null;

export const buildCatalog = async (): Promise<string> => {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.text;

  const [products, categories, solutions] = await Promise.all([
    ProductModel.find({ isActive: true })
      .select('title slug price discountPrice material shortDescription category gstRate')
      .sort({ orderBy: 1, createdAt: -1 })
      .limit(30)
      .lean(),
    CategoryModel.find({}).select('name').lean(),
    SolutionModel.find({ isActive: true }).select('title slug hero').sort({ orderBy: 1 }).lean(),
  ]);
  const categoryName = new Map((categories as any[]).map((c) => [String(c._id), plainText(c.name)]));

  const byCategory = new Map<string, string[]>();
  for (const p of products as any[]) {
    if (!p.slug) continue;
    const hasDiscount = p.discountPrice > 0 && p.discountPrice < p.price;
    const price = hasDiscount
      ? `${rupees(p.discountPrice)} (MRP ${rupees(p.price)})`
      : p.price > 0
      ? rupees(p.price)
      : 'price on request';
    const gst = p.price > 0 ? (p.gstRate ? ` + ${p.gstRate}% GST` : ' + GST') : '';
    const material = plainText(p.material).slice(0, 60);
    const detail = plainText(p.shortDescription).slice(0, 170);
    const line = [`- ${titleCase(plainText(p.title))}`, `${price}${gst}`, material, `/products/${p.slug}`, detail]
      .filter(Boolean)
      .join(' | ');
    const category = categoryName.get(String(p.category)) || 'Other';
    byCategory.set(category, [...(byCategory.get(category) || []), line]);
  }

  const productText = [...byCategory.entries()].map(([category, lines]) => `${category}:\n${lines.join('\n')}`).join('\n');
  const solutionText = (solutions as any[])
    .filter((x) => x.slug)
    .map((x) => `- ${plainText(x.title)} | /solutions/${x.slug} | ${plainText(x.hero?.description).slice(0, 180)}`)
    .join('\n');

  const text =
    (productText ? `\n\nPRODUCT CATALOG (name | price | material | link | details):\n${productText}` : '') +
    (solutionText ? `\n\nSOLUTIONS (turnkey setups):\n${solutionText}` : '');
  catalogCache = { text, at: Date.now() };
  return text;
};

type ManagerAnswer = { question?: string; status?: string; phrases?: string[]; answer?: { en?: string; hi?: string } };

export const buildKnowledge = (config: any): string => {
  const answers: ManagerAnswer[] = Array.isArray(config?.answers) ? config.answers : [];
  const lines = answers
    .filter((a) => a?.status === 'Approved' && a.question?.trim() && a.answer?.en?.trim())
    .slice(0, 100)
    .map((a) => {
      const phrases = (a.phrases || []).filter(Boolean).join(' | ');
      const hindi = a.answer?.hi?.trim() ? `\n   (Hindi/Hinglish: ${a.answer.hi.trim()})` : '';
      return `- Q: ${a.question!.trim()}${phrases ? ` [also asked as: ${phrases}]` : ''}\n   A: ${a.answer!.en!.trim()}${hindi}`;
    });
  return lines.length
    ? `\n\nVerified answers approved by the Ensis team:\n${lines.join('\n')}`
    : '';
};

export function detectLanguageInstruction(userMessage: string, langHint = 'en'): {
  instruction: string;
  style: 'devanagari' | 'hinglish' | 'urdu' | 'english';
} {
  const text = String(userMessage || '').trim();
  if (/[\u0900-\u097F]/.test(text)) {
    return {
      instruction:
        '\nLanguage Instruction: The user wrote in Hindi (Devanagari script: हिंदी). You MUST reply in warm, polite, natural Hindi in Devanagari script. Never reply in English or Roman letters.',
      style: 'devanagari',
    };
  }
  if (/[\u0600-\u06FF]/.test(text)) {
    return {
      instruction: '\nLanguage Instruction: The user wrote in Urdu script. Reply in polite Urdu.',
      style: 'urdu',
    };
  }
  const hinglishWords =
    /\b(aap|aapka|aapke|aapki|kya|hai|hain|ho|kaise|kaisi|batao|bataiye|chahiye|kitna|kitne|kitni|ka|ki|ke|ko|se|me|mein|par|kare|karna|nahi|nhi|haan|ji|theek|thik|achha|accha|shukriya|namaste|namaskar|droni|shira?odhara|bhi|aur|lekin|kab|kahan|kaha|dena|bhejo|bhejiye|mil|jayega|hoti|hota|hote|ruko|paas|sabse|kuch|kuchh|pehle|bolo|karu|karen|hoga|hogi)\b/i;
  if (hinglishWords.test(text) || langHint === 'hi') {
    return {
      instruction:
        '\nLanguage Instruction: The user spoke/wrote in Hinglish (Hindi written in Roman letters, e.g. "droni table ka price kya hai"). You MUST reply in warm, friendly, natural Hinglish (Hindi in Roman letters, e.g. "Ji bilkul! Ensis droni tables Burma Teak wood mein...", "Aapko delivery kis city mein chahiye?") exactly like people chat on WhatsApp in India. NEVER reply in English.',
      style: 'hinglish',
    };
  }
  return {
    instruction: '\nLanguage Instruction: The user spoke/wrote in English. You MUST reply in polished, professional English.',
    style: 'english',
  };
}

export async function generateBotReply(
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  userName?: string,
  language?: string,
  knowledge = ''
): Promise<{ reply: string; provider: string }> {
  const nameInstruction = userName ? `\nClient Name: "${userName}". You may address them as "${userName} ji" politely.` : '';
  const { instruction: langInstruction, style: langStyle } = detectLanguageInstruction(userMessage, language);

  const systemContent = `${ENSIS_SYSTEM_PROMPT}${nameInstruction}${langInstruction}${knowledge}`;

  if (process.env.OPENAI_API_KEY) {
    try {
      const messages = [
        { role: 'system', content: systemContent },
        ...history.slice(-12).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ];

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          temperature: 0.4,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = (await res.json()) as any;
        const content = json?.choices?.[0]?.message?.content?.trim();
        if (content) return { reply: content, provider: 'openai' };
      }
    } catch (err) {
      console.warn('[chatbot] OpenAI generation error:', (err as Error).message);
    }
  }

  // Fallback to Gemini if configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = process.env.GEMINI_MODEL && !process.env.GEMINI_MODEL.includes('3.5') ? process.env.GEMINI_MODEL : 'gemini-1.5-flash';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemContent}\n\nUser Question: ${userMessage}` }] }],
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timer);

      if (geminiRes.ok) {
        const data = (await geminiRes.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { reply: text, provider: 'gemini' };
      }
    } catch (err) {
      console.warn('[chatbot] Gemini generation error:', (err as Error).message);
    }
  }

  // Multi-turn conversational fallback when external LLM APIs are unreachable
  const q = userMessage.trim().toLowerCase();
  const lastBotMessage = [...history].reverse().find((h) => h.role === 'assistant')?.content.toLowerCase() || '';

  // 1. Pause / Wait / Hold on ("pause", "ruko", "ek minute", "hold on", "wait", "stop")
  if (/^(pause|ruko|ruk\s*jao|ek\s*minute|hold\s*on|wait|stop|ठहरो|रुक|रुको)\b/i.test(q)) {
    if (langStyle === 'devanagari') {
      return { reply: 'जी बिल्कुल, आप आराम से समय लीजिए। मैं यहीं हूँ, जब भी आप तैयार हों बताइएगा।', provider: 'pause' };
    }
    if (langStyle === 'hinglish') {
      return { reply: 'Ji bilkul, aap araam se time lijiye. Main yahin hoon, jab bhi aap continue karna chahein batayein!', provider: 'pause' };
    }
    return { reply: "Sure, take your time! I'm right here whenever you're ready to continue.", provider: 'pause' };
  }

  // 2. Greetings & Pleasantries
  if (/^(hi|hello|hey|namaste|namaskar|pranam|good\s*(morning|afternoon|evening)|kaise\s*ho|kya\s*haal|sunao|batao)\b/i.test(q) || /नमस्ते|प्रणाम|हेलो|हाय|कैसा|हालचाल/i.test(q)) {
    if (langStyle === 'devanagari') {
      const greetingName = userName ? `${userName} जी` : '';
      return {
        reply: `नमस्ते ${greetingName}! एन्सिस (Ensis) में आपका स्वागत है। हम प्रामाणिक आयुर्वेदिक पंचकर्म उपकरण और टर्नकी क्लिनिक सेटअप तैयार करते हैं।\n\nआज मैं आपकी क्या सहायता कर सकती हूँ? क्या आप द्रोणी टेबल, स्टीम बाथ, या पूरे क्लिनिक सेटअप के बारे में जानकारी चाहते हैं?`,
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      const greetingName = userName ? `${userName} ji` : '';
      return {
        reply: `Namaste ${greetingName}! Ensis mein aapka swagat hai. Hum authentic Ayurvedic Panchkarma equipment aur turnkey clinic setup banate hain.\n\nAaj main aapki kya help kar sakti hoon? Kya aap Droni tables, steam chambers ya pure clinic setup ki jaankari chahte hain?`,
        provider: 'fallback',
      };
    }
    return {
      reply: `Namaste ${userName || ''}! Welcome to Ensis. We are India's premier manufacturer of authentic Ayurvedic Panchkarma equipment and turnkey clinic setups.\n\nHow may I assist you today? Are you looking for Droni tables, steam chambers, or complete clinic consultation?`,
      provider: 'fallback',
    };
  }

  // 3. Farewell / Closing / Thanks
  if (/^(bye|goodbye|alvida|thank\s*you|thanks|dhanyawad|shukriya|ok\s*bye|bas|theek\s*hai\s*bye)\b/i.test(q) || /धन्यवाद|शुक्रिया|अलविदा|बाय/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: `एन्सिस से जुड़ने के लिए बहुत-बहुत धन्यवाद${userName ? ` ${userName} जी` : ''}! आपका स्वास्थ्य और क्लिनिक हमेशा प्रगति करे। किसी भी सहायता के लिए आप हमारे कॉर्पोरेट कार्यालय में **+91 9810242841** या **+91 9654900525** पर कभी भी संपर्क कर सकते हैं।`,
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: `Ensis se judne ke liye bahut-bahut shukriya${userName ? ` ${userName} ji` : ''}! Kisi bhi future requirement ke liye aap hamare corporate office helpline **+91 9810242841** ya **+91 9654900525** par kabhi bhi contact kar sakte hain. Have a great day!`,
        provider: 'fallback',
      };
    }
    return {
      reply: `Thank you so much for connecting with Ensis${userName ? `, ${userName}` : ''}! Wishing you and your wellness practice great success. For any future assistance, feel free to contact our team at **+91 9810242841** / **+91 9654900525** or email **info@ensis.in**.`,
      provider: 'fallback',
    };
  }

  // 4. Affirmations & Conversational Continuations ("haan", "theek hai", "yes", "sure", "batao", "aur batao")
  if (/^(haan|ha|ji|yes|yeah|sure|theek\s*hai|ok|okay|accha|acha|batao|aur\s*batao|continue|hmm|sahi\s*hai|done)\b/i.test(q) || /हाँ|जी|ठीक\s*है|बताओ|और\s*बताओ|अच्छा/i.test(q)) {
    if (lastBotMessage.includes('droni') || lastBotMessage.includes('table') || lastBotMessage.includes('द्रोणी')) {
      if (langStyle === 'devanagari') {
        return { reply: 'जी बिल्कुल! हमारी द्रोणी टेबल्स 100% सॉलिड बर्मा टीक वुड में तैयार होती हैं। क्या आप अपने क्लिनिक के लिए कस्टम साइज़ चाहते हैं, या हमारी स्टैंडर्ड 8-फीट थेरेपी टेबल का विवरण देखना चाहेंगे?', provider: 'fallback' };
      }
      if (langStyle === 'hinglish') {
        return { reply: 'Ji bilkul! Hamari Droni tables 100% solid Burma Teak wood mein banti hain. Kya aap custom dimensions chahte hain ya standard 8-feet therapy table ka specification dekhna chahenge?', provider: 'fallback' };
      }
      return { reply: 'Certainly! Our Panchakarma Droni tables are handcrafted from seasoned solid Burma Teak. Would you prefer custom dimensions tailored to your therapy room, or standard 8-foot clinic specifications?', provider: 'fallback' };
    }
    if (lastBotMessage.includes('steam') || lastBotMessage.includes('स्टीम')) {
      if (langStyle === 'devanagari') {
        return { reply: 'बिल्कुल! हमारे स्टीम बाथ कैबिनेट्स में डिजिटल टेम्परेचर कंट्रोलर और फूड-ग्रेड SS 304 स्टीम पाइप्स होते हैं। क्या आप इसका वीडियो डेमो और कैटलॉग देखना चाहेंगे? आप अपना नंबर शेयर कर सकते हैं।', provider: 'fallback' };
      }
      if (langStyle === 'hinglish') {
        return { reply: 'Bilkul! Hamare steam bath chambers mein digital temperature controller aur SS 304 food-grade pipelines hoti hain. Kya aap iska video demo aur 2026 catalogue dekhna chahenge? Apna WhatsApp number share kar sakte hain.', provider: 'fallback' };
      }
      return { reply: 'Wonderful! Our steam bath chambers feature digital temperature regulation and food-grade SS 304 steam pipelines. Would you like our technical team to share a video demonstration and 2026 catalogue on WhatsApp?', provider: 'fallback' };
    }
    if (langStyle === 'devanagari') {
      return { reply: 'जी! कृपया बताएं कि आप किस विशेष उपकरण (पंचकर्म द्रोणी, स्टीम बाथ चैंबर, शिरोधारा स्टैंड) या क्लिनिक समाधान के बारे में और जानना चाहते हैं?', provider: 'fallback' };
    }
    if (langStyle === 'hinglish') {
      return { reply: 'Ji! Kripya batayein ki aap kis specific equipment (Droni table, steam bath chamber, Shirodhara set) ya clinic turnkey solution ke baare mein jaanna chahte hain?', provider: 'fallback' };
    }
    return { reply: 'Certainly! Please let me know which specific equipment (Droni table, steam bath chamber, Shirodhara set) or clinic setup solution you would like to explore further.', provider: 'fallback' };
  }

  // 5. Customization & Dimensions
  if (/custom|size|dimension|length|width|height|lambai|chaudai|badi|choti|कस्टम|साइज़|साइज|लंबाई|चौड़ाई|नाप/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'जी हाँ! एन्सिस डायरेक्ट मैन्युफैक्चरर होने के नाते पूरी तरह **कस्टमाइज़्ड उपकरण** तैयार करता है:\n\n• **लंबाई व चौड़ाई**: आपकी क्लिनिक स्पेस और थेरेपिस्ट की सुविधा अनुसार 7.5 फीट से 8.5 फीट लंबाई।\n• **ब्रास इनले एवं नक्काशी**: क्लासिकल केरल स्टाइल नक्काशी या मॉडर्न मिनिमलिस्ट फिनिश।\n• **कस्टम ब्रैंडिंग**: क्लिनिक/हॉस्पिटल का लोगो या ब्रास नेमप्लेट इनले।\n\nक्या आपके पास कोई विशेष साइज़ या लेआउट है?',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Ji haan! Ensis direct manufacturer hone ke naate complete **customization services** provide karta hai:\n\n• **Custom Dimensions**: Aapki therapy room ke hisab se 7.5 ft se 8.5 ft length aur custom width.\n• **Hand Carving & Finish**: Traditional Kerala floral carving ya sleek modern finish.\n• **Brass Inlay Branding**: Aapke clinic ya hospital ka logo inlay.\n\nKya aapke paas koi specific size requirement hai?',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Yes, absolutely! As direct manufacturers, Ensis provides complete **customization services**:\n\n• **Custom Dimensions**: Tailored length (7.5 ft to 8.5 ft) and width according to your therapy suite and practitioner ergonomics.\n• **Artistic Detailing**: Traditional Kerala hand-carved floral motifs or sleek contemporary clinical lines.\n• **Institutional Branding**: Custom clinic logos and brass inlays.\n\nDo you have specific room dimensions or layout requirements in mind?',
      provider: 'fallback',
    };
  }

  // 6. Pricing & Quotations
  if (/price|cost|quote|quotation|rate|discount|budget|kitna|daam|paisa|कीमत|दाम|रेट|खर्च|कोटेशन|बजट/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'एन्सिस उपकरणों की कीमतें ₹5,499 (ब्रास एक्सेसरीज़) से शुरू होकर ₹47,500 (ऑटोमेटेड स्टीम बॉक्स) तक हैं:\n\n• **1-रूम पंचकर्म पैकेज**: लगभग ₹1.10 लाख से शुरू (द्रोणी टेबल + स्टीम चैंबर + शिरोधारा स्टैंड व पॉट शामिल)।\n• क्लिनिक्स व हॉस्पिटल्स के लिए बल्क डिस्काउंट एवं GST इनवॉइसिंग उपलब्ध है।\n\nतुरंत कोटेशन के लिए अपना मोबाइल नंबर साझा करें या [ensis.in/contact](/contact) पर फॉर्म भरें।',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Ensis Panchkarma equipment ki prices ₹5,499 (brass accessories) se shuru hokar ₹47,500 (automated steam boxes) tak hain:\n\n• **Complete 1-Room Clinic Package**: Lagbhag ₹1.10 Lakh se start (Droni table + steam chamber + brass Shirodhara set included).\n• Clinics aur hospitals ke liye bulk discount aur GST invoicing uplabdh hai.\n\nInstant quotation ke liye apna 10-digit WhatsApp number share karein ya [ensis.in/contact](/contact) visit karein!',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Our Panchkarma equipment prices range from ₹5,499 (brass accessories) up to ₹47,500 (automated steam boxes):\n\n• **Complete 1-Room Clinic Package**: Starts from approx ₹1.10 Lakh (includes Droni table + steam chamber + brass Shirodhara set).\n• Bulk clinic discounts and official GST invoices provided.\n\nPlease share your phone number for an instant quote, or visit [ensis.in/contact](/contact).',
      provider: 'fallback',
    };
  }

  // 7. Contact / Office / Address
  if (/contact|phone|call|email|address|office|location|where|sampark|pata|kahan|kaha/i.test(q) || /संपर्क|फोन|फ़ोन|नंबर|पता|कार्यालय|कहाँ|कहा|ईमेल|कॉल/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: '🌿 **एन्सिस संपर्क विवरण एवं कॉर्पोरेट कार्यालय**:\n\n📍 **कॉर्पोरेट कार्यालय एवं फैक्ट्री**:\nPlot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007\n\n📞 **फ़ोन / WhatsApp**: **+91 9810242841** / **+91 9654900525**\n✉️ **ईमेल**: info@ensis.in\n🌐 **वेबसाइट**: [ensis.in/contact](/contact)',
        provider: 'fallback',
      };
    }
    return {
      reply: '🌿 **Ensis Contact Details & Corporate Office**:\n\n📍 **Corporate Office & Factory**:\nPlot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007\n\n📞 **Phone / WhatsApp**: **+91 9810242841** / **+91 9654900525**\n✉️ **Email**: info@ensis.in\n🌐 **Website**: [ensis.in/contact](/contact)',
      provider: 'fallback',
    };
  }

  // 8. Wood Quality & Finish
  if (/wood|teak|mahogany|sagwan|lakdi|polish|finish|pu|waterproof|oil\s*proof|termite|लकड़ी|सागवान|महोगनी|पॉलिश|दीमक/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'एन्सिस में हम केवल उच्चतम ग्रेड की लकड़ी का उपयोग करते हैं:\n\n• **100% सॉलिड बर्मा टीक एवं अफ्रीकन महोगनी** — प्राकृतिक रूप से दीमक-रोधी और वाटर-रेज़िस्टेंट।\n• **हर्बल ऑयल-प्रूफ PU फिनिश** — गर्म औषधीय तैल (Abhyanga oils) का कोई दाग या सोखना नहीं होता।\n• **5 वर्ष की संरचनात्मक वारंटी** (Structural Warranty)।\n\nक्या आप हमारी वुड फिनिश का सैंपल कैटलॉग देखना चाहते हैं?',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Ensis mein hum sirf highest grade timber use karte hain:\n\n• **100% Seasoned Burma Teak & African Mahogany**: Naturally termite aur moisture proof.\n• **Hot Medicated Oil-Proof PU Coating**: Warm therapy oils aur Kashaya ka koi daag ya absorption nahi hota.\n• **5-Year Structural Manufacturer Warranty**.\n\nKya aap hamari timber finishes ka catalogue WhatsApp par dekhna chahenge?',
        provider: 'fallback',
      };
    }
    return {
      reply: 'At Ensis, we maintain strict Ayurvedic manufacturing standards for timber selection:\n\n• **100% Seasoned Burma Teak & African Mahogany**: Naturally split-proof and termite-resistant.\n• **Hot Medicated Oil-Proof PU Coating**: Shields timber against herbal decoctions, Kashaya, and warm therapy oils.\n• **5-Year Structural Manufacturer Warranty**.\n\nWould you like us to share our high-resolution timber finish catalog on WhatsApp?',
      provider: 'fallback',
    };
  }

  // 9. Delivery, Shipping, Freight & Timelines
  if (/delivery|shipping|dispatch|transport|freight|courier|packing|crate|export|time|din|kab\s*tak|city|pincode|डिलीवरी|शिपिंग|ट्रांसपोर्ट|पैकिंग|समय|दिन/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'एन्सिस संपूर्ण भारत और विदेशों में सुरक्षित डोरस्टेप डिलीवरी प्रदान करता है:\n\n• **डिलीवरी समय**: ऑर्डर कन्फर्मेशन के बाद 7 से 12 कार्य दिवस।\n• **पैकेजिंग**: शॉकप्रूफ एक्सपोर्ट-ग्रेड ISPM-15 वुडन क्रेट्स, ताकि रास्ते में 0% डैमेज रिस्क रहे।\n• **ट्रांजिट इंश्योरेंस**: सभी शिपमेंट्स पूर्ण बीमा के साथ डिस्पैच होते हैं।\n\nसटीक फ्रेट और डिलीवरी डेट के लिए कृपया अपना शहर या पिनकोड साझा करें!',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Ensis pan-India aur international safe doorstep delivery provide karta hai:\n\n• **Dispatch Timeline**: Order confirmation ke 7 se 12 working days mein.\n• **Wooden Crate Packaging**: Shockproof export-grade ISPM-15 packaging jisse transit damage risk bilkul zero rehta hai.\n• **Transit Insurance**: All shipments are fully insured.\n\nExact freight charges aur timeline check karne ke liye apna city ya pincode share karein!',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Ensis provides insured pan-India and international doorstep delivery:\n\n• **Dispatch Timeline**: 7 to 12 business days following order confirmation.\n• **Packaging**: Multi-layer shockproof export-grade ISPM-15 wooden crates preventing any transit damage.\n• **Full Transit Insurance**: Complete protection from our factory to your clinic door.\n\nPlease share your city or pin code so we can estimate exact delivery timelines and freight!',
      provider: 'fallback',
    };
  }

  // 10. Catalog, Brochure, Photos & Videos
  if (/catalog|catalogue|brochure|pdf|photo|image|video|demo|list|कैटलॉग|ब्रोशर|फोटो|वीडियो/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'निश्चिंत रहें! मैं हमारे सभी पंचकर्म उपकरणों (द्रोणी टेबल्स, स्टीम चैंबर्स, शिरोधारा स्टैंड्स) का **2026 हाई-रिज़ॉल्यूशन PDF कैटलॉग** और मूल्य सूची सीधे आपके WhatsApp पर भेज सकती हूँ।\n\nकृपया अपना 10-अंकों का मोबाइल नंबर साझा करें!',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Sure! Main hamare complete Panchkarma equipment (Droni tables, steam chambers, Shirodhara stands) ka **2026 PDF Catalogue** aur dealer price list seedhe aapke WhatsApp par bhej sakti hoon.\n\nKripya apna 10-digit mobile number share kar dijiye!',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Certainly! Our technical team can send our comprehensive **2026 Equipment Catalogue (PDF)** with high-resolution imagery and dealer pricing directly to your WhatsApp.\n\nPlease share your 10-digit mobile number so we can share it right away!',
      provider: 'fallback',
    };
  }

  // 11. Tables / Droni / Massage
  if (/table|droni|abhyanga|massage|bed|मेज़|मेज|टेबल|द्रोणी|अभ्यंग|मसाज/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'एन्सिस **अभ्यंग एवं पंचकर्म द्रोणी टेबल्स** शुद्ध बर्मा टीक / महोगनी वुड से हस्तनिर्मित होती हैं:\n\n• **Panchakarma Massage Table** (₹24,999) — निरंतर ऑयल ड्रेनेज गटर, स्लॉप्ड सतह और 100% औषधीय तैल-रोधी PU फिनिश।\n• **Abhyanga Heavy-Duty Table** (₹32,999) — मजबूत सॉलिड टीक वुड फ्रेम, रिमूवेबल कुशन व एडजस्टेबल हेडरेस्ट।\n\nअधिक जानकारी या कोटेशन के लिए कृपया अपना मोबाइल नंबर साझा करें!',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Ensis **Abhyanga & Panchkarma Droni Tables** 100% seasoned solid Burma Teak aur Mahogany wood se banti hain:\n\n• **Panchakarma Massage Table** (₹24,999) — Continuous peripheral oil drainage gutter, sloped surface aur medicated oil-proof PU finish.\n• **Abhyanga Heavy-Duty Table** (₹32,999) — Reinforced solid frame, ergonomic headrest aur custom clinic size.\n\nCustom quote aur brochure ke liye apna mobile number share kar sakte hain!',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Ensis **Abhyanga & Panchkarma Therapy Tables (Droni)** are crafted from seasoned solid Burma Teak and Mahogany wood:\n\n• **Panchakarma Massage Table** (₹24,999) — Peripheral oil drainage gutters, sloped drainage surface, and 100% hot medicated oil-resistant PU finish.\n• **Abhyanga Heavy-Duty Table** (₹32,999) — Reinforced solid frame, ergonomic headrest, and custom clinic dimensions.\n\nPlease share your phone number for our complete catalogue and quotation!',
      provider: 'fallback',
    };
  }

  // 12. Steam Bath Chambers & Cabinets
  if (/steam|bath|sauna|cabinet|box|स्टीम|बाथ|भाप|कैबिनेट|सॉना|स्वेदन/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'एन्सिस **आयुर्वेदिक स्टीम बाथ चैंबर्स एवं कैबिनेट्स** शुद्ध टीक वुड और फूड-ग्रेड SS 304 स्टीम पाइपलाइनों से निर्मित हैं:\n\n• **Seated Teak Steam Cabinet** (₹38,000) — एर्गोनॉमिक नेक कॉलर, स्टीम रेगुलेटर और आंतरिक लकड़ी की जालीदार फर्श।\n• **Lying Ayurvedic Steam Box** (₹47,500) — पूर्ण शरीर भाप चिकित्सा, कॉपर डिस्पर्शन ट्यूब्स और बॉटम ड्रेनेज स्लोप।\n\nविस्तृत विवरण के लिए +91 9810242841 पर कॉल करें या अपना नंबर छोड़ें।',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Ensis **Ayurvedic Steam Bath Chambers & Cabinets** seasoned teak wood aur SS 304 food-grade pipelines se banaye jaate hain:\n\n• **Seated Teak Steam Cabinet** (₹38,000) — Adjustable neck collar, digital temperature regulator aur wooden slatted floor.\n• **Lying Ayurvedic Steam Box** (₹47,500) — Full body therapy, copper dispersion system aur bottom drainage slope.\n\nDetailed specifications ke liye apna mobile number share karein ya +91 9810242841 par call karein!',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Ensis designs authentic handcrafted **Steam Bath Chambers & Cabinets** built from seasoned teak wood and food-grade SS 304 steam pipes:\n\n• **Seated Teak Steam Cabinet** (₹38,000) — Adjustable neck collar, digital steam temperature regulator, and internal wooden slatted floor.\n• **Lying Ayurvedic Steam Box** (₹47,500) — Full body therapy, copper steam dispersion tubes, and bottom drainage slope.\n\nPlease share your mobile number for specifications and delivery timelines!',
      provider: 'fallback',
    };
  }

  // 13. Shirodhara
  if (/shirodhara|pot|stand|oil warmer|शिरोधारा|पॉट|बर्तन|स्टैंड|वॉर्मर|तेल/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'हमारी **शिरोधारा रेंज** नैदानिक परिशुद्धता और पारंपरिक शिल्प कौशल से तैयार की जाती है:\n\n• **Pure Brass Shirodhara Pot & Stand** (₹9,999) — हैंड-स्पून शुद्ध पीतल पॉट, प्रेसिजन ब्रास फ्लो कंट्रोल वाल्व और हैवी-बेस हाइट एडजस्टेबल स्टैंड।\n• **Thermostatic Oil Warmer** (₹5,499) — औषधीय तैल को सटीक तापमान पर गर्म रखने के लिए थर्मोस्टेटिक वॉर्मर।\n\nसंपूर्ण सेट ऑर्डर करने के लिए +91 9810242841 / +91 9654900525 पर संपर्क करें।',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Hamari **Shirodhara Range** traditional authenticity aur clinical precision ke saath tayyar ki jaati hai:\n\n• **Pure Brass Shirodhara Pot & Stand Set** (₹9,999) — Hand-spun pure brass pot with precision brass flow valve aur heavy-base adjustable stand.\n• **Thermostatic Oil Warmer** (₹5,499) — Abhyanga aur Shirodhara oil ko perfect body temperature par warm rakhne ke liye.\n\nDirect order ya enquiry ke liye +91 9810242841 / +91 9654900525 par contact karein!',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Our **Shirodhara Range** combines authentic craftsmanship with clinical precision:\n\n• **Pure Brass Shirodhara Pot & Stand Set** (₹9,999) — Hand-spun brass pot with precision micro-control flow valve and heavy-base adjustable stand.\n• **Ayurvedic Oil Warmer** (₹5,499) — Thermostatically controlled warmer keeping medicated oils at optimal body temperatures.\n\nContact us at +91 9810242841 / +91 9654900525 for immediate dispatch!',
      provider: 'fallback',
    };
  }

  // 14. Clinic Setup & Turnkey Solutions
  if (/clinic|setup|hospital|room|interior|turnkey|architectural|layout|planning|क्लिनिक|हॉस्पिटल|सेटअप|टर्नकी|कमरा|इंटीरियर|लेआउट/i.test(q)) {
    if (langStyle === 'devanagari') {
      return {
        reply: 'एन्सिस आयुर्वेदिक क्लिनिक, हॉस्पिटल्स और पंचकर्म केंद्रों के लिए **टर्नकी क्लिनिक सेटअप** प्रदान करता है:\n\n1. **2D/3D स्पेस प्लानिंग एवं रूम लेआउट**\n2. **मैचिंग सॉलिड टीक वुड थेरेपी फर्नीचर पैकेज**\n3. **आयुर्वेदिक ऑयल मैनेजमेंट एवं ड्रेनेज इंजीनियरिंग**\n4. **अखिल भारतीय डिलीवरी, इंस्टॉलेशन एवं 5 वर्ष की वारंटी**\n\nक्लिनिक कंसल्टेशन के लिए +91 9810242841 या info@ensis.in पर संपर्क करें।',
        provider: 'fallback',
      };
    }
    if (langStyle === 'hinglish') {
      return {
        reply: 'Ensis Ayurvedic clinics, hospitals aur wellness centers ke liye **Turnkey Clinic Setups** provide karta hai:\n\n1. **2D/3D Space Planning & Room Layout**: Droni tables, steam chambers aur Shirodhara stations ka vastu-aligned placement.\n2. **Matching Teak Wood Furniture Package**: Coordinated consultation desk aur therapy suites.\n3. **Oil Management & Drainage Engineering**: Specialized oil channels aur washable surfaces.\n4. **Pan-India Delivery & 5-Year Structural Warranty**.\n\nDirect consultation ke liye hamare expert se +91 9810242841 ya info@ensis.in par sampark karein.',
        provider: 'fallback',
      };
    }
    return {
      reply: 'Ensis provides complete end-to-end **Turnkey Setups for Ayurvedic Clinics & Panchkarma Centers**:\n\n1. **2D/3D Room Layout & Space Planning**: Optimal placement of Droni tables, steam chambers, and Shirodhara stations.\n2. **Therapy Furniture Package**: Coordinated designs in seasoned solid teak finishes.\n3. **Oil Drainage Engineering**: Medicated oil-proof surfaces and custom drainage channels.\n4. **Pan-India Delivery & 5-Year Structural Warranty**.\n\nConnect directly with our clinic architect at +91 9810242841 or info@ensis.in.',
      provider: 'fallback',
    };
  }

  // 15. Conversational default response that carries the chat forward in user's language
  if (langStyle === 'devanagari') {
    return {
      reply: 'एन्सिस में हम विशेष रूप से प्रामाणिक आयुर्वेदिक पंचकर्म उपकरण और क्लिनिक इंफ्रास्ट्रक्चर के विशेषज्ञ निर्माता हैं। आपके इस विषय पर हमारी टेक्निकल टीम आपको कस्टमाइज़्ड सलाह और 2026 कैटलॉग शेयर कर सकती है।\n\nक्या आप नया क्लिनिक सेटअप प्लान कर रहे हैं, या किसी विशेष उपकरण के बारे में जानना चाहते हैं?',
      provider: 'fallback',
    };
  }
  if (langStyle === 'hinglish') {
    return {
      reply: 'Ensis mein hum authentic Ayurvedic Panchkarma equipment aur turnkey clinic setups ke direct manufacturers hain. Aapki requirement par hamari technical team detailed specifications aur 2026 catalogue share kar sakti hai.\n\nKya aap naya clinic setup plan kar rahe hain ya kisi specific therapy equipment ki jaankari chahte hain?',
      provider: 'fallback',
    };
  }
  return {
    reply: 'At Ensis, we specialize in authentic Ayurvedic Panchkarma therapy equipment and turnkey clinic infrastructure. Our technical specialist can provide detailed specifications, custom sizing, and our 2026 catalogue.\n\nAre you planning a new clinic setup, or looking for a specific therapy unit?',
    provider: 'fallback',
  };
}

const pageUrlOf = (value: unknown): string => (typeof value === 'string' ? value.trim().slice(0, 300) : '');

const visitorOf = (req: Request) => ({
  ip: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 60),
  userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
});

const DEFAULT_ENSIS_OVERVIEW = [
  {
    title: '🌿 Namaste! Welcome to Ensis',
    text: "India's premier manufacturer of authentic **Ayurvedic Panchkarma equipment**, therapy furniture, and **turnkey clinic setups**.\n\nHow may I assist you today? Feel free to ask about our **Droni tables**, **Shirodhara units**, **Steam Bath Chambers**, or request a custom quotation.\n\n📞 **Call:** [+91 9810242841](tel:+919810242841) | [+91 9654900525](tel:+919654900525)\n✉️ **Email:** [info@ensis.in](mailto:info@ensis.in)",
    greeting: true,
    link: { href: '/products', label: 'View Products' },
  },
];

// POST /api/chatbot/session
export const postChatbotSession = asyncHandler(async (req: Request, res: Response) => {
  const visitor = visitorOf(req);
  const clientIp = visitor.ip;

  const block = await ChatBlockModel.findOne({ ip: clientIp });
  if (block?.blockedUntil && block.blockedUntil > new Date()) {
    const blockedFor = block.blockedUntil.getTime() - Date.now();
    return successResponse(res, {
      sessionId: req.body?.sessionId || crypto.randomUUID(),
      blocked: true,
      blockedFor,
      replies: [],
      serverTime: Date.now(),
    });
  }

  const reqSessionId =
    typeof req.body?.sessionId === 'string' && req.body.sessionId.trim().length === 36
      ? req.body.sessionId.trim()
      : crypto.randomUUID();
  const lang = req.body?.lang === 'hi' ? 'hi' : 'en';
  const pageUrl = pageUrlOf(req.body?.pageUrl);

  let session = await ChatbotSessionModel.findOne({ sessionId: reqSessionId });
  if (!session) {
    session = await ChatbotSessionModel.create({
      sessionId: reqSessionId,
      lang,
      pageUrl,
      visitor,
      source: 'chat',
      messages: [],
    });
  }

  const history = (session.messages || []).map((m, idx) => ({
    id: idx + 1,
    from: m.role === 'assistant' ? 'bot' : m.role === 'agent' ? 'agent' : 'user',
    text: m.content,
    title: m.title,
    link: m.link?.href ? { href: m.link.href, label: m.link.label || 'Learn More' } : undefined,
    files: m.files,
    event: m.event,
    speakId: m.speakId,
    spoken: m.spoken,
    at: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
  }));

  const replies = history.length === 0 ? DEFAULT_ENSIS_OVERVIEW : [];

  return successResponse(res, {
    sessionId: session.sessionId,
    lang: session.lang || lang,
    replies,
    blocked: false,
    history,
    agent: session.agent || false,
    serverTime: Date.now(),
  });
});

// POST /api/chatbot/session/clear
export const postChatbotSessionClear = asyncHandler(async (req: Request, res: Response) => {
  const reqSessionId = req.body?.sessionId;
  const visitor = visitorOf(req);

  if (reqSessionId) {
    await ChatbotSessionModel.deleteMany({ sessionId: reqSessionId });
  }
  if (visitor.ip && visitor.ip !== '::1' && visitor.ip !== '127.0.0.1') {
    await ChatbotSessionModel.deleteMany({ 'visitor.ip': visitor.ip });
  } else {
    await ChatbotSessionModel.deleteMany({});
  }

  return successResponse(res, { cleared: true, serverTime: Date.now() }, 'All chats cleared successfully');
});

// POST /api/chatbot/message
export const postChatbotMessage = asyncHandler(async (req: Request, res: Response) => {
  const userText = String(req.body?.text ?? req.body?.message ?? req.body?.query ?? '').trim();
  const reqSessionId = req.body?.sessionId || crypto.randomUUID();
  const lang = req.body?.lang || req.body?.language || 'en';
  const pageUrl = pageUrlOf(req.body?.pageUrl);
  const userName = req.body?.userName;
  const visitor = visitorOf(req);

  // Check IP block
  const block = await ChatBlockModel.findOne({ ip: visitor.ip });
  if (block?.blockedUntil && block.blockedUntil > new Date()) {
    const blockedFor = block.blockedUntil.getTime() - Date.now();
    return successResponse(res, {
      sessionId: reqSessionId,
      blocked: true,
      blockedFor,
      reply: 'Chat is temporarily blocked.',
      replies: [],
    });
  }

  if (!userText) {
    return successResponse(res, {
      sessionId: reqSessionId,
      lang,
      reply: 'Namaste! How may I assist you with Ensis Panchkarma equipment or clinic setups today?',
      replies: DEFAULT_ENSIS_OVERVIEW,
      blocked: false,
      serverTime: Date.now(),
    });
  }

  let session = await ChatbotSessionModel.findOne({ sessionId: reqSessionId });
  if (!session) {
    session = await ChatbotSessionModel.create({
      sessionId: reqSessionId,
      lang,
      pageUrl,
      visitor,
      source: 'chat',
      messages: [],
    });
  }

  let knowledge = '';
  try {
    knowledge = buildKnowledge(await getPublishedConfigService());
  } catch (err) {
    console.error('Failed to load published answers:', err);
  }

  try {
    knowledge += await buildCatalog();
  } catch (err) {
    console.error('Failed to load catalog:', err);
  }

  // Multi-turn history from previous messages in this session
  const history = (session.messages || [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-16)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
    }));

  // Extract phone number if user provides it in the message
  const phoneMatch = userText.match(/(?:\+?91[\s-]*)?([6-9]\d{9})\b/);
  let autoOtpSent = false;
  if (phoneMatch) {
    const rawPhone = phoneMatch[1];
    session.phone = rawPhone;
    session.capturedLead = true;
    if (!session.phoneVerifiedAt) {
      try {
        await sendPhoneOtp(rawPhone, 'CONTACT', session.userName || 'Client');
        autoOtpSent = true;
      } catch (otpErr) {
        console.warn('sendPhoneOtp error:', (otpErr as Error).message);
      }
    }
  }

  // Extract name if user introduces themselves
  const nameMatch = userText.match(/(?:(?:my name is|mera naam|i am|this is|i'm|naam hai)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?))/i);
  if (nameMatch && !session.userName) {
    session.userName = nameMatch[1].trim();
  }

  // Extract OTP if user types a 6-digit code
  const otpMatch = userText.match(/\b\d{6}\b/);
  let autoOtpVerified = false;
  if (otpMatch && session.phone && !session.phoneVerifiedAt) {
    try {
      await verifyPhoneOtp(session.phone, otpMatch[0]);
      session.phoneVerifiedAt = new Date();
      session.capturedLead = true;
      autoOtpVerified = true;

      const questions = (session.messages || [])
        .filter((m) => m.role === 'user')
        .slice(-5)
        .map((m) => `• ${m.content}`)
        .join('\n');

      try {
        const { enquiry } = await saveVerifiedChatbotLead({
          phone: session.phone,
          name: session.userName,
          userQuery: questions ? `User questions asked before OTP verification:\n${questions}` : `Verified via chat OTP. User input: ${userText}`,
        });
        if (enquiry) {
          session.enquiryId = String(enquiry._id);
        }
      } catch (saveErr) {
        console.warn('saveVerifiedChatbotLead error:', (saveErr as Error).message);
      }
    } catch (verifyErr) {
      console.warn('verifyPhoneOtp error:', (verifyErr as Error).message);
    }
  }

  const activeUserName = req.body?.userName || session.userName || userName;

  const generated = await generateBotReply(userText, history, activeUserName, lang, knowledge);
  let replyText = generated.reply.replace(/\s*\[\[\s*LEAD\s*\]\]\s*/gi, ' ').trim();

  if (autoOtpVerified) {
    const isHi = lang === 'hi';
    replyText = isHi
      ? `✅ धन्यवाद ${session.userName ? session.userName + ' जी' : ''}! आपका मोबाइल नंबर +91 ${session.phone} सफलतापूर्वक सत्यापित हो गया है। हमारी पंचकर्म टेक्निकल टीम जल्द ही WhatsApp पर आपसे संपर्क करेगी और कम्प्लीट कोटेशन शेयर करेगी। आप और क्या जानना चाहते हैं?`
      : `✅ Thank you ${session.userName ? session.userName : ''}! Your mobile number +91 ${session.phone} has been verified successfully. Our Ayurvedic specialist will connect with you on WhatsApp shortly to share our 2026 catalogue and custom quotation. How else may I assist you today?`;
  } else if (autoOtpSent) {
    const isHi = lang === 'hi';
    replyText = isHi
      ? `${replyText}\n\n📱 *मैंने आपके WhatsApp नंबर +91 ${session.phone} पर 6-अंकों का OTP भेज दिया है।* कृपया पुष्टि के लिए यहाँ 6-अंकों का OTP दर्ज करें।`
      : `${replyText}\n\n📱 *I have sent a 6-digit verification OTP to your WhatsApp number +91 ${session.phone}.* Please enter the 6-digit code here to verify and connect with our specialist.`;
  }

  const userMsgCount = (session.messages || []).filter((m) => m.role === 'user').length + 1;
  const needsOtp = userMsgCount >= 2 && !session.phoneVerifiedAt;

  const nextSpeakId = (session.messages?.length || 0) + 1;
  session.messages.push({
    role: 'user',
    content: userText,
    timestamp: new Date(),
  });
  session.messages.push({
    role: 'assistant',
    content: replyText,
    speakId: nextSpeakId,
    timestamp: new Date(),
  });
  await session.save();

  return successResponse(res, {
    sessionId: session.sessionId,
    lang,
    reply: replyText,
    replies: [
      {
        text: replyText,
        speakId: nextSpeakId,
      },
    ],
    provider: generated.provider,
    showLeadForm: /\[\[\s*LEAD\s*\]\]/i.test(generated.reply),
    blocked: false,
    end: /goodbye|have a nice day|alvida/i.test(replyText),
    serverTime: Date.now(),
    needsOtp,
    otpSent: autoOtpSent,
    leadVerified: Boolean(session.phoneVerifiedAt),
    phone: session.phone || '',
  });
});

// GET /api/chatbot/updates
export const getChatbotUpdates = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.query.session || '').trim();
  const since = Number(req.query.since) || 0;

  if (!sessionId) {
    return successResponse(res, { agent: false, messages: [], serverTime: Date.now() });
  }

  const session = await ChatbotSessionModel.findOne({ sessionId }).lean();
  if (!session) {
    return successResponse(res, { agent: false, messages: [], serverTime: Date.now() });
  }

  const fresh = (session.messages || [])
    .filter((m) => m.role === 'agent' && new Date(m.timestamp).getTime() > since)
    .map((m) => ({
      text: m.content,
      event: m.event,
      files: m.files,
      at: new Date(m.timestamp).getTime(),
    }));

  return successResponse(res, {
    agent: session.agent || false,
    messages: fresh,
    serverTime: Date.now(),
  });
});

// GET /api/chatbot/speak
export const getChatbotSpeak = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.query.session || '').trim();
  const messageIndex = Number(req.query.message);

  if (!sessionId || isNaN(messageIndex)) {
    throw new AppError(400, 'Invalid session or message index');
  }

  const session = await ChatbotSessionModel.findOne({ sessionId }).lean();
  const message = session?.messages?.[messageIndex - 1] || session?.messages?.[messageIndex];
  const textToSpeak = message?.spoken || message?.content || '';

  if (!textToSpeak) {
    throw new AppError(404, 'Nothing to read out');
  }

  await streamSpeech(textToSpeak, res);
});

// POST /api/chatbot/call
export const postChatbotCall = asyncHandler(async (req: Request, res: Response) => {
  const sdp = typeof req.body?.sdp === 'string' ? req.body.sdp.slice(0, 20000) : '';
  if (!sdp) throw new AppError(400, 'No SDP connection offer received');

  const sessionId =
    typeof req.body?.sessionId === 'string' && req.body.sessionId.trim().length === 36
      ? req.body.sessionId.trim()
      : crypto.randomUUID();
  const visitor = visitorOf(req);

  const block = await ChatBlockModel.findOne({ ip: visitor.ip });
  if (block?.blockedUntil && block.blockedUntil > new Date()) {
    return successResponse(res, { blocked: true, blockedFor: block.blockedUntil.getTime() - Date.now() });
  }

  const callResult = await startWebRtcCall({
    sdp,
    sessionId,
    lang: req.body?.lang === 'hi' ? 'hi' : 'en',
    noise: req.body?.noise !== false,
    ip: visitor.ip,
  });

  return successResponse(res, callResult);
});

// POST /api/chatbot/call/turn
export const postChatbotCallTurn = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  const role = req.body?.role === 'user' ? 'user' : 'assistant';
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

  if (sessionId && text) {
    await ChatbotSessionModel.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: { role, content: text, timestamp: new Date() },
        },
      },
      { upsert: true }
    );
  }

  return successResponse(res, { text, role, ok: true });
});

// POST /api/chatbot/call/tool
export const postChatbotCallTool = asyncHandler(async (req: Request, res: Response) => {
  const { name, args, sessionId } = req.body;

  if (name === 'update_visitor' && args?.name && sessionId) {
    await ChatbotSessionModel.findOneAndUpdate({ sessionId }, { $set: { userName: String(args.name).trim() } });
    return successResponse(res, { output: { ok: true, name: args.name } });
  }

  if (name === 'continue_typing') {
    return successResponse(res, { output: { ok: true } });
  }

  return successResponse(res, { output: { ok: true } });
});

// POST /api/chatbot/call/say
export const postChatbotCallSay = asyncHandler(async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) throw new AppError(400, 'No text provided for speech');
  await streamSpeech(text, res);
});

// POST /api/chatbot/call/end
export const postChatbotCallEnd = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  if (sessionId) {
    endActiveCall(sessionId);
  }
  return successResponse(res, { ended: true });
});

export interface VerifiedLeadParams {
  phone: string;
  name?: string;
  country?: string;
  userQuery?: string;
}

/**
 * Saves a verified phone lead into:
 * 1. LeadModel (Ensis CRM Leads Pipeline)
 * 2. EnquiryModel (Incoming Enquiries)
 * 3. Sends instant WhatsApp confirmation message to the user's phone via Opus API
 */
export const saveVerifiedChatbotLead = async ({ phone, name, country, userQuery }: VerifiedLeadParams) => {
  const cleanDigits = phone.replace(/\D/g, '').slice(-10);
  if (!cleanDigits || cleanDigits.length < 10) return { lead: null, enquiry: null };

  const rawName = (name || '').trim();
  const nameParts = rawName ? rawName.split(/\s+/) : [];
  const firstName = nameParts[0] || 'Valued';
  const lastName = nameParts.slice(1).join(' ') || 'Client';
  const fullName = rawName || 'Valued Client';

  // 1. Upsert into LeadModel (Ensis CRM Leads)
  let lead = null;
  try {
    const existingLead = await LeadModel.findOne({ phone: cleanDigits });
    const leadEmail = existingLead?.email || `${cleanDigits}@whatsapp.ensis.in`;
    const resolvedFirstName = existingLead?.firstName && existingLead.firstName !== 'Valued' ? existingLead.firstName : firstName;
    const resolvedLastName = existingLead?.lastName && existingLead.lastName !== 'Client' ? existingLead.lastName : lastName;
    const resolvedNotes = existingLead?.leadNotes
      ? `${existingLead.leadNotes}\n[${new Date().toISOString().slice(0, 10)}] Verified in chatbot. ${userQuery || ''}`.trim()
      : `Verified via WhatsApp OTP in live website chatbot. ${userQuery ? `Enquiry details:\n${userQuery}` : ''}`.trim();

    lead = await LeadModel.findOneAndUpdate(
      { phone: cleanDigits },
      {
        $set: {
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          phone: cleanDigits,
          phoneCode: '+91',
          email: leadEmail,
          leadSource: existingLead?.leadSource || 'WhatsApp',
          leadStatus: existingLead?.leadStatus || 'New',
          priority: 'High',
          leadCategory: 'hot',
          followUpMethod: 'WhatsApp',
          country: country || existingLead?.country || 'India',
          leadNotes: resolvedNotes,
        },
        $setOnInsert: {
          companyName: 'Individual',
          leadDate: new Date().toISOString().slice(0, 10),
          followUpDate: new Date().toISOString().slice(0, 10),
          interestedProduct: 'Ayurvedic Panchkarma Equipment / Clinic Setup',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (leadErr) {
    console.error('saveVerifiedChatbotLead LeadModel error:', (leadErr as Error).message);
  }

  // 2. Create in EnquiryModel (Enquiries Pipeline)
  let enquiry = null;
  try {
    enquiry = await EnquiryModel.create({
      fullName,
      mobileNumber: cleanDigits,
      email: `${cleanDigits}@whatsapp.ensis.in`,
      projectType: 'Ayurvedic Equipment / Clinic Setup',
      message: [
        country ? `Country: ${country}` : '',
        userQuery
          ? `Verified via WhatsApp OTP in website chatbot.\n${userQuery}`
          : 'Verified callback request from website chatbot.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      preferredContact: 'WhatsApp',
      agreeToContact: true,
      status: 'new',
      isRead: false,
      source: 'chatbot',
    });
  } catch (enqErr) {
    console.error('saveVerifiedChatbotLead EnquiryModel error:', (enqErr as Error).message);
  }

  // 3. Send official WhatsApp confirmation message to user's phone via Opus API
  try {
    const displayName = fullName !== 'Valued Client' ? fullName : 'ji';
    const confirmationMsg = `Namaste ${displayName}! 🙏

Thank you for connecting with *Ensis — Authentic Ayurvedic & Panchkarma Equipment*.

✅ Your mobile number (*+91 ${cleanDigits}*) has been verified successfully.

🌿 Our technical specialist will connect with you shortly on WhatsApp to share our *2026 Product Catalogue* and custom clinic quotation.

📞 Direct Specialist Support:
• Call / WhatsApp: +91 9810242841 / +91 9654900525
• Email: info@ensis.in
• Website: https://ensis.in

— Team Ensis (Panchkarma & Wellness Spaces)`;

    let formattedPhone = cleanDigits;
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
    await sendWhatsAppMessage(formattedPhone, confirmationMsg, fullName !== 'Valued Client' ? fullName : null);
  } catch (waErr) {
    console.error('saveVerifiedChatbotLead sendWhatsAppMessage error:', (waErr as Error).message);
  }

  return { lead, enquiry };
};

const leadContact = (body: any) => {
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 25) : '';
  const country = typeof body?.country === 'string' ? body.country.trim().slice(0, 60) : '';
  const digits = phone.replace(/\D/g, '');
  if (!name) throw new AppError(400, 'Please enter your name.');
  if (digits.length < 7 || digits.length > 15) throw new AppError(400, 'Please enter a valid mobile number.');
  return { name, phone, country };
};

// POST /chatbot/lead/otp
export const postChatbotLeadOtp = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone } = leadContact(req.body);
  const session = req.body?.sessionId ? String(req.body.sessionId).trim() : '';
  if (session) {
    await ChatbotSessionModel.findOneAndUpdate(
      { sessionId: session },
      { $set: { phone, userName: name } }
    ).catch(() => {});
  }
  await sendPhoneOtp(phone, 'CONTACT', name);
  successResponse(res, { sent: true }, 'OTP sent on WhatsApp');
});

// POST /chatbot/lead
export const postChatbotLead = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, country } = leadContact(req.body);
  const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
  if (!/^\d{4,8}$/.test(otp)) throw new AppError(400, 'Please enter the OTP sent on WhatsApp.');
  await verifyPhoneOtp(phone, otp);
  const verifiedAt = new Date();

  const session = req.body.sessionId ? String(req.body.sessionId).trim() : '';
  const chat = session ? await ChatbotSessionModel.findOne({ sessionId: session }).lean() : null;
  const questions = (chat?.messages || [])
    .filter((m) => m.role === 'user')
    .slice(-5)
    .map((m) => `• ${m.content}`)
    .join('\n');

  const { lead, enquiry } = await saveVerifiedChatbotLead({
    phone,
    name,
    country,
    userQuery: questions ? `Questions asked in chat:\n${questions}` : 'Lead Card submission via Chatbot',
  });

  if (session) {
    await ChatbotSessionModel.findOneAndUpdate(
      { sessionId: session },
      {
        $set: {
          userName: name,
          phone,
          capturedLead: true,
          phoneVerifiedAt: verifiedAt,
          ...(enquiry ? { enquiryId: String(enquiry._id) } : {}),
          ...(pageUrlOf(req.body.pageUrl) ? { pageUrl: pageUrlOf(req.body.pageUrl) } : {}),
        },
        $setOnInsert: { source: 'chat', visitor: visitorOf(req) },
      },
      { upsert: true, runValidators: true }
    );
  }

  successResponse(
    res,
    {
      leadId: lead ? String(lead._id) : undefined,
      enquiryId: enquiry ? String(enquiry._id) : undefined,
    },
    'Callback request received and verified',
    201
  );
});

export const getConversationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    ChatbotSessionModel.find().sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    ChatbotSessionModel.countDocuments(),
  ]);

  successResponse(res, {
    sessions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const totalSessions = await ChatbotSessionModel.countDocuments();
  const capturedLeads = await ChatbotSessionModel.countDocuments({ capturedLead: true });
  const totalMessagesResult = await ChatbotSessionModel.aggregate([
    { $project: { count: { $size: '$messages' } } },
    { $group: { _id: null, total: { $sum: '$count' } } },
  ]);

  const totalMessages = totalMessagesResult[0]?.total || 0;

  const avgDuration = await ChatbotSessionModel.aggregate([
    {
      $project: {
        duration: {
          $subtract: [{ $ifNull: ['$updatedAt', '$createdAt'] }, { $ifNull: ['$createdAt', new Date(0)] }],
        },
      },
    },
    { $group: { _id: null, avg: { $avg: '$duration' } } },
  ]);

  const avgMs = avgDuration[0]?.avg || 0;
  const avgMinutes = Math.round(avgMs / 60000);

  const topQueries = await ChatbotSessionModel.aggregate([
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user' } },
    { $group: { _id: '$messages.content', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  successResponse(res, {
    totalSessions,
    capturedLeads,
    totalMessages,
    avgSessionDurationMinutes: avgMinutes,
    topQueries: topQueries.map((q) => ({ query: q._id, count: q.count })),
  });
});
