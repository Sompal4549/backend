import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import Page from '../models/page.model';
import Settings from '../models/settings.model';
import { ComponentContentModel } from '../models/component-content.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ensis';

export const disclaimerSections = [
  {
    id: "general-information",
    number: "01",
    title: "General Information",
    text: "The information provided on this website (the “Website”) is for general informational purposes only. ENSIS – Panchkarma & Spa Solutions is a brand of Design House India Pvt Ltd. While we strive to keep the information accurate, up to date and complete, we make no warranties or representations of any kind, express or implied, about the accuracy, reliability, completeness, suitability or availability of the content on this Website.",
    icon: "file-text"
  },
  {
    id: "product-information",
    number: "02",
    title: "Product Information",
    text: "All products, specifications, designs, dimensions, features and other details shown on this Website are for illustrative and general guidance purposes only. Actual products may vary slightly due to colour variation, material properties, manufacturing process or customisation. We reserve the right to modify product details, specifications and pricing without prior notice.",
    icon: "package"
  },
  {
    id: "images-and-visuals",
    number: "03",
    title: "Images and Visuals",
    text: "The images, renders and photographs displayed on this Website are for representative purposes only. They may include customised projects, concept designs or sample installations. Actual product colour, finish, texture and appearance may vary due to lighting, screen settings, manufacturing differences and project-specific customisation.",
    icon: "image"
  },
  {
    id: "third-party-links",
    number: "04",
    title: "Third-Party Links",
    text: "This Website may contain links to third-party websites for your convenience. We do not endorse or take responsibility for the content, privacy practices or policies of any third-party websites. Accessing such links is at your own risk.",
    icon: "link"
  },
  {
    id: "professional-advice",
    number: "05",
    title: "Professional Advice",
    text: "The content on this Website does not constitute professional, medical, legal or technical advice. For specific project requirements, product suitability, installation, usage or other professional guidance, please contact our team directly for consultation.",
    icon: "users"
  },
  {
    id: "limitation-of-liability",
    number: "06",
    title: "Limitation of Liability",
    text: "To the fullest extent permitted by law, ENSIS and Design House India Pvt Ltd. shall not be liable for any direct, indirect, incidental, special or consequential losses or damages arising from the use of this Website, its content, products or services.",
    icon: "shield"
  },
  {
    id: "availability-of-products-and-services",
    number: "07",
    title: "Availability of Products and Services",
    text: "All products and services are subject to availability, project feasibility, customisation requirements and mutually agreed terms. We reserve the right to discontinue or modify any product or service at any time without prior notice.",
    icon: "cart"
  },
  {
    id: "intellectual-property",
    number: "08",
    title: "Intellectual Property",
    text: "All content, including text, images, logos, designs, product information and code, is the property of Design House India Pvt Ltd. and/or its brand ENSIS, unless otherwise stated. Unauthorised use, reproduction or distribution is strictly prohibited.",
    icon: "copyright"
  },
  {
    id: "user-responsibility",
    number: "09",
    title: "User Responsibility",
    text: "By using this Website, you agree to use the information responsibly and not for any unlawful, misleading or unauthorised purpose.",
    icon: "user"
  },
  {
    id: "changes-to-disclaimer",
    number: "10",
    title: "Changes to Disclaimer",
    text: "We may update this Disclaimer from time to time. Any changes will be posted on this page with the revised “Last Updated” date.",
    icon: "file-cog"
  },
  {
    id: "contact-us",
    number: "11",
    title: "Contact Us",
    text: "If you have any questions about this Disclaimer, please contact us at info@ensis.in.",
    icon: "mail"
  }
];

export const refundSections = [
  {
    id: "introduction",
    number: "01",
    title: "Introduction",
    text: "This Refund Policy applies to all products and services provided by ENSIS – Panchkarma & Spa Solutions, a brand of Design House India Pvt Ltd. (“we”, “us”, “our”). It outlines the circumstances under which cancellations, refunds or adjustments may be considered for payments made through our Website, enquiries, quotations, purchase orders or service contracts."
  },
  {
    id: "scope",
    number: "02",
    title: "Scope",
    text: "This policy covers standard products, customised products, project-based orders, consultancy services, training, and other services offered by ENSIS through our Website (https://web.ensis.in), email, phone or authorised representatives."
  },
  {
    id: "cancellation-policy",
    number: "03",
    title: "Cancellation Policy",
    text: "Cancellation requests must be submitted in writing. The applicable terms depend on the stage your order has reached:",
    cards: [
      {
        icon: "file-x",
        title: "Before Order Confirmation",
        text: "You may cancel your enquiry or request at any time before a formal order is confirmed. No charges will be applied."
      },
      {
        icon: "settings",
        title: "After Order Confirmation",
        text: "Cancellation may be possible only with written request and subject to project stage, material procurement and customisation status."
      },
      {
        icon: "puzzle",
        title: "Customised / Project Orders",
        text: "Once raw material procurement or design work has commenced, cancellation may not be possible or may attract partial charges."
      },
      {
        icon: "calendar",
        title: "Event / Training / Consultation",
        text: "Cancellations for events, training or consultancy services must be made as per the guidelines communicated at the time of booking."
      }
    ]
  },
  {
    id: "refund-eligibility",
    number: "04",
    title: "Refund Eligibility",
    text: "A refund may be considered in the following cases:",
    checkItems: [
      "Advance payment made for confirmed orders, if cancellation is requested before production or dispatch.",
      "Duplicate payment made due to technical error.",
      "Services cancelled by ENSIS due to unforeseen circumstances.",
      "If the product delivered is significantly different from the agreed specifications, and cannot be rectified (as per our assessment).",
      "Any other genuine reason, subject to written approval from ENSIS management."
    ]
  },
  {
    id: "refund-process",
    number: "05",
    title: "Refund Process",
    text: "To request a refund, write to info@ensis.in with your order reference, proof of payment and the reason for the request. Our team will acknowledge your request within 2 working days and verify the details against our records.",
    bullets: [
      "Approved refunds are credited to the original payment method used for the transaction.",
      "Refund approvals are communicated in writing by an authorised ENSIS representative.",
      "We may request additional information or documentation to process your claim."
    ]
  },
  {
    id: "timelines",
    number: "06",
    title: "Timelines",
    text: "Once a refund is approved, processing typically follows this schedule:",
    bullets: [
      "Credit/debit card and net banking refunds: 7–10 working days, subject to bank processing.",
      "UPI and wallet refunds: 3–5 working days.",
      "Cheque or bank transfer refunds: 10–15 working days."
    ],
    extra: "Timelines are indicative and may vary depending on the bank or payment provider."
  },
  {
    id: "non-refundable-items",
    number: "07",
    title: "Non-Refundable Items",
    text: "Certain categories of payments are non-refundable by default:",
    bullets: [
      "Products that have been dispatched, installed or used.",
      "Customised or made-to-order products after design approval and material procurement.",
      "Delivered services such as consultancy, training, site visits and audits.",
      "Amounts paid towards logistics, freight, packing or third-party services.",
      "Government levies, GST and other statutory charges."
    ]
  },
  {
    id: "project-based-custom-orders",
    number: "08",
    title: "Project-Based & Custom Orders",
    text: "Project-based and custom orders are governed by the milestone schedule mentioned in the signed quotation or contract. Refund eligibility is calculated only on the unearned portion of the payment, adjusted for materials procured, work completed and administrative costs.",
    extra: "Any advance forfeited or adjusted will be communicated in writing before closure of the project."
  },
  {
    id: "service-consultancy-fees",
    number: "09",
    title: "Service & Consultancy Fees",
    text: "Service and consultancy fees are non-refundable once the engagement has commenced. If a service is cancelled by ENSIS before commencement, a full refund of the collected fee will be issued within the timelines mentioned in section 06."
  },
  {
    id: "payment-gateway-bank-charges",
    number: "10",
    title: "Payment Gateway & Bank Charges",
    text: "Payment gateway convenience fees, bank charges and transaction fees charged by third parties are non-refundable. In the case of a refund, these charges will be deducted from the refundable amount.",
    extra: "In rare cases of a failed or duplicate transaction, we will assist you in raising a chargeback request with the payment provider."
  },
  {
    id: "modifications-rescheduling",
    number: "11",
    title: "Modifications & Rescheduling",
    text: "Requests to modify quantities, specifications or delivery schedules after order confirmation are subject to a re-estimation of cost. If the modification increases the order value, the difference is payable before production resumes; if it reduces the value, the difference is adjusted against the balance payable or future invoices rather than refunded.",
    extra: "Event, training and consultation sessions may be rescheduled once at no cost if requested at least 7 days in advance. Later rescheduling may attract a rescheduling fee."
  },
  {
    id: "disputes",
    number: "12",
    title: "Disputes",
    text: "In case of any disagreement regarding a refund decision, please write to our team with supporting evidence. We will review the matter and respond within 15 working days.",
    extra: "These terms are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of the courts of Kochi, Kerala.",
    link: { href: "/terms-and-conditions", label: "Read our Terms & Conditions" }
  },
  {
    id: "contact-us",
    number: "13",
    title: "Contact Us",
    text: "For refund requests, cancellations or any related questions, reach out to our team:",
    bullets: [
      "Email: info@ensis.in",
      "Phone: +91 9654900525"
    ],
    extra: "Design House India Pvt Ltd (ENSIS – Panchkarma & Spa Solutions), Kochi, Kerala, India."
  }
];

export const privacySections = [
  {
    id: "introduction",
    number: "01",
    title: "Introduction",
    text: "Design House India Pvt. Ltd. (operating under the brand ENSIS) (“we”, “us”, “our”) values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose and safeguard your information when you visit our website https://web.ensis.in (the “Website”), submit an enquiry, or interact with us through any of our digital channels.",
    extra: "By using our Website or providing your information, you agree to the practices described in this Privacy Policy."
  },
  {
    id: "information-we-collect",
    number: "02",
    title: "Information We Collect",
    text: "We may collect the following types of information:",
    cards: [
      {
        icon: "user",
        title: "Personal Information",
        text: "Such as name, phone number, email address, company name, location and other details submitted through enquiry forms or direct communication."
      },
      {
        icon: "list",
        title: "Project Information",
        text: "Details related to your requirements, project type, project location, budget range and any other information you choose to share."
      },
      {
        icon: "monitor",
        title: "Technical Information",
        text: "Such as IP address, browser type, device information, pages visited and time spent on the Website."
      },
      {
        icon: "message",
        title: "Communication Data",
        text: "Information you provide when you contact us via email, phone or chat, including the content of your messages."
      }
    ]
  },
  {
    id: "how-we-use",
    number: "03",
    title: "How We Use Your Information",
    text: "We use the information we collect to:",
    checkItems: [
      "Respond to your enquiries and provide relevant information.",
      "Understand your requirements and offer suitable solutions.",
      "Improve our products, services and website experience.",
      "Communicate with you regarding your projects, updates and offers (with your consent).",
      "Maintain internal records and ensure effective customer support.",
      "Comply with applicable legal and regulatory requirements."
    ]
  },
  {
    id: "cookies",
    number: "04",
    title: "Cookies and Tracking Technologies",
    text: "We use cookies and similar tracking technologies to remember your preferences, keep your cart intact and understand how visitors use the site. You can disable cookies in your browser settings, though some features may not function correctly."
  },
  {
    id: "data-sharing",
    number: "05",
    title: "Sharing of Information",
    text: "We do not sell your personal information. Data may be shared with trusted service providers — such as logistics partners, payment processors and analytics tools — strictly to the extent needed to deliver our services.",
    extra: "We may disclose information if required by law or to protect the rights and safety of ENSIS and our customers."
  },
  {
    id: "data-security",
    number: "06",
    title: "Data Security",
    text: "We implement appropriate technical and organisational measures to protect your data against unauthorised access, alteration, disclosure or destruction."
  },
  {
    id: "your-rights",
    number: "07",
    title: "Your Rights",
    text: "You may request access to, correction of or deletion of your personal data at any time by writing to us. We respond to verified requests within a reasonable period.",
    link: { href: "/contact", label: "Contact us to exercise your rights" }
  },
  {
    id: "third-party-links",
    number: "08",
    title: "Third-Party Links",
    text: "This Website may contain links to third-party websites for your convenience. We do not endorse or take responsibility for the content, privacy practices or policies of any third-party websites. Accessing such links is at your own risk."
  },
  {
    id: "childrens-privacy",
    number: "09",
    title: "Children's Privacy",
    text: "Our Website and services are directed at businesses and adults. We do not knowingly collect personal information from children. If you believe a child has provided us with information, please contact us and we will delete it."
  },
  {
    id: "policy-changes",
    number: "10",
    title: "Updates to This Policy",
    text: "We may update this Privacy Policy from time to time. The latest version will always be published on this page with an updated revision date."
  },
  {
    id: "contact-us",
    number: "11",
    title: "Contact Us",
    text: "For any questions about this Privacy Policy or your personal data, reach out to our team:",
    bullets: [
      "Email: info@ensis.in",
      "Phone: +91 9654900525"
    ]
  }
];

async function seedLegalPages() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // ==========================================
  // 1. ComponentContent Seeding
  // ==========================================
  await ComponentContentModel.findOneAndUpdate(
    { key: 'policy.disclaimer' },
    {
      $set: {
        key: 'policy.disclaimer',
        label: 'Website & Product Disclaimer',
        page: 'policy',
        description: 'Legal disclaimer regarding product representations, dimensions, finishes and liability.',
        isActive: true,
        data: {
          hero: {
            eyebrow: "LEGAL NOTICE",
            title: "Disclaimer",
            subtitle: "Important information about the use of our website, products, services and content.",
            lastUpdated: "October 2026"
          },
          sections: disclaimerSections
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('ComponentContent policy.disclaimer upserted');

  await ComponentContentModel.findOneAndUpdate(
    { key: 'policy.refund' },
    {
      $set: {
        key: 'policy.refund',
        label: 'Refund & Cancellation Policy',
        page: 'policy',
        description: 'Conditions under which cancellations, refunds or adjustments apply to our products, services and payments.',
        isActive: true,
        data: {
          hero: {
            eyebrow: "COMMERCIAL TERMS",
            title: "Refund Policy",
            subtitle: "Clear guidelines on order cancellations, project adjustments and refund processing.",
            lastUpdated: "October 2026"
          },
          sections: refundSections
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('ComponentContent policy.refund upserted');

  await ComponentContentModel.findOneAndUpdate(
    { key: 'policy.privacy' },
    {
      $set: {
        key: 'policy.privacy',
        label: 'Privacy Policy',
        page: 'policy',
        description: 'How ENSIS collects, uses, protects and respects institutional and customer information.',
        isActive: true,
        data: {
          hero: {
            eyebrow: "POLICY GUIDE",
            title: "Privacy Policy",
            subtitle: "Your privacy is important to us. This policy explains how ENSIS collects, uses, protects and respects your information.",
            lastUpdated: "October 2026"
          },
          sections: privacySections
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('ComponentContent policy.privacy upserted');

  // ==========================================
  // 2. Build Section-by-Section Admin Lists
  // ==========================================
  const disclaimerPageSections = disclaimerSections.map((sec) => ({
    key: `disclaimer.${sec.id}`,
    componentKey: 'policy.disclaimer',
    name: `${sec.number}. ${sec.title}`,
    enabled: true,
    title: sec.title,
    description: sec.text,
    icon: sec.icon,
    items: [],
    data: sec,
  }));

  const refundPageSections = refundSections.map((sec) => ({
    key: `refund.${sec.id}`,
    componentKey: 'policy.refund',
    name: `${sec.number}. ${sec.title}`,
    enabled: true,
    title: sec.title,
    description: sec.text,
    ...(sec.extra ? { extra: sec.extra } : {}),
    ...(sec.link ? { link: sec.link } : {}),
    items: sec.cards
      ? sec.cards.map((c) => ({
          icon: c.icon,
          title: c.title,
          description: c.text,
        }))
      : sec.checkItems
      ? sec.checkItems.map((chk) => ({
          title: chk,
        }))
      : sec.bullets
      ? sec.bullets.map((b) => ({
          title: b,
        }))
      : [],
    data: sec,
  }));

  const privacyPageSections = privacySections.map((sec) => ({
    key: `privacy.${sec.id}`,
    componentKey: 'policy.privacy',
    name: `${sec.number}. ${sec.title}`,
    enabled: true,
    title: sec.title,
    description: sec.text,
    ...(sec.extra ? { extra: sec.extra } : {}),
    ...(sec.link ? { link: sec.link } : {}),
    items: sec.cards
      ? sec.cards.map((c) => ({
          icon: c.icon,
          title: c.title,
          description: c.text,
        }))
      : sec.checkItems
      ? sec.checkItems.map((chk) => ({
          title: chk,
        }))
      : sec.bullets
      ? sec.bullets.map((b) => ({
          title: b,
        }))
      : [],
    data: sec,
  }));

  // ==========================================
  // 3. Upsert Pages
  // ==========================================
  await Page.findOneAndUpdate(
    { configKey: 'disclaimerPage' },
    {
      $set: {
        configKey: 'disclaimerPage',
        pageName: 'Disclaimer',
        slug: '/disclaimer',
        status: 'Published',
        visibility: 'Public',
        author: 'Admin',
        updatedBy: 'Admin',
        sections: disclaimerPageSections,
        seo: {
          metaTitle: 'Disclaimer | ENSIS Wellness Furniture',
          metaDescription: 'Important information about the use of ENSIS website, products, services, visuals and content.',
          metaKeywords: 'disclaimer, ensis, wellness furniture, ayurvedic equipment',
          canonicalUrl: 'https://ensis.in/disclaimer',
          h1Tag: 'Disclaimer',
          robotsIndex: true,
          robotsFollow: true,
          isActive: true
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('Page /disclaimer upserted with 11 sections');

  await Page.findOneAndUpdate(
    { configKey: 'refundPolicyPage' },
    {
      $set: {
        configKey: 'refundPolicyPage',
        pageName: 'Refund Policy',
        slug: '/refund-policy',
        status: 'Published',
        visibility: 'Public',
        author: 'Admin',
        updatedBy: 'Admin',
        sections: refundPageSections,
        seo: {
          metaTitle: 'Refund Policy | ENSIS Wellness Furniture',
          metaDescription: 'Refund and cancellation guidelines for ENSIS equipment, turnkey spa setups and custom manufacturing.',
          metaKeywords: 'refund policy, cancellation, ensis, terms',
          canonicalUrl: 'https://ensis.in/refund-policy',
          h1Tag: 'Refund Policy',
          robotsIndex: true,
          robotsFollow: true,
          isActive: true
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('Page /refund-policy upserted with 13 sections');

  await Page.findOneAndUpdate(
    { configKey: 'privacyPolicyPage' },
    {
      $set: {
        configKey: 'privacyPolicyPage',
        pageName: 'Privacy Policy',
        slug: '/privacy-policy',
        status: 'Published',
        visibility: 'Public',
        author: 'Admin',
        updatedBy: 'Admin',
        sections: privacyPageSections,
        seo: {
          metaTitle: 'Privacy Policy | ENSIS Wellness Furniture',
          metaDescription: 'Your privacy is important to us. This policy explains how ENSIS collects, uses, protects and respects your information.',
          metaKeywords: 'privacy policy, ensis, wellness furniture, data protection',
          canonicalUrl: 'https://ensis.in/privacy-policy',
          h1Tag: 'Privacy Policy',
          robotsIndex: true,
          robotsFollow: true,
          isActive: true
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('Page /privacy-policy upserted with 11 sections');

  // ==========================================
  // 4. Sync Settings for Admin CMS
  // ==========================================
  await Settings.findOneAndUpdate(
    { website: 'ensis' },
    {
      $set: {
        'data.disclaimerPage': {
          title: 'Disclaimer - Legal Notice',
          slug: '/disclaimer',
          status: 'Published',
          visibility: 'Public',
          author: 'Admin',
          updatedBy: 'Admin',
          lastUpdated: new Date().toISOString(),
          sections: disclaimerPageSections
        },
        'data.refundPolicyPage': {
          title: 'Refund Policy - Cancellation Guidelines',
          slug: '/refund-policy',
          status: 'Published',
          visibility: 'Public',
          author: 'Admin',
          updatedBy: 'Admin',
          lastUpdated: new Date().toISOString(),
          sections: refundPageSections
        },
        'data.privacyPolicyPage': {
          title: 'Privacy Policy - Customer Data Protection',
          slug: '/privacy-policy',
          status: 'Published',
          visibility: 'Public',
          author: 'Admin',
          updatedBy: 'Admin',
          lastUpdated: new Date().toISOString(),
          sections: privacyPageSections
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('Settings synced for disclaimerPage, refundPolicyPage, and privacyPolicyPage');

  await mongoose.disconnect();
  console.log('Legal pages seeding complete!');
}

seedLegalPages().catch((err) => {
  console.error('Seed legal pages failed:', err);
  process.exit(1);
});
