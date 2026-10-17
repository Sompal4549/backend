import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { FaqModel } from '../models/faq.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// The ten FAQs the admin FAQ page used to show as static data
const faqs = [
  {
    question: 'What does Ensis do?',
    shortAnswer: 'Handcrafted Panchkarma, Ayurvedic & Spa equipment and turnkey wellness spaces.',
    answer:
      'Ensis designs and manufactures handcrafted Panchkarma, Ayurvedic and Spa equipment, and delivers turnkey wellness spaces — from planning and interiors to equipment and installation — across India and abroad.',
    category: 'General',
  },
  {
    question: 'How do I request a quotation?',
    shortAnswer: 'Share your requirement and get a customised quotation and 2D layout.',
    answer:
      'Share your requirement through the enquiry form, WhatsApp or a call. Our team studies your space and needs, then sends a customised quotation along with a 2D layout.',
    category: 'Request Process',
  },
  {
    question: 'What is included in a turnkey clinic setup?',
    shortAnswer: 'Space planning, 2D/3D layouts, interiors, equipment and installation.',
    answer:
      'A turnkey setup covers space planning, 2D/3D layouts, interiors, Ensis equipment, delivery and on-site installation, so your clinic or spa is ready to operate.',
    category: 'Request Process',
  },
  {
    question: 'Which Panchkarma equipment do you manufacture?',
    shortAnswer: 'Teak Droni, Panchkarma tables, Shirodhara stands and Swedana steam chambers.',
    answer:
      'We manufacture Teak Droni, Panchkarma tables, Shirodhara stands, Swedana steam chambers and related Ayurvedic therapy equipment, all finished by skilled craftsmen.',
    category: 'Services',
  },
  {
    question: 'How long does a turnkey project take?',
    shortAnswer: 'Most clinic and spa setups are delivered in 30–45 days.',
    answer:
      'Most clinic and spa setups are delivered in 30–45 days from layout approval. Larger or highly customised projects may take longer; we share a timeline with your quotation.',
    category: 'Services',
  },
  {
    question: 'Do you ship outside India?',
    shortAnswer: 'Pan-India and global shipping with on-site installation by Ensis engineers.',
    answer:
      'Yes. We ship pan-India and globally, and Ensis engineers handle on-site installation so your equipment is set up correctly.',
    category: 'Services',
  },
  {
    question: 'Do you offer consultancy for new Ayurvedic centres?',
    shortAnswer: 'SOPs, therapist training, NABH guidance and space sizing for Vaidyas.',
    answer:
      'Yes. Our consultancy covers SOPs, therapist training, NABH guidance and space sizing to help Vaidyas and wellness entrepreneurs launch new Ayurvedic centres.',
    category: 'Services',
  },
  {
    question: 'What warranty do Ensis products carry?',
    shortAnswer: 'A 5-year structural warranty on Ensis equipment.',
    answer: 'Ensis equipment comes with a 5-year structural warranty, backed by our after-sales support team.',
    category: 'Support',
  },
  {
    question: 'Can equipment be customised to my space?',
    shortAnswer: 'Custom sizes, finishes and wood options are available on request.',
    answer:
      'Yes. Custom sizes, finishes and wood options are available on request, so the equipment fits your space and design.',
    category: 'Support',
  },
  {
    question: 'How can I contact the Ensis team?',
    shortAnswer: 'Call or WhatsApp +91 9654900525 or email info@ensis.in.',
    answer: 'Call or WhatsApp us on +91 9654900525, or email info@ensis.in. You can also use the enquiry form on our Contact page.',
    category: 'General',
  },
];

/** Insert-only: an FAQ that already exists (same question) keeps every admin edit. */
const main = async (): Promise<void> => {
  await connectDatabase();
  try {
    let inserted = 0;
    for (const [index, faq] of faqs.entries()) {
      const result = await FaqModel.updateOne(
        { question: faq.question },
        { $setOnInsert: { ...faq, orderBy: index + 1, status: 'Published', visibility: 'Public' } },
        { upsert: true }
      );
      if (result.upsertedCount) inserted += 1;
    }
    console.log(`faqs: ${inserted} inserted, ${faqs.length - inserted} already present`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('FAQS SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
