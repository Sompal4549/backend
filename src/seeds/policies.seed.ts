import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Seeds the full Privacy Policy and Terms & Conditions text.
 * The storefront reads component-content policy.privacy / policy.terms (data.sections); the admin
 * edits the page section's items. Both are written here so they hold the same content.
 * Starting content only — have it reviewed before relying on it legally.
 */

type PolicySection = { title: string; text: string; bullets?: string[]; extra?: string };

const COMPANY = 'Design House India Pvt. Ltd. (ENSIS)';
const ADDRESS = '12/29, Site-II, Loni Road, Industrial Area, Mohan Nagar, Ghaziabad, Uttar Pradesh 201007, India';
const EMAIL = 'info@ensis.in';
const PHONE = '+91 9654900525';

const PRIVACY: PolicySection[] = [
  {
    title: 'Who We Are',
    text: `This website is operated by ${COMPANY}, a manufacturer of Panchkarma, Ayurvedic, spa and wellness equipment and a provider of turnkey wellness setups and consultancy. In this policy "ENSIS", "we", "us" and "our" refer to the company; "you" refers to any visitor, customer or business partner.`,
    extra: `Registered address: ${ADDRESS}.`,
  },
  {
    title: 'Information We Collect',
    text: 'We collect the information you choose to give us and a limited amount of technical information collected automatically.',
    bullets: [
      'Contact details: name, mobile / WhatsApp number, email address, company or clinic name, city and state.',
      'Project details: project type and size, budget range, timeline, services required, messages and files you attach (such as floor plans).',
      'Career applications: CV / resume, photograph, work experience, current company, notice period and expected salary.',
      'Orders and accounts: billing and delivery address, order history and GST details where provided.',
      'Chatbot conversations: the questions you ask our website assistant and any details you share in it.',
      'Technical data: IP address, browser and device type, pages visited and the referring website.',
    ],
  },
  {
    title: 'How We Use Your Information',
    text: 'We use your information only for purposes connected with our products and services.',
    bullets: [
      'To respond to enquiries, prepare quotations, 2D/3D layouts and project proposals.',
      'To process orders, deliveries, installation, warranty and after-sales support.',
      'To assess job applications and contact candidates.',
      'To send updates, catalogues and newsletters you have asked for — you can unsubscribe at any time.',
      'To improve our website, chatbot answers and customer service.',
      'To meet legal, tax and accounting obligations.',
    ],
  },
  {
    title: 'Legal Basis & Consent',
    text: 'We process personal data on the basis of your consent (for example when you submit a form and agree to be contacted), to perform a contract with you, and to comply with applicable law, including the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.',
    extra: 'You may withdraw consent at any time by writing to us; this does not affect processing already carried out.',
  },
  {
    title: 'Cookies & Analytics',
    text: 'Our website uses cookies and similar technologies to remember your preferences (such as chat language), keep you signed in and understand how the website is used through analytics tools.',
    extra: 'You can block or delete cookies in your browser settings; some features, such as the cart or sign-in, may then not work correctly.',
  },
  {
    title: 'Sharing & Disclosure',
    text: 'We do not sell or rent your personal information. We share it only where needed to serve you:',
    bullets: [
      'Logistics, installation and payment partners who help us deliver an order.',
      'Service providers who host our website, send emails or WhatsApp messages, or store files on our behalf.',
      'Professional advisers, auditors and authorities where required by law or to protect our legal rights.',
    ],
    extra: 'Every partner is required to keep your information confidential and use it only for the service they provide to us.',
  },
  {
    title: 'Data Storage & Security',
    text: 'Your information is stored on secured servers and cloud services with access limited to authorised staff. We use encrypted connections (HTTPS), access controls and regular reviews to protect it from loss, misuse or unauthorised access.',
    extra: 'No method of transmission over the internet is completely secure, but we work to protect your data using reasonable safeguards.',
  },
  {
    title: 'Data Retention',
    text: 'We keep personal information only as long as needed for the purpose it was collected: enquiries and quotations for up to 3 years, customer and order records for the period required by tax law, and career applications for up to 12 months unless you ask us to delete them sooner.',
  },
  {
    title: 'Your Rights',
    text: 'Subject to applicable law, you may:',
    bullets: [
      'Ask for a copy of the personal information we hold about you.',
      'Ask us to correct inaccurate or incomplete information.',
      'Ask us to delete your information or withdraw your consent.',
      'Opt out of marketing messages at any time.',
      'Raise a grievance with our Grievance Officer (details below).',
    ],
    extra: `Send requests to ${EMAIL}; we respond within 30 days.`,
  },
  {
    title: "Children's Privacy",
    text: 'Our website and services are intended for adults and businesses. We do not knowingly collect personal information from anyone under 18. If you believe a child has shared information with us, please contact us and we will delete it.',
  },
  {
    title: 'Grievance Officer',
    text: `For any questions, concerns or complaints about how your data is handled, contact our Grievance Officer at ${EMAIL} or ${PHONE}, or write to ${COMPANY}, ${ADDRESS}.`,
  },
  {
    title: 'Changes to This Policy',
    text: 'We may update this Privacy Policy from time to time. The "Last updated" date at the top shows when it was last revised; significant changes will be highlighted on this page.',
  },
];

const TERMS: PolicySection[] = [
  {
    title: 'Acceptance of Terms',
    text: `By accessing the ENSIS website, browsing our catalogue, placing an order or submitting an enquiry, you agree to these Terms & Conditions with ${COMPANY}. If you do not agree, please do not use the website.`,
    extra: 'These terms apply to all visitors, users, customers and business partners.',
  },
  {
    title: 'Products & Services',
    text: 'ENSIS designs, manufactures and installs Ayurvedic, Panchkarma, spa and wellness equipment and furniture, and delivers turnkey wellness spaces and consultancy. Specifications, dimensions, finishes and prices may change without prior notice.',
    bullets: [
      'Product images are indicative; natural materials such as solid wood vary in grain and shade.',
      'Custom-built products are manufactured to the drawings and specifications you approve.',
      'Turnkey and consultancy projects are governed by the separate proposal or agreement for that project.',
    ],
  },
  {
    title: 'Quotations & Orders',
    text: 'Quotations are valid for 30 days unless stated otherwise. An order is confirmed only when we accept it in writing and receive the agreed advance payment.',
    extra: 'Prices exclude GST, freight, installation and site work unless the quotation says they are included.',
  },
  {
    title: 'Payments',
    text: 'Payment terms are set out in each quotation or invoice. Online payments are processed by our payment gateway partner; we do not store your card or bank details.',
    bullets: [
      'Standard products: full payment before dispatch unless agreed otherwise.',
      'Custom and turnkey projects: payment in the milestones stated in the proposal.',
      'Delayed payments may delay production, dispatch or installation.',
    ],
  },
  {
    title: 'Shipping & Delivery',
    text: 'We ship across India and to international destinations. Delivery dates are estimates and depend on production, transport and site readiness. Risk passes to you on delivery; please check goods at delivery and note visible damage on the delivery receipt.',
  },
  {
    title: 'Installation & Site Readiness',
    text: 'Where installation is included, you are responsible for site access, civil work, plumbing, electrical points and any permissions required. Additional visits caused by an unready site may be charged.',
  },
  {
    title: 'Cancellations & Returns',
    text: 'Standard products may be cancelled before dispatch, subject to deduction of costs already incurred. Custom-made products and project work cannot be cancelled once production has started. Returns are accepted only for items that arrive damaged or defective and are reported within 48 hours of delivery.',
  },
  {
    title: 'Warranty',
    text: 'ENSIS equipment carries a 5-year structural warranty against manufacturing defects, unless the product documentation states otherwise.',
    bullets: [
      'The warranty does not cover normal wear, misuse, water or oil damage from improper care, or unauthorised repairs.',
      'Electrical and motorised parts are covered for the period stated in the product documentation.',
      'Warranty service is provided by repair or replacement at our discretion.',
    ],
  },
  {
    title: 'Intellectual Property',
    text: 'All content on this website — text, product designs, drawings, layouts, images, logos and videos — belongs to ENSIS or its licensors. You may not copy, reproduce or use it commercially without our written permission. Designs and layouts we prepare for your project remain our property until paid for in full.',
  },
  {
    title: 'Website Use',
    text: 'You agree not to misuse the website, including attempting unauthorised access, submitting false information, or interfering with its operation. Information on the website, including chatbot answers, is for general guidance and does not replace a written quotation or professional medical advice.',
  },
  {
    title: 'Limitation of Liability',
    text: 'To the extent permitted by law, ENSIS is not liable for indirect or consequential losses, such as loss of business or profit. Our total liability for any claim is limited to the amount paid for the product or service concerned.',
  },
  {
    title: 'Governing Law & Disputes',
    text: 'These terms are governed by the laws of India. Disputes will first be addressed through good-faith discussion; failing that, they are subject to the exclusive jurisdiction of the courts at Ghaziabad, Uttar Pradesh.',
    extra: `Questions about these terms: ${EMAIL} or ${PHONE}.`,
  },
];

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const toStorefront = (sections: PolicySection[]) =>
  sections.map((s, i) => ({
    id: slug(s.title),
    number: String(i + 1).padStart(2, '0'),
    title: s.title,
    text: s.text,
    ...(s.bullets ? { bullets: s.bullets } : {}),
    ...(s.extra ? { extra: s.extra } : {}),
  }));

const toAdminItems = (sections: PolicySection[]) =>
  sections.map((s, i) => ({ title: `${i + 1}. ${s.title}`, description: s.text }));

const LAST_UPDATED = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

const POLICIES = [
  { componentKey: 'policy.privacy', configKey: 'privacyPolicyPage', sections: PRIVACY },
  { componentKey: 'policy.terms', configKey: 'termsAndConditionsPage', sections: TERMS },
];

const main = async (): Promise<void> => {
  await connectDatabase();
  const db = mongoose.connection.db!;
  try {
    for (const policy of POLICIES) {
      const storefront = toStorefront(policy.sections);
      const items = toAdminItems(policy.sections);

      const cc = await db.collection('componentcontents').updateOne(
        { key: policy.componentKey },
        { $set: { 'data.sections': storefront, 'data.hero.lastUpdated': LAST_UPDATED, isActive: true } }
      );

      // The page's policy section (componentKey policy.*) in Settings and Page
      const settings = await db.collection('settings').updateOne(
        { [`data.${policy.configKey}.sections.componentKey`]: policy.componentKey },
        {
          $set: {
            [`data.${policy.configKey}.sections.$[s].items`]: items,
            [`data.${policy.configKey}.sections.$[s].data.sections`]: storefront,
          },
        },
        { arrayFilters: [{ 's.componentKey': policy.componentKey }] }
      );
      // Page.sections mirrors the admin's Settings sections (older imports split policies into one section per heading)
      const savedSettings = await db.collection('settings').findOne(
        { [`data.${policy.configKey}.sections`]: { $exists: true } },
        { projection: { [`data.${policy.configKey}.sections`]: 1 } }
      );
      const adminSections = (savedSettings as any)?.data?.[policy.configKey]?.sections;
      const page = adminSections
        ? await db.collection('pages').updateOne({ configKey: policy.configKey }, { $set: { sections: adminSections } })
        : { matchedCount: 0 };
      console.log(
        `${policy.componentKey}: ${storefront.length} sections — storefront ${cc.matchedCount ? 'updated' : 'MISSING'}, admin settings ${settings.matchedCount ? 'updated' : 'MISSING'}, page ${page.matchedCount ? 'updated' : 'MISSING'}`
      );
    }
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('POLICIES SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
