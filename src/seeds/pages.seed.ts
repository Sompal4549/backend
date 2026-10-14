import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import Page from '../models/page.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface PageSeed {
  pageName: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

/** Canonical Ensis CMS pages — slug is the single source of truth for the public site. */
export const ENSIS_PAGES: PageSeed[] = [
  {
    pageName: 'Home',
    slug: '/',
    metaTitle: 'Ensis | Premium Panchkarma & Wellness Equipment',
    metaDescription:
      'Ensis builds premium Panchkarma tables, steam cabinets and modular wellness furniture for clinics, spas and hospitals across India.',
    metaKeywords: 'panchkarma equipment, ayurvedic droni, shirodhara table, wellness furniture, ensis',
  },
  {
    pageName: 'About Us',
    slug: '/about-us',
    metaTitle: 'About Ensis | Ayurvedic Equipment Manufacturers',
    metaDescription:
      'Learn about Ensis — a heritage manufacturer of Ayurvedic wellness equipment, medical furniture and custom modular clinic interiors.',
    metaKeywords: 'about ensis, ayurvedic equipment manufacturer, wellness furniture company',
  },
  {
    pageName: 'Turnkey Solutions',
    slug: '/turnkey-solutions',
    metaTitle: 'Turnkey Clinic & Spa Setup Solutions | Ensis',
    metaDescription:
      'End-to-end turnkey design, manufacturing and installation for Ayurvedic clinics, spas, hospitals and wellness centres.',
    metaKeywords: 'turnkey clinic setup, spa turnkey projects, wellness centre interior, hospital furniture setup',
  },
  {
    pageName: 'Clinic Consultancy',
    slug: '/consultancy',
    metaTitle: 'Clinic Consultancy Services | Ensis Wellness',
    metaDescription:
      'Expert consultancy for planning NABH-compliant wellness clinics, therapy rooms, layout design and equipment selection.',
    metaKeywords: 'clinic consultancy, wellness clinic planning, nabh compliant clinic design',
  },
  {
    pageName: 'Custom Modular Solutions',
    slug: '/custom-solutions',
    metaTitle: 'Custom Modular Wellness Solutions | Ensis',
    metaDescription:
      'Bespoke therapeutic furniture, steam cabinets, sauna units and modular wellness setups engineered to your specification.',
    metaKeywords: 'custom wellness furniture, modular spa equipment, bespoke steam cabinet manufacturer',
  },
  {
    pageName: 'Products & Equipment',
    slug: '/products',
    metaTitle: 'Ayurvedic Products & Equipment | Ensis Catalogue',
    metaDescription:
      'Browse handcrafted teakwood droni tables, shirodhara units, steam boxes, sauna cabins and brass Ayurvedic accessories.',
    metaKeywords: 'ayurvedic equipment catalogue, panchkarma table, steam box, shirodhara equipment',
  },
  {
    pageName: 'Projects & Clients',
    slug: '/projects',
    metaTitle: 'Projects & Clients | Ensis Wellness Spaces',
    metaDescription:
      'Explore completed Ensis installations for luxury resorts, hospitals, Ayurvedic clinics and spa facilities nationwide.',
    metaKeywords: 'wellness projects, hospital furniture installations, spa project portfolio, ensis clients',
  },
  {
    pageName: 'Blog',
    slug: '/blog',
    metaTitle: 'Blog | Ayurvedic Wellness Insights | Ensis',
    metaDescription:
      'Read the latest Ensis articles on therapy guides, equipment maintenance, clinic setup and Ayurvedic wellness industry news.',
    metaKeywords: 'ayurvedic blog, panchkarma guides, wellness equipment maintenance, spa industry news',
  },
  {
    pageName: 'Careers',
    slug: '/careers',
    metaTitle: 'Careers at Ensis | Join Our Team',
    metaDescription:
      'Explore open roles in manufacturing, woodworking, design, engineering and sales at Ensis Wellness Spaces.',
    metaKeywords: 'ensis careers, wellness manufacturing jobs, furniture design jobs india',
  },
  {
    pageName: 'Contact Us',
    slug: '/contact-us',
    metaTitle: 'Contact Us | Ensis Wellness Spaces',
    metaDescription:
      'Get in touch with the Ensis factory, corporate sales team and customer support for enquiries and product quotations.',
    metaKeywords: 'contact ensis, wellness equipment enquiry, ayurvedic furniture supplier contact',
  },
  {
    pageName: 'Privacy Policy',
    slug: '/privacy-policy',
    metaTitle: 'Privacy Policy | Ensis Wellness Spaces',
    metaDescription:
      'How Ensis collects, stores and protects your personal data, order information and website usage details.',
    metaKeywords: 'privacy policy, data protection, ensis privacy',
  },
  {
    pageName: 'Terms & Conditions',
    slug: '/terms-and-conditions',
    metaTitle: 'Terms & Conditions | Ensis Wellness',
    metaDescription:
      'Warranty terms, order delivery, shipping policies, returns and service standards for Ensis products and projects.',
    metaKeywords: 'terms and conditions, warranty policy, shipping policy, ensis terms',
  },
  {
    pageName: 'Enquiry',
    slug: '/enquiry',
    metaTitle: 'Product Enquiry | Get a Quote | Ensis',
    metaDescription:
      'Send a B2B enquiry for catalogue pricing, custom configurations, shipping and installation of wellness equipment.',
    metaKeywords: 'product enquiry, quote request, wellness equipment quote, ensis enquiry',
  },
];

/** Idempotent — upserts by slug so re-running never duplicates documents. */
const buildJsonLd = (page: PageSeed): string =>
  JSON.stringify(
    page.slug === '/'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Ensis Wellness Spaces',
          url: 'https://ensis.in',
          logo: 'https://ensis.in/ensis-logo.webp',
          description: page.metaDescription,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: page.pageName,
          url: `https://ensis.in${page.slug}`,
          description: page.metaDescription,
        },
  );

export const seedPages = async () => {
  let created = 0;
  let updated = 0;

  for (const page of ENSIS_PAGES) {
    const payload = {
      pageName: page.pageName,
      slug: page.slug,
      seo: {
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        metaKeywords: page.metaKeywords,
        canonical: `https://ensis.in${page.slug === '/' ? '' : page.slug}`,
        schema: buildJsonLd(page),
      },
      robots: 'index, follow',
    };

    const existing = await Page.findOne({ slug: page.slug });
    if (existing) {
      existing.set(payload);
      await existing.save();
      updated += 1;
    } else {
      await Page.create(payload);
      created += 1;
    }
  }

  return { created, updated };
};

const main = async () => {
  console.log('Connecting to MongoDB...');
  await connectDatabase();

  const dbName = mongoose.connection.name;
  if (dbName !== 'ensis') {
    console.warn(`Warning: active database is "${dbName}", not "ensis". Check MONGO_URI in .env.`);
  }

  const { created, updated } = await seedPages();
  const total = await Page.countDocuments();

  console.log('\nPAGES SEED COMPLETE');
  console.log(`  Database : ${dbName}`);
  console.log(`  Created  : ${created}`);
  console.log(`  Updated  : ${updated}`);
  console.log(`  PageModel.countDocuments() = ${total} (expected ${ENSIS_PAGES.length})`);

  if (total !== ENSIS_PAGES.length) {
    console.warn(`Warning: collection holds ${total} document(s) — ${total - ENSIS_PAGES.length} page(s) outside this seed.`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

main().catch((error) => {
  console.error('\nPAGES SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
