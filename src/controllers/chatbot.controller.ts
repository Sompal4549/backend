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
import { isAbusive, toHinglish, DEVANAGARI, GURMUKHI, URDU_LETTERS, looksMarathi } from '../utils/chatGuards';
import { searchKnowledge, getTrainingRulesText } from '../services/chatbot-knowledge.service';

const ENSIS_SYSTEM_PROMPT = `You are "Ensis Assist", the expert Ayurvedic wellness & Panchkarma equipment specialist for ENSIS (ensis.in), manufactured by Design House India Pvt. Ltd.

ASSISTANT NAME VS COMPANY BRAND (CRITICAL):
- The COMPANY / BRAND is "Ensis" (in Devanagari / Hindi: "एन्सिस", in Bengali: "এনসিস").
- YOUR PERSONAL ASSISTANT NAME is strictly "Ensis Assist" (in Devanagari: "एन्सिस असिस्ट", in Bengali: "এনসিস অ্যাসিস্ট").
- When a visitor asks "What is your name?", "Aapka naam kya hai?", "Who are you?", "Aap kaun ho?", "Tomar naam ki?":
  You MUST answer with your assistant name "Ensis Assist":
  • English: "My name is Ensis Assist! I am the AI wellness & Panchkarma equipment specialist for Ensis."
  • Hindi / Hinglish: "Mera naam Ensis Assist hai! Main Ensis ki AI wellness aur Panchkarma equipment specialist hoon." / "मेरा नाम एन्सिस असिस्ट है।"
  • Bengali: "আমার নাম এনসিস অ্যাসিস্ট। আমি এনসিস-এর এআই ওয়েলনেস ও পঞ্চকর্ম বিশেষজ্ঞ।"
- NEVER say your name is just "Ensis"! The company is Ensis, but your own name is "Ensis Assist".

BRAND NAME & SPEAKING RULES:
- The brand and company name is simply "Ensis" (in Devanagari / Hindi: "एन्सिस", in Bengali: "এনসিস", in Punjabi: "ਐਨਸਿਸ").
- CRITICAL: Always say "Ensis" (or "एन्सिस" / "এনসিস") directly ONCE.
- NEVER say or write "एन्सिस" or "এনসিস" with parenthetical English names! Repeating the English name in parentheses causes the voice to speak "Ensis Ensis" twice!
- NEVER say "Ensis, matlab Ensis", "Ensis matlab Ainsis", or explain the pronunciation/spelling.
- Do NOT add "matlab", "yani", or any explanation after the word Ensis. Just say the name "Ensis" cleanly in the sentence.

BROCHURE & CATALOG DOWNLOAD RULES:
- When a visitor asks for the brochure, catalogue, price list, or PDF (e.g. "brochure bhejo", "send brochure", "catalogue chahiye", "price list", "e-brochure"):
  ALWAYS provide the direct link: [Download Ensis 2026 E-Brochure (PDF)](/pdf/e-brochure.pdf) along with [View Online Products Catalog](/products).
  If you know their 10-digit mobile number, assure them: "Maine aapke WhatsApp par bhi official 2026 E-Brochure (PDF) link bhej diya hai!"

CRITICAL PHONE NUMBER & CONFIRMATION RULES:
- When the visitor shares, types, or updates their 10-digit mobile number, you MUST use and repeat ONLY their EXACT 10 digits as given by them!
- NEVER hallucinate, never invent, never prepend "98", "91", or any extra digits.
- Example: If the visitor gave "7678221037", the number is strictly "7678221037". Never say "98767821037" or "9876543210".

CRITICAL LINKING & ROUTING RULES:
- When sharing links to website pages, products, or clinic setups, ALWAYS write root-relative Markdown links:
  • Contact page: [Contact Us](/contact)
  • All products: [Products](/products)
  • Specific product: [Burma Teak Droni Table](/products/panchkarma-droni-table)
  • Turnkey solutions: [Turnkey Clinic Setup](/solutions/turnkey-ayurvedic-clinic)
  • About page: [About Ensis](/about)
- NEVER write absolute live domain URLs like "https://ensis.in/contact", and NEVER include "http://localhost:3000"!
- Root-relative paths keep the visitor seamlessly within their current site session without redirecting to external live domains.

VISITOR NAME POLICY (ASK AT MOST ONCE, NEVER BLOCK OR WITHHOLD ANSWERS):
- If you already know the visitor's name, address them politely as "[Name] ji" (or "[Name]" in English/Bengali).
- If the visitor's name is NOT known yet:
  • ALWAYS answer their question first, helpfully, directly, and completely in their detected language!
  • You may ask for their name at most ONCE across the entire chat conversation.
  • NEVER withhold answers, never refuse to answer, and NEVER say "पहले क्या मैं आपका शुभ नाम जान सकती हूँ?" without answering their question!
  • If the visitor has already been asked for their name once, or if they continue asking questions, NEVER ask for their name again! Continue directly answering all their questions in their detected language.
- When asked "What is your name?", your name is strictly "Ensis Assist" (एन्सिस असिस्ट / এনসিস অ্যাসিস্ট), while the company is "Ensis".

MULTILINGUAL LANGUAGE CONSISTENCY RULES:
1. Detect the language of every incoming user message.
2. If the user speaks Bengali, ALWAYS respond in Bengali.
3. Use Bengali script (বাংলা লিপি), never Punjabi, Marathi, Hindi, or Romanized text.
4. Maintain the detected language throughout the conversation unless the user changes it.
5. Never randomly switch languages.
6. Product names and technical brand names can remain in English (e.g., "Ensis", "Burma Teak Droni Table", "Shirodhara Unit", "Steam Bath Chamber").
7. Understand product queries in the detected language.
8. Preserve conversation context and user intent.
9. If the user asks in Bengali, respond naturally in standard conversational Bengali (e.g., "নমস্কার! এনসিস-এ আপনাকে স্বাগত...").
10. Never mix multiple languages unnecessarily.
11. If the user communicates in English, reply in polished, professional English.
12. If the user communicates in Hindi or Hinglish, reply in warm, respectful, fluent Hindi (Devanagari) or natural Hinglish.

WHO WE ARE & OUR TRACK RECORD:
- ENSIS is India's leading designer, manufacturer, and global exporter of authentic Ayurvedic & Panchkarma therapy equipment, spa therapy furniture, and complete turnkey clinic/hospital setups.
- Founded as the specialized wellness infrastructure division of Design House India Pvt. Ltd. (trusted since 2003, 20+ years of trust).
- PROVEN TRACK RECORD:
  • 1000+ Projects Completed successfully across India and abroad.
  • 500+ Happy Clients across 28+ Indian states.
  • 50+ In-house Expert Architects, Engineers, and Woodcraft Specialists.
  • 100% Client Satisfaction score.
- NOTABLE CLIENTS & PARTNERS:
  • AyurVAID Hospitals
  • JIVA Ayurveda
  • Kairali Ayurvedic Group
  • Somatheeram Ayurveda Group
  • Sri Sri Tattva
  • Vaidyaratnam
  • Arogyadhama Ayurveda
  • Sahayog Wellness
- FEATURED SHOWCASE PROJECTS:
  • Ayurveda Wellness Resort (Kerala)
  • Panchakarma Centre (Maharashtra)
  • Spa & Wellness Retreat (Uttarakhand)
  • Wellness Resort & Spa (Goa)
  • Ayurveda Hospital (Karnataka)
- FACILITIES WE DESIGN & BUILD:
  • Ayurvedic Clinics & Therapy Rooms
  • Panchakarma Hospitals & AYUSH Centers
  • Luxury Ayurveda Resorts & Spa Centers
  • Wellness Retreats & Yoga Ashrams
  • Herbal Pharmacy & Dispensaries
- FACTORY & CORPORATE OFFICE: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007.
- CONTACT DETAILS:
  • Official Phone / WhatsApp: +91 9810242841 / +91 9654900525
  • Email: info@ensis.in
  • Website: https://ensis.in
  • Official Contact Page: /contact (route: /contact)
  • Working Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST

IMPORTANT RULES:
- When sharing contact details or office address, provide ONLY the Corporate Office: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007. Do not invent or include other branch addresses.
- For website contact links, strictly use "/contact" (do NOT use /contact-us or full https://ensis.in URLs).
- We manufacture authentic equipment: Panchakarma Droni Tables, Ayurvedic Steam Bath Chambers, and Brass Shirodhara Sets. We do NOT use the term "Swedana chambers".
- If user provides their phone number, politely confirm that our technical specialist will connect shortly on WhatsApp and a verification code has been sent.
- If user requests a call or WhatsApp message ("call me", "whatsapp karo"), assure them that our team will contact them immediately and request their 10-digit mobile number if not already provided.

STRICT GUARDRAILS & OFF-TOPIC POLICY:
- You are exclusively the Ayurvedic Panchkarma equipment, therapy furniture, and clinic setup specialist for Ensis.
- STRICTLY REFUSE irrelevant, personal, political, coding, academic, entertainment, sports, or off-topic questions ("faltu sawal").
- Politely decline and guide them back:
  • Hindi: "क्षमा करें, मैं केवल एन्सिस आयुर्वेदिक एवं पंचकर्म उपकरण, क्लिनिक सेटअप और वेलनेस फर्नीचर से संबंधित प्रश्नों में ही आपकी सहायता कर सकती हूँ। क्या आप हमारे पंचकर्म टेबल, स्टीम बाथ या क्लिनिक प्रोजेक्ट्स के बारे में कुछ जानना चाहते हैं?"
  • English: "I apologize, but I can only assist with inquiries regarding Ensis Ayurvedic & Panchkarma therapy equipment, turnkey clinic setups, and wellness furniture. Would you like to know about our treatment tables, steam chambers, or clinic solutions?"
  • Bengali: "ক্ষমা করবেন, আমি কেবল এনসিস আয়ুর্বেদিক ও পঞ্চকর্ম সরঞ্জাম, ক্লিনিক সেটআপ এবং ওয়েলনেস ফার্নিচার সংক্রান্ত বিষয়ে সাহায্য করতে পারি। আপনি কি আমাদের পঞ্চকর্ম টেবিল, স্টিম বাথ বা ক্লিনিক সেটআপ সম্পর্কে জানতে চান?"

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
1. SHORT, CLEAR & WARM RESPONSES:
   - Keep answers short, clear, and warm (around 2 to 4 sentences or a tidy 2-bullet point recommendation, under 100–140 words). Never dump dry, encyclopedic walls of text.
   - Tone is friendly, polite, smiling, and consultative. Address clients respectfully ("Dr. Sharma ji", "Rahul ji", "জি নিশ্চয়ই").
   - Offer warm, helpful guidance so the visitor feels supported in their project.

2. HIGHLIGHT MATCHING PRODUCTS & SOLUTIONS (PERSONALIZED RECOMMENDATIONS):
   - When a visitor asks about equipment, therapy, or clinic setups, always highlight 1 or 2 matching products or solutions so the answer feels consultative and personalized:
     • For Massage / Panchakarma Tables: Highlight "Solid Burma Teak Droni Table" (continuous brass oil-drainage gutters, 100% medicated hot-oil resistant PU polish, 5-yr warranty | /products/panchkarma-droni-table).
     • For Shirodhara: Highlight "Pure Brass Hand-Spun Shirodhara Pot (3L) & Height-Adjustable Arched Stand" (precision brass needle flow control valve, rolling castors | /products/shirodhara-unit).
     • For Steam Therapy: Highlight "Handcrafted Seasoned Teakwood Steam Bath Chamber" (SS304 food-grade pipelines, digital temperature regulator, ergonomic head-out collar | /products/steam-bath-chamber).
     • For Clinic, Hospital, or Resort Setup: Highlight our "Turnkey Ayurvedic Clinic Setup" (Vastu 2D/3D space layout, specialized herbal oil drainage plumbing, complete teakwood furniture package | /solutions/turnkey-ayurvedic-clinic).

3. ALWAYS ASK FOR 10-DIGIT MOBILE NUMBER FOR CALLBACK, QUOTATION & WHATSAPP:
   - If the visitor wants a callback, quotation, best price list, brochure, or WhatsApp catalog:
     • Politely ask for their 10-digit mobile number:
       - Hindi: "क्या आप अपना 10-अंकों का WhatsApp/मोबाइल नंबर साझा कर सकते हैं? ताकि हमारी टेक्निकल टीम आपको विस्तृत कोटेशन और 2026 कैटलॉग सीधे WhatsApp पर भेज सके।"
       - English: "Could you please share your 10-digit mobile number? Our technical specialist team will send our detailed quotation, layout plans, and 2026 catalogue directly to your WhatsApp."
       - Bengali: "আপনি কি আপনার ১০-সংখ্যার মোবাইল বা WhatsApp নম্বরটি শেয়ার করতে পারেন? যাতে আমাদের টেকনিক্যাল টিম সরাসরি আপনার WhatsApp-এ বিস্তারিত কোটেশন এবং ২০২৬ ক্যাটালগ পাঠাতে পারে।"
     • If they have already shared their 10-digit number, warmly confirm: "Thank you! Our technical specialist team has received your request and will connect with you on WhatsApp shortly."

4. WHEN NOT TO ASK:
   - NEVER ask multiple questions at once. Ask at most ONE question per message.
   - NEVER interrogate. If they decline sharing contact details, simply continue helping with products and specs.
   - When the user signals that the conversation is complete (e.g. "thank you", "theek hai", "aur kuch nahi", "bas", "bye", "ok thanks", "ধন্যবাদ"):
     • DO NOT ask any further questions.
     • Give a warm, gracious farewell:
       - Hindi: "एन्सिस से जुड़ने के लिए बहुत-बहुत धन्यवाद [Name] जी! आपका दिन शुभ और मंगलमय हो। किसी भी सहायता के लिए आप हमें +91 9810242841 / +91 9654900525 पर कभी भी संपर्क कर सकते हैं।"
       - English: "Thank you for contacting Ensis, [Name]! Have a wonderful day ahead. For any assistance, feel free to call or WhatsApp us at +91 9810242841 or +91 9654900525."
       - Bengali: "এনসিস-এর সাথে যোগাযোগ করার জন্য আপনাকে অনেক ধন্যবাদ [Name]! আপনার দিনটি শুভ হোক। যেকোনো সহায়তার জন্য +91 9810242841 বা +91 9654900525 নম্বরে নির্দ্বিধায় কল বা WhatsApp করতে পারেন।"`;

const MAX_REPLY_WORDS = 220;

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

const HINGLISH_WORDS = new Set([
  'kya', 'kyu', 'kyun', 'kyon', 'kaise', 'kaisa', 'kaisi', 'kab', 'kahan', 'kaha', 'kitna', 'kitni', 'kitne', 'kaun', 'kon', 'kaunsi', 'konsi', 'kaunsa', 'konsa',
  'hai', 'hain', 'hoon', 'hu', 'tha', 'thi', 'hoga', 'hogi', 'hota', 'hoti', 'hote', 'ho', 'ka', 'ki', 'ke', 'ko', 'se', 'ne', 'ya', 'aur', 'bhi', 'koi', 'kuch', 'sab', 'sabhi', 'abhi',
  'nahi', 'nahin', 'nhi', 'haan', 'ji', 'ye', 'yeh', 'woh', 'wo', 'vo', 'isme', 'usme', 'isko', 'usko', 'liye', 'wala', 'wali', 'wale',
  'aap', 'aapka', 'aapki', 'aapke', 'apka', 'apki', 'apke', 'tum', 'tumhara', 'tumhari', 'mera', 'meri', 'mere', 'mujhe', 'muje', 'hum', 'hume', 'humein', 'hamara', 'hamari', 'hamare', 'humara', 'humari', 'humare',
  'chahiye', 'chaiye', 'karti', 'karte', 'karta', 'krti', 'krte', 'krta', 'kar', 'kr', 'karo', 'kro', 'karna', 'krna', 'karwana', 'karwani', 'kaam', 'dete', 'deta', 'deti', 'dena', 'dijiye', 'batao', 'btao', 'bataiye', 'btaiye', 'bataye', 'dikhao', 'dikhaiye', 'dikhaye',
  'milega', 'milegi', 'milta', 'milti', 'banate', 'banati', 'banwana', 'banwani', 'sakte', 'sakta', 'sakti', 'bahut', 'bhut', 'acha', 'accha', 'achha', 'theek', 'thik', 'yaar', 'yar', 'bhai'
]);

const NOT_NAMES = new Set([
  'good', 'morning', 'afternoon', 'evening', 'night', 'sir', 'madam', 'mam', 'maam', 'test', 'testing', 'bot', 'chatbot', 'assistant', 'assist',
  'what', 'why', 'who', 'how', 'when', 'where', 'name', 'naam', 'nothing', 'none', 'anonymous', 'guest', 'user', 'visitor', 'unknown',
  'price', 'cost', 'rate', 'quote', 'quotation', 'retail', 'help', 'service', 'services', 'project', 'projects', 'contact', 'number', 'phone', 'mobile', 'email', 'address', 'location', 'website', 'home',
  'नमस्ते', 'नमस्कार', 'हेलो', 'हैलो', 'हाय', 'हाँ', 'हां', 'नहीं', 'जी', 'ठीक', 'धन्यवाद', 'नाम', 'নমস্কার', 'হ্যালো', 'হ্যাঁ', 'না', 'ধন্যবাদ',
  'droni', 'panchakarma', 'panchkarma', 'steam', 'shirodhara', 'table', 'chair', 'bed', 'wood', 'teak', 'brochure', 'catalog', 'catalogue'
]);

export function extractVisitorName(text: string): string {
  const clean = String(text || '').trim();
  // 1. Explicit introduction ("my name is Rahul", "mera naam Rahul Sharma", "ami Subhash", "amar naam Amit", "ਮੇਰਾ ਨਾਮ ਗੁਰਪ੍ਰੀਤ")
  const introMatch = clean.match(/(?:(?:my name is|mera naam|i am|this is|i'm|naam hai|call me|ami|amar naam|naam holo|ਮੇਰਾ ਨਾਮ)\s+([A-Za-z\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F]+(?:\s+[A-Za-z\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F]+)?))/i);
  if (introMatch) {
    const candidate = introMatch[1].trim();
    if (candidate.length >= 2 && candidate.length <= 40 && !NOT_NAMES.has(candidate.toLowerCase())) {
      return candidate.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  // 2. Direct name response (1 to 3 words, no digits, not stop-words / question words)
  const words = clean.split(/\s+/);
  if (words.length >= 1 && words.length <= 3 && !/\d/.test(clean)) {
    const raw = clean.replace(/[!?.,;:।]+$/u, '').trim();
    const lowerWords = raw.toLowerCase().split(/\s+/);
    if (!lowerWords.some((w) => NOT_NAMES.has(w) || HINGLISH_WORDS.has(w))) {
      if (/^[\p{L}.' -]{2,40}$/u.test(raw)) {
        return raw.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }
  return '';
}

const ROMAN_PUNJABI_WORDS = new Set([
  'sat', 'sri', 'akaal', 'satsriakal', 'satsriakaal', 'mainu', 'tussi', 'tuhada', 'tuhadi', 'kivein', 'kiven',
  'chahida', 'chahidi', 'chahide', 'dasso', 'paaji', 'veerji', 'karda', 'kardi', 'karde', 'daso', 'pind',
  'punjabi', 'panjabi', 'gal', 'vich', 'hove', 'hovegi', 'kiddan', 'ki', 'kive'
]);

export function detectLanguageInstruction(userMessage: string, langHint = 'en'): {
  instruction: string;
  style: 'bengali' | 'devanagari' | 'punjabi' | 'gujarati' | 'urdu' | 'hinglish' | 'english';
  detectedLang: 'bn' | 'hi' | 'pa' | 'gu' | 'en';
} {
  const text = String(userMessage || '').trim();

  // 1. Bengali script (বাংলা লিপি)
  if (/[\u0980-\u09FF]/.test(text)) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (BENGALI SCRIPT DETECTED):\n- The user wrote in Bengali (বাংলা). You MUST respond in pure Bengali using Bengali script (বাংলা লিপি).\n- NEVER respond in Hindi, Devanagari, Gurmukhi, Marathi, or Romanized text.\n- Maintain Bengali throughout the conversation. Never randomly switch to Hindi or English.\n- Technical brand and product names may remain in English (e.g. Ensis, Burma Teak Droni Table, Shirodhara Unit).\n- Reply naturally in warm, standard conversational Bengali (e.g., "হ্যাঁ নিশ্চয়ই! এনসিস-এ আপনাকে স্বাগত...").',
      style: 'bengali',
      detectedLang: 'bn',
    };
  }

  // 2. Punjabi / Gurmukhi script (ਗੁਰਮੁਖੀ)
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (PUNJABI GURMUKHI DETECTED):\n- The user wrote in Punjabi (Gurmukhi: ਗੁਰਮੁਖੀ). You MUST respond in warm, respectful, fluent Punjabi in Gurmukhi script.\n- NEVER respond in Hindi or Devanagari or English.\n- Maintain pure Punjabi in Gurmukhi script throughout the conversation.',
      style: 'punjabi',
      detectedLang: 'pa',
    };
  }

  // 3. Gujarati script
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (GUJARATI DETECTED):\n- The user wrote in Gujarati. You MUST respond in warm, polite Gujarati script.',
      style: 'gujarati',
      detectedLang: 'gu',
    };
  }

  // 4. Urdu script
  if (/[\u0600-\u06FF]/.test(text)) {
    return {
      instruction: '\nLanguage Instruction: The user wrote in Urdu script. Reply in polite Urdu.',
      style: 'urdu',
      detectedLang: 'hi',
    };
  }

  // 5. Hindi / Devanagari script (हिंदी)
  if (/[\u0900-\u097F]/.test(text)) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (HINDI DEVANAGARI DETECTED):\n- The user wrote in Hindi (Devanagari script: हिंदी). You MUST reply in warm, polite, natural Hindi in Devanagari script. Never reply in English or Roman letters. Maintain Hindi throughout.',
      style: 'devanagari',
      detectedLang: 'hi',
    };
  }

  // 6. Explicit Language Requests (e.g. "Hello, talk me Punjabi", "talk in punjabi", "punjabi vich bolo", "bengali me bolo")
  const lowerText = text.toLowerCase();
  if (/\b(punjabi|panjabi|gurmukhi)\b/i.test(lowerText) && /\b(talk|speak|bolo|gal|baat|likho|me|vich|in|chaho|chahta|kar)\b/i.test(lowerText)) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (PUNJABI REQUESTED):\n- The user requested to communicate in Punjabi. You MUST respond warmly, politely, and fluently in pure Punjabi using Gurmukhi script (ਗੁਰਮੁਖੀ).\n- Greet them warmly in Punjabi (e.g. "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਐਨਸਿਸ ਅਸਿਸਟ ਹਾਂ, ਦੱਸੋ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?") and maintain Punjabi throughout.',
      style: 'punjabi',
      detectedLang: 'pa',
    };
  }
  if (/\b(bengali|bangla)\b/i.test(lowerText) && /\b(talk|speak|bolo|katha|baat|likho|me|te|in|kar)\b/i.test(lowerText)) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (BENGALI REQUESTED):\n- The user requested to communicate in Bengali. You MUST respond warmly, politely, and fluently in pure Bengali using Bengali script (বাংলা লিপি).\n- Greet them warmly in Bengali (e.g. "নমস্কার! আমি এনসিস অ্যাসিস্ট, বলুন আমি আপনাকে কীভাবে সাহায্য করতে পারি?") and maintain Bengali throughout.',
      style: 'bengali',
      detectedLang: 'bn',
    };
  }
  if (/\b(hindi)\b/i.test(lowerText) && /\b(talk|speak|bolo|baat|likho|me|in|kar)\b/i.test(lowerText)) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (HINDI REQUESTED):\n- The user requested to communicate in Hindi. You MUST respond warmly and politely in pure Hindi using Devanagari script (हिंदी).\n- Maintain Hindi throughout.',
      style: 'devanagari',
      detectedLang: 'hi',
    };
  }

  // 7. Roman Punjabi
  const words = text.toLowerCase().split(/[^a-z]+/);
  const hasRomanPunjabi = words.some((w) => ROMAN_PUNJABI_WORDS.has(w));
  if (hasRomanPunjabi) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (PUNJABI DETECTED):\n- The user wrote in Punjabi. You MUST respond in warm, polite, respectful Punjabi (Gurmukhi script or natural Punjabi). Maintain Punjabi throughout.',
      style: 'punjabi',
      detectedLang: 'pa',
    };
  }

  // 8. Hinglish (Hindi written in Roman English alphabet)
  // CRITICAL: Must be genuine Hindi Roman words; NEVER match English words like "me", "to", "in", "is", or product names!
  const hasHinglish = words.some((w) => HINGLISH_WORDS.has(w));
  if (hasHinglish) {
    return {
      instruction:
        '\nCRITICAL MULTILINGUAL RULE (HINGLISH DETECTED):\n- The user wrote in Hinglish (Hindi written in Roman letters, e.g. "droni table ka price kya hai", "mujhe catalog chahiye"). You MUST reply in warm, friendly, natural Hinglish (Hindi in Roman letters) exactly like professional WhatsApp chat in India. Do not switch to English unless explicitly asked.',
      style: 'hinglish',
      detectedLang: 'hi',
    };
  }

  // 9. If previous session was Bengali or Punjabi and current text is short / continuation, preserve language
  if (langHint === 'bn' && (!/[a-z]{4,}/i.test(text) || text.split(/\s+/).length <= 3)) {
    return {
      instruction: '\nLanguage Instruction: The conversation is in Bengali. Reply in pure Bengali in Bengali script (বাংলা লিপি).',
      style: 'bengali',
      detectedLang: 'bn',
    };
  }
  if (langHint === 'pa' && (!/[a-z]{4,}/i.test(text) || text.split(/\s+/).length <= 3)) {
    return {
      instruction: '\nLanguage Instruction: The conversation is in Punjabi. Reply in respectful Punjabi in Gurmukhi script (ਗੁਰਮੁਖੀ).',
      style: 'punjabi',
      detectedLang: 'pa',
    };
  }

  // 9. Default: English
  return {
    instruction:
      '\nCRITICAL MULTILINGUAL RULE (ENGLISH DETECTED):\n- The user wrote in English. You MUST reply in polished, professional, warm Indian English. Do NOT reply in Hindi or Hinglish.',
    style: 'english',
    detectedLang: 'en',
  };
}


export const ENSIS_COPY = {
  en: {
    greetTitle: 'Namaste! 🙏',
    welcome: "Welcome to Ensis! I'm Ensis Assist 😊 Tell me, how can I help you today?",
    askName: "Hello! 😊 Nice to hear from you. May I know your name?",
    askNameFirst: "Sure, I'll help you with that! 😊 First, may I know your name?",
    askNameBeforeAnswer: "I'll answer that right away 😊 Just tell me your name first?",
    typeHere: "Sure! 😊 Go ahead and type here. Tell me, how can I help you today?",
    tapMic: "Sure! 😊 Tap the mic button below to talk to me, or type here if you like.",
    howCanIHelp: "Hello! 😊 Tell me, how can I help you today?",
    welcomeAgain: (name: string) => `Welcome back, ${name}! 😊 How can I help you today?`,
    goodbye: "Thank you for chatting with Ensis. Have a great day! 😊",
    callWelcome: "Welcome to Ensis! I'm Ensis Assist. Would you like to talk to me, or would you rather type?",
    callWelcomeAgain: (name: string) => `Welcome back, ${name}! Would you like to talk to me, or would you rather type?`,
    nameThanks: (name: string) => `Nice to meet you, ${name}! 😊 Tell me, how can I help you?`,
    askNameAgain: [
      "😄 Haha, that doesn't sound like a name! What should I call you?",
      "Hehe 😊 I'd really like to know your name — what is it?",
      "😅 Nice one! But tell me your real name, please?",
    ],
    abuseWarning: (count: number, _hours?: number) =>
      `⚠️ Warning ${count}/3: Please don't use that kind of language with me 🙏 Let's keep it friendly and I'll happily help you.`,
    blocking: (hours: number) =>
      `You kept using offensive language even after 3 warnings, so I'm blocking this chat${hours ? ` for ${hours} hours ⛔` : ' ⛔'}. For genuine enquiries, please call +91 9810242841.`,
    blocked: "This chat is blocked because of offensive language ⛔ For genuine enquiries, please call +91 9810242841.",
    unavailable: "Sorry, I can't look that up right now. Please call +91 9810242841 or email info@ensis.in, and our team will help you.",
  },
  hi: {
    greetTitle: 'Namaste! 🙏',
    welcome: "Ensis mein aapka swagat hai! Main Ensis Assist hoon 😊 Bataiye, aaj main aapki kya madad kar sakti hoon?",
    askName: "Namaste! 😊 Aapse baat karke accha laga. Pehle apna naam bata dijiye?",
    askNameFirst: "Zaroor, main bataungi! 😊 Pehle apna naam bata dijiye?",
    askNameBeforeAnswer: "Main abhi bataati hoon 😊 Bas pehle apna naam bata dijiye?",
    typeHere: "Ji zaroor! 😊 Yahan likhiye. Bataiye, main aapki kya madad kar sakti hoon?",
    tapMic: "Ji zaroor! 😊 Baat karne ke liye neeche mic button dabaiye, ya chahein toh yahan likhiye.",
    howCanIHelp: "Namaste! 😊 Bataiye, main aapki kya madad kar sakti hoon?",
    welcomeAgain: (name: string) => `${name} ji, phir se aapka swagat hai! 😊 Bataiye, aaj main aapki kya madad kar sakti hoon?`,
    goodbye: "Ensis se baat karne ke liye dhanyavaad! Aapka din accha rahe 😊",
    callWelcome: "Ensis mein aapka swagat hai! Main Ensis Assist hoon. Aap mujhse bolkar baat karna chahenge, ya type karna chahenge?",
    callWelcomeAgain: (name: string) => `${name} ji, phir se aapka swagat hai! Aap bolkar baat karna chahenge, ya type karna chahenge?`,
    nameThanks: (name: string) => `${name} ji, aapse milkar accha laga! 😊 Bataiye, main aapki kya madad kar sakti hoon?`,
    askNameAgain: [
      "😄 Haha, ye toh naam nahi lagta! Aapka naam kya hai?",
      "Hehe 😊 Pehle apna asli naam bata dijiye na!",
      "😅 Accha mazaak tha! Ab apna naam bataiye?",
    ],
    abuseWarning: (count: number, _hours?: number) =>
      `⚠️ Warning ${count}/3: Arey, mere saath aisi bhasha mat use kijiye 🙏 Aaram se baat karenge toh main poori madad karungi.`,
    blocking: (hours: number) =>
      `3 warning ke baad bhi aapne galat bhasha use ki, isliye main ye chat${hours ? ` ${hours} ghante ke liye block kar rahi hoon ⛔` : ' block kar rahi hoon ⛔'}. Agar sach mein koi kaam hai, toh +91 9810242841 par call kijiye.`,
    blocked: "Galat bhasha ki wajah se ye chat block hai ⛔ Agar sach mein koi kaam hai, toh +91 9810242841 par call kijiye.",
    unavailable: "Maaf kijiye, abhi main ye dekh nahi pa rahi hoon. +91 9810242841 par call kijiye ya info@ensis.in par email kijiye, hamari team madad karegi.",
  },
  bn: {
    greetTitle: 'নমস্কার! 🙏',
    welcome: "এনসিস-এ আপনাকে স্বাগত! আমি এনসিস অ্যাসিস্ট 😊 বলুন, আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    askName: "নমস্কার! 😊 আপনার সাথে কথা বলে ভালো লাগল। প্রথমে কি আপনার নামটি জানতে পারি?",
    askNameFirst: "নিশ্চয়ই, আমি সাহায্য করব! 😊 প্রথমে কি আপনার শুভ নামটি জানতে পারি?",
    askNameBeforeAnswer: "আমি এখনই জানাচ্ছি 😊 তার আগে অনুগ্রহ করে আপনার নামটি বলে দিন?",
    typeHere: "হ্যাঁ নিশ্চয়ই! 😊 এখানে লিখুন। বলুন, আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    tapMic: "হ্যাঁ নিশ্চয়ই! 😊 কথা বলতে নিচে মাইক বোতামটি টিপুন, অথবা এখানে লিখুন।",
    howCanIHelp: "নমস্কার! 😊 বলুন, আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    welcomeAgain: (name: string) => `স্বাগত ${name}! 😊 বলুন, আজ আপনাকে কীভাবে সাহায্য করতে পারি?`,
    goodbye: "এনসিস-এর সাথে যোগাযোগ করার জন্য ধন্যবাদ! আপনার দিনটি সুন্দর কাটুক 😊",
    callWelcome: "এনসিস-এ আপনাকে স্বাগত! আমি এনসিস অ্যাসিস্ট। আপনি কি কথা বলতে চান নাকি টাইপ করতে পছন্দ করবেন?",
    callWelcomeAgain: (name: string) => `স্বাগত ${name}! আপনি কি কথা বলতে চান নাকি টাইপ করবেন?`,
    nameThanks: (name: string) => `${name}, আপনার সাথে পরিচিত হয়ে আনন্দিত হলাম! 😊 বলুন, আজ আপনাকে কীভাবে সাহায্য করতে পারি?`,
    askNameAgain: [
      "😄 হাহা, এটা তো নাম বলে মনে হচ্ছে না! আপনার নাম কী?",
      "হেহে 😊 আপনার আসল নামটি জানতে পারলে খুব ভালো হতো!",
      "😅 বেশ মজার ছিল! এবার আপনার নামটি বলুন?",
    ],
    abuseWarning: (count: number, _hours?: number) =>
      `⚠️ সতর্কতা ${count}/৩: দয়া করে অপ্রীতিকর ভাষা ব্যবহার করবেন না 🙏 শান্তভাবে কথা বলুন, আমি সম্পূর্ণ সাহায্য করব।`,
    blocking: (hours: number) =>
      `৩টি সতর্কতার পরেও আপনি অনুপযুক্ত ভাষা ব্যবহার করেছেন, তাই এই চ্যাটটি${hours ? ` ${hours} ঘণ্টার জন্য বন্ধ করা হলো ⛔` : ' বন্ধ করা হলো ⛔'}। যোগাযোগের জন্য +91 9810242841 নম্বরে কল করুন।`,
    blocked: "অনুপযুক্ত ভাষার কারণে এই চ্যাটটি ব্লক করা হয়েছে ⛔ যোগাযোগের জন্য +91 9810242841 নম্বরে কল করুন।",
    unavailable: "দুঃখিত, এই মুহূর্তে তথ্যটি পাওয়া যাচ্ছে না। অনুগ্রহ করে +91 9810242841 নম্বরে কল বা info@ensis.in-এ ইমেল করুন।",
  },
  pa: {
    greetTitle: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! 🙏',
    welcome: "ਐਨਸਿਸ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ! ਮੈਂ ਐਨਸਿਸ ਅਸਿਸਟ ਹਾਂ 😊 ਦੱਸੋ ਜੀ, ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?",
    askName: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! 😊 ਤੁਹਾਡੇ ਨਾਲ ਗੱਲ ਕਰਕੇ ਚੰਗਾ ਲੱਗਿਆ। ਪਹਿਲਾਂ ਆਪਣਾ ਸ਼ੁਭ ਨਾਮ ਦੱਸ ਦਿਓ ਜੀ?",
    askNameFirst: "ਜ਼ਰੂਰ, ਮੈਂ ਮਦਦ ਕਰਾਂਗੀ! 😊 ਪਹਿਲਾਂ ਆਪਣਾ ਸ਼ੁਭ ਨਾਮ ਦੱਸ ਦਿਓ ਜੀ?",
    askNameBeforeAnswer: "ਮੈਂ ਹੁਣੇ ਦੱਸਦੀ ਹਾਂ 😊 ਬਸ ਪਹਿਲਾਂ ਆਪਣਾ ਨਾਮ ਦੱਸ ਦਿਓ ਜੀ?",
    typeHere: "ਜੀ ਜ਼ਰੂਰ! 😊 ਇੱਥੇ ਲਿਖੋ। ਦੱਸੋ ਜੀ, ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?",
    tapMic: "ਜੀ ਜ਼ਰੂਰ! 😊 ਗੱਲ ਕਰਨ ਲਈ ਹੇਠਾਂ ਮਾਈਕ ਬਟਨ ਦਬਾਓ, ਜਾਂ ਇੱਥੇ ਲਿਖੋ।",
    howCanIHelp: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! 😊 ਦੱਸੋ ਜੀ, ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?",
    welcomeAgain: (name: string) => `${name} ਜੀ, ਫਿਰ ਤੋਂ ਸੁਆਗਤ ਹੈ! 😊 ਦੱਸੋ ਜੀ, ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?`,
    goodbye: "ਐਨਸਿਸ ਨਾਲ ਗੱਲ ਕਰਨ ਲਈ ਧੰਨਵਾਦ! ਤੁਹਾਡਾ ਦਿਨ ਸ਼ੁਭ ਰਹੇ 😊",
    callWelcome: "ਐਨਸਿਸ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ! ਮੈਂ ਐਨਸਿਸ ਅਸਿਸਟ ਹਾਂ। ਤੁਸੀਂ ਬੋਲ ਕੇ ਗੱਲ ਕਰਨੀ ਚਾਹੋਗੇ ਜਾਂ ਟਾਈਪ ਕਰੋਗੇ?",
    callWelcomeAgain: (name: string) => `${name} ਜੀ, ਫਿਰ ਤੋਂ ਸੁਆਗਤ ਹੈ! ਤੁਸੀਂ ਬੋਲ ਕੇ ਗੱਲ ਕਰਨੀ ਚਾਹੋਗੇ ਜਾਂ ਟਾਈਪ ਕਰੋਗੇ?`,
    nameThanks: (name: string) => `${name} ਜੀ, ਤੁਹਾਡੇ ਨਾਲ ਗੱਲ ਕਰਕੇ ਚੰਗਾ ਲੱਗਿਆ! 😊 ਦੱਸੋ ਜੀ, ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?`,
    askNameAgain: [
      "😄 ਹਾਹਾ, ਇਹ ਤਾਂ ਨਾਮ ਨਹੀਂ ਲੱਗਦਾ! ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ ਜੀ?",
      "ਹੇਹੇ 😊 ਪਹਿਲਾਂ ਆਪਣਾ ਅਸਲੀ ਨਾਮ ਦੱਸ ਦਿਓ ਜੀ!",
      "😅 ਚੰਗਾ ਮਜ਼ਾਕ ਸੀ! ਹੁਣ ਆਪਣਾ ਨਾਮ ਦੱਸੋ ਜੀ?",
    ],
    abuseWarning: (count: number, _hours?: number) =>
      `⚠️ ਚੇਤਾਵਨੀ ${count}/3: ਕਿਰਪਾ ਕਰਕੇ ਗਲਤ ਭਾਸ਼ਾ ਦੀ ਵਰਤੋਂ ਨਾ ਕਰੋ 🙏 ਅਰਾਮ ਨਾਲ ਗੱਲ ਕਰੋਗੇ ਤਾਂ ਮੈਂ ਪੂਰੀ ਮਦਦ ਕਰਾਂਗੀ।`,
    blocking: (hours: number) =>
      `3 ਚੇਤਾਵਨੀਆਂ ਤੋਂ ਬਾਅਦ ਵੀ ਗਲਤ ਭਾਸ਼ਾ ਵਰਤੀ ਗਈ, ਇਸ ਲਈ ਇਹ ਚੈਟ${hours ? ` ${hours} ਘੰਟਿਆਂ ਲਈ ਬਲਾਕ ਕੀਤੀ ਜਾਂਦੀ ਹੈ ⛔` : ' ਬਲਾਕ ਕੀਤੀ ਜਾਂਦੀ ਹੈ ⛔'}। ਸਹਾਇਤਾ ਲਈ +91 9810242841 ਤੇ ਕਾਲ ਕਰੋ।`,
    blocked: "ਗਲਤ ਭਾਸ਼ਾ ਕਾਰਨ ਇਹ ਚੈਟ ਬਲਾਕ ਹੈ ⛔ ਸਹਾਇਤਾ ਲਈ +91 9810242841 ਤੇ ਕਾਲ ਕਰੋ।",
    unavailable: "ਮਾਫ਼ ਕਰਨਾ, ਇਸ ਵੇਲੇ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲ ਰਹੀ। ਕਿਰਪਾ ਕਰਕੇ +91 9810242841 'ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ info@ensis.in 'ਤੇ ਈਮੇਲ ਕਰੋ।",
  },
};

export const getCopy = (lang: string) => {
  if (lang === 'bn') return ENSIS_COPY.bn;
  if (lang === 'pa') return ENSIS_COPY.pa;
  if (lang === 'hi') return ENSIS_COPY.hi;
  return ENSIS_COPY.en;
};

const GREETING_WORDS = new Set([
  'hi', 'hii', 'hiii', 'hello', 'helo', 'hey', 'heya', 'namaste', 'namaskar', 'pranam', 'hola',
  'good', 'morning', 'afternoon', 'evening', 'ok', 'okay', 'hmm', 'hm', 'yes', 'yeah', 'haan', 'han',
  'ha', 'ji', 'sure', 'thanks', 'thank', 'you', 'dhanyavaad', 'shukriya', 'there',
  'नमस्ते', 'नमस्कार', 'हेलो', 'हैलो', 'हाय', 'हाँ', 'हां', 'जी', 'ठीक', 'धन्यवाद',
  'নমস্কার', 'হ্যালো', 'হ্যাঁ', 'ধন্যবাদ', 'সত', 'ਸ੍ਰੀ', 'ਅਕਾਲ', 'ਸਤਿ', 'ਜੀ'
]);

export const isGreeting = (text: string): boolean => {
  const words = text.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 4 && words.every((w) => GREETING_WORDS.has(w));
};

export const looksLikeRequest = (text: string): boolean =>
  /[?؟]/.test(text) || text.trim().split(/\s+/).length >= 4;

export const conversationIsOver = (text: string): boolean =>
  /\b(bye|goodbye|see you|tata|alvida|khatam|bas|theek hai bas|aur kuch nahi|no more|thanks that's all|thank you that's all|dhanyawad bas|ধন্যবাদ আর কিছু নেই|अलविदा|बस इतना ही)\b/i.test(text);

export async function generateBotReply(
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  userName?: string,
  language?: string,
  knowledge = '',
  userPhone?: string,
  nameAlreadyAsked = false,
  answerEarlier = ''
): Promise<{ reply: string; provider: string }> {
  const answerEarlierInstruction = answerEarlier
    ? `\nNOTE ON EARLIER QUESTION: Before sharing their name, the visitor asked: "${answerEarlier}". The visitor just shared their name as "${userName || 'Friend'}". Start by warmly greeting/acknowledging them by name in their detected language (e.g. "${userName} ji, aapse milkar accha laga! 😊"), and immediately provide a complete, direct, helpful answer to their earlier question: "${answerEarlier}".`
    : '';
  const nameInstruction = userName
    ? `\nClient Name: "${userName}". You may address them politely as "${userName} ji" (or "${userName}" in English/Bengali).`
    : nameAlreadyAsked
    ? `\nClient Name: Unknown. CRITICAL: The visitor's name has ALREADY been asked previously. DO NOT ask for their name again under any circumstance! Directly, thoroughly, and helpfully answer their question in their detected language.`
    : `\nClient Name: Unknown yet. Answer their question clearly and helpfully in their detected language. You may politely ask for their name once at the very end of your response, but NEVER withhold or delay answering their question.`;
  const phoneInstruction = userPhone ? `\nCRITICAL: The visitor's verified 10-digit mobile number is strictly "${userPhone}". If you repeat or confirm their number, you MUST use ONLY these exact digits: ${userPhone}. NEVER prepend 98 or alter any digits.` : '';
  const { instruction: langInstruction, style: langStyle } = detectLanguageInstruction(userMessage, language);

  let dynamicKnowledge = '';
  try {
    const passages = await searchKnowledge(userMessage, 3);
    if (passages.length) {
      dynamicKnowledge = `\n\nRELEVANT WEBSITE & SPECIFICATION KNOWLEDGE:\n${passages.map((p) => `- ${p.title} (${p.url}): ${p.text}`).join('\n')}`;
    }
  } catch {
    // ignore search knowledge error
  }

  let teamRules = '';
  try {
    teamRules = await getTrainingRulesText();
  } catch {
    // ignore training rules error
  }

  const systemContent = `${ENSIS_SYSTEM_PROMPT}${answerEarlierInstruction}${nameInstruction}${phoneInstruction}${langInstruction}${knowledge}${teamRules}${dynamicKnowledge}`;

  // Deterministic Instant Reply when visitor asks for the Assistant's own name
  const cleanQuery = userMessage.trim().toLowerCase();
  const isAskingBotName = /\b(what(?:'s|\s+is)\s+your\s+name|who\s+(?:are|r)\s+you|tell\s+me\s+your\s+name|aap(?:ka)?\s*(?:kya)?\s*naam|tumhara\s*naam|apna\s*naam|naam\s*kya\s*hai|aap\s*kaun\s*(?:ho|hai|hain)|tomar\s*naam\s*ki)\b/i.test(cleanQuery)
    || /(आपका\s*नाम|तुम्हारा\s*नाम|अपना\s*नाम|आप\s*कौन\s*हैं|आप\s*कौन\s*हो|ਤੁਹਾਡਾ\s*ਨਾਮ|ਤੁਸੀਂ\s*ਕੌਣ|তোমার\s*নাম)/i.test(userMessage);

  if (isAskingBotName && userMessage.trim().split(/\s+/).length <= 8) {
    if (langStyle === 'bengali') {
      return {
        reply: 'আমার নাম এনসিস অ্যাসিস্ট। আমি এনসিস-এর এআই ওয়েলনেস ও পঞ্চকর্ম সরঞ্জাম বিশেষজ্ঞ। বলুন, আজ আপনাকে কীভাবে সাহায্য করতে পারি?',
        provider: 'direct',
      };
    }
    if (langStyle === 'punjabi') {
      return {
        reply: 'ਮੇਰਾ ਨਾਮ ਐਨਸਿਸ ਅਸਿਸਟ ਹੈ। ਮੈਂ ਐਨਸਿਸ ਦੀ ਏਆਈ ਵੈੱਲਨੈੱਸ ਅਤੇ ਪੰਚਕਰਮਾ ਉਪਕਰਨ ਮਾਹਿਰ ਹਾਂ। ਦੱਸੋ ਜੀ, ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਸਹਾਇਤਾ ਕਰ ਸਕਦੀ ਹਾਂ?',
        provider: 'direct',
      };
    }
    if (langStyle === 'devanagari') {
      return {
        reply: 'मेरा नाम एन्सिस असिस्ट है! मैं एन्सिस की एआई वेलनेस और पंचकर्म उपकरण विशेषज्ञ हूँ। बताइए, आज मैं आपकी क्या सहायता कर सकती हूँ?',
        provider: 'direct',
      };
    }
    if (langStyle === 'english') {
      return {
        reply: "My name is Ensis Assist! I am the AI wellness & Panchkarma therapy equipment specialist for Ensis. Tell me, how can I help you today?",
        provider: 'direct',
      };
    }
    return {
      reply: 'Mera naam Ensis Assist hai! Main Ensis ki AI wellness aur Panchkarma equipment specialist hoon. Bataiye, aaj main aapki kya madad kar sakti hoon?',
      provider: 'direct',
    };
  }

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
  if (/^(hi|hello|hey|namaste|namaskar|pranam|good\s*(morning|afternoon|evening)|kaise\s*ho|kya\s*haal|sunao|batao)\b/i.test(q) || /नमस्ते|प्रणाम|हेलो|हाय|कैसा|हालचाल|নমস্কার|হ্যালো/i.test(q)) {
    if (langStyle === 'bengali') {
      const greetingName = userName ? `${userName}` : '';
      return {
        reply: `নমস্কার ${greetingName}! এনসিস-এ আপনাকে স্বাগত। আমরা প্রামাণিক আয়ুর্বেদিক পঞ্চকর্ম সরঞ্জাম ও সম্পূর্ণ ক্লিনিক সেটআপ তৈরি করি।\n\nআজ আমি আপনাকে কীভাবে সাহায্য করতে পারি? আপনি কি দ্রোণী টেবিল, বাষ্প স্নান (Steam Bath) বা পুরো ক্লিনিক সেটআপ সম্পর্কে জানতে চান?`,
        provider: 'fallback',
      };
    }
    if (langStyle === 'devanagari') {
      const greetingName = userName ? `${userName} जी` : '';
      return {
        reply: `नमस्ते ${greetingName}! एन्सिस में आपका स्वागत है। हम प्रामाणिक आयुर्वेदिक पंचकर्म उपकरण और टर्नकी क्लिनिक सेटअप तैयार करते हैं।\n\nआज मैं आपकी क्या सहायता कर सकती हूँ? क्या आप द्रोणी टेबल, स्टीम बाथ, या पूरे क्लिनिक सेटअप के बारे में जानकारी चाहते हैं?`,
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
  if (/^(bye|goodbye|alvida|thank\s*you|thanks|dhanyawad|shukriya|ok\s*bye|bas|theek\s*hai\s*bye)\b/i.test(q) || /धन्यवाद|शुक्रिया|अलविदा|बाय|ধন্যবাদ|বিদায়/i.test(q)) {
    if (langStyle === 'bengali') {
      return {
        reply: `এনসিস-এর সাথে যোগাযোগ করার জন্য আপনাকে অনেক ধন্যবাদ${userName ? ` ${userName}` : ''}! আপনার প্র্যাকটিস সফল হোক। যেকোনো সহায়তার জন্য আমাদের সাথে **+91 9810242841** বা **+91 9654900525** নম্বরে যোগাযোগ করতে পারেন।`,
        provider: 'fallback',
      };
    }
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
  if (/price|cost|quote|quotation|rate|discount|budget|kitna|daam|paisa|कीमत|दाम|रेट|खर्च|कोटेशन|बजট|দাম|মূল্য/i.test(q)) {
    if (langStyle === 'bengali') {
      return {
        reply: 'এনসিস পঞ্চকর্ম সরঞ্জামের দাম ₹৫,৪৯৯ (ব্রাস সামগ্রী) থেকে শুরু করে ₹৪৭,৫০০ (অটোমেটেড স্টিম বক্স) পর্যন্ত রয়েছে:\n\n• **সম্পূর্ণ ১-রুম ক্লিনিক প্যাকেজ**: প্রায় ₹১.১০ লক্ষ থেকে শুরু (দ্রোণী টেবিল + স্টিম চেম্বার + ব্রাস শিরোধারা সেট অন্তর্ভুক্ত)।\n• ক্লিনিক ও হাসপাতালের জন্য বাল্ক ডিসকাউন্ট ও জিএসটি ইনভয়েস উপলব্ধ।\n\nতাত্ক্ষণিক কোটেশনের জন্য আপনার ১০-সংখ্যার WhatsApp নম্বরটি শেয়ার করুন বা [যোগাযোগ পৃষ্ঠা](/contact) দেখুন!',
        provider: 'fallback',
      };
    }
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
  if (/contact|phone|call|email|address|office|location|where|sampark|pata|kahan|kaha|যোগাযোগ|ঠিকানা|ফোন|অফিস/i.test(q) || /संपर्क|फोन|फ़ोन|नंबर|पता|कार्यालय|कहाँ|कहा|ईमेल|कॉल/i.test(q)) {
    if (langStyle === 'bengali') {
      return {
        reply: '🌿 **এনসিস যোগাযোগ বিবরণ ও কর্পোরেট অফিস**:\n\n📍 **কর্পোরেট অফিস ও ফ্যাক্টরি**:\nPlot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007\n\n📞 **ফোন / WhatsApp**: **+91 9810242841** / **+91 9654900525**\n✉️ **ইমেল**: info@ensis.in\n🌐 **ওয়েবসাইট**: [যোগাযোগ করুন](/contact)',
        provider: 'fallback',
      };
    }
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

export const DEFAULT_ENSIS_OVERVIEW = [
  {
    title: '🌿 Namaste! Welcome to Ensis',
    text: "Ensis mein aapka swagat hai! Main Ensis Assist hoon 😊 Bataiye, aaj main aapki kya madad kar sakti hoon?",
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

export const extractCleanPhone = (text: string): string | null => {
  if (!text) return null;
  const standard = text.match(/(?:\+?91[\s-]*)?([6-9]\d{9})\b/);
  if (standard) return standard[1];

  const cleanedDigits = text.replace(/[^\d]/g, '');
  if (cleanedDigits.length === 10 && /^[6-9]/.test(cleanedDigits)) {
    return cleanedDigits;
  }
  if (cleanedDigits.length > 10 && cleanedDigits.startsWith('91')) {
    const after91 = cleanedDigits.slice(2);
    if (after91.length === 10 && /^[6-9]/.test(after91)) {
      return after91;
    }
  }

  const WORD_DIGITS: Record<string, string> = {
    zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    shunya: '0', ek: '1', do: '2', teen: '3', char: '4', paanch: '5', chhah: '6', che: '6', saat: '7', aath: '8', nau: '9',
  };
  const words = text.toLowerCase().split(/[\s,.-]+/);
  let built = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === 'double' && i + 1 < words.length && WORD_DIGITS[words[i + 1]]) {
      built += WORD_DIGITS[words[i + 1]] + WORD_DIGITS[words[i + 1]];
      i++;
    } else if (w === 'triple' && i + 1 < words.length && WORD_DIGITS[words[i + 1]]) {
      built += WORD_DIGITS[words[i + 1]] + WORD_DIGITS[words[i + 1]] + WORD_DIGITS[words[i + 1]];
      i++;
    } else if (WORD_DIGITS[w]) {
      built += WORD_DIGITS[w];
    } else if (/^\d+$/.test(w)) {
      built += w;
    }
  }
  const phone10 = built.replace(/^91/, '');
  if (phone10.length === 10 && /^[6-9]/.test(phone10)) return phone10;

  return null;
};

export const sendChatbotCatalogueWhatsApp = async (phone: string, userName?: string): Promise<boolean> => {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return false;
  const clientName = userName && userName !== 'Client' && userName !== 'Valued Client' ? userName : 'Valued Client';

  const message = `🌿 *Namaste ${clientName}!*

Thank you for contacting *Ensis Panchkarma & Wellness Equipment* (by Design House India Pvt. Ltd. — trusted since 2003, 1000+ completed projects).

Here is our official 2026 digital brochure & equipment catalog:

📥 *DOWNLOAD COMPLETE 2026 E-BROCHURE (PDF):*
👉 https://ensis.in/pdf/e-brochure.pdf

📖 *EXPLORE 2026 PRODUCT CATALOGUE:*
👉 https://ensis.in/products

✨ *AUTHENTIC PANCHKARMA & CLINIC RANGE:*
1️⃣ *Solid Burma Teak Droni Table*: Traditional peripheral brass oil-drainage gutters, 100% medicated hot-oil resistant PU coating, 5-year structural warranty.
2️⃣ *Pure Brass Shirodhara Pot (3L) & Stand*: Hand-spun heavy brass with precision needle flow control valve, arched height-adjustable stand on rolling castors.
3️⃣ *Teakwood Steam Bath Chamber*: Food-grade SS304 steam dispersion pipelines, digital temperature regulator, ergonomic head-out collar.
4️⃣ *Turnkey Clinic & Hospital Setup*: 2D/3D Vastu layout planning, specialized herbal oil drainage plumbing, and complete teakwood furniture packages.

📍 *Corporate Office & Factory:*
Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007

📞 *Direct Helpline & WhatsApp:*
+91 9810242841 / +91 9654900525
✉️ Email: info@ensis.in
🌐 Website: https://ensis.in/contact

Our technical specialist team will connect with you shortly for customized quotations and clinic layouts.

— *Team Ensis*
_Spaces that Heal. Experiences that Last._`;

  try {
    const res = await sendWhatsAppMessage(cleanPhone, message, clientName);
    return Boolean(res?.success);
  } catch (err: unknown) {
    console.warn('sendChatbotCatalogueWhatsApp error:', (err as Error).message);
    return false;
  }
};

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
      reply: 'Chat is temporarily blocked due to offensive language. Please call +91 9810242841 for assistance.',
      replies: [{ text: 'Chat is temporarily blocked due to offensive language. Please call +91 9810242841 for assistance.', from: 'bot' }],
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

  // Abusive language detection with 3-strike warning and 24h IP block matching Design House
  if (isAbusive(userText)) {
    let blockDoc = await ChatBlockModel.findOne({ ip: visitor.ip });
    if (!blockDoc) {
      blockDoc = new ChatBlockModel({ ip: visitor.ip, strikes: 0 });
    }
    if (blockDoc.blockedUntil && blockDoc.blockedUntil <= new Date()) {
      blockDoc.strikes = 0;
      blockDoc.blockedUntil = undefined;
    }
    blockDoc.strikes = (blockDoc.strikes || 0) + 1;
    blockDoc.lastStrikeAt = new Date();
    blockDoc.sessionId = reqSessionId;
    blockDoc.lastMessage = userText.slice(0, 500);

    const MAX_WARNINGS = 3;
    if (blockDoc.strikes > MAX_WARNINGS) {
      blockDoc.blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await blockDoc.save();
      const blockedFor = blockDoc.blockedUntil.getTime() - Date.now();
      const blockMsg = lang === 'hi'
        ? 'गलत भाषा की वजह से यह चैट 24 घंटे के लिए ब्लॉक कर दी गई है। वास्तविक पूछताछ के लिए +91 9810242841 पर संपर्क करें।'
        : 'This chat has been blocked for 24 hours due to repeated offensive language. Please call +91 9810242841 for genuine inquiries.';
      return successResponse(res, {
        sessionId: reqSessionId,
        blocked: true,
        blockedFor,
        strikes: blockDoc.strikes,
        reply: blockMsg,
        replies: [{ text: blockMsg, from: 'bot' }],
      });
    } else {
      await blockDoc.save();
      const warnMsg = lang === 'hi'
        ? `कृपया अनुचित शब्दों का उपयोग न करें। यह चेतावनी संख्या ${blockDoc.strikes}/3 है। 3 चेतावनियों के बाद चैट ब्लॉक कर दी जाएगी।`
        : `Please avoid offensive language. This is warning ${blockDoc.strikes}/3. Continued offensive language will result in an IP block.`;
      return successResponse(res, {
        sessionId: reqSessionId,
        flagged: true,
        strikes: blockDoc.strikes,
        blocked: false,
        reply: warnMsg,
        replies: [{ text: warnMsg, from: 'bot' }],
      });
    }
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
  const rawCleanPhone = extractCleanPhone(userText);
  const autoOtpSent = false;
  if (rawCleanPhone) {
    session.phone = rawCleanPhone;
    session.capturedLead = true;
  }

  // Trigger professional WhatsApp notification with Product Details & Catalogue
  // STRICT RULE: Send at most ONCE per chat session so the user is never spammed with repeating messages!
  const isCatalogueOrWhatsAppRequest = /\b(whatsapp|catalog|catalogue|brochure|product\s*detail|details|quote|quotation|price\s*list|call\s*me|call\s*karo|call\s*karein|contact\s*me|message\s*karo|message\s*kijiye|bhej|send|करो|भेजो|व्हाट्सएप|कैटलॉग|ब्रोशर)\b/i.test(userText);
  const targetPhone = rawCleanPhone || session.phone || '';
  if (targetPhone && !session.whatsappConfirmationSent && (isCatalogueOrWhatsAppRequest || rawCleanPhone)) {
    sendChatbotCatalogueWhatsApp(targetPhone, session.userName).catch((waErr: any) => {
      console.warn('sendChatbotCatalogueWhatsApp error:', (waErr as Error).message);
    });
    session.whatsappConfirmationSent = true;
    session.capturedLead = true;
  }

  // Extract name if user introduces themselves or provides their name
  const candidateName = extractVisitorName(userText);
  if (candidateName && !session.userName) {
    session.userName = candidateName;
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

  const { detectedLang } = detectLanguageInstruction(
    userText,
    session.lang || lang
  );
  session.lang = detectedLang;
  const copy = getCopy(detectedLang);

  // 1. Check if conversation is over (e.g. "thanks", "theek hai bas", "bye")
  if (conversationIsOver(userText)) {
    const farewell = session.userName
      ? (detectedLang === 'hi'
          ? `${session.userName} जी, एन्सिस से जुड़ने के लिए बहुत-बहुत धन्यवाद! आपका दिन शुभ और मंगलमय हो 😊`
          : detectedLang === 'bn'
          ? `${session.userName}, এনসিস-এর সাথে যোগাযোগ করার জন্য অনেক ধন্যবাদ! আপনার দিনটি সুন্দর কাটুক 😊`
          : detectedLang === 'pa'
          ? `${session.userName} ਜੀ, ਐਨਸਿਸ ਨਾਲ ਗੱਲ ਕਰਨ ਲਈ ਧੰਨਵਾਦ! ਤੁਹਾਡਾ ਦਿਨ ਸ਼ੁਭ ਰਹੇ 😊`
          : `Thank you for chatting with Ensis, ${session.userName}! Have a wonderful day ahead 😊`)
      : copy.goodbye;

    const nextSpeakId = (session.messages?.length || 0) + 1;
    session.messages.push({ role: 'user', content: userText, timestamp: new Date() });
    session.messages.push({ role: 'assistant', content: farewell, speakId: nextSpeakId, timestamp: new Date() });
    await session.save();

    return successResponse(res, {
      sessionId: session.sessionId,
      lang: detectedLang,
      userName: session.userName || '',
      reply: farewell,
      replies: [{ text: farewell, speakId: nextSpeakId }],
      provider: 'direct',
      blocked: false,
      end: true,
      serverTime: Date.now(),
      needsOtp: false,
      otpSent: false,
      leadVerified: Boolean(session.phoneVerifiedAt),
      phone: session.phone || '',
    });
  }

  // 2. Design House Conversational State Machine for Name & Questions
  let directReply = '';
  let answerEarlier = '';
  let queryToAnswer = userText;

  if (!session.userName && !session.nameAsked) {
    // User has never been asked for their name yet
    if (isGreeting(userText)) {
      // Greeting message (hi, hello, namaste, etc.): reply warmly, do NOT ask for name yet!
      directReply = copy.howCanIHelp;
    } else if (candidateName) {
      session.userName = candidateName;
      if (looksLikeRequest(userText)) {
        queryToAnswer = userText;
      } else {
        directReply = copy.nameThanks(candidateName);
      }
    } else {
      // First real inquiry/question from visitor!
      // Store question in session.pendingQuestion and ask for name once (Design House standard)
      session.nameAsked = true;
      session.pendingQuestion = userText;
      directReply = copy.askNameFirst;
    }
  } else if (!session.userName && session.nameAsked) {
    // Bot previously asked for visitor's name
    if (candidateName) {
      // Visitor shared their name!
      session.userName = candidateName;
      const waiting = session.pendingQuestion || '';
      session.pendingQuestion = undefined;
      if (waiting) {
        // Answer the earlier question now, warmly addressing them by name!
        answerEarlier = waiting;
        queryToAnswer = waiting;
      } else if (looksLikeRequest(userText)) {
        queryToAnswer = userText;
      } else {
        directReply = copy.nameThanks(candidateName);
      }
    } else if (looksLikeRequest(userText) || (session.pendingQuestion && !isGreeting(userText))) {
      // Visitor did not give name, but asks question or insists on answer
      session.nameTries = (session.nameTries || 0) + 1;
      if ((session.nameTries || 0) < 2) {
        directReply = copy.askNameBeforeAnswer;
      } else {
        // Visitor refuses to share name: stop asking, answer directly!
        session.nameTries = 99;
        if (session.pendingQuestion && !looksLikeRequest(userText)) {
          queryToAnswer = session.pendingQuestion;
        }
        session.pendingQuestion = undefined;
      }
    } else {
      // Gibberish or non-name response
      session.nameTries = (session.nameTries || 0) + 1;
      if ((session.nameTries || 0) < 3) {
        const lines = copy.askNameAgain;
        directReply = lines[Math.floor(Math.random() * lines.length)];
      } else {
        session.nameTries = 99;
        directReply = copy.howCanIHelp;
      }
    }
  }

  let replyText = directReply;
  let replyProvider = 'direct';

  if (!replyText) {
    const activeUserName = req.body?.userName || session.userName || userName;
    const generated = await generateBotReply(
      queryToAnswer,
      history,
      activeUserName,
      detectedLang,
      knowledge,
      targetPhone,
      true,
      answerEarlier
    );
    replyText = generated.reply.replace(/\s*\[\[\s*LEAD\s*\]\]\s*/gi, ' ').trim();
    replyProvider = generated.provider;
  }

  // Scrub any localhost or live domain prefixes so links are strictly root-relative (/products/..., /contact)
  replyText = replyText
    .replace(/https?:\/\/localhost:\d+/gi, '')
    .replace(/https?:\/\/(?:www\.)?ensis\.in/gi, '');

  // Deduplicate brand names like "एन्सिस (Ensis)" or "Ensis (एन्सिस)" so Ensis is never written or spoken twice
  replyText = replyText
    .replace(/(?:एन्सिस\s*असिस्ट|এনসিস\s*অ্যাসিস্ট|ਐਨਸਿਸ\s*ਅਸਿਸਟ|Ensis\s*Assist)\s*[\(\[]\s*(?:एन्सिस\s*असिस्ट|এনসিস\s*অ্যাসিস্ট|ਐਨਸਿਸ\s*ਅਸਿਸਟ|Ensis\s*Assist|Ensis|एन्सिस)\s*[\)\]]/gi, (m) => m.includes('অ্যাসিস্ট') ? 'এনসিস অ্যাসিস্ট' : m.includes('ਅਸਿਸਟ') ? 'ਐਨਸਿਸ ਅਸਿਸਟ' : m.includes('असिस्ट') ? 'एन्सिस असिस्ट' : 'Ensis Assist')
    .replace(/(?:एन्सिस|এনসিস|ਐਨਸਿਸ|ਐન્સਿਸ)\s*[\(\[]\s*Ensis\s*[\)\]]/gi, (m) => m.startsWith('এনসিস') ? 'এনসিস' : m.startsWith('ਐਨਸਿਸ') ? 'ਐਨਸਿਸ' : m.startsWith('એન્સਿਸ') ? 'એન્સਿਸ' : 'एन्सिस')
    .replace(/Ensis\s*[\(\[]\s*(?:एन्सिस|এনসিস|ਐਨਸਿਸ|એન્સਿਸ)\s*[\)\]]/gi, (m) => m.includes('এনসিস') ? 'এনসিস' : m.includes('ਐਨਸਿਸ') ? 'ਐਨਸਿਸ' : m.includes('એન્સਿਸ') ? 'એન્સਿਸ' : 'एन्सिस')
    .replace(/[\(\[]\s*(?:Ensis|एन्सिस|এনসিস|ਐਨਸਿਸ|એન્સਿਸ)\s*[\)\]]/gi, '');

  // Sanitize any hallucinated phone numbers in replyText so visitor never receives corrupted digits
  if (targetPhone) {
    replyText = replyText
      .replace(/\b98[6-9]\d{8,9}\b/g, targetPhone)
      .replace(/\b9876543210\b/g, targetPhone)
      .replace(/\b98767821037\b/g, targetPhone)
      .replace(/\b9876782103\b/g, targetPhone);
  }

  if (autoOtpVerified) {
    if (detectedLang === 'bn') {
      replyText = `✅ ধন্যবাদ ${session.userName ? session.userName : ''}! আপনার মোবাইল নম্বর +91 ${session.phone} সফলভাবে যাচাই করা হয়েছে। আমাদের টেকনিক্যাল টিম খুব শীঘ্রই WhatsApp-এ আপনার সাথে যোগাযোগ করবে এবং সম্পূর্ণ কোটেশন পাঠাবে।`;
    } else if (detectedLang === 'hi') {
      replyText = `✅ धन्यवाद ${session.userName ? session.userName + ' जी' : ''}! आपका मोबाइल नंबर +91 ${session.phone} सफलतापूर्वक सत्यापित हो गया है। हमारी पंचकर्म टेक्निकल टीम जल्द ही WhatsApp पर आपसे संपर्क करेगी और कम्प्लीट कोटेशन शेयर करेगी। आप और क्या जानना चाहते हैं?`;
    } else {
      replyText = `✅ Thank you ${session.userName ? session.userName : ''}! Your mobile number +91 ${session.phone} has been verified successfully. Our Ayurvedic specialist will connect with you on WhatsApp shortly to share our 2026 catalogue and custom quotation. How else may I assist you today?`;
    }
  } else if (autoOtpSent) {
    if (detectedLang === 'bn') {
      replyText = `${replyText}\n\n📱 *আমি আপনার WhatsApp নম্বর +91 ${session.phone}-এ একটি ৬-সংখ্যার OTP পাঠিয়েছি।* নিশ্চিতকরণের জন্য দয়া করে এখানে কোডটি লিখুন।`;
    } else if (detectedLang === 'hi') {
      replyText = `${replyText}\n\n📱 *मैंने आपके WhatsApp नंबर +91 ${session.phone} पर 6-अंकों का OTP भेज दिया है।* कृपया पुष्टि के लिए यहाँ 6-अंकों का OTP दर्ज करें।`;
    } else {
      replyText = `${replyText}\n\n📱 *I have sent a 6-digit verification OTP to your WhatsApp number +91 ${session.phone}.* Please enter the 6-digit code here to verify and connect with our specialist.`;
    }
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
    lang: detectedLang,
    userName: session.userName || '',
    reply: replyText,
    replies: [
      {
        text: replyText,
        speakId: nextSpeakId,
      },
    ],
    provider: replyProvider,
    showLeadForm: /\[\[\s*LEAD\s*\]\]/i.test(replyText),
    blocked: false,
    end: /goodbye|have a nice day|alvida|বিদায়/i.test(replyText),
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
  // Specifically match assistant reply by speakId, or assistant message, never user input
  const message =
    session?.messages?.find((m) => m.role === 'assistant' && m.speakId === messageIndex) ||
    session?.messages?.find((m) => m.speakId === messageIndex) ||
    (session?.messages?.[messageIndex]?.role === 'assistant' ? session.messages[messageIndex] : undefined) ||
    (session?.messages?.[messageIndex - 1]?.role === 'assistant' ? session.messages[messageIndex - 1] : undefined) ||
    session?.messages?.slice().reverse().find((m) => m.role === 'assistant') ||
    session?.messages?.[messageIndex - 1] ||
    session?.messages?.[messageIndex];

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
  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const clientIp = visitorOf(req).ip;

  if (!rawText) {
    return successResponse(res, { ok: true });
  }

  // Rewrite speech transcribed in Urdu/Arabic script or Devanagari Hindi into clean Romanized Hinglish
  // (Punjabi/Gurmukhi, Marathi, Gujarati, Bengali and other native languages stay untouched)
  const isGurmukhi = GURMUKHI.test(rawText);
  const isGujarati = /[\u0A80-\u0AFF]/.test(rawText);
  const isBengali = /[\u0980-\u09FF]/.test(rawText);
  const needsRewrite = !isGurmukhi && !isGujarati && !isBengali && ((DEVANAGARI.test(rawText) && !looksMarathi(rawText)) || URDU_LETTERS.test(rawText));
  const text = needsRewrite ? await toHinglish(rawText, { allArabicScript: true }) : rawText;

  let block = await ChatBlockModel.findOne({ ip: clientIp });
  const isIpBlocked = Boolean(block?.blockedUntil && block.blockedUntil > new Date());
  const blockedFor = isIpBlocked && block?.blockedUntil ? block.blockedUntil.getTime() - Date.now() : undefined;

  if (isIpBlocked) {
    return successResponse(res, {
      text,
      role,
      blocked: true,
      blockedFor,
      flagged: true,
      say: 'गलत भाषा की वजह से यह कॉल समाप्त की जा रही है और आपकी चैट ब्लॉक कर दी गई है।',
    });
  }

  // Abusive language detection for user spoken turns
  if (role === 'user' && isAbusive(rawText)) {
    if (!block) block = new ChatBlockModel({ ip: clientIp, strikes: 0 });
    if (block.blockedUntil && block.blockedUntil <= new Date()) {
      block.strikes = 0;
      block.blockedUntil = undefined;
    }
    block.strikes = (block.strikes || 0) + 1;
    block.lastStrikeAt = new Date();
    block.sessionId = sessionId;
    block.lastMessage = rawText.slice(0, 500);

    const MAX_WARNINGS = 3;
    if (block.strikes > MAX_WARNINGS) {
      block.blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await block.save();
      return successResponse(res, {
        text,
        role,
        blocked: true,
        blockedFor: block.blockedUntil.getTime() - Date.now(),
        flagged: true,
        say: 'गलत भाषा की वजह से यह कॉल समाप्त की जा रही है और आपकी चैट 24 घंटे के लिए ब्लॉक कर दी गई है।',
      });
    } else {
      await block.save();
      return successResponse(res, {
        text,
        role,
        blocked: false,
        flagged: true,
        strikes: block.strikes,
        say: `कृपया अनुचित शब्दों का उपयोग न करें। यह चेतावनी ${block.strikes}/3 है।`,
      });
    }
  }

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

    // Check if phone number was spoken in call or user asked for catalogue/WhatsApp
    const phoneInSpoken = extractCleanPhone(rawText) || extractCleanPhone(text);
    if (phoneInSpoken) {
      const existing = await ChatbotSessionModel.findOne({ sessionId });
      const session = await ChatbotSessionModel.findOneAndUpdate(
        { sessionId },
        { $set: { phone: phoneInSpoken, capturedLead: true, whatsappConfirmationSent: true } },
        { new: true }
      );
      if (!existing?.whatsappConfirmationSent) {
        sendChatbotCatalogueWhatsApp(phoneInSpoken, session?.userName).catch((err: any) => {
          console.warn('Call turn WhatsApp catalogue error:', (err as Error).message);
        });
      }
    } else {
      const isWaReq = /\b(whatsapp|catalog|catalogue|brochure|कैटलॉग|ब्रोशर)\b/i.test(rawText + ' ' + text);
      if (isWaReq) {
        const session = await ChatbotSessionModel.findOne({ sessionId });
        if (session?.phone && !session.whatsappConfirmationSent) {
          sendChatbotCatalogueWhatsApp(session.phone, session.userName).catch((err: any) => {
            console.warn('Call turn WhatsApp catalogue error:', (err as Error).message);
          });
          await ChatbotSessionModel.findOneAndUpdate({ sessionId }, { $set: { whatsappConfirmationSent: true } });
        }
      }
    }
  }

  return successResponse(res, { text, role, ok: true });
});

// POST /api/chatbot/call/tool
export const postChatbotCallTool = asyncHandler(async (req: Request, res: Response) => {
  const { name, args, sessionId } = req.body;

  if (name === 'update_visitor' && sessionId) {
    const updateObj: Record<string, any> = {};
    if (args?.name) updateObj.userName = String(args.name).trim();
    if (args?.phone) {
      let cleanPhone = extractCleanPhone(String(args.phone));
      const digits = String(args.phone).replace(/\D/g, '');
      if (!cleanPhone && digits.length === 11 && digits.startsWith('98')) {
        cleanPhone = extractCleanPhone(digits.slice(2));
      }
      if (!cleanPhone && digits.length === 10 && /^[6-9]/.test(digits)) {
        cleanPhone = digits;
      }
      if (cleanPhone) updateObj.phone = cleanPhone;
    }
    if (args?.email) updateObj['manual.email'] = String(args.email).trim();

    const updatedSession = await ChatbotSessionModel.findOneAndUpdate(
      { sessionId },
      { $set: updateObj },
      { new: true }
    );

    const effectivePhone = updateObj.phone || updatedSession?.phone;
    if (effectivePhone && !updatedSession?.whatsappConfirmationSent) {
      sendChatbotCatalogueWhatsApp(effectivePhone, updateObj.userName || updatedSession?.userName).catch((err: any) => {
        console.warn('Call tool WhatsApp catalogue error:', (err as Error).message);
      });
      await ChatbotSessionModel.findOneAndUpdate({ sessionId }, { $set: { whatsappConfirmationSent: true, capturedLead: true } });
    }

    return successResponse(res, { output: { ok: true, name: args?.name, phone: effectivePhone || args?.phone } });
  }

  if (name === 'continue_typing') {
    return successResponse(res, { output: { ok: true } });
  }

  if (name === 'search_website') {
    const query = String(args?.query || '').trim();
    const passages = await searchKnowledge(query, 3);
    const textResult = passages.length
      ? passages.map((p) => `${p.title} (${p.url}): ${p.text}`).join('\n\n')
      : 'No specific matching passage found on the website. Refer to general Panchkarma equipment specs.';
    return successResponse(res, { output: { ok: true, results: textResult } });
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
