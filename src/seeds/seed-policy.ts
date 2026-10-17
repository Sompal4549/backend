import mongoose from 'mongoose';
import Page from '../models/page.model';
import { ComponentContentModel } from '../models/component-content.model';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ensis';

const privacySections = [
  {
    id: "information-we-collect",
    number: "01",
    title: "Information We Collect",
    text: "We collect information you provide directly — name, email, phone number, company details, project requirements and any files you upload through our enquiry and career forms. We also collect standard technical data such as IP address, browser type and pages visited.",
    bullets: [
      "Enquiry and contact form submissions",
      "Job applications including resumes and portfolios",
      "Newsletter subscriptions",
      "Device and analytics data collected via cookies"
    ]
  },
  {
    id: "how-we-use",
    number: "02",
    title: "How We Use Your Information",
    text: "Your information is used to respond to enquiries, prepare quotations, process orders, evaluate job applications, improve our website and send occasional updates you have opted into.",
    bullets: [
      "To deliver products and services you request",
      "To communicate about projects, orders and support",
      "To improve website performance and user experience",
      "To meet legal and regulatory obligations"
    ]
  },
  {
    id: "cookies",
    number: "03",
    title: "Cookies & Analytics",
    text: "We use cookies to remember preferences, keep your cart intact and understand how visitors use the site. You can disable cookies in your browser settings, though some features may not function correctly."
  },
  {
    id: "data-sharing",
    number: "04",
    title: "Data Sharing & Disclosure",
    text: "We do not sell your personal information. Data may be shared with trusted service providers — such as logistics partners, payment processors and analytics tools — strictly to the extent needed to deliver our services.",
    extra: "We may disclose information if required by law or to protect the rights and safety of ENSIS and its customers."
  },
  {
    id: "data-retention",
    number: "05",
    title: "Data Retention",
    text: "We retain enquiry and order records for as long as needed for service delivery and legal compliance. Job application data is retained for up to 12 months unless you request earlier deletion."
  },
  {
    id: "your-rights",
    number: "06",
    title: "Your Rights",
    text: "You may request access to, correction of or deletion of your personal data at any time by writing to us. We respond to verified requests within a reasonable period.",
    link: { href: "/contact", label: "Contact us to exercise your rights" }
  },
  {
    id: "security",
    number: "07",
    title: "Security",
    text: "We implement appropriate technical and organisational measures to protect your data against unauthorised access, alteration, disclosure or destruction."
  },
  {
    id: "policy-changes",
    number: "08",
    title: "Changes to This Policy",
    text: "We may update this Privacy Policy from time to time. The latest version will always be published on this page with an updated revision date."
  }
];

const termsSections = [
  {
    id: "acceptance-of-terms",
    number: "01",
    title: "Acceptance of Terms",
    text: "By accessing the ENSIS website, browsing our product catalog or submitting an enquiry, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, please discontinue use of the website immediately.",
    extra: "These terms apply to all visitors, users, customers and business partners who access or use our services."
  },
  {
    id: "products-services",
    number: "02",
    title: "Products & Services",
    text: "ENSIS designs, manufactures and installs ayurvedic and wellness equipment, furniture and turnkey wellness spaces. Product specifications, dimensions, finishes and pricing are subject to change without prior notice.",
    bullets: [
      "All product images are indicative; actual finishes may vary due to natural material variation.",
      "Custom-built products are manufactured to approved drawings and specifications.",
      "Installation is subject to site readiness and separate service agreements."
    ],
    extra: "Detailed quotations and project schedules shared via email form the final scope of work."
  },
  {
    id: "orders-payments",
    number: "03",
    title: "Orders & Payments",
    text: "Orders are confirmed only upon receipt of the agreed advance payment and written purchase order. Balance payments are due as per the milestone schedule mentioned in the quotation.",
    bullets: [
      "Prices are exclusive of GST and applicable statutory levies unless stated otherwise.",
      "Payment timelines are mentioned in each quotation and invoice.",
      "Delayed payments may attract interest as communicated at the time of order confirmation."
    ],
    link: { href: "/contact", label: "Contact us for order queries" }
  },
  {
    id: "shipping-delivery",
    number: "04",
    title: "Shipping & Delivery",
    text: "Delivery timelines are estimates and may be affected by customisation complexity, raw material availability and logistics conditions. Risk in the goods passes to the buyer upon delivery at the agreed site.",
    extra: "Any delays will be communicated proactively with a revised schedule."
  },
  {
    id: "returns-warranty",
    number: "05",
    title: "Returns & Warranty",
    text: "Standard products carry a limited warranty against manufacturing defects as mentioned in the warranty card. Custom-made products are not eligible for return or exchange once approved and manufactured.",
    bullets: [
      "Warranty does not cover normal wear, misuse or unauthorised modifications.",
      "Claims must be raised within the warranty period with proof of purchase.",
      "Warranty service may be provided onsite or at our facility depending on the product."
    ],
    extra2: "Spare parts and after-sales support are available for the product lifecycle mentioned in your agreement."
  },
  {
    id: "intellectual-property",
    number: "06",
    title: "Intellectual Property",
    text: "All content on this website — including text, images, logos, product designs, drawings and 3D renders — is the property of ENSIS or its licensors and may not be reproduced without written permission."
  },
  {
    id: "limitation-liability",
    number: "07",
    title: "Limitation of Liability",
    text: "ENSIS shall not be liable for any indirect, incidental or consequential damages arising from the use of this website or its products, to the maximum extent permitted by law.",
    extra: "Our total liability for any claim shall not exceed the amount paid for the specific product or service concerned."
  },
  {
    id: "governing-law",
    number: "08",
    title: "Governing Law",
    text: "These Terms & Conditions are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Kochi, Kerala.",
    link: { href: "/privacy-policy", label: "Read our Privacy Policy" }
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Seed ComponentContent policy.privacy
  await ComponentContentModel.findOneAndUpdate(
    { key: 'policy.privacy' },
    {
      key: 'policy.privacy',
      label: 'Privacy Policy',
      page: 'policy',
      description: 'Privacy Policy clauses and disclosures for Ensis.',
      isActive: true,
      data: {
        hero: {
          eyebrow: "ENSIS LEGAL & PRIVACY",
          title: "Privacy Policy",
          subtitle: "Your privacy and trust matter to us. Learn how ENSIS collects, uses and protects your information.",
          lastUpdated: "October 2026",
          stats: [
            { number: "100%", label: "Data Protection" },
            { number: "24/7", label: "Support Available" },
            { number: "1000+", label: "Clients Trust Us" },
            { number: "20+", label: "Years Experience" }
          ]
        },
        intro: {
          heading: "Your Privacy, Handled with Care",
          description: "ENSIS respects the privacy of every visitor, customer and business partner. This Privacy Policy explains how we collect, use, store and protect information when you interact with our website, products and services.",
          features: [
            { title: "Privacy &", subtitle: "Transparency" },
            { title: "Secure Information", subtitle: "Handling" },
            { title: "Responsible", subtitle: "Communication" }
          ]
        },
        contact: {
          heading: "Have a Privacy Question?",
          subheading: "Contact Our Team",
          description: "We are committed to protecting your information and resolving any concerns you may have.",
          phone: "+91 9654900525",
          email: "info@ensis.in",
          website: "www.ensis.in"
        },
        sections: privacySections
      }
    },
    { upsert: true, new: true }
  );
  console.log('ComponentContent policy.privacy updated');

  // 2. Seed ComponentContent policy.terms
  await ComponentContentModel.findOneAndUpdate(
    { key: 'policy.terms' },
    {
      key: 'policy.terms',
      label: 'Terms & Conditions',
      page: 'policy',
      description: 'Terms and Conditions legal clauses for Ensis.',
      isActive: true,
      data: {
        hero: {
          eyebrow: "ENSIS COMMERCIAL & LEGAL",
          title: "Terms & Conditions",
          subtitle: "Commercial guidelines, warranties and service agreements for Ensis products and installations.",
          lastUpdated: "October 2026",
          stats: [
            { number: "3 Years", label: "Table Warranty" },
            { number: "NABH", label: "Compliance Guarantee" },
            { number: "Pan India", label: "Service Network" },
            { number: "100%", label: "Authentic Materials" }
          ]
        },
        intro: {
          heading: "Transparent Commercial Terms",
          description: "These terms govern the access, purchase, installation, and usage of Ensis wellness and Panchkarma equipment.",
          features: [
            { title: "Clear", subtitle: "Warranty Terms" },
            { title: "Transparent", subtitle: "Payment Milestones" },
            { title: "Reliable", subtitle: "After-Sales Support" }
          ]
        },
        contact: {
          heading: "Need Legal or Commercial Clarification?",
          subheading: "Reach Out to Our Operations Desk",
          description: "Our dedicated contract and customer support team is available to assist you with any questions.",
          phone: "+91 9654900525",
          email: "info@ensis.in",
          website: "www.ensis.in"
        },
        sections: termsSections
      }
    },
    { upsert: true, new: true }
  );
  console.log('ComponentContent policy.terms updated');

  // 3. Update PageModel for /privacy-policy and /terms-and-conditions
  const privacyPageSections = privacySections.map((sec) => ({
    key: `privacy.${sec.id}`,
    componentKey: `policy.privacy`,
    name: `${sec.number}. ${sec.title}`,
    enabled: true,
    title: sec.title,
    description: sec.text,
    data: sec,
    items: (sec.bullets || []).map((b) => ({ title: b, description: '' }))
  }));

  const termsPageSections = termsSections.map((sec) => ({
    key: `terms.${sec.id}`,
    componentKey: `policy.terms`,
    name: `${sec.number}. ${sec.title}`,
    enabled: true,
    title: sec.title,
    description: sec.text,
    data: sec,
    items: (sec.bullets || []).map((b) => ({ title: b, description: '' }))
  }));

  await Page.findOneAndUpdate(
    { slug: { $in: ['/privacy-policy', 'privacy-policy'] } },
    {
      $set: {
        sections: privacyPageSections
      }
    }
  );
  console.log('Page /privacy-policy updated with', privacyPageSections.length, 'sections');

  await Page.findOneAndUpdate(
    { slug: { $in: ['/terms-and-conditions', 'terms-and-conditions'] } },
    {
      $set: {
        sections: termsPageSections
      }
    }
  );
  console.log('Page /terms-and-conditions updated with', termsPageSections.length, 'sections');

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
