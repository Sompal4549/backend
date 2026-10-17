import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { ComponentContentModel } from '../models/component-content.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const ALL_PAGE_COMPONENTS = [
  // --- ABOUT PAGE ---
  {
    key: "about.hero",
    label: "About Hero Banner",
    page: "about",
    description: "Main hero banner on the About Us page.",
    index: 1,
    isActive: true,
    data: {
      title: "Building Wellness",
      heading: "ABOUT ENSIS",
      description: "<p>We design and deliver complete wellness environments — from Ayurvedic clinics and spa rooms to turnkey hospital wellness floors — combining traditional wisdom with modern engineering.</p>",
      highlight: "Spaces That Heal",
      primaryBtnText: "Get a Free Consultation",
      primaryBtnPath: "/contact",
      secondaryBtnText: "View Our Products",
      secondaryBtnPath: "/products"
    }
  },
  {
    key: "about.ourStory",
    label: "Our Story & Core Values",
    page: "about",
    description: "Company heritage, milestones, and core values.",
    index: 2,
    isActive: true,
    data: {
      heading: "Our Story",
      title: "Crafting Wellness Since 2003",
      description: "<p>ENSIS, the wellness division of Design House India Pvt. Ltd., was established in 2003 with a vision to create authentic, durable and aesthetically superior wellness solutions.</p>"
    }
  },
  {
    key: "about.industriesWeServe",
    label: "Industries We Serve",
    page: "about",
    description: "Overview of industry sectors served by Ensis.",
    index: 3,
    isActive: true,
    data: {
      title: "Industries We Serve",
      subtitle: "Tailored solutions for healthcare, hospitality, and wellness leaders."
    }
  },
  {
    key: "about.ourProducts",
    label: "Our Products Showcase",
    page: "about",
    description: "Quick preview grid of product categories on the About page.",
    index: 4,
    isActive: true,
    data: {
      title: "Our Products"
    }
  },
  {
    key: "about.ourTurnkeyProcess",
    label: "Turnkey Process",
    page: "about",
    description: "Step-by-step methodology from consultation to handover.",
    index: 5,
    isActive: true,
    data: {
      title: "Our Turnkey Process",
      subtitle: "From concept to commissioning — precision in every step."
    }
  },
  {
    key: "about.wellnessSection",
    label: "Wellness Philosophy",
    page: "about",
    description: "Detailed wellness ethos and design principles.",
    index: 6,
    isActive: true,
    data: {
      title: "Crafted With Ayurvedic Principles",
      subtitle: "Authentic woods, brass fixtures, and ergonomic excellence."
    }
  },
  {
    key: "about.aboutEnsis",
    label: "About Ensis Infrastructure",
    page: "about",
    description: "Manufacturing facility and technical capabilities.",
    index: 7,
    isActive: true,
    data: {
      title: "State-of-the-Art Manufacturing",
      subtitle: "Over 50,000 sq.ft facility in NCR dedicated to wellness manufacturing."
    }
  },
  {
    key: "about.founderVision",
    label: "Founder's Vision",
    page: "about",
    description: "Message and vision from leadership.",
    index: 8,
    isActive: true,
    data: {
      title: "Leadership & Vision",
      quote: "To make authentic Ayurvedic wellness spaces globally accessible and impeccably built."
    }
  },
  {
    key: "about.testimonials",
    label: "Client Testimonials",
    page: "about",
    description: "Partner reviews and endorsements.",
    index: 9,
    isActive: true,
    data: {}
  },
  {
    key: "about.letsBuild",
    label: "Call to Action Banner",
    page: "about",
    description: "Bottom call-to-action banner for consultation.",
    index: 10,
    isActive: true,
    data: {
      heading: "Ready to Build Your Wellness Space?",
      description: "Speak with our architects and wellness consultants today.",
      buttonText: "Schedule Consultation",
      buttonHref: "/contact"
    }
  },

  // --- TURNKEY PAGE ---
  {
    key: "turnkey.banner",
    label: "Turnkey Hero Banner",
    page: "turnkey",
    description: "Hero banner for turnkey wellness spaces.",
    index: 1,
    isActive: true,
    data: {
      title: "End-to-End Turnkey Solutions",
      subtitle: "From bare shell to fully operational Ayurvedic clinics and wellness spas.",
      primaryBtnText: "Explore Turnkey Projects",
      primaryBtnPath: "/projects-and-clients"
    }
  },
  {
    key: "turnkey.whatIsTurnkey",
    label: "What is Turnkey?",
    page: "turnkey",
    description: "Explanation of turnkey solutions and why clients choose Ensis.",
    index: 2,
    isActive: true,
    data: {}
  },
  {
    key: "turnkey.completeSolutions",
    label: "Complete Solutions Grid",
    page: "turnkey",
    description: "Architecture, MEP, equipment manufacturing, and licensing.",
    index: 3,
    isActive: true,
    data: {}
  },
  {
    key: "turnkey.facilities",
    label: "Facilities We Build",
    page: "turnkey",
    description: "Types of facilities delivered: NABH clinics, luxury resort spas, etc.",
    index: 4,
    isActive: true,
    data: {}
  },
  {
    key: "turnkey.customized",
    label: "Why Choose Turnkey with Ensis",
    page: "turnkey",
    description: "Key advantages and USPs of Ensis turnkey execution.",
    index: 5,
    isActive: true,
    data: {}
  },
  {
    key: "turnkey.featuredProjects",
    label: "Featured Turnkey Projects",
    page: "turnkey",
    description: "Gallery of completed turnkey installations.",
    index: 6,
    isActive: true,
    data: {}
  },
  {
    key: "turnkey.readyToBuild",
    label: "Turnkey CTA Banner",
    page: "turnkey",
    description: "Closing banner inviting enquiries for turnkey projects.",
    index: 7,
    isActive: true,
    data: {}
  },

  // --- CONSULTANCY PAGE ---
  {
    key: "consultancy.hero",
    label: "Consultancy Hero",
    page: "consultancy",
    description: "Hero banner for clinic & spa consultancy.",
    index: 1,
    isActive: true,
    data: {
      title: "Expert Wellness Consultancy",
      subtitle: "NABH compliance, layout optimization, equipment specification, and operational workflows."
    }
  },
  {
    key: "consultancy.features_strip",
    label: "Consultancy Stats & Features Strip",
    page: "consultancy",
    description: "Key metrics and feature badges for consultancy.",
    index: 2,
    isActive: true,
    data: {}
  },
  {
    key: "consultancy.whatWeOffer",
    label: "What We Offer",
    page: "consultancy",
    description: "Detailed consultancy offerings and packages.",
    index: 3,
    isActive: true,
    data: {}
  },
  {
    key: "consultancy.whyChooseOurProcess",
    label: "How We Work",
    page: "consultancy",
    description: "4-step structured consultancy process.",
    index: 4,
    isActive: true,
    data: {}
  },
  {
    key: "consultancy.readyToGetStarted",
    label: "Consultancy CTA",
    page: "consultancy",
    description: "Call to action for booking a consultancy session.",
    index: 5,
    isActive: true,
    data: {}
  },

  // --- CONTACT PAGE ---
  {
    key: "contact.hero",
    label: "Contact Hero Banner",
    page: "contact",
    description: "Header on contact page.",
    index: 1,
    isActive: true,
    data: {
      heading: "Contact Us",
      subtitle: "We're here to assist with equipment, customized spaces, and technical support."
    }
  },
  {
    key: "contact.getInTouch",
    label: "Enquiry Form & Info",
    page: "contact",
    description: "Interactive enquiry form and contact numbers.",
    index: 2,
    isActive: true,
    data: {}
  },
  {
    key: "contact.ctaBanner",
    label: "Contact Support Banner",
    page: "contact",
    description: "Direct WhatsApp and corporate enquiry badge.",
    index: 3,
    isActive: true,
    data: {}
  },
  {
    key: "contact.premiumMap",
    label: "Location & Factory Map",
    page: "contact",
    description: "Interactive factory & office location map.",
    index: 4,
    isActive: true,
    data: {}
  },

  // --- BLOG PAGE ---
  {
    key: "blog.hero",
    label: "Blog Hero Banner",
    page: "blog",
    description: "Hero banner on the blog insights page.",
    index: 1,
    isActive: true,
    data: {
      heading: "Ensis Wellness Insights",
      subtitle: "Articles, clinical guides, and equipment engineering trends."
    }
  },
  {
    key: "blog.allBlogs",
    label: "All Articles & Grid",
    page: "blog",
    description: "Searchable and categorised blog post cards.",
    index: 2,
    isActive: true,
    data: {}
  },
  {
    key: "blog.mediaResources",
    label: "Media & Downloadable Resources",
    page: "blog",
    description: "Downloadable catalogues, whitepapers, and spec sheets.",
    index: 3,
    isActive: true,
    data: {}
  },
  {
    key: "blog.stayInspired",
    label: "Newsletter Subscription Card",
    page: "blog",
    description: "Email newsletter signup for wellness professionals.",
    index: 4,
    isActive: true,
    data: {}
  },
  {
    key: "blog.supportWellness",
    label: "Support Wellness Banner",
    page: "blog",
    description: "Bottom support and outreach banner.",
    index: 5,
    isActive: true,
    data: {}
  },

  // --- PRODUCT / PRODUCTS PAGE ---
  {
    key: "product.hero",
    label: "Product Catalogue Hero Slider",
    page: "product",
    description: "Slider showcasing featured wellness equipment.",
    index: 1,
    isActive: true,
    data: {}
  },
  {
    key: "product.trustedBy",
    label: "Trusted Brands Strip",
    page: "product",
    description: "Hospitality and healthcare partner logos.",
    index: 2,
    isActive: true,
    data: {}
  },
  {
    key: "product.productsection",
    label: "Full Products Listing & Filter",
    page: "product",
    description: "Paginated product catalog with category sidebar and search.",
    index: 3,
    isActive: true,
    data: {}
  },
  {
    key: "product.whyChoose",
    label: "Why Choose Ensis Equipment",
    page: "product",
    description: "Features: teakwood, medical brass, ergonomic design.",
    index: 4,
    isActive: true,
    data: {}
  },
  {
    key: "product.testimonials",
    label: "Product Testimonials",
    page: "product",
    description: "Practitioner and clinic owner feedback.",
    index: 5,
    isActive: true,
    data: {}
  },

  // --- PROJECTS & CLIENTS PAGE ---
  {
    key: "projects.banner",
    label: "Projects Hero Banner",
    page: "projects",
    description: "Hero banner celebrating installations across India and globally.",
    index: 1,
    isActive: true,
    data: {
      title: "Our Projects & Esteemed Clients",
      subtitle: "Showcasing world-class Ayurvedic spaces crafted with precision."
    }
  },
  {
    key: "projects.ourProjects",
    label: "Featured Installation Gallery",
    page: "projects",
    description: "Gallery of completed clinic and resort setups.",
    index: 2,
    isActive: true,
    data: {}
  },
  {
    key: "projects.ourClients",
    label: "Our Client Network",
    page: "projects",
    description: "Logos and client testimonials.",
    index: 3,
    isActive: true,
    data: {}
  },
  {
    key: "projects.whyPartner",
    label: "Why Partner With Ensis",
    page: "projects",
    description: "Long-term warranty, turnkey capabilities, and after-sales support.",
    index: 4,
    isActive: true,
    data: {}
  },
  {
    key: "projects.contactSection",
    label: "Project Consultation CTA",
    page: "projects",
    description: "Enquiry banner for new hospital and resort installations.",
    index: 5,
    isActive: true,
    data: {}
  },

  // --- CAREER PAGE ---
  {
    key: "career.banner",
    label: "Careers Hero Banner",
    page: "career",
    description: "Hero banner inviting talent to join the Ensis manufacturing & design team.",
    index: 1,
    isActive: true,
    data: {
      title: "Build the Future of Wellness With Us",
      subtitle: "Join our passionate team of woodworkers, designers, engineers, and consultants."
    }
  },
  {
    key: "career.features",
    label: "Career Highlights & Culture",
    page: "career",
    description: "Core workplace statistics and team achievements.",
    index: 2,
    isActive: true,
    data: {}
  },
  {
    key: "career.whyWork",
    label: "Why Work at Ensis",
    page: "career",
    description: "Growth opportunities, creative freedom, and work-life balance.",
    index: 3,
    isActive: true,
    data: {}
  },
  {
    key: "career.section",
    label: "Open Job Positions",
    page: "career",
    description: "Listing of available roles with application form.",
    index: 4,
    isActive: true,
    data: {}
  },
  {
    key: "career.benefits",
    label: "Employee Benefits & Perks",
    page: "career",
    description: "Healthcare, training, skill building, and performance bonuses.",
    index: 5,
    isActive: true,
    data: {}
  },
  {
    key: "career.talentCommunity",
    label: "Join Our Talent Community",
    page: "career",
    description: "Resume upload form for future opportunities.",
    index: 6,
    isActive: true,
    data: {}
  },
  {
    key: "career.testimonials",
    label: "Team Member Testimonials",
    page: "career",
    description: "What our craftsmen and designers say about working at Ensis.",
    index: 7,
    isActive: true,
    data: {}
  }
];

async function seed() {
  console.log("Connecting to MongoDB...");
  await connectDatabase();

  let created = 0;
  let updated = 0;

  for (const item of ALL_PAGE_COMPONENTS) {
    const existing = await ComponentContentModel.findOne({ key: item.key });
    if (existing) {
      existing.label = item.label;
      existing.page = item.page;
      existing.description = item.description;
      existing.index = item.index ?? existing.index;
      existing.isActive = item.isActive;
      // Merge data so we preserve any customizations
      existing.data = { ...item.data, ...existing.data };
      await existing.save();
      updated++;
    } else {
      await ComponentContentModel.create(item);
      created++;
    }
  }

  const total = await ComponentContentModel.countDocuments();
  console.log(`\nPAGE COMPONENTS SEED COMPLETE:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total Components in DB: ${total}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
