import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI_MAIN || process.env.MONGO_URI || 'mongodb://localhost:27017/ensis';

async function seedCareerOnly() {
  console.log('[seed-career-only] Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;

  const careerBannerData = {
    eyebrow: 'CAREERS AT ENSIS',
    headingLines: ['Design Spaces', 'for a Healthier'],
    highlight: 'Tomorrow',
    description:
      'Be a part of a passionate team that designs and delivers wellness furniture and solutions for spas, wellness centers and healthcare spaces across the world.',
    ctaText: 'Explore Opportunities',
    ctaHref: '#openings',
    backgroundImage: '',
    highlights: [
      { icon: 'bulb', label: 'Meaningful Work', title: 'Meaningful', subtitle: 'Work', image: '' },
      { icon: 'users', label: 'Collaborative Team', title: 'Collaborative', subtitle: 'Team', image: '' },
      { icon: 'growth', label: 'Growth Opportunities', title: 'Growth', subtitle: 'Opportunities', image: '' },
      { icon: 'heart', label: 'Real Impact on Lives', title: 'Real Impact', subtitle: 'on Lives', image: '' },
    ],
  };

  const careerFeaturesData = {
    features: [
      {
        id: '68xrggl',
        image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1785761780/ensis/lij7pifeclw2iocsghii.webp',
        title: 'Meaningful Work',
        subtitle: 'Transform Lives',
        icon: 'bulb',
      },
      {
        id: '9hmftaj',
        image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1785761802/ensis/zvksvc5dsiogbqvbrwlf.webp',
        title: 'Collaborative Team',
        subtitle: 'Strong Together',
        icon: 'users',
      },
      {
        id: 'dqxdfsm',
        image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1785761797/ensis/snttcnvp29wutxg2fkeu.webp',
        title: 'Growth Opportunities',
        subtitle: 'Grow With Us',
        icon: 'growth',
      },
      {
        id: 'xuk3r1o',
        image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1785761839/ensis/gk0zs0omaav6buo1uxwm.webp',
        title: 'Real Impact on Lives',
        subtitle: 'Worldwide Impact',
        icon: 'heart',
      },
    ],
  };

  const careerWhyWorkData = {
    eyebrow: 'WHY WORK AT ENSIS?',
    heading: 'A Career with Purpose',
    description:
      "We're not just creating interiors and equipment, we're crafting experiences that transform lives. Join a team that believes in purpose over profit and wellness over everything.",
    items: [
      { icon: 'leaf', title: 'Purpose-Driven Work', text: "Contribute to wellness spaces that enhance people's lives." },
      { icon: 'users', title: 'Supportive Team Environment', text: 'Collaborate with talented and driven colleagues across design, manufacturing, sales and operations.' },
      { icon: 'growth', title: 'Learning & Growth', text: 'Enhance your skills with continuous learning and exposure to global markets.' },
      { icon: 'heart', title: 'Better Spaces, Better Lives', text: 'Be part of a mission that improves how people live, work and heal.' },
    ],
  };

  // 1. Update ComponentContent collection for career.banner, career.features, and career.whyWork
  console.log('[seed-career-only] Updating componentcontents for career...');
  await db.collection('componentcontents').updateOne(
    { key: 'career.banner' },
    {
      $set: {
        key: 'career.banner',
        label: 'Careers Hero Banner',
        page: 'career',
        description: 'Hero banner inviting talent to join the Ensis manufacturing & design team.',
        index: 1,
        isActive: true,
        data: careerBannerData,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  await db.collection('componentcontents').updateOne(
    { key: 'career.features' },
    {
      $set: {
        key: 'career.features',
        label: 'Features Strip',
        page: 'career',
        description: 'Core workplace statistics and team achievements.',
        index: 2,
        isActive: true,
        data: careerFeaturesData,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  await db.collection('componentcontents').updateOne(
    { key: 'career.whyWork' },
    {
      $set: {
        key: 'career.whyWork',
        label: 'Why Work at Ensis',
        page: 'career',
        description: 'Why work at Ensis reasons and value propositions.',
        index: 3,
        isActive: true,
        data: careerWhyWorkData,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  // 2. Update Career page document in pages collection
  console.log('[seed-career-only] Updating career page in pages collection...');
  const careerPage = await db.collection('pages').findOne({ slug: 'career' });
  if (careerPage) {
    const updatedSections = (careerPage.sections || []).map((sec: any) => {
      if (sec.key === 'banner' || sec.componentKey === 'career.banner') {
        return {
          ...sec,
          eyebrow: 'CAREERS AT ENSIS',
          title: 'Design Spaces for a Healthier Tomorrow',
          subtitle:
            'Be a part of a passionate team that designs and delivers wellness furniture and solutions for spas, wellness centers and healthcare spaces across the world.',
          description:
            '<p>Be a part of a passionate team that designs and delivers wellness furniture and solutions for spas, wellness centers and healthcare spaces across the world.</p>',
          buttonLabel: 'Explore Opportunities',
          buttonHref: '#openings',
          data: careerBannerData,
        };
      }
      if (sec.key === 'features' || sec.componentKey === 'career.features') {
        return {
          ...sec,
          title: 'Meaningful Work & Collaborative Culture',
          subtitle: 'Why our team members thrive and grow with us.',
          data: careerFeaturesData,
        };
      }
      if (sec.key === 'whyWork' || sec.componentKey === 'career.whyWork') {
        return {
          ...sec,
          title: 'A Career with Purpose',
          subtitle: "We're not just creating interiors and equipment, we're crafting experiences that transform lives.",
          data: careerWhyWorkData,
        };
      }
      return sec;
    });

    await db.collection('pages').updateOne(
      { slug: 'career' },
      {
        $set: {
          sections: updatedSections,
          updatedAt: new Date(),
        },
      }
    );
  }

  // 3. Upsert the 4 exact mockup jobs in the jobs collection
  console.log('[seed-career-only] Upserting 4 mockup jobs in jobs collection...');
  const MOCKUP_JOBS = [
    {
      title: 'Product Designer',
      slug: 'product-designer',
      designation: 'Product Designer',
      department: 'Design & R&D',
      location: 'Delhi NCR',
      employmentType: 'Full Time',
      workplaceType: 'On-site',
      totalOpenings: 2,
      experienceMin: 2,
      experienceMax: 5,
      educationRequirements: 'B.Des / M.Des / Interior or Industrial Design',
      ctcMin: 500000,
      ctcMax: 900000,
      featuredJob: true,
      status: 'active',
      jobStatus: 'OPEN',
      roleObjective: 'Design innovative wellness furniture and treatment solutions that combine functionality, comfort and aesthetics.',
      shortDescription: 'Design innovative wellness furniture and treatment solutions that combine functionality, comfort and aesthetics.',
      description: 'Design innovative wellness furniture and treatment solutions that combine functionality, comfort and aesthetics. Work closely with production craftsmen and healthcare consultants.',
      responsibilities: [
        'Create 3D models and manufacturing drawings for wellness furniture',
        'Collaborate with craftsmen on prototypes and joinery details',
        'Incorporate ergonomic requirements for Ayurvedic therapy procedures',
      ],
      requirements: ['2+ years in furniture or industrial design', 'Proficiency in Rhino, SolidWorks, or AutoCAD', 'Eye for wood craftsmanship'],
      skills: ['Furniture Design', '3D CAD', 'Ergonomics', 'Aesthetic Detailing'],
      createdAt: new Date('2026-10-25T10:00:00Z'),
      updatedAt: new Date(),
    },
    {
      title: 'Furniture Production Specialist',
      slug: 'furniture-production-specialist',
      designation: 'Furniture Production Specialist',
      department: 'Manufacturing',
      location: 'Delhi NCR',
      employmentType: 'Full Time',
      workplaceType: 'On-site',
      totalOpenings: 3,
      experienceMin: 3,
      experienceMax: 7,
      educationRequirements: 'Diploma / Degree in Woodworking or Production Engineering',
      ctcMin: 420000,
      ctcMax: 720000,
      featuredJob: true,
      status: 'active',
      jobStatus: 'OPEN',
      roleObjective: 'Support manufacturing processes, ensure quality craftsmanship and help bring our designs to life.',
      shortDescription: 'Support manufacturing processes, ensure quality craftsmanship and help bring our designs to life.',
      description: 'Support manufacturing processes, ensure quality craftsmanship and help bring our designs to life. Supervise teak woodworking, assembly and polishing.',
      responsibilities: [
        'Oversee precision joinery, carving, and structural assembly',
        'Maintain strict dimensional accuracy against CAD drawings',
        'Ensure 5-year structural quality and oil-resistant finishes',
      ],
      requirements: ['3+ years in solid wood furniture manufacturing', 'Hands-on knowledge of teak, steam seasoning, and joinery'],
      skills: ['Woodworking', 'Production Supervision', 'Quality Inspection', 'Craftsmanship'],
      createdAt: new Date('2026-10-25T09:00:00Z'),
      updatedAt: new Date(),
    },
    {
      title: 'Sales & Partnerships Executive',
      slug: 'sales-partnerships-executive',
      designation: 'Sales & Partnerships Executive',
      department: 'Sales & Partnerships',
      location: 'Delhi NCR',
      employmentType: 'Full Time',
      workplaceType: 'On-site',
      totalOpenings: 2,
      experienceMin: 2,
      experienceMax: 6,
      educationRequirements: 'Graduate / MBA in Sales & Marketing',
      ctcMin: 550000,
      ctcMax: 950000,
      featuredJob: true,
      status: 'active',
      jobStatus: 'OPEN',
      roleObjective: 'Build client relationships, explore new business opportunities and contribute to the growth of ENSIS.',
      shortDescription: 'Build client relationships, explore new business opportunities and contribute to the growth of ENSIS.',
      description: 'Build client relationships, explore new business opportunities and contribute to the growth of ENSIS. Engage with luxury spas, Ayurveda hospitals and wellness resorts.',
      responsibilities: [
        'Engage luxury resorts, spas and Ayurveda clinics across India',
        'Deliver product presentations and turnkey consultancy solutions',
        'Close orders and maintain long-term client relationships',
      ],
      requirements: ['2+ years in B2B or hospitality equipment sales', 'Excellent verbal & written communication'],
      skills: ['B2B Sales', 'Client Relations', 'Account Management', 'Consultative Selling'],
      createdAt: new Date('2026-10-25T08:00:00Z'),
      updatedAt: new Date(),
    },
    {
      title: 'Wellness Space Consultant',
      slug: 'wellness-space-consultant',
      designation: 'Wellness Space Consultant',
      department: 'Consultancy',
      location: 'Delhi NCR',
      employmentType: 'Full Time',
      workplaceType: 'Hybrid',
      totalOpenings: 2,
      experienceMin: 3,
      experienceMax: 7,
      educationRequirements: 'BAMS / Architecture / Interior Design / Spa Operations Diploma',
      ctcMin: 600000,
      ctcMax: 1100000,
      featuredJob: true,
      status: 'active',
      jobStatus: 'OPEN',
      roleObjective: 'Guide clients in creating functional and beautiful wellness spaces with the right furniture and solutions.',
      shortDescription: 'Guide clients in creating functional and beautiful wellness spaces with the right furniture and solutions.',
      description: 'Guide clients in creating functional and beautiful wellness spaces with the right furniture and solutions. Consult on room layouts, treatment equipment and workflow optimization.',
      responsibilities: [
        'Consult clients on therapy room dimensions, plumbing, and ventilation',
        'Recommend appropriate furniture sets for clinical and luxury setups',
        'Assist clients through turnkey planning and implementation',
      ],
      requirements: ['3+ years in spa consulting, Ayurveda clinic design or wellness interiors'],
      skills: ['Space Planning', 'Ayurveda SOPs', 'Clinic Layouts', 'Client Consultation'],
      createdAt: new Date('2026-10-25T07:00:00Z'),
      updatedAt: new Date(),
    },
  ];

  for (const job of MOCKUP_JOBS) {
    await db.collection('jobs').updateOne(
      { slug: job.slug },
      { $set: job },
      { upsert: true }
    );
  }

  console.log('✅ [seed-career-only] Career page & 4 mockup jobs successfully seeded!');
  await mongoose.disconnect();
  process.exit(0);
}

seedCareerOnly().catch((err) => {
  console.error('[seed-career-only] Error:', err);
  process.exit(1);
});
