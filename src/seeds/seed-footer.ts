import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { ComponentContentModel } from '../models/component-content.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Brings the footer's admin-editable content into the database (insert-only, safe to re-run):
 *  - layout.footer: adds footerColumns / strap / callUs / brandText / bottom ONLY when a field is missing,
 *    so anything already edited in the admin is never overwritten.
 *  - contact.getInTouch: adds the three offices and the email entry when no "Office" entry exists yet.
 *    The footer reads offices, phone numbers and email from here, so the Contact page and footer always match.
 *
 * Run `npm run seed:footer:dry` first to see what would change without writing anything.
 */

const DRY_RUN = process.argv.includes('--dry-run');

const link = (label: string, href: string) => ({ label, href });

const FOOTER_DEFAULTS: Record<string, unknown> = {
  footerColumns: [
    {
      title: 'Quick Links',
      links: [
        link('Home', '/'),
        link('About Us', '/about-us'),
        link('Our Solutions', '/solutions'),
        link('Our Products', '/products'),
        link('Our Projects', '/projects-and-clients'),
        link('Our Clients', '/projects-and-clients'),
        link('Why Choose Us', '/about-us'),
        link('Blogs', '/blog'),
        link('Careers', '/career'),
        link('Contact Us', '/contact'),
      ],
    },
    {
      title: 'Product Categories',
      links: [
        'Panchkarma Tables & Equipment',
        'Ayurveda Therapy Equipment',
        'Spa & Wellness Furniture',
        'Hydrotherapy Equipment',
        'Massage & Treatment Tables',
        'Consultation & Examination Furniture',
        'Hospitality & Resort Spa Setup',
        'Accessories & Consumables',
        'Herbal & Oil Preparation Equipment',
      ].map((label) => link(label, '/products')),
    },
    {
      title: 'Our Solutions',
      links: [
        link('Panchkarma Clinic Setup', '/solutions/panchkarma-clinic-setup'),
        link('Resort & Spa Setup', '/solutions/resort-spa-setup'),
        link('Wellness Retreat Design', '/solutions/wellness-retreat-design'),
        link('Ayurveda Hospital Setup', '/solutions/ayurveda-hospital-setup'),
        link('Interior & Equipment Integration', '/solutions/interior-equipment-integration'),
        link('Customised Solutions', '/turnkey'),
        link('Turnkey Project Execution', '/turnkey'),
        link('Consultancy & Support', '/consultancy'),
        link('AMC & Service Support', '/contact'),
      ],
    },
  ],
  strap: [
    { title: 'Premium Quality', desc: 'Durable & Reliable Products' },
    { title: 'Ayurvedic Expertise', desc: 'Rooted in Ancient Wisdom' },
    { title: 'End to End Support', desc: 'From Planning to Installation' },
    { title: 'Customized Solutions', desc: 'Tailored For Your Unique Needs' },
    { title: 'Pan India Service', desc: 'Delivering Wellness Across India' },
  ],
  callUs: { label: 'Call Us Today' },
  brandText:
    'Premium Ayurveda, Panchakarma\nand spa equipment designed for clinics,\nresorts and healthcare spaces.\nWe create durable, functional and\naesthetically crafted wellness solutions\nacross India.',
  bottom: {
    brand: 'ENSIS',
    tagline: 'A Brand of Design House India Pvt. Ltd.',
    rights: 'All Rights Reserved.',
    links: [
      link('Sitemap', '/sitemap.xml'),
      link('Privacy Policy', '/privacy-policy'),
      link('Terms & Conditions', '/terms-and-conditions'),
      link('Disclaimer', '/terms-and-conditions'),
      link('Refund Policy', '/refund-policy'),
    ],
  },
};

// The Contact page renders descriptions as HTML, hence <br>; the footer turns them back into line breaks
const OFFICES = [
  {
    title: 'Corporate Office | Delhi-NCR, India',
    description: 'Plot No. 12/29, Site-II Industrial Area,<br>Loni Road, Mohan Nagar, Ghaziabad,<br>Uttar Pradesh – 201007, India',
  },
  {
    title: 'Regional Office | Delhi, India',
    description: 'Ground Floor, E-1, Main Market,<br>Opp. KFC, Kalkaji,<br>New Delhi – 110019, India',
  },
  {
    title: 'Mumbai Branch Office',
    description: 'UNIT-IISR Compound, Plot No 49/459.<br>Opp Dynamic Flow Company,<br>Wakanpada Road, Vasai Phata<br>Vasai East – 401208, India',
  },
];

type ContactDetail = { id: string; icon?: string; title: string; description: string };
const newId = () => crypto.randomBytes(4).toString('hex').slice(0, 7);

const seedFooterLayout = async () => {
  const doc = await ComponentContentModel.findOne({ key: 'layout.footer' });
  if (!doc) {
    console.log('layout.footer: record not found, skipped (create it from the admin first)');
    return;
  }
  const data = (doc.data || {}) as Record<string, unknown>;
  const added = Object.keys(FOOTER_DEFAULTS).filter((key) => data[key] === undefined);
  console.log(`layout.footer: ${added.length ? `adding ${added.join(', ')}` : 'already has every footer field, nothing to add'}`);
  if (!added.length || DRY_RUN) return;
  const updates: Record<string, unknown> = {};
  added.forEach((key) => {
    updates[`data.${key}`] = FOOTER_DEFAULTS[key];
  });
  await ComponentContentModel.updateOne({ key: 'layout.footer' }, { $set: updates });
};

const seedContactDetails = async () => {
  const doc = await ComponentContentModel.findOne({ key: 'contact.getInTouch' });
  if (!doc) {
    console.log('contact.getInTouch: record not found, skipped (create it from the admin first)');
    return;
  }
  const data = (doc.data || {}) as { contactDetails?: ContactDetail[] };
  const details = Array.isArray(data.contactDetails) ? data.contactDetails : [];
  const hasOffices = details.some((d) => /office/i.test(d?.title || ''));
  const hasEmail = details.some((d) => /e-?mail/i.test(d?.title || ''));
  const addressIcon = details.find((d) => /address/i.test(d?.title || ''))?.icon || '';

  const additions: ContactDetail[] = [];
  if (!hasOffices) OFFICES.forEach((o) => additions.push({ id: newId(), icon: addressIcon, ...o }));
  if (!hasEmail) additions.push({ id: newId(), icon: '', title: 'Email', description: 'info@ensis.in (ENSIS)' });

  console.log(
    `contact.getInTouch: ${
      additions.length ? `adding ${additions.map((a) => a.title).join(' | ')}` : 'offices and email already present, nothing to add'
    }`
  );
  if (!additions.length || DRY_RUN) return;
  await ComponentContentModel.updateOne({ key: 'contact.getInTouch' }, { $set: { 'data.contactDetails': [...details, ...additions] } });
};

const main = async () => {
  console.log(DRY_RUN ? 'DRY RUN — nothing will be written' : 'Seeding footer content (insert-only)');
  await connectDatabase();
  await seedFooterLayout();
  await seedContactDetails();
  await mongoose.disconnect();
  process.exit(0);
};

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed to seed footer content:', err);
    process.exit(1);
  });
}
