import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { ComponentContentModel } from '../models/component-content.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const DEFAULT_COMPONENT_CONTENTS = [
  {
    key: "layout.header",
    label: "Header",
    page: "layout",
    description: "Navigation, contact details, social links, brochure URL, and login links.",
    isActive: true,
    data: {
      phone: "+91 9654900525",
      email: "info@ensis.in",
      brochureUrl: "https://ensis.in/pdf/e-broucher.pdf",
      badges: ["Exporting Worldwide", "ISO 9001:2015 Certified", "Manufactured in India"],
      navLinks: [
        { label: "Home", href: "/" },
        { label: "About Us", href: "/about" },
        { label: "Products", href: "/products" },
        { label: "Turnkey Solutions", href: "/turnkey" },
        { label: "Consultancy", href: "/consultancy" },
        { label: "Projects And Clients", href: "/projects-and-clients" },
        { label: "Blog", href: "/blog" },
        { label: "Enquiry", href: "/enquiry" },
        { label: "Contact Us", href: "/contact" }
      ],
      socialLinks: []
    }
  },
  {
    key: "layout.footer",
    label: "Footer",
    page: "layout",
    description: "Footer information: descriptions, quick links, category links, solution links, contact details, and copyright.",
    isActive: true,
    data: {
      companyDescription: "Leading manufacturer of Ayurvedic, Spa & Wellness equipments. Crafting premium solutions for a healthier & better tomorrow.",
      quickLinks: [
        { label: "Home", href: "/" },
        { label: "About Us", href: "/about" },
        { label: "Products", href: "/products" },
        { label: "Turnkey Solutions", href: "/turnkey" },
        { label: "Projects", href: "/projects" },
        { label: "Blog", href: "/blog" },
        { label: "Contact Us", href: "/contact" }
      ],
      productCategories: [
        { label: "Panchkarma Beds", href: "/products/panchkarma-beds" },
        { label: "Spa Massage Tables", href: "/products/spa-massage-tables" },
        { label: "Steam Chambers", href: "/products/steam-chambers" },
        { label: "Sauna Systems", href: "/products/sauna-systems" },
        { label: "Bronze Accessories", href: "/products/bronze-accessories" },
        { label: "Spa Furniture", href: "/products/spa-furniture" },
        { label: "Steam Generators", href: "/products/steam-generators" },
        { label: "Yoga & Wellness", href: "/products/yoga-wellness" }
      ],
      solutionLinks: [
        { label: "Panchkarma Clinic Setup", href: "/solutions/clinic" },
        { label: "Resort & Spa Setup", href: "/solutions/resort" },
        { label: "Wellness Retreat Design", href: "/solutions/retreat" },
        { label: "Ayurveda Hospital Setup", href: "/solutions/hospital" },
        { label: "Interior & Equipment Integration", href: "/solutions/integration" }
      ],
      contact: {
        address: "12/29, Site-II, Loni Road, Industrial Area, Mohan Nagar - 201007, India, Uttar Pradesh, India",
        phone: "+91 9654900525",
        email: "info@ensis.in",
        whatsappPhone: "+919654900525"
      },
      copyrightText: "Ensis Panchkarma & Spa Solutions. All Rights Reserved."
    }
  },
  {
    key: "home.hero",
    label: "Home Hero",
    page: "home",
    description: "Homepage slider text, button labels, and image paths.",
    index: 1,
    isActive: true,
    data: {
      slides: [
        {
          id: "slide-1",
          title: "Rooted in Tradition",
          highlight: "Crafted for Healing",
          description: "Authentic Panchakarma. Timeless wellness",
          image: "/uploads/welcome_to_ensis.webp",
          primaryButtonText: "EXPLORE COLLECTION",
          primaryButtonHref: "/products",
          secondaryButtonText: "BOOK DESIGN CONSULTATION",
          secondaryButtonHref: "/contact",
          listItems: ["Authentic Craftsmanship", "Export Grade Standards", "Ayurvedic Compliance"],
          showLutus: true,
          isCenter: false
        }
      ]
    }
  },
  {
    key: "home.features",
    label: "Home Feature Cards",
    page: "home",
    description: "Four feature cards shown below the home hero.",
    index: 2,
    isActive: true,
    data: {
      features: [
        { title: "In-house Manufacturing", desc: "Premium quality products crafted in our own facility", imgUrl: "" },
        { title: "Customized Solutions", desc: "Tailored equipment as per your space & requirement", imgUrl: "" },
        { title: "Export Quality Standards", desc: "International standards with strict quality control", imgUrl: "" },
        { title: "Turnkey Wellness Solutions", desc: "From concept to complete wellness setup", imgUrl: "" }
      ]
    }
  },
  {
    key: "home.fullWidthFeatures",
    label: "Full Width Features",
    page: "home",
    description: "Green banner items under hero section.",
    index: 3,
    isActive: true,
    data: {
      features: [
        { title: "Authentic Ayurveda", subtitle: "Rooted in ancient wisdom", image: "" },
        { title: "Holistic Well-being", subtitle: "For mind, body & soul", image: "" },
        { title: "Timeless Care", subtitle: "Lasting transformation", image: "" }
      ],
      buttonText: "Get In Touch",
      buttonPath: "/contact"
    }
  },
  {
    key: "home.wellnessSection",
    label: "Wellness Section",
    page: "home",
    description: "Wellness section welcome info, welcome image, and services list.",
    index: 4,
    isActive: true,
    data: {
      welcomeImage: "/uploads/welcome_to_ensis.webp",
      eyebrow: "Welcome To Ensis",
      heading: "Where Tradition Meets Transformative Wellness.",
      description: "At Ensis, we blend ancient Ayurvedic wisdom with exceptional craftsmanship to create timeless wellness solutions for modern lives.",
      buttonText: "Know More",
      buttonHref: "/about",
      services: [
        { image: "", title: "PANCHAKARMA TABLES", description: "Experience authentic therapies with comfort and precision." },
        { image: "", title: "SHIRODHARA EQUIPMENTS", description: "Precision-crafted for deep relaxation and mental clarity." },
        { image: "", title: "STEAM & SAUNA", description: "Detoxify. Rejuvenate. Restore balance naturally." },
        { image: "", title: "WELLNESS ACCESSORIES", description: "Thoughtful additions for a complete wellness journey." }
      ]
    }
  },
  {
    key: "home.productsGrid",
    label: "Products Grid",
    page: "home",
    description: "Dynamic products configuration, titles, descriptions, and manual fallback list.",
    index: 5,
    isActive: true,
    data: {
      subtitle: "OUR PRODUCTS",
      heading: "Premium Wellness Equipment",
      description: "Wide range of Ayurvedic, Spa & Wellness equipment crafted for modern wellness spaces.",
      buttonText: "VIEW ALL PRODUCTS",
      buttonPath: "/products",
      productsLimit: 8,
      products: [
        { id: "panchkarma-beds", title: "Panchkarma Beds", image: "" },
        { id: "steam-chambers", title: "Steam Chambers", image: "" },
        { id: "spa-massage-tables", title: "Spa Massage Tables", image: "" },
        { id: "sauna-systems", title: "Sauna Systems", image: "" },
        { id: "bronze-accessories", title: "Bronze Accessories", image: "" },
        { id: "spa-furniture", title: "Spa Furniture", image: "" },
        { id: "steam-generators", title: "Steam Generators", image: "" },
        { id: "yoga-wellness", title: "Yoga & Wellness", image: "" }
      ]
    }
  },
  {
    key: "home.turnkeySolutions",
    label: "Home Turnkey Solutions",
    page: "home",
    description: "Turnkey solutions section heading, CTA, background, and service cards.",
    index: 6,
    isActive: true,
    data: {
      eyebrow: "TURNKEY WELLNESS SOLUTIONS",
      heading: "From Concept to\nComplete Wellness Setup",
      description: "We provide end-to-end solutions for Panchkarma Clinics, Resorts, Hospitals & Wellness Centers.",
      buttonText: "BOOK DESIGN CONSULTATION",
      buttonHref: "/contact",
      backgroundImage: "/uploads/welcome_to_ensis.webp",
      solutions: [
        { title: "Panchkarma Clinic Setup", imgUrl: "" },
        { title: "Resort & Spa Setup", imgUrl: "" },
        { title: "Wellness Retreat Design", imgUrl: "" },
        { title: "Ayurveda Hospital Equipment", imgUrl: "" },
        { title: "Interior & Equipment Integration", imgUrl: "" }
      ]
    }
  },
  {
    key: "home.wellnessRoomSetups",
    label: "Wellness Room Setups",
    page: "home",
    description: "Room setups grid layout and grid cards configuration.",
    index: 7,
    isActive: true,
    data: {
      subtitle: "Complete Wellness Solutions",
      heading: "Complete Room Setups",
      description: "Thoughtfully designed, perfectly crafted wellness rooms that reflect the essence of Ayurveda and modern luxury.",
      buttonText: "EXPLORE ROOM SETUPS",
      buttonPath: "/products",
      rooms: [
        { title: "Panchkarma Suite Setup", image: "" },
        { title: "Shirodhara Room Setup", image: "" },
        { title: "Steam Therapy Room Setup", image: "" },
        { title: "Consultation Room Setup", image: "" }
      ]
    }
  },
  {
    key: "home.manufacturingAndProjects",
    label: "Manufacturing Excellence & Projects",
    page: "home",
    description: "Manufacturing text, features list, and grids of images for manufacturing and project sites.",
    index: 8,
    isActive: true,
    data: {
      mfgSubtitle: "MANUFACTURING EXCELLENCE",
      mfgHeading: "Crafted with Precision,\nDelivered Worldwide",
      mfgDescription: "Our advanced manufacturing facility combines traditional craftsmanship with modern technology to deliver world-class wellness equipment.",
      mfgFeatures: [
        "Premium Quality Raw Materials",
        "Skilled Artisans & Modern Machinery",
        "Multi-Level Quality Testing",
        "International Export Packing"
      ],
      mfgButtonText: "OUR MANUFACTURING",
      mfgButtonPath: "/manufacturing",
      mfgImages: ["", "", ""],
      projSubtitle: "OUR PROJECTS",
      projHeading: "Creating Wellness\nSpaces Worldwide",
      projDescription: "Proud to be a trusted partner for 500+ wellness projects across the globe.",
      projButtonText: "VIEW ALL PROJECTS",
      projButtonPath: "/projects",
      projImages: ["", "", "", "", ""]
    }
  },
  {
    key: "home.globalPresence",
    label: "Home Global Presence",
    page: "home",
    description: "Global presence section text, image, and statistics.",
    index: 9,
    isActive: true,
    data: {
      eyebrow: "GLOBAL PRESENCE",
      heading: "Trusted by Wellness\nProfessionals Worldwide",
      description: "Exporting to 25+ countries and growing stronger every day",
      image: "/uploads/welcome_to_ensis.webp",
      stats: [
        { value: "25+", label: "Countries" },
        { value: "500+", label: "Projects" },
        { value: "10+", label: "Years of Excellence" },
        { value: "100%", label: "Customer Satisfaction" }
      ]
    }
  },
  {
    key: "home.testimonials",
    label: "Home Testimonials",
    page: "home",
    description: "Testimonials title and list of customer reviews.",
    index: 10,
    isActive: true,
    data: {
      subtitle: "WHAT OUR CLIENTS SAY",
      testimonials: [
        { text: "Ensis has delivered exceptional quality Panchkarma equipment for our center. Their customization and support are outstanding.", name: "Dr. Anand Sharma", role: "Ayurveda Physician", image: "" },
        { text: "The spa setup by Ensis has elevated our resort's wellness experience to a whole new level.", name: "Neha Malhotra", role: "Wellness Resort Owner", image: "" },
        { text: "Excellent workmanship, premium finishing and on-time delivery. Highly recommended!", name: "Arjun Menon", role: "Spa Consultant", image: "" },
        { text: "Their steam chambers and massage tables are of outstanding quality. Our clients love them.", name: "Priya Nair", role: "Wellness Center Director", image: "" }
      ]
    }
  },
  {
    key: "home.blogInsights",
    label: "Home Blog Insights",
    page: "home",
    description: "Blog Insights overview titles, links, and bottom contact CTA block.",
    index: 11,
    isActive: true,
    data: {
      subtitle: "FROM THE BLOG",
      heading: "Insights & Wellness Knowledge",
      buttonText: "VIEW ALL BLOGS",
      buttonPath: "/blog",
      blogs: [
        { title: "Panchkarma Room Design Guide: Everything You Need to Know", image: "" },
        { title: "How to Choose the Right Spa Equipment for Your Business", image: "" },
        { title: "Steam Chamber Benefits for Detox & Relaxation Therapy", image: "" },
        { title: "Top 7 Ayurveda Wellness Trends in 2024", image: "" }
      ],
      ctaHeading: "Ready to Build Your Dream Wellness Space?",
      ctaDescription: "Connect with our experts for personalized consultation and premium solutions.",
      ctaButtonText: "CONTACT US TODAY",
      ctaButtonPath: "/contact",
      ctaBgImage: ""
    }
  },
  {
    key: "contact.details",
    label: "Contact Details",
    page: "contact",
    description: "Address, phone, email, business hours, and social links on the contact page.",
    isActive: true,
    data: {
      heading: "Get In Touch",
      intro: "Have a question or need assistance? We're here to help you on your wellness journey.",
      address: "12/29, Site-II, Loni Road, Industrial Area, Mohan Nagar - 201007, Ghaziabad, Uttar Pradesh, India",
      phone: "+91-9654900525",
      email: "info@ensis.in",
      hours: "Mon - Sat: 9:00 AM - 6:00 PM",
      socialLinks: []
    }
  },
  {
    key: "policy.terms",
    label: "Terms & Conditions",
    page: "policy",
    description: "Terms and conditions governing the use of the ENSIS website, products, services and business interactions.",
    isActive: true,
    data: {
      sections: [
        {
          id: "introduction",
          number: "01",
          title: "Introduction",
          text: "These Terms & Conditions govern your access to and use of the ENSIS website and all services, products, equipment, consultancy and solutions provided by ENSIS.",
          extra: "By using our website or engaging with our services, you agree to be bound by these Terms."
        },
        {
          id: "acceptance",
          number: "02",
          title: "Acceptance of Terms",
          text: "By accessing or using our website, submitting an enquiry, placing an order or availing any of our services, you acknowledge that you have read, understood and agreed to these Terms & Conditions."
        }
      ]
    }
  },
  {
    key: "policy.privacy",
    label: "Privacy Policy",
    page: "policy",
    description: "How ENSIS collects, uses, stores and protects personal information from website visitors and business partners.",
    isActive: true,
    data: {
      sections: [
        {
          id: "information-we-collect",
          number: "01",
          title: "Information We Collect",
          text: "We collect personal information that you voluntarily provide when you contact us, fill out a form or interact with our website."
        }
      ]
    }
  }
];

export const seedComponentContent = async () => {
  let created = 0;
  let updated = 0;

  for (const item of DEFAULT_COMPONENT_CONTENTS) {
    const existing = await ComponentContentModel.findOne({ key: item.key });
    if (existing) {
      existing.label = item.label;
      existing.page = item.page;
      existing.description = item.description;
      existing.index = item.index ?? existing.index;
      existing.isActive = item.isActive;
      existing.data = item.data;
      await existing.save();
      updated += 1;
    } else {
      await ComponentContentModel.create(item);
      created += 1;
    }
  }

  return { created, updated };
};

const main = async () => {
  console.log('Connecting to MongoDB for ComponentContent seeding...');
  await connectDatabase();

  const { created, updated } = await seedComponentContent();
  const total = await ComponentContentModel.countDocuments();

  console.log('\nCOMPONENT CONTENT SEED COMPLETE:');
  console.log(`  Created : ${created}`);
  console.log(`  Updated : ${updated}`);
  console.log(`  Total in DB : ${total}`);

  await mongoose.disconnect();
  process.exit(0);
};

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed to seed ComponentContent:', err);
    process.exit(1);
  });
}
