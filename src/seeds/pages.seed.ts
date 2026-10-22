import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import Page from '../models/page.model';
import Settings from '../models/settings.model';
import { ComponentContentModel } from '../models/component-content.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnsisCmsPageSeed {
  configKey: string;
  pageName: string;
  slug: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    h1Tag: string;
    breadcrumbName: string;
    schemaMarkup: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
    isActive: boolean;
  };
  sections: Array<{
    key: string;
    componentKey?: string;
    name: string;
    enabled: boolean;
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    buttonLabel?: string;
    buttonHref?: string;
    secondaryButtonLabel?: string;
    secondaryButtonHref?: string;
    items?: Array<{
      title?: string;
      subtitle?: string;
      description?: string;
      image?: string;
      icon?: string;
      buttonLabel?: string;
      buttonHref?: string;
      [key: string]: any;
    }>;
    data?: Record<string, any>;
    [key: string]: any;
  }>;
  faqs?: Array<{ question: string; answer: string }>;
}

export const ENSIS_CMS_PAGES: EnsisCmsPageSeed[] = [
  // 1. HOME / LANDING PAGE
  {
    configKey: 'landingPage',
    pageName: 'Home - Premium Wellness & Panchkarma',
    slug: '/',
    seo: {
      metaTitle: 'Ensis | Premium Panchkarma & Ayurvedic Wellness Equipment',
      metaDescription:
        'India’s premier manufacturer of handcrafted solid teakwood Panchkarma tables, automated Shirodhara units, steam cabinets, and turnkey hospital wellness architecture.',
      metaKeywords:
        'panchkarma equipment, ayurvedic droni, shirodhara table, teakwood massage bed, steam cabinet, ayurveda clinic setup, ensis wellness',
      canonicalUrl: 'https://ensis.in/',
      ogTitle: 'Ensis | Luxury Panchkarma Tables & Ayurvedic Furniture',
      ogDescription:
        'Engineered from seasoned Grade-A teakwood and virgin brass hardware. Authentic Charaka Samhita dimensions engineered for NABH clinical excellence.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Handcrafted Panchkarma & Wellness Architecture',
      breadcrumbName: 'Home',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Ensis Wellness Spaces',
        url: 'https://ensis.in',
        logo: 'https://ensis.in/ensis-logo.webp',
        description: 'Manufacturer of authentic Ayurvedic wellness furniture and turnkey clinic setups.',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'hero',
        componentKey: 'home.hero',
        name: 'Home Hero Banner',
        enabled: true,
        eyebrow: 'Rooted in Tradition',
        title: 'Crafted for Healing',
        subtitle: 'Authentic Panchakarma. Timeless wellness',
        description:
          '<p>Authentic Panchakarma. Timeless wellness. Handcrafted therapeutic furniture, automated shirodhara units, and turnkey clinic infrastructure.</p>',
        buttonLabel: 'EXPLORE COLLECTION',
        buttonHref: '/products',
        secondaryButtonLabel: 'BOOK DESIGN CONSULTATION',
        secondaryButtonHref: '/contact',
        image: '/uploads/welcome_to_ensis.webp',
        items: [
          { title: 'Authentic Craftsmanship' },
          { title: 'Export Grade Standards' },
          { title: 'Ayurvedic Compliance' },
        ],
        data: {
          slides: [
            {
              id: 'slide-1',
              title: 'Rooted in Tradition',
              highlight: 'Crafted for Healing',
              description: 'Authentic Panchakarma. Timeless wellness',
              image: '/uploads/welcome_to_ensis.webp',
              primaryButtonText: 'EXPLORE COLLECTION',
              primaryButtonHref: '/products',
              secondaryButtonText: 'BOOK DESIGN CONSULTATION',
              secondaryButtonHref: '/contact',
              listItems: ['Authentic Craftsmanship', 'Export Grade Standards', 'Ayurvedic Compliance'],
              showLutus: true,
              isCenter: false,
            },
          ],
        },
      },
      {
        key: 'fullWidthFeatures',
        componentKey: 'home.fullWidthFeatures',
        name: 'Full Width Features',
        enabled: true,
        eyebrow: 'Pillars',
        title: 'Authentic Ayurveda & Holistic Care',
        subtitle: 'Rooted in ancient wisdom, built for lasting transformation.',
        description: '<p>We combine ancient Ayurvedic wisdom with precision modern engineering.</p>',
        buttonLabel: 'Get In Touch',
        buttonHref: '/contact',
        items: [
          { title: 'Authentic Ayurveda', subtitle: 'Rooted in ancient wisdom', description: 'Ancient wisdom with precision manufacturing' },
          { title: 'Holistic Well-being', subtitle: 'For mind, body & soul', description: 'Engineered for peace, healing, and rehabilitation' },
          { title: 'Timeless Care', subtitle: 'Lasting transformation', description: 'Durable construction with 3-year structural guarantee' },
        ],
        data: {
          features: [
            { title: 'Authentic Ayurveda', subtitle: 'Rooted in ancient wisdom', image: '' },
            { title: 'Holistic Well-being', subtitle: 'For mind, body & soul', image: '' },
            { title: 'Timeless Care', subtitle: 'Lasting transformation', image: '' },
          ],
          buttonText: 'Get In Touch',
          buttonPath: '/contact',
        },
      },
      {
        key: 'wellnessSection',
        componentKey: 'home.wellnessSection',
        name: 'Wellness Philosophy & Welcome',
        enabled: true,
        eyebrow: 'Welcome To Ensis',
        title: 'Where Tradition Meets Transformative Wellness.',
        subtitle: 'At Ensis, we blend ancient Ayurvedic wisdom with exceptional craftsmanship.',
        description:
          '<p>At Ensis, we blend ancient Ayurvedic wisdom with exceptional craftsmanship to create timeless wellness solutions for modern lives.</p>',
        buttonLabel: 'Know More',
        buttonHref: '/about',
        image: '/uploads/welcome_to_ensis.webp',
        items: [
          { title: 'PANCHAKARMA TABLES', description: 'Experience authentic therapies with comfort and precision.' },
          { title: 'SHIRODHARA EQUIPMENTS', description: 'Precision-crafted for deep relaxation and mental clarity.' },
          { title: 'STEAM & SAUNA', description: 'Detoxify. Rejuvenate. Restore balance naturally.' },
          { title: 'WELLNESS ACCESSORIES', description: 'Thoughtful additions for a complete wellness journey.' },
        ],
        data: {
          welcomeImage: '/uploads/welcome_to_ensis.webp',
          eyebrow: 'Welcome To Ensis',
          heading: 'Where Tradition Meets Transformative Wellness.',
          description:
            'At Ensis, we blend ancient Ayurvedic wisdom with exceptional craftsmanship to create timeless wellness solutions for modern lives.',
          buttonText: 'Know More',
          buttonHref: '/about',
          services: [
            { image: '', title: 'PANCHAKARMA TABLES', description: 'Experience authentic therapies with comfort and precision.' },
            { image: '', title: 'SHIRODHARA EQUIPMENTS', description: 'Precision-crafted for deep relaxation and mental clarity.' },
            { image: '', title: 'STEAM & SAUNA', description: 'Detoxify. Rejuvenate. Restore balance naturally.' },
            { image: '', title: 'WELLNESS ACCESSORIES', description: 'Thoughtful additions for a complete wellness journey.' },
          ],
        },
      },
      {
        key: 'turnkeySolutions',
        componentKey: 'home.turnkeySolutions',
        name: 'Home Turnkey Solutions',
        enabled: true,
        eyebrow: 'TURNKEY WELLNESS SOLUTIONS',
        title: 'From Concept to Complete Wellness Setup',
        subtitle: 'We provide end-to-end solutions for Panchkarma Clinics, Resorts, Hospitals & Wellness Centers.',
        description:
          '<p>We provide end-to-end solutions for Panchkarma Clinics, Resorts, Hospitals & Wellness Centers.</p>',
        buttonLabel: 'BOOK DESIGN CONSULTATION',
        buttonHref: '/contact',
        image: '/uploads/welcome_to_ensis.webp',
        items: [
          { title: 'Panchkarma Clinic Setup', description: 'Complete NABH-standard clinical suites' },
          { title: 'Resort & Spa Setup', description: 'Luxury destination spa treatment rooms' },
          { title: 'Wellness Retreat Design', description: 'Holistic timber therapy sanctuaries' },
          { title: 'Ayurveda Hospital Equipment', description: 'Hospital grade patient droni systems' },
          { title: 'Interior & Equipment Integration', description: 'MEP plumbing and aesthetic architectural alignment' },
        ],
        data: {
          eyebrow: 'TURNKEY WELLNESS SOLUTIONS',
          heading: 'From Concept to\nComplete Wellness Setup',
          description:
            'We provide end-to-end solutions for Panchkarma Clinics, Resorts, Hospitals & Wellness Centers.',
          buttonText: 'BOOK DESIGN CONSULTATION',
          buttonHref: '/contact',
          backgroundImage: '/uploads/welcome_to_ensis.webp',
          solutions: [
            { title: 'Panchkarma Clinic Setup', imgUrl: '' },
            { title: 'Resort & Spa Setup', imgUrl: '' },
            { title: 'Wellness Retreat Design', imgUrl: '' },
            { title: 'Ayurveda Hospital Equipment', imgUrl: '' },
            { title: 'Interior & Equipment Integration', imgUrl: '' },
          ],
        },
      },
      {
        key: 'productsGrid',
        componentKey: 'home.productsGrid',
        name: 'Featured Products Grid',
        enabled: true,
        eyebrow: 'OUR PRODUCTS',
        title: 'Premium Wellness Equipment',
        subtitle: 'Wide range of Ayurvedic, Spa & Wellness equipment crafted for modern wellness spaces.',
        description:
          '<p>Wide range of Ayurvedic, Spa & Wellness equipment crafted for modern wellness spaces.</p>',
        buttonLabel: 'VIEW ALL PRODUCTS',
        buttonHref: '/products',
        items: [
          { title: 'Panchkarma Beds' },
          { title: 'Steam Chambers' },
          { title: 'Spa Massage Tables' },
          { title: 'Sauna Systems' },
          { title: 'Bronze Accessories' },
          { title: 'Spa Furniture' },
          { title: 'Steam Generators' },
          { title: 'Yoga & Wellness' },
        ],
        data: {
          subtitle: 'OUR PRODUCTS',
          heading: 'Premium Wellness Equipment',
          description:
            'Wide range of Ayurvedic, Spa & Wellness equipment crafted for modern wellness spaces.',
          buttonText: 'VIEW ALL PRODUCTS',
          buttonPath: '/products',
          productsLimit: 8,
          products: [
            { id: 'panchkarma-beds', title: 'Panchkarma Beds', image: '' },
            { id: 'steam-chambers', title: 'Steam Chambers', image: '' },
            { id: 'spa-massage-tables', title: 'Spa Massage Tables', image: '' },
            { id: 'sauna-systems', title: 'Sauna Systems', image: '' },
            { id: 'bronze-accessories', title: 'Bronze Accessories', image: '' },
            { id: 'spa-furniture', title: 'Spa Furniture', image: '' },
            { id: 'steam-generators', title: 'Steam Generators', image: '' },
            { id: 'yoga-wellness', title: 'Yoga & Wellness', image: '' },
          ],
        },
      },
      {
        key: 'wellnessRoomSetups',
        componentKey: 'home.wellnessRoomSetups',
        name: 'Complete Room Setups',
        enabled: true,
        eyebrow: 'Complete Wellness Solutions',
        title: 'Complete Room Setups',
        subtitle:
          'Thoughtfully designed, perfectly crafted wellness rooms that reflect the essence of Ayurveda and modern luxury.',
        description:
          '<p>Thoughtfully designed, perfectly crafted wellness rooms that reflect the essence of Ayurveda and modern luxury.</p>',
        buttonLabel: 'EXPLORE ROOM SETUPS',
        buttonHref: '/products',
        items: [
          { title: 'Panchkarma Suite Setup' },
          { title: 'Shirodhara Room Setup' },
          { title: 'Steam Therapy Room Setup' },
          { title: 'Consultation Room Setup' },
        ],
        data: {
          subtitle: 'Complete Wellness Solutions',
          heading: 'Complete Room Setups',
          description:
            'Thoughtfully designed, perfectly crafted wellness rooms that reflect the essence of Ayurveda and modern luxury.',
          buttonText: 'EXPLORE ROOM SETUPS',
          buttonPath: '/products',
          rooms: [
            { title: 'Panchkarma Suite Setup', image: '' },
            { title: 'Shirodhara Room Setup', image: '' },
            { title: 'Steam Therapy Room Setup', image: '' },
            { title: 'Consultation Room Setup', image: '' },
          ],
        },
      },
      {
        key: 'manufacturingAndProjects',
        componentKey: 'home.manufacturingAndProjects',
        name: 'Manufacturing & Global Projects',
        enabled: true,
        eyebrow: 'MANUFACTURING EXCELLENCE',
        title: 'Crafted with Precision, Delivered Worldwide',
        subtitle: 'Our advanced manufacturing facility combines traditional craftsmanship with modern technology.',
        description:
          '<p>Our advanced manufacturing facility combines traditional craftsmanship with modern technology to deliver world-class wellness equipment. Proud to be a trusted partner for 500+ wellness projects across the globe.</p>',
        buttonLabel: 'OUR MANUFACTURING',
        buttonHref: '/manufacturing',
        items: [
          { title: 'Premium Quality Raw Materials' },
          { title: 'Skilled Artisans & Modern Machinery' },
          { title: 'Multi-Level Quality Testing' },
          { title: 'International Export Packing' },
        ],
        data: {
          mfgSubtitle: 'MANUFACTURING EXCELLENCE',
          mfgHeading: 'Crafted with Precision,\nDelivered Worldwide',
          mfgDescription:
            'Our advanced manufacturing facility combines traditional craftsmanship with modern technology to deliver world-class wellness equipment.',
          mfgFeatures: [
            'Premium Quality Raw Materials',
            'Skilled Artisans & Modern Machinery',
            'Multi-Level Quality Testing',
            'International Export Packing',
          ],
          mfgButtonText: 'OUR MANUFACTURING',
          mfgButtonPath: '/manufacturing',
          projSubtitle: 'OUR PROJECTS',
          projHeading: 'Creating Wellness\nSpaces Worldwide',
          projDescription: 'Proud to be a trusted partner for 500+ wellness projects across the globe.',
          projButtonText: 'VIEW ALL PROJECTS',
          projButtonPath: '/projects',
        },
      },
      {
        key: 'globalPresence',
        componentKey: 'home.globalPresence',
        name: 'Global Presence & Statistics',
        enabled: true,
        eyebrow: 'GLOBAL PRESENCE',
        title: 'Trusted by Wellness Professionals Worldwide',
        subtitle: 'Exporting to 25+ countries and growing stronger every day.',
        description: '<p>Exporting to 25+ countries and growing stronger every day.</p>',
        image: '/uploads/welcome_to_ensis.webp',
        items: [
          { title: '25+', subtitle: 'Countries' },
          { title: '500+', subtitle: 'Projects' },
          { title: '10+', subtitle: 'Years of Excellence' },
          { title: '100%', subtitle: 'Customer Satisfaction' },
        ],
        data: {
          eyebrow: 'GLOBAL PRESENCE',
          heading: 'Trusted by Wellness\nProfessionals Worldwide',
          description: 'Exporting to 25+ countries and growing stronger every day',
          image: '/uploads/welcome_to_ensis.webp',
          stats: [
            { value: '25+', label: 'Countries' },
            { value: '500+', label: 'Projects' },
            { value: '10+', label: 'Years of Excellence' },
            { value: '100%', label: 'Customer Satisfaction' },
          ],
        },
      },
      {
        key: 'testimonials',
        componentKey: 'home.testimonials',
        name: 'Client Reviews & Feedback',
        enabled: true,
        eyebrow: 'TESTIMONIALS',
        title: 'What Our Clients Say',
        subtitle: 'Verified practitioner reviews from leading clinics',
        description: '<p>What practitioners and clinic directors say about our solid wood equipment.</p>',
        items: [
          {
            title: 'Dr. Anand Sharma',
            subtitle: 'Ayurveda Physician',
            description:
              'Ensis has delivered exceptional quality Panchkarma equipment for our center. Their customization and support are outstanding.',
          },
          {
            title: 'Neha Malhotra',
            subtitle: 'Wellness Resort Owner',
            description:
              "The spa setup by Ensis has elevated our resort's wellness experience to a whole new level.",
          },
          {
            title: 'Arjun Menon',
            subtitle: 'Spa Consultant',
            description: 'Excellent workmanship, premium finishing and on-time delivery. Highly recommended!',
          },
          {
            title: 'Priya Nair',
            subtitle: 'Wellness Center Director',
            description:
              'Their steam chambers and massage tables are of outstanding quality. Our clients love them.',
          },
        ],
        data: {
          subtitle: 'WHAT OUR CLIENTS SAY',
          testimonials: [
            {
              text: 'Ensis has delivered exceptional quality Panchkarma equipment for our center. Their customization and support are outstanding.',
              name: 'Dr. Anand Sharma',
              role: 'Ayurveda Physician',
              image: '',
            },
            {
              text: "The spa setup by Ensis has elevated our resort's wellness experience to a whole new level.",
              name: 'Neha Malhotra',
              role: 'Wellness Resort Owner',
              image: '',
            },
            {
              text: 'Excellent workmanship, premium finishing and on-time delivery. Highly recommended!',
              name: 'Arjun Menon',
              role: 'Spa Consultant',
              image: '',
            },
            {
              text: 'Their steam chambers and massage tables are of outstanding quality. Our clients love them.',
              name: 'Priya Nair',
              role: 'Wellness Center Director',
              image: '',
            },
          ],
        },
      },
      {
        key: 'blogInsights',
        componentKey: 'home.blogInsights',
        name: 'Insights & Wellness Knowledge',
        enabled: true,
        eyebrow: 'FROM THE BLOG',
        title: 'Insights & Wellness Knowledge',
        subtitle: 'Articles, clinical guides, and equipment engineering trends.',
        description:
          '<p>Articles, clinical guides, and equipment engineering trends from India’s foremost wellness timber masters.</p>',
        buttonLabel: 'VIEW ALL BLOGS',
        buttonHref: '/blog',
        items: [
          { title: 'Panchkarma Room Design Guide: Everything You Need to Know' },
          { title: 'How to Choose the Right Spa Equipment for Your Business' },
          { title: 'Steam Chamber Benefits for Detox & Relaxation Therapy' },
          { title: 'Top 7 Ayurveda Wellness Trends in 2024' },
        ],
        data: {
          subtitle: 'FROM THE BLOG',
          heading: 'Insights & Wellness Knowledge',
          buttonText: 'VIEW ALL BLOGS',
          buttonPath: '/blog',
          ctaHeading: 'Ready to Build Your Dream Wellness Space?',
          ctaDescription: 'Connect with our experts for personalized consultation and premium solutions.',
          ctaButtonText: 'CONTACT US TODAY',
          ctaButtonPath: '/contact',
        },
      },
    ],
  },

  // 2. ABOUT US PAGE
  {
    configKey: 'aboutPage',
    pageName: 'About Us - Heritage & Craftsmanship',
    slug: '/about-us',
    seo: {
      metaTitle: 'About Ensis | Heritage Ayurvedic Equipment Manufacturers',
      metaDescription:
        'Over two decades of precision woodcraft and engineering dedication to authentic Ayurvedic therapeutic furniture and hospital interiors.',
      metaKeywords: 'about ensis, ayurvedic furniture company, panchkarma table manufacturing, wellness heritage',
      canonicalUrl: 'https://ensis.in/about-us',
      ogTitle: 'About Us | Ensis Wellness Spaces',
      ogDescription: 'Preserving ancient healing wisdom through modern precision woodcraft and hospital-grade engineering.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'About Ensis Heritage',
      breadcrumbName: 'About Us',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About Ensis',
        url: 'https://ensis.in/about-us',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'hero',
        componentKey: 'about.hero',
        name: 'About Hero Banner',
        enabled: true,
        eyebrow: 'Spaces That Heal',
        title: 'Building Wellness',
        subtitle: 'ABOUT ENSIS',
        description:
          '<p>We design and deliver complete wellness environments — from Ayurvedic clinics and spa rooms to turnkey hospital wellness floors — combining traditional wisdom with modern engineering.</p>',
        buttonLabel: 'Get a Free Consultation',
        buttonHref: '/contact',
        secondaryButtonLabel: 'View Our Products',
        secondaryButtonHref: '/products',
        image: '/assets/about_new/about_banner.webp',
        data: {
          title: 'Building Wellness',
          heading: 'ABOUT ENSIS',
          description:
            '<p>We design and deliver complete wellness environments — from Ayurvedic clinics and spa rooms to turnkey hospital wellness floors — combining traditional wisdom with modern engineering.</p>',
          highlight: 'Spaces That Heal',
          primaryBtnText: 'Get a Free Consultation',
          primaryBtnPath: '/contact',
          secondaryBtnText: 'View Our Products',
          secondaryBtnPath: '/products',
        },
      },
      {
        key: 'ourStory',
        componentKey: 'about.ourStory',
        name: 'Our Story & Core Values',
        enabled: true,
        eyebrow: 'Our Story',
        title: 'Crafting Wellness Since 2003',
        subtitle: 'ENSIS Heritage & Journey',
        description:
          '<p>ENSIS, the wellness division of Design House India Pvt. Ltd., was established in 2003 with a vision to create authentic, durable and aesthetically superior wellness solutions.</p><p>We combine the wisdom of Ayurveda with modern engineering to build products and spaces that deliver healing, comfort and long-term value.</p><p>Today, ENSIS is a preferred partner for clinics, hospitals, resorts, spas and wellness entrepreneurs across India.</p>',
        items: [
          { title: '20+ Years Experience', description: 'Established in 2003 with deep Ayurvedic roots' },
          { title: 'Ayurveda Centric', description: 'Formulations and designs rooted in classical Ayurvedic texts' },
          { title: 'Quality & Durability', description: 'Solid Grade-A timber and precision engineered brass' },
          { title: 'Customer Satisfaction', description: '500+ successful installations across India and worldwide' },
        ],
        data: {
          heading: 'Our Story',
          title: 'Crafting Wellness Since 2003',
          description:
            '<p>ENSIS, the wellness division of Design House India Pvt. Ltd., was established in 2003 with a vision to create authentic, durable and aesthetically superior wellness solutions.</p><p>We combine the wisdom of Ayurveda with modern engineering to build products and spaces that deliver healing, comfort and long-term value.</p><p>Today, ENSIS is a preferred partner for clinics, hospitals, resorts, spas and wellness entrepreneurs across India.</p>',
        },
      },
      {
        key: 'industriesWeServe',
        componentKey: 'about.industriesWeServe',
        name: 'Industries We Serve',
        enabled: true,
        eyebrow: 'Sectors & Venues',
        title: 'Industries We Serve',
        subtitle: 'Tailored solutions for healthcare, hospitality, and wellness leaders.',
        description:
          '<p>From premier Ayurvedic medical hospitals to world-class destination resorts, we build compliant therapeutic environments.</p>',
        items: [
          { title: 'Ayurveda Hospitals', description: 'NABH-compliant hospital wings, consultation rooms, and droni suites' },
          { title: 'Wellness Resorts', description: 'Luxury destination spa rooms and Ayurvedic experience centres' },
          { title: 'Luxury Spas', description: 'Contemporary swedana steam boxes, massage suites, and hydrotherapy' },
          { title: 'Panchkarma Centers', description: 'Dedicated traditional 5-action detox and purification facilities' },
          { title: 'Yoga Retreats', description: 'Serene natural timber furniture, meditation spaces, and props' },
          { title: 'Wellness Clinics', description: 'Compact clinical droni setups for urban practitioners' },
          { title: 'Hotels & Retreats', description: 'Turnkey wellness additions for boutique hospitality properties' },
          { title: 'Naturopathy Centers', description: 'Eco-friendly, chemical-free therapeutic wooden setups' },
        ],
        data: {
          title: 'Industries We Serve',
          subtitle: 'Tailored solutions for healthcare, hospitality, and wellness leaders.',
        },
      },
      {
        key: 'ourProducts',
        componentKey: 'about.ourProducts',
        name: 'Our Products Showcase',
        enabled: true,
        eyebrow: 'Signature Craftsmanship',
        title: 'Our Products',
        subtitle: 'Ayurvedic, Spa & Wellness equipment manufactured to international specifications.',
        description:
          '<p>Engineered from seasoned solid wood and solid brass hardware for therapeutic durability.</p>',
        buttonLabel: 'View All Products',
        buttonHref: '/products',
        data: {
          title: 'Our Products',
        },
      },
      {
        key: 'ourTurnkeyProcess',
        componentKey: 'about.ourTurnkeyProcess',
        name: 'Our Turnkey Process',
        enabled: true,
        eyebrow: 'Methodology',
        title: 'Our Turnkey Process',
        subtitle: 'From concept to commissioning — precision in every step.',
        description:
          '<p>A seamless 5-stage turnkey delivery model designed to eliminate project delays.</p>',
        items: [
          { title: '1. Consultation & Planning', description: 'Understanding clinical requirements, layout sizing, and doctor workflow' },
          { title: '2. Design & 3D Visualization', description: 'Detailed 2D CAD layouts and 3D realistic interior walk-throughs' },
          { title: '3. Manufacturing & Production', description: 'Precision woodcraft and automated machinery in our 50,000 sq.ft NCR factory' },
          { title: '4. Installation & Execution', description: 'White-glove delivery, MEP plumbing integration, and on-site assembly' },
          { title: '5. Handover & Support', description: 'Maintenance manuals, staff training, and continuous after-sales service' },
        ],
        data: {
          title: 'Our Turnkey Process',
          subtitle: 'From concept to commissioning — precision in every step.',
        },
      },
      {
        key: 'wellnessSection',
        componentKey: 'about.wellnessSection',
        name: 'Wellness Philosophy',
        enabled: true,
        eyebrow: 'Ancient Science',
        title: 'Crafted With Ayurvedic Principles',
        subtitle: 'Authentic woods, brass fixtures, and ergonomic excellence.',
        description:
          '<p>We harmonize Charaka Samhita geometry with modern biomechanics for therapeutic efficacy.</p>',
        data: {
          title: 'Crafted With Ayurvedic Principles',
          subtitle: 'Authentic woods, brass fixtures, and ergonomic excellence.',
        },
      },
      {
        key: 'aboutEnsis',
        componentKey: 'about.aboutEnsis',
        name: 'About Ensis Infrastructure',
        enabled: true,
        eyebrow: 'Manufacturing Backbone',
        title: 'State-of-the-Art Manufacturing',
        subtitle: 'Over 50,000 sq.ft facility in NCR dedicated to wellness manufacturing.',
        description:
          '<p>ENSIS is the wellness division of Design House India Pvt. Ltd., a trusted name in turnkey interiors and manufacturing since 2003. With a passion for Ayurveda and a commitment to excellence, we design and manufacture premium equipment.</p>',
        items: [
          { title: '20+ Years', description: 'Years of Manufacturing Experience' },
          { title: '1000+', description: 'Projects Completed Worldwide' },
          { title: '200+', description: 'Happy Institutional Clients' },
          { title: '28', description: 'States Across India Served' },
          { title: '50+', description: 'Skilled Artisans & Expert Engineers' },
        ],
        data: {
          title: 'State-of-the-Art Manufacturing',
          subtitle: 'Over 50,000 sq.ft facility in NCR dedicated to wellness manufacturing.',
        },
      },
      {
        key: 'founderVision',
        componentKey: 'about.founderVision',
        name: "Founder's Vision",
        enabled: true,
        eyebrow: 'Leadership',
        title: 'Building a Legacy of Wellness',
        subtitle: 'Founder & Managing Director - Jomy Thomas',
        description:
          '<p>With over two decades of experience in the wellness industry, our founder envisioned creating spaces that seamlessly blend traditional Ayurvedic wisdom with modern engineering excellence.</p>',
        data: {
          heading: "FOUNDER'S VISION",
          title: 'Building a Legacy of Wellness',
          description:
            '<p>With over two decades of experience in the wellness industry, our founder envisioned creating spaces that seamlessly blend traditional Ayurvedic wisdom with modern engineering excellence.</p>',
          quote: 'To make authentic Ayurvedic wellness spaces globally accessible and impeccably built.',
        },
      },
      {
        key: 'testimonials',
        componentKey: 'about.testimonials',
        name: 'Client Testimonials',
        enabled: true,
        eyebrow: 'Trust & Endorsements',
        title: 'What Leading Vaidyas & Practitioners Say',
        subtitle: 'Verified feedback from healthcare leaders across India.',
        items: [
          {
            title: 'Dr. Anand Sharma',
            subtitle: 'Ayurveda Physician',
            description:
              'Ensis has delivered exceptional quality Panchkarma equipment for our center. Their customization and support are outstanding.',
          },
          {
            title: 'Neha Malhotra',
            subtitle: 'Wellness Resort Owner',
            description:
              "The spa setup by Ensis has elevated our resort's wellness experience to a whole new level.",
          },
          {
            title: 'Arjun Menon',
            subtitle: 'Spa Consultant',
            description: 'Excellent workmanship, premium finishing and on-time delivery. Highly recommended!',
          },
        ],
        data: {},
      },
      {
        key: 'letsBuild',
        componentKey: 'about.letsBuild',
        name: 'Call to Action Banner',
        enabled: true,
        eyebrow: 'Get Started',
        title: 'Ready to Build Your Wellness Space?',
        subtitle: 'Speak with our architects and wellness consultants today.',
        description:
          '<p>From concept to commissioning, we design, manufacture and install complete wellness environments. Let our experts help you create spaces that heal.</p>',
        buttonLabel: 'Schedule Consultation',
        buttonHref: '/contact',
        data: {
          heading: 'Ready to Build Your Wellness Space?',
          title: 'Ready to Build Your Wellness Space?',
          description:
            '<p>From concept to commissioning, we design, manufacture and install complete wellness environments. Let our experts help you create spaces that heal.</p>',
          buttonText: 'Schedule Consultation',
          buttonHref: '/contact',
        },
      },
    ],
  },

  // 3. TURNKEY SOLUTIONS PAGE
  {
    configKey: 'turnkeyPage',
    pageName: 'Turnkey Solutions - Clinic & Spa Setup',
    slug: '/turnkey',
    seo: {
      metaTitle: 'Turnkey Ayurvedic Clinic & Luxury Spa Setup | Ensis',
      metaDescription:
        'Complete end-to-end design, manufacturing, interior setup, MEP plumbing, and equipment commissioning for wellness clinics and resorts.',
      metaKeywords: 'turnkey clinic setup, spa architecture, panchkarma room design, wellness interior contractor',
      canonicalUrl: 'https://ensis.in/turnkey',
      ogTitle: 'Turnkey Clinic & Spa Setup Solutions | Ensis',
      ogDescription: 'End-to-end architectural planning and installation for premium Ayurvedic health centres.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Turnkey Clinic Architecture',
      breadcrumbName: 'Turnkey Solutions',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Turnkey Clinic Setup',
        provider: { '@type': 'Organization', name: 'Ensis' },
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'banner',
        componentKey: 'turnkey.banner',
        name: 'Turnkey Hero Banner',
        enabled: true,
        eyebrow: 'Turnkey Architecture',
        title: 'End-to-End Turnkey Solutions',
        subtitle: 'From bare shell to fully operational Ayurvedic clinics and wellness spas.',
        description:
          '<p>From bare shell to fully operational Ayurvedic clinics and wellness spas. We plan, manufacture, deliver, and install every square foot of your wellness center.</p>',
        buttonLabel: 'Explore Turnkey Projects',
        buttonHref: '/projects-and-clients',
        data: {
          title: 'End-to-End Turnkey Solutions',
          subtitle: 'From bare shell to fully operational Ayurvedic clinics and wellness spas.',
          primaryBtnText: 'Explore Turnkey Projects',
          primaryBtnPath: '/projects-and-clients',
        },
      },
      {
        key: 'whatIsTurnkey',
        componentKey: 'turnkey.whatIsTurnkey',
        name: 'What is Turnkey?',
        enabled: true,
        eyebrow: 'Comprehensive Service',
        title: 'Complete Clinic Execution Under One Roof',
        subtitle: 'No fragmented contractors, single-point accountability.',
        description:
          '<p>From floor plan CAD design to MEP plumbing, equipment manufacturing, and doctor training.</p>',
        items: [
          { title: 'Zero Coordination Hassles' },
          { title: 'Guaranteed 45-Day Handover' },
          { title: 'NABH Compliance Built-In' },
        ],
        data: {},
      },
      {
        key: 'completeSolutions',
        componentKey: 'turnkey.completeSolutions',
        name: 'Complete Solutions Grid',
        enabled: true,
        eyebrow: 'Capabilities',
        title: 'Architecture, MEP & Equipment Setup',
        subtitle: 'Turnkey hospital wellness floors, resorts, and day clinics.',
        items: [
          { title: 'Architectural CAD Layout', description: 'Patient workflow and NABH zoning design' },
          { title: 'HVAC & Plumbing MEP', description: 'Hot water, oil catchers, and specialized exhaust' },
          { title: 'Custom Timber Manufacturing', description: 'Handcrafted droni tables and Swedana boxes' },
          { title: 'Hospital Commissioning', description: 'Testing, staff training, and compliance handover' },
        ],
        data: {},
      },
      {
        key: 'facilities',
        componentKey: 'turnkey.facilities',
        name: 'Facilities We Build',
        enabled: true,
        eyebrow: 'Venues Delivered',
        title: 'Clinics, Spas & Ayurvedic Hospitals',
        subtitle: 'Specialized setups for medical and hospitality applications.',
        items: [
          { title: 'NABH Hospital Wings', description: 'Clinical suites with full sanitation integration' },
          { title: 'Luxury Resort Spas', description: 'Aesthetic therapy rooms for high-end hospitality' },
          { title: 'Ayurvedic Day Clinics', description: 'Optimized multi-room consultation and therapy setups' },
          { title: 'Swedana Therapy Suites', description: 'Steam and sauna chambers with dedicated drainage' },
        ],
        data: {},
      },
      {
        key: 'customized',
        componentKey: 'turnkey.customized',
        name: 'Why Choose Turnkey with Ensis',
        enabled: true,
        eyebrow: 'The Ensis Advantage',
        title: 'Single Vendor Accountability & 3-Year Warranty',
        subtitle: 'Factory direct manufacturing with on-site engineering teams.',
        description:
          '<p>We eliminate coordination friction between interior contractors, plumbers, and equipment vendors.</p>',
        data: {},
      },
      {
        key: 'featuredProjects',
        componentKey: 'turnkey.featuredProjects',
        name: 'Featured Turnkey Projects',
        enabled: true,
        eyebrow: 'Our Portfolio',
        title: 'Showcasing Landmark Wellness Projects',
        subtitle: 'Explore our prestigious installations across India.',
        data: {},
      },
      {
        key: 'readyToBuild',
        componentKey: 'turnkey.readyToBuild',
        name: 'Turnkey Call to Action',
        enabled: true,
        eyebrow: 'Get Started',
        title: 'Ready to Build Your Turnkey Center?',
        subtitle: 'Connect with our wellness infrastructure architects today.',
        buttonLabel: 'Schedule Consultation',
        buttonHref: '/contact',
        data: {},
      },
    ],
  },

  // 4. CONSULTANCY PAGE
  {
    configKey: 'consultancyPage',
    pageName: 'NABH Healthcare & Spa Consultancy',
    slug: '/consultancy',
    seo: {
      metaTitle: 'Ayurvedic Hospital & Spa Consultancy | NABH Compliance',
      metaDescription:
        'Professional healthcare advisory for NABH accreditation, clinic workflow optimization, equipment selection, and wellness project feasibility.',
      metaKeywords: 'ayurveda consultancy, nabh clinic accreditation, spa business consulting, wellness architecture advisory',
      canonicalUrl: 'https://ensis.in/consultancy',
      ogTitle: 'Ayurvedic Healthcare & Spa Consultancy | Ensis',
      ogDescription: 'Expert healthcare guidance for NABH compliance, patient safety, and optimal clinic revenue.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'NABH Healthcare Consultancy',
      breadcrumbName: 'Consultancy',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Ayurvedic Healthcare Consultancy',
        provider: { '@type': 'Organization', name: 'Ensis' },
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'hero',
        componentKey: 'consultancy.hero',
        name: 'Consultancy Hero Banner',
        enabled: true,
        eyebrow: 'Healthcare Architecture Advisory',
        title: 'Expert Wellness Consultancy',
        subtitle: 'NABH compliance, layout optimization, equipment specification, and operational workflows.',
        description:
          '<p>NABH compliance, layout optimization, equipment specification, and operational workflows. We help hospitals and resorts build profitable, accredited centers.</p>',
        buttonLabel: 'Book Consultation',
        buttonHref: '/contact',
        data: {
          title: 'Expert Wellness Consultancy',
          subtitle:
            'NABH compliance, layout optimization, equipment specification, and operational workflows.',
        },
      },
      {
        key: 'features_strip',
        componentKey: 'consultancy.features_strip',
        name: 'Consultancy Stats & Features Strip',
        enabled: true,
        eyebrow: 'Key Metrics',
        title: 'Proven Track Record in Clinical Accreditation',
        subtitle: 'Over 500+ clinics and hospitals guided to full certification.',
        data: {},
      },
      {
        key: 'whatWeOffer',
        componentKey: 'consultancy.whatWeOffer',
        name: 'What We Offer',
        enabled: true,
        eyebrow: 'Our Services',
        title: 'Complete Healthcare & Spa Advisory Solutions',
        subtitle: 'Comprehensive packages covering layout, equipment, staffing, and compliance.',
        items: [
          { title: 'NABH Accreditation Roadmapping' },
          { title: 'Architectural CAD Layout & MEP Sizing' },
          { title: 'Therapeutic Equipment Audits' },
          { title: 'Therapist Ergonomics & Safety Training' },
        ],
        data: {},
      },
      {
        key: 'whyChooseOurProcess',
        componentKey: 'consultancy.whyChooseOurProcess',
        name: 'How We Work',
        enabled: true,
        eyebrow: 'Our Process',
        title: '4-Step Structured Consultancy Process',
        subtitle: 'From initial site audit to final accreditation handover.',
        items: [
          { title: '1. Site Audit & Assessment' },
          { title: '2. Custom Compliance Blueprint' },
          { title: '3. Execution & Vendor Supervision' },
          { title: '4. Staff Training & NABH Handover' },
        ],
        data: {},
      },
      {
        key: 'readyToGetStarted',
        componentKey: 'consultancy.readyToGetStarted',
        name: 'Consultancy Call to Action',
        enabled: true,
        eyebrow: 'Get in Touch',
        title: 'Ready to Plan Your Accredited Clinic?',
        subtitle: 'Speak with our senior Ayurvedic healthcare consultants.',
        buttonLabel: 'Schedule A Call',
        buttonHref: '/contact',
        data: {},
      },
    ],
  },

  // 5. PRODUCTS PAGE
  {
    configKey: 'productsPage',
    pageName: 'Products Catalog - Equipment & Furniture',
    slug: '/products',
    seo: {
      metaTitle: 'Panchkarma Equipment & Spa Furniture Catalog | Ensis',
      metaDescription:
        'Explore solid teakwood Droni massage tables, automated Shirodhara units, Swedana steam chambers, sauna systems, and Ayurvedic therapy accessories.',
      metaKeywords: 'droni table, shirodhara unit, swedana box, steam cabinet, ayurvedic massage bed, spa furniture',
      canonicalUrl: 'https://ensis.in/products',
      ogTitle: 'Panchkarma & Spa Equipment Catalog | Ensis',
      ogDescription: 'Browse the full collection of luxury timber and brass equipment engineered for healing.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Panchkarma Equipment Catalog',
      breadcrumbName: 'Products',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Ensis Products Catalog',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'hero',
        componentKey: 'product.hero',
        name: 'Products Catalog Hero Slider',
        enabled: true,
        eyebrow: 'Master Woodcraft',
        title: 'Engineered for Intensive Clinical Use',
        subtitle: 'Every piece is crafted from seasoned Grade-A teakwood and virgin brass hardware.',
        description:
          '<p>Engineered for intensive clinical use. Handcrafted therapeutic timber furniture designed to withstand daily hot medicated oils.</p>',
        buttonLabel: 'View Collections',
        buttonHref: '#catalog',
        data: {},
      },
      {
        key: 'trustedBy',
        componentKey: 'product.trustedBy',
        name: 'Trusted Brands & Partners Strip',
        enabled: true,
        title: 'Trusted by Premier Healthcare & Hospitality Networks',
        subtitle: 'Leading hospital chains, luxury resorts, and Vaidyas rely on Ensis.',
        data: {},
      },
      {
        key: 'productsection',
        componentKey: 'product.productsection',
        name: 'Full Products Listing & Filter Grid',
        enabled: true,
        title: 'Complete Equipment Catalog',
        subtitle: 'Filter by category, timber type, and therapy requirements.',
        data: {},
      },
      {
        key: 'whyChoose',
        componentKey: 'product.whyChoose',
        name: 'Why Choose Ensis Equipment',
        enabled: true,
        eyebrow: 'Engineering Excellence',
        title: 'Solid Teakwood, Virgin Brass, 3-Year Warranty',
        subtitle: 'Built to exceed international hospital and spa hygiene benchmarks.',
        data: {},
      },
      {
        key: 'testimonials',
        componentKey: 'product.testimonials',
        name: 'Product Testimonials',
        enabled: true,
        title: 'Practitioner Feedback & Endorsements',
        subtitle: 'Real reviews from clinic owners and therapists.',
        data: {},
      },
    ],
  },

  // 6. PROJECTS & CLIENTS PAGE
  {
    configKey: 'projectsPage',
    pageName: 'Projects & Clients - Installation Portfolio',
    slug: '/projects-and-clients',
    seo: {
      metaTitle: 'Our Projects & Clients | Ensis Wellness Installations',
      metaDescription:
        'Explore our completed Ayurvedic hospital suites, resort spas, and luxury wellness centers across India and internationally.',
      metaKeywords: 'ensis projects, clinic installations, ayurveda hospital portfolio, resort spa setups',
      canonicalUrl: 'https://ensis.in/projects-and-clients',
      ogTitle: 'Ensis Installations & Client Portfolio',
      ogDescription: 'Over 500+ successful installations across 24 states and international destinations.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Projects & Clients Portfolio',
      breadcrumbName: 'Projects & Clients',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Ensis Projects Portfolio',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'banner',
        componentKey: 'projects.banner',
        name: 'Projects Hero Banner',
        enabled: true,
        eyebrow: 'Global Portfolio',
        title: 'Our Projects & Esteemed Clients',
        subtitle: 'Showcasing world-class Ayurvedic spaces crafted with precision.',
        description:
          '<p>Showcasing world-class Ayurvedic spaces crafted with precision across India and internationally.</p>',
        buttonLabel: 'Explore Installations',
        buttonHref: '#gallery',
        data: {
          title: 'Our Projects & Esteemed Clients',
          subtitle: 'Showcasing world-class Ayurvedic spaces crafted with precision.',
        },
      },
      {
        key: 'ourProjects',
        componentKey: 'projects.ourProjects',
        name: 'Featured Installation Gallery',
        enabled: true,
        title: 'Completed Turnkey Setups & Installations',
        subtitle: 'Browse through our hospital wings and luxury wellness destinations.',
        data: {},
      },
      {
        key: 'ourClients',
        componentKey: 'projects.ourClients',
        name: 'Our Client Network',
        enabled: true,
        title: 'Partners in Healthcare & Hospitality',
        subtitle: 'Trusted by 500+ clinics and world-renowned wellness resorts.',
        data: {},
      },
      {
        key: 'whyPartner',
        componentKey: 'projects.whyPartner',
        name: 'Why Partner With Ensis',
        enabled: true,
        title: 'Factory-Direct Pricing, Long-Term Reliability',
        subtitle: 'Complete accountability from concept to 3-year warranty support.',
        data: {},
      },
      {
        key: 'contactSection',
        componentKey: 'projects.contactSection',
        name: 'Project Consultation CTA',
        enabled: true,
        title: 'Planning a New Wellness Project?',
        subtitle: 'Connect with our engineering and project management team.',
        buttonLabel: 'Start A Conversation',
        buttonHref: '/contact',
        data: {},
      },
    ],
  },

  // 7. BLOG & INSIGHTS PAGE
  {
    configKey: 'blogPage',
    pageName: 'Blog & Clinical Insights',
    slug: '/blog',
    seo: {
      metaTitle: 'Ayurvedic Wellness Insights & Guides | Ensis Blog',
      metaDescription:
        'Articles on Panchkarma room design, swedana therapy equipment maintenance, NABH clinic compliance, and Ayurvedic wellness engineering.',
      metaKeywords: 'ayurveda blog, panchkarma room guide, spa equipment maintenance, wellness insights',
      canonicalUrl: 'https://ensis.in/blog',
      ogTitle: 'Ensis Wellness Insights & Knowledge Base',
      ogDescription: 'Clinical guides, equipment maintenance manuals, and industry trends from master artisans.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Wellness Insights & Knowledge',
      breadcrumbName: 'Blog',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Ensis Blog',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'hero',
        componentKey: 'blog.hero',
        name: 'Blog Hero Banner',
        enabled: true,
        eyebrow: 'Knowledge Hub',
        title: 'Ensis Wellness Insights',
        subtitle: 'Articles, clinical guides, and equipment engineering trends.',
        description:
          '<p>Articles, clinical guides, and equipment engineering trends from India’s foremost wellness timber masters.</p>',
        data: {
          heading: 'Ensis Wellness Insights',
          subtitle: 'Articles, clinical guides, and equipment engineering trends.',
        },
      },
      {
        key: 'allBlogs',
        componentKey: 'blog.allBlogs',
        name: 'All Articles & Resource Grid',
        enabled: true,
        title: 'Latest Publications & Clinical Guides',
        subtitle: 'Searchable by category: clinic architecture, timber care, and Swedana protocols.',
        data: {},
      },
      {
        key: 'mediaResources',
        componentKey: 'blog.mediaResources',
        name: 'Media & Downloadable Resources',
        enabled: true,
        title: 'Downloadable Catalogues & Specifications',
        subtitle: 'Architect CAD blocks, equipment dimensions, and MEP layout diagrams.',
        data: {},
      },
      {
        key: 'stayInspired',
        componentKey: 'blog.stayInspired',
        name: 'Newsletter Subscription Card',
        enabled: true,
        title: 'Join the Ensis Professional Community',
        subtitle: 'Receive quarterly clinic architecture case studies and equipment care tips.',
        data: {},
      },
      {
        key: 'supportWellness',
        componentKey: 'blog.supportWellness',
        name: 'Support Wellness Banner',
        enabled: true,
        title: 'Advancing Authentic Ayurvedic Heritage',
        subtitle: 'Dedicated to preserving ancient wisdom through durable modern design.',
        data: {},
      },
    ],
  },

  // 8. CAREERS PAGE
  {
    configKey: 'careersPage',
    pageName: 'Careers & Join The Team',
    slug: '/career',
    seo: {
      metaTitle: 'Careers at Ensis | Build the Future of Wellness',
      metaDescription:
        'Join our passionate team of master woodcrafters, CAD architects, MEP engineers, and Ayurvedic wellness consultants in NCR.',
      metaKeywords: 'ensis careers, woodworking jobs, ayurveda jobs, interior design careers',
      canonicalUrl: 'https://ensis.in/career',
      ogTitle: 'Careers at Ensis Wellness',
      ogDescription: 'Be part of India’s premier Ayurvedic equipment design and manufacturing house.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Careers at Ensis',
      breadcrumbName: 'Careers',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Ensis Careers',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'banner',
        componentKey: 'career.banner',
        name: 'Careers Hero Banner',
        enabled: true,
        eyebrow: 'CAREERS AT ENSIS',
        title: 'Design Spaces for a Healthier Tomorrow',
        subtitle: 'Be a part of a passionate team that designs and delivers wellness furniture and solutions for spas, wellness centers and healthcare spaces across the world.',
        description:
          '<p>Be a part of a passionate team that designs and delivers wellness furniture and solutions for spas, wellness centers and healthcare spaces across the world.</p>',
        buttonLabel: 'Explore Opportunities',
        buttonHref: '#openings',
        data: {
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
        },
      },
      {
        key: 'features',
        componentKey: 'career.features',
        name: 'Workplace Highlights & Culture',
        enabled: true,
        title: 'Meaningful Work & Collaborative Culture',
        subtitle: 'Why our team members thrive and grow with us.',
        data: {
          stats: [
            { title: 'Meaningful', subtitle: 'Work', label: 'Meaningful Work', icon: 'bulb', image: '' },
            { title: 'Collaborative', subtitle: 'Team', label: 'Collaborative Team', icon: 'users', image: '' },
            { title: 'Growth', subtitle: 'Opportunities', label: 'Growth Opportunities', icon: 'growth', image: '' },
            { title: 'Real Impact', subtitle: 'on Lives', label: 'Real Impact on Lives', icon: 'heart', image: '' },
          ],
        },
      },
      {
        key: 'whyWork',
        componentKey: 'career.whyWork',
        name: 'Why Work at Ensis',
        enabled: true,
        title: 'Creative Freedom & World-Class Facilities',
        subtitle: 'Modern factory machinery combined with artisan master craftsmanship.',
        data: {},
      },
      {
        key: 'section',
        componentKey: 'career.section',
        name: 'Open Job Positions',
        enabled: true,
        title: 'Current Job Openings',
        subtitle: 'Explore roles in production, CAD design, sales, and client relations.',
        data: {},
      },
      {
        key: 'benefits',
        componentKey: 'career.benefits',
        name: 'Employee Benefits & Perks',
        enabled: true,
        title: 'Health, Learning, and Career Growth',
        subtitle: 'Comprehensive healthcare, competitive compensation, and skill-building workshops.',
        data: {},
      },
      {
        key: 'talentCommunity',
        componentKey: 'career.talentCommunity',
        name: 'Join Our Talent Community',
        enabled: true,
        title: 'Don’t See Your Ideal Role?',
        subtitle: 'Submit your resume and portfolio for future opportunities.',
        buttonLabel: 'Submit Resume',
        buttonHref: '/contact',
        data: {},
      },
    ],
  },

  // 9. CONTACT US PAGE
  {
    configKey: 'contactPage',
    pageName: 'Contact Us & Corporate Sales',
    slug: '/contact',
    seo: {
      metaTitle: 'Contact Ensis | Corporate Sales, Factory & Inquiries',
      metaDescription:
        'Get in touch with Ensis for equipment orders, turnkey hospital consultations, factory visits in NCR, or export inquiries.',
      metaKeywords: 'contact ensis, buy panchkarma table, ayurveda equipment sales, ensis address',
      canonicalUrl: 'https://ensis.in/contact',
      ogTitle: 'Contact Ensis | Wellness Spaces & Equipment',
      ogDescription: 'Direct phone, WhatsApp, and factory location in Mohan Nagar, Ghaziabad, NCR.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Contact Ensis Corporate Sales',
      breadcrumbName: 'Contact Us',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contact Ensis',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'hero',
        componentKey: 'contact.hero',
        name: 'Contact Hero Banner',
        enabled: true,
        eyebrow: 'Direct Support',
        title: 'Contact Us',
        subtitle: "We're here to assist with equipment, customized spaces, and technical support.",
        description:
          "<p>We're here to assist with equipment, customized spaces, and technical support. Connect with our architects and technical representatives.</p>",
        data: {
          heading: 'Contact Us',
          subtitle: "We're here to assist with equipment, customized spaces, and technical support.",
        },
      },
      {
        key: 'getInTouch',
        componentKey: 'contact.getInTouch',
        name: 'Enquiry Form & Corporate Info',
        enabled: true,
        title: 'Send Us An Equipment Inquiry',
        subtitle: 'Our technical consultants respond within 4 business hours.',
        data: {},
      },
      {
        key: 'ctaBanner',
        componentKey: 'contact.ctaBanner',
        name: 'Direct WhatsApp & Helpline Banner',
        enabled: true,
        title: 'Need Immediate Technical Assistance?',
        subtitle: 'Call or WhatsApp our factory engineering helpline: +91 9654900525',
        buttonLabel: 'Chat On WhatsApp',
        buttonHref: 'https://wa.me/919654900525',
        data: {},
      },
      {
        key: 'premiumMap',
        componentKey: 'contact.premiumMap',
        name: 'Factory & Head Office Map',
        enabled: true,
        title: 'Visit Our 50,000 Sq.Ft Manufacturing Facility',
        subtitle: '12/29, Site-II, Loni Road, Mohan Nagar, Industrial Area, Ghaziabad - 201007, NCR, India',
        data: {},
      },
    ],
  },

  // 10. ENQUIRY PAGE
  {
    configKey: 'enquiryPage',
    pageName: 'Quick Equipment Enquiry',
    slug: '/enquiry',
    seo: {
      metaTitle: 'Equipment Enquiry & Quotation | Ensis',
      metaDescription: 'Request a customized quotation for Panchkarma tables, Shirodhara units, or clinic setups.',
      metaKeywords: 'panchkarma quote, equipment enquiry, droni price, shirodhara price',
      canonicalUrl: 'https://ensis.in/enquiry',
      ogTitle: 'Request a Quote | Ensis Equipment',
      ogDescription: 'Instant quote and consultation request for hospital equipment and spa tables.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Quick Equipment Enquiry',
      breadcrumbName: 'Enquiry',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Ensis Quick Enquiry',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'hero',
        componentKey: 'enquiry.hero',
        name: 'Enquiry Hero Banner',
        enabled: true,
        eyebrow: 'Fast Response',
        title: 'Request a Custom Quotation',
        subtitle: 'Share your specifications for instant pricing, CAD layouts, and delivery timelines.',
        description:
          '<p>Share your specifications for instant pricing, CAD layouts, and delivery timelines.</p>',
        data: {},
      },
    ],
  },

  // 11. PRIVACY POLICY PAGE
  {
    configKey: 'privacyPolicyPage',
    pageName: 'Privacy Policy',
    slug: '/privacy-policy',
    seo: {
      metaTitle: 'Privacy Policy | Ensis Panchkarma & Spa Solutions',
      metaDescription: 'Information about how Ensis collects, uses, and safeguards customer data.',
      metaKeywords: 'privacy policy, ensis data protection, terms',
      canonicalUrl: 'https://ensis.in/privacy-policy',
      ogTitle: 'Privacy Policy | Ensis',
      ogDescription: 'Our commitment to protecting your personal information and privacy.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Privacy Policy',
      breadcrumbName: 'Privacy Policy',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Privacy Policy',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'privacy-content',
        componentKey: 'policy.privacy',
        name: 'Privacy Policy Document',
        enabled: true,
        title: 'Data Collection, Storage & Protection Policies',
        description:
          '<p>We collect personal information that you voluntarily provide when you contact us, fill out a form or interact with our website. Your personal data is never sold or traded.</p>',
        items: [
          {
            title: '1. Information We Collect',
            description: 'Name, email, phone number, and clinic requirements submitted through forms.',
          },
          {
            title: '2. How We Use Information',
            description: 'To process equipment orders, schedule consultations, and deliver support.',
          },
        ],
        data: {
          sections: [
            {
              id: 'information-we-collect',
              number: '01',
              title: 'Information We Collect',
              text: 'We collect personal information that you voluntarily provide when you contact us, fill out a form or interact with our website.',
            },
          ],
        },
      },
    ],
  },

  // 12. TERMS & CONDITIONS PAGE
  {
    configKey: 'termsAndConditionsPage',
    pageName: 'Terms & Conditions',
    slug: '/terms-and-conditions',
    seo: {
      metaTitle: 'Terms & Conditions | Ensis Panchkarma & Spa Solutions',
      metaDescription: 'Legal terms and conditions governing the purchase and use of Ensis equipment and services.',
      metaKeywords: 'terms and conditions, warranty terms, ensis legal',
      canonicalUrl: 'https://ensis.in/terms-and-conditions',
      ogTitle: 'Terms & Conditions | Ensis',
      ogDescription: 'Warranty, delivery, and service agreements governing all purchases.',
      ogImage: '/ensis-logo.webp',
      h1Tag: 'Terms & Conditions',
      breadcrumbName: 'Terms & Conditions',
      schemaMarkup: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Terms & Conditions',
      }),
      robotsIndex: true,
      robotsFollow: true,
      isActive: true,
    },
    sections: [
      {
        key: 'terms-content',
        componentKey: 'policy.terms',
        name: 'Terms & Conditions Document',
        enabled: true,
        title: 'Warranty, Orders & Commercial Terms',
        description:
          '<p>These Terms & Conditions govern your access to and use of the ENSIS website and all services, products, equipment, consultancy and solutions provided by ENSIS.</p>',
        items: [
          {
            title: '1. Introduction',
            description: 'By using our website or engaging our services, you agree to these terms.',
          },
          {
            title: '2. 3-Year Warranty Policy',
            description: 'All solid timber tables carry a 3-year structural guarantee against warping.',
          },
        ],
        data: {
          sections: [
            {
              id: 'introduction',
              number: '01',
              title: 'Introduction',
              text: 'These Terms & Conditions govern your access to and use of the ENSIS website and all services, products, equipment, consultancy and solutions provided by ENSIS.',
              extra: 'By using our website or engaging with our services, you agree to be bound by these Terms.',
            },
            {
              id: 'acceptance',
              number: '02',
              title: 'Acceptance of Terms',
              text: 'By accessing or using our website, submitting an enquiry, placing an order or availing any of our services, you acknowledge that you have read, understood and agreed to these Terms & Conditions.',
            },
          ],
        },
      },
    ],
  },
];

const CONFIG_KEY_TO_PAGE_SLUG: Record<string, string> = {
  landingPage: 'home',
  aboutPage: 'about',
  turnkeyPage: 'turnkey',
  consultancyPage: 'consultancy',
  solutionsPage: 'solutions',
  productsPage: 'product',
  projectsPage: 'projects',
  blogPage: 'blog',
  careersPage: 'career',
  contactPage: 'contact',
  enquiryPage: 'enquiry',
  privacyPolicyPage: 'policy',
  termsAndConditionsPage: 'policy',
};

export const seedPagesAndCms = async () => {
  let createdPages = 0;
  let updatedPages = 0;
  let syncedComponents = 0;

  const settingsPagesPayload: Record<string, any> = {
    websiteName: 'Ensis - Premium Panchkarma & Wellness Spaces',
    helplineNumber: '+91 9654900525',
    supportEmail: 'info@ensis.in',
  };

  const now = new Date().toISOString();

  for (const pageSeed of ENSIS_CMS_PAGES) {
    const pageConfig = {
      title: pageSeed.pageName,
      slug: pageSeed.slug,
      status: 'Published',
      visibility: 'Public',
      author: 'Ensis Admin',
      updatedBy: 'Admin',
      publishedAt: '2026-01-15T09:00:00.000Z',
      lastUpdated: now,
      seo: { ...pageSeed.seo },
      sections: pageSeed.sections,
    };

    settingsPagesPayload[pageSeed.configKey] = pageConfig;

    const pageDocumentPayload = {
      configKey: pageSeed.configKey,
      pageName: pageSeed.pageName,
      slug: pageSeed.slug,
      status: 'Published',
      visibility: 'Public',
      author: 'Ensis Admin',
      updatedBy: 'Admin',
      publishedAt: '2026-01-15T09:00:00.000Z',
      sections: pageSeed.sections,
      seo: {
        metaTitle: pageSeed.seo.metaTitle,
        metaDescription: pageSeed.seo.metaDescription,
        metaKeywords: pageSeed.seo.metaKeywords,
        canonical: pageSeed.seo.canonicalUrl,
        canonicalUrl: pageSeed.seo.canonicalUrl,
        ogTitle: pageSeed.seo.ogTitle,
        ogDescription: pageSeed.seo.ogDescription,
        ogImage: pageSeed.seo.ogImage,
        h1Tag: pageSeed.seo.h1Tag,
        breadcrumbName: pageSeed.seo.breadcrumbName,
        schema: pageSeed.seo.schemaMarkup,
        schemaMarkup: pageSeed.seo.schemaMarkup,
        robotsIndex: pageSeed.seo.robotsIndex,
        robotsFollow: pageSeed.seo.robotsFollow,
        isActive: pageSeed.seo.isActive,
      },
      robots: 'index, follow',
      faqs: pageSeed.faqs || [],
    };

    const existingPage = await Page.findOne({
      $or: [{ configKey: pageSeed.configKey }, { slug: pageSeed.slug }],
    });

    if (existingPage) {
      existingPage.set(pageDocumentPayload);
      await existingPage.save();
      updatedPages++;
    } else {
      await Page.create(pageDocumentPayload);
      createdPages++;
    }

    // Two-way sync to ComponentContent collection
    const pageSlug = CONFIG_KEY_TO_PAGE_SLUG[pageSeed.configKey] || pageSeed.configKey.replace(/Page$/, '').toLowerCase();
    for (let idx = 0; idx < pageSeed.sections.length; idx++) {
      const section = pageSeed.sections[idx];
      let compKey = section.componentKey || section.key;
      if (!compKey.includes('.')) {
        compKey = `${pageSlug}.${compKey}`;
      }

      const mergedData: Record<string, any> = {
        ...(section.data || {}),
        ...(section.title ? { title: section.title } : {}),
        ...(section.heading ? { heading: section.heading } : (section.title ? { heading: section.title } : {})),
        ...(section.subtitle ? { subtitle: section.subtitle } : {}),
        ...(section.description ? { description: section.description } : {}),
        ...(section.eyebrow ? { eyebrow: section.eyebrow, highlight: section.eyebrow } : {}),
        ...(section.buttonLabel ? {
          buttonLabel: section.buttonLabel,
          buttonText: section.buttonLabel,
          primaryBtnText: section.buttonLabel,
          primaryButtonText: section.buttonLabel,
        } : {}),
        ...(section.buttonHref ? {
          buttonHref: section.buttonHref,
          buttonPath: section.buttonHref,
          primaryBtnPath: section.buttonHref,
          primaryButtonHref: section.buttonHref,
        } : {}),
        ...(section.secondaryButtonLabel ? {
          secondaryButtonLabel: section.secondaryButtonLabel,
          secondaryBtnText: section.secondaryButtonLabel,
          secondaryButtonText: section.secondaryButtonLabel,
        } : {}),
        ...(section.secondaryButtonHref ? {
          secondaryButtonHref: section.secondaryButtonHref,
          secondaryBtnPath: section.secondaryButtonHref,
          secondaryButtonPath: section.secondaryButtonHref,
        } : {}),
        ...(section.image ? { image: section.image } : {}),
        ...(section.items ? { items: section.items } : {}),
      };

      await ComponentContentModel.findOneAndUpdate(
        { key: compKey },
        {
          $set: {
            key: compKey,
            label: section.name || section.title || compKey,
            page: pageSlug,
            index: idx + 1,
            isActive: section.enabled !== false,
            data: mergedData,
          },
        },
        { upsert: true, new: true }
      );
      syncedComponents++;
    }
  }

  // Upsert into Settings collection (Organic blueprint data flow)
  await Settings.findOneAndUpdate(
    { website: 'ensis' },
    {
      $set: {
        website: 'ensis',
        data: settingsPagesPayload,
      },
    },
    { upsert: true, new: true }
  );

  return { createdPages, updatedPages, totalConfigKeys: ENSIS_CMS_PAGES.length, syncedComponents };
};

const main = async () => {
  console.log('Connecting to MongoDB...');
  await connectDatabase();

  const dbName = mongoose.connection.name;
  console.log(`Connected to database: "${dbName}"`);

  const result = await seedPagesAndCms();

  console.log('\n=============================================');
  console.log(' ENSIS PAGES & CMS UNIFIED SEED SUCCESSFUL');
  console.log('=============================================');
  console.log(`  Database           : ${dbName}`);
  console.log(`  Pages Created      : ${result.createdPages}`);
  console.log(`  Pages Updated      : ${result.updatedPages}`);
  console.log(`  Settings Configs   : ${result.totalConfigKeys} pages seeded`);
  console.log(`  Synced Components  : ${result.syncedComponents} components synced`);
  console.log('=============================================\n');

  await mongoose.disconnect();
  process.exit(0);
};

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
