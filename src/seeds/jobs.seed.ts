import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { CareerModel } from '../models/career.model';
import { generateSlug } from '../utils/generate-slug';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Sample job postings for the Career page and the admin's Job Postings. Insert-only by slug:
 * a job that already exists keeps every admin edit. Replace them with real openings before going live.
 */
const COMMON = {
  company: 'ENSIS (Design House India Pvt. Ltd.)',
  aboutCompany:
    'ENSIS designs and manufactures handcrafted Panchkarma, Ayurvedic and spa equipment and delivers turnkey wellness clinics, spas and hospitals across India and abroad.',
  acceptOnlineApplications: true,
  aiCvScreening: true,
  cvUploadMandatory: true,
  candidatePhotoMandatory: true,
  allowCvReplacement: true,
  eligibilityThreshold: 70,
  partialMatchMin: 50,
  partialMatchMax: 69,
  showMatchScoreToCandidate: true,
  showMatchBreakdown: true,
  salaryType: 'Annual CTC',
  views: 0,
};

const JOBS = [
  {
    title: 'Sales Manager – Wellness Equipment',
    designation: 'Sales Manager',
    department: 'Sales',
    location: 'Ghaziabad, Delhi NCR',
    employmentType: 'Full Time',
    workplaceType: 'On-site',
    totalOpenings: 2,
    experienceMin: 3,
    experienceMax: 6,
    educationRequirements: 'Graduate; MBA (Sales/Marketing) preferred',
    ctcMin: 600000,
    ctcMax: 1000000,
    performanceIncentiveApplicable: true,
    incentiveType: 'Monthly sales incentive',
    featuredJob: true,
    roleObjective: 'Grow ENSIS equipment and turnkey project sales with Ayurvedic clinics, hospitals, resorts and spas.',
    description:
      'Own the sales cycle for Panchkarma equipment and turnkey wellness setups — from enquiry to quotation, negotiation and order closure — working closely with the design and production teams.',
    skills: ['B2B sales', 'Quotation & negotiation', 'Client relationship management', 'CRM follow-ups'],
    preferredSkills: ['Healthcare or hospitality equipment sales', 'Hindi & English communication'],
    responsibilities: [
      'Follow up website, chatbot and exhibition leads within 24 hours',
      'Prepare quotations with the design team and close orders',
      'Visit clinics, hospitals and resorts for requirement meetings',
      'Maintain the sales pipeline and weekly reports',
    ],
    requirements: ['3+ years in B2B or project sales', 'Willing to travel within North India', 'Own two-wheeler or car preferred'],
    targetIndustrySegments: ['Ayurveda & wellness', 'Hospitals', 'Hotels & resorts'],
    tags: ['sales', 'b2b', 'wellness'],
  },
  {
    title: 'Turnkey Project Manager',
    designation: 'Project Manager',
    department: 'Projects',
    location: 'Ghaziabad (site travel across India)',
    employmentType: 'Full Time',
    workplaceType: 'On-site',
    totalOpenings: 1,
    experienceMin: 5,
    experienceMax: 10,
    educationRequirements: 'B.Arch / B.E. Civil / Interior Design',
    ctcMin: 900000,
    ctcMax: 1500000,
    roleObjective: 'Deliver turnkey Panchkarma centres, Ayurveda hospitals and spas on time and within budget.',
    description:
      'Lead turnkey wellness projects from approved layout to handover: site planning, vendor and installation coordination, quality checks and client communication.',
    skills: ['Project planning', 'Site execution', 'Vendor coordination', 'Interior fit-out'],
    preferredSkills: ['Healthcare / NABH projects', 'MS Project or similar'],
    responsibilities: [
      'Plan project schedules and site readiness with clients',
      'Coordinate production, logistics and installation teams',
      'Run quality checks and handover with snag lists',
      'Report progress and costs to management',
    ],
    requirements: ['5+ years managing interior or healthcare fit-out projects', 'Comfortable with frequent site travel'],
    targetIndustrySegments: ['Healthcare', 'Hospitality', 'Interiors'],
    tags: ['projects', 'turnkey', 'interiors'],
  },
  {
    title: 'Panchkarma Therapist Trainer',
    designation: 'Senior Therapist & Trainer',
    department: 'Consultancy',
    location: 'Ghaziabad / client locations',
    employmentType: 'Full Time',
    workplaceType: 'Hybrid',
    totalOpenings: 1,
    experienceMin: 4,
    experienceMax: 8,
    educationRequirements: 'BAMS or certified Panchkarma therapy diploma',
    ctcMin: 480000,
    ctcMax: 720000,
    roleObjective: 'Train therapists at new ENSIS clinic setups and help clients run Panchkarma operations.',
    description:
      'Conduct hands-on Panchkarma therapy training, write SOPs for therapy rooms and support clinic teams during their first months of operation.',
    skills: ['Panchkarma procedures', 'Therapist training', 'SOP writing'],
    preferredSkills: ['Spa operations', 'Hindi & English'],
    responsibilities: [
      'Train client therapists on Abhyanga, Shirodhara, Swedana and other procedures',
      'Prepare therapy SOPs and room checklists',
      'Support product demos for the sales team',
    ],
    requirements: ['4+ years practising Panchkarma therapies', 'Willing to travel for 1–2 week trainings'],
    targetIndustrySegments: ['Ayurveda clinics', 'Wellness resorts'],
    tags: ['ayurveda', 'panchkarma', 'training'],
  },
  {
    title: 'Production Supervisor – Woodwork',
    designation: 'Production Supervisor',
    department: 'Manufacturing',
    location: 'Ghaziabad (factory)',
    employmentType: 'Full Time',
    workplaceType: 'On-site',
    totalOpenings: 1,
    experienceMin: 4,
    experienceMax: 9,
    educationRequirements: 'Diploma / B.E. in Mechanical or Production; furniture experience preferred',
    ctcMin: 420000,
    ctcMax: 660000,
    roleObjective: 'Run daily production of teak Droni, therapy tables and Shirodhara stands to quality and schedule.',
    description:
      'Supervise carpenters, polishers and upholstery staff, plan daily output against orders and keep the 5-year structural warranty quality standard.',
    skills: ['Wood furniture production', 'Shop-floor supervision', 'Quality inspection'],
    responsibilities: [
      'Plan daily production against confirmed orders',
      'Supervise woodwork, polishing and upholstery teams',
      'Check finished pieces before dispatch',
      'Maintain material and wastage records',
    ],
    requirements: ['4+ years in furniture or woodwork production', 'Team handling of 15+ workers'],
    targetIndustrySegments: ['Furniture manufacturing'],
    tags: ['manufacturing', 'woodwork'],
  },
  {
    title: 'Digital Marketing Executive',
    designation: 'Digital Marketing Executive',
    department: 'Marketing',
    location: 'Ghaziabad, Delhi NCR',
    employmentType: 'Full Time',
    workplaceType: 'Hybrid',
    totalOpenings: 1,
    experienceMin: 1,
    experienceMax: 3,
    educationRequirements: 'Graduate; digital marketing certification preferred',
    ctcMin: 300000,
    ctcMax: 480000,
    allowFresherCandidates: true,
    roleObjective: 'Bring qualified enquiries for ENSIS products and turnkey setups through SEO, social media and ads.',
    description:
      'Manage the ENSIS website content, city landing pages, Google Ads and social media, and report on enquiries generated.',
    skills: ['SEO', 'Google Ads', 'Social media marketing', 'Content writing'],
    preferredSkills: ['Canva / basic design', 'Google Analytics & Search Console'],
    responsibilities: [
      'Publish blogs, product and city pages with SEO best practices',
      'Run and optimise Google Ads and Meta campaigns',
      'Track enquiries and report weekly results',
    ],
    requirements: ['1+ year in digital marketing (freshers with strong portfolio may apply)'],
    targetIndustrySegments: ['Healthcare & wellness', 'B2B'],
    tags: ['marketing', 'seo', 'digital'],
  },
  {
    title: 'Software Engineer – Full Stack (React / Next.js)',
    designation: 'Software Engineer',
    department: 'Technology',
    location: 'New Delhi / Ghaziabad (Hybrid)',
    employmentType: 'Full Time',
    workplaceType: 'Hybrid',
    totalOpenings: 1,
    experienceMin: 3,
    experienceMax: 7,
    educationRequirements: 'Any graduate; web development certification is a plus',
    ctcMin: 800000,
    ctcMax: 1400000,
    roleObjective: 'Build and run the ENSIS website, admin panel and AI tools that bring and manage enquiries.',
    description:
      'Develop the ENSIS storefront (Next.js), admin panel (React) and Node.js/MongoDB backend: product and city landing pages, enquiry and career forms, the website chatbot and SEO improvements.',
    skills: ['React', 'Next.js', 'JavaScript', 'Node.js', 'REST APIs', 'MongoDB', 'Tailwind CSS'],
    preferredSkills: ['SEO-friendly web development', 'React Native or Flutter', 'Git, GitHub / Bitbucket, Jira', 'Basic UI design (Photoshop / Illustrator)'],
    responsibilities: [
      'Build responsive, SEO-optimised pages and reusable UI components in React and Next.js',
      'Develop REST APIs and data workflows with Node.js and MongoDB',
      'Maintain the admin panel, website forms and chatbot integrations',
      'Improve page speed and ship production-ready features with code reviews',
    ],
    requirements: ['3+ years building React / Next.js applications', 'Hands-on REST API and MongoDB experience', 'Comfortable with Git-based team workflows'],
    targetIndustrySegments: ['Web development', 'E-commerce & B2B websites'],
    tags: ['software', 'react', 'nextjs', 'full-stack'],
  },
];

const experienceLabel = (min: number, max: number) => (min === max ? `${min} Years` : `${min} – ${max} Years`);

const main = async (): Promise<void> => {
  await connectDatabase();
  try {
    let inserted = 0;
    for (const job of JOBS) {
      const slug = generateSlug(job.title);
      const doc = {
        ...COMMON,
        ...job,
        slug,
        // What the website lists
        type: job.employmentType,
        experience: experienceLabel(job.experienceMin, job.experienceMax),
        status: 'active',
        jobStatus: 'OPEN',
        publishedAt: new Date(),
        applications: 0,
      };
      const result = await CareerModel.collection.updateOne({ slug }, { $setOnInsert: { ...doc, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
      if (result.upsertedCount) inserted += 1;
    }
    console.log(`jobs: ${inserted} inserted, ${JOBS.length - inserted} already present`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('JOBS SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
