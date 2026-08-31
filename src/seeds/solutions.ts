import mongoose from "mongoose";
import dotenv from "dotenv";
import { SolutionModel } from "../models/solution.model";
import { config } from "../config/app.config";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI_MAIN || process.env.MONGO_URI || config.mongoUri || "mongodb://localhost:27017/ensis";

const PLACEHOLDER_IMG = "https://res.cloudinary.com/ddjhixcwh/image/upload/v1782902339/ensis/isou1qrftguelpicwcnh.webp";

const solutions = [
  {
    title: "Ayurveda Hospital Setup",
    slug: "ayurveda-hospital-setup",
    isActive: true,
    isFeatured: true,
    orderBy: 1,
    viewCount: 0,
    robots: "index, follow",
    hero: {
      eyebrow: "AYURVEDA HOSPITAL SETUP",
      heading: ["Where Ayurveda Meets", "The Art Of Healing."],
      description: "From concept and space planning to interiors, equipment and operational readiness, ENSIS creates thoughtfully planned Ayurveda hospitals that bring traditional healing practices into contemporary healthcare environments.",
      primaryCta: { text: "DISCUSS YOUR PROJECT", url: "/contact" },
      secondaryCta: { text: "EXPLORE OUR APPROACH", url: "#approach" },
      image: PLACEHOLDER_IMG,
      imageAlt: "ENSIS Ayurveda Hospital",
    },
    stats: [
      { icon: "Leaf", top: "20+", text: "YEARS EXPERIENCE" },
      { icon: "Flower2", top: "COMPLETE", text: "SETUP SOLUTIONS" },
      { icon: "LayoutGrid", top: "DESIGN +", text: "CONSULTANCY" },
      { icon: "HandHeart", top: "EQUIPMENT +", text: "SUPPORT" },
    ],
    approach: {
      eyebrow: "THE ENSIS APPROACH",
      heading: "A Hospital Designed Around Healing.",
      description: "An Ayurveda hospital requires more than rooms and equipment. Every space must support the patient journey, therapeutic practices, clinical functionality, staff movement and the philosophy of Ayurveda. ENSIS brings together spatial planning, interior design, Ayurveda-specific equipment, operational understanding and project support to create complete environments built around healing.",
      image: PLACEHOLDER_IMG,
      imageAlt: "Ayurveda hospital interior",
    },
    spaces: {
      eyebrow: "COMPLETE HOSPITAL INTEGRATION",
      heading: "EVERY ELEMENT. PERFECTLY ALIGNED.",
      description: "We integrate design, equipment and wellness solutions to create seamless Ayurveda hospital environments.",
      items: [
        { title: "SPA & THERAPY EQUIPMENT", text: "Premium Ayurvedic and international equipment for every therapy.", icon: "BedDouble" },
        { title: "INTERIORS & FURNITURE", text: "Bespoke furniture and interiors that reflect nature and luxury.", icon: "Frame" },
        { title: "LIGHTING DESIGN", text: "Ambient lighting that enhances mood, comfort and healing.", icon: "Lamp" },
        { title: "MATERIALS & FINISHES", text: "Natural, sustainable materials that create warmth and harmony.", icon: "Flower2" },
        { title: "WET AREA SOLUTIONS", text: "Steam, sauna, Jacuzzi and hydrotherapy spaces designed to perfection.", icon: "Droplets" },
        { title: "UTILITY & BACK END", text: "Smart utility planning for smooth operations and guest comfort.", icon: "Settings" },
      ],
    },
    services: [
      { title: "CONSULTANCY & FEASIBILITY", text: "Market study, concept development and strategic planning.", icon: "ClipboardCheck" },
      { title: "ARCHITECTURE & SPACE PLANNING", text: "Functional layouts that align with Ayurveda principles.", icon: "LayoutGrid" },
      { title: "INTERIOR DESIGN", text: "Natural materials, soothing aesthetics and patient-centric design.", icon: "Sparkles" },
      { title: "EQUIPMENT & FURNITURE", text: "Ayurveda specific equipment and custom furniture.", icon: "BedDouble" },
      { title: "OPERATIONAL PLANNING", text: "SOPs, workflow, staff planning and process design.", icon: "Settings" },
      { title: "PROJECT EXECUTION", text: "Turnkey execution with quality, timeline and cost control.", icon: "HardHat" },
      { title: "TRAINING & SUPPORT", text: "Training, hand-holding and post-launch support.", icon: "HandHeart" },
    ],
    process: [
      { number: "01", title: "DISCOVER", text: "Understanding your vision, goals and requirements." },
      { number: "02", title: "PLAN", text: "Space planning, concept development and feasibility." },
      { number: "03", title: "DESIGN", text: "Architectural and interior design with details." },
      { number: "04", title: "EQUIP", text: "Selection and supply of equipment and furniture." },
      { number: "05", title: "EXECUTE", text: "Project execution with precision and transparency." },
      { number: "06", title: "LAUNCH & SUPPORT", text: "Operational readiness and continuous support." },
    ],
    cta: {
      eyebrow: "LET'S BUILD A HEALING SPACE TOGETHER",
      heading: ["Inspired Spaces.", "Lasting Impact."],
      description: "Partner with ENSIS to create an Ayurveda hospital that heals, inspires and stands the test of time.",
      buttonText: "DISCUSS YOUR HOSPITAL PROJECT",
      image: PLACEHOLDER_IMG,
      imageAlt: "Ayurveda healing space",
    },
    seo: {
      metaTitle: "Ayurveda Hospital Setup | ENSIS Wellness",
      metaDescription: "End-to-end Ayurveda hospital setup by ENSIS. From concept to complete healing environment.",
      metaKeywords: "ayurveda hospital setup, hospital design, wellness hospital",
      canonical: "https://ensis.in/solutions/ayurveda-hospital-setup",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Panchkarma Clinic Setup",
    slug: "panchkarma-clinic-setup",
    isActive: true,
    isFeatured: true,
    orderBy: 2,
    viewCount: 0,
    robots: "index, follow",
    hero: {
      eyebrow: "PANCHKARMA CLINIC SETUP",
      heading: ["Where Traditional Healing", "Meets Modern Clinic Design."],
      description: "From therapy room planning to equipment selection and interior design, ENSIS creates authentic Panchkarma clinics that deliver transformative healing experiences.",
      primaryCta: { text: "DISCUSS YOUR PROJECT", url: "/contact" },
      secondaryCta: { text: "EXPLORE OUR APPROACH", url: "#approach" },
      image: PLACEHOLDER_IMG,
      imageAlt: "ENSIS Panchkarma Clinic",
    },
    stats: [
      { icon: "Leaf", top: "20+", text: "YEARS EXPERIENCE" },
      { icon: "Flower2", top: "PANCHKARMA", text: "EXPERTISE" },
      { icon: "LayoutGrid", top: "CLINIC", text: "DESIGN" },
      { icon: "HandHeart", top: "EQUIPMENT +", text: "SUPPORT" },
    ],
    approach: {
      eyebrow: "THE ENSIS APPROACH",
      heading: "A Clinic Designed For Authentic Healing.",
      description: "A Panchkarma clinic requires precise spatial planning, specialized equipment, and an environment that supports detoxification and rejuvenation therapies. ENSIS brings together spatial planning, interior design, Panchkarma-specific equipment, operational understanding and project support to create complete environments built around authentic healing.",
      image: PLACEHOLDER_IMG,
      imageAlt: "Panchkarma clinic interior",
    },
    spaces: {
      eyebrow: "COMPLETE PANCHKARMA CLINIC INTEGRATION",
      heading: "EVERY ELEMENT. PERFECTLY ALIGNED.",
      description: "We integrate design, equipment and wellness solutions to create seamless Panchkarma clinic environments.",
      items: [
        { title: "THERAPY ROOMS", text: "Purpose-built rooms for authentic Panchkarma therapies.", icon: "BedDouble" },
        { title: "PRE-PROCEDURE AREA", text: "Dedicated preparation spaces for pre-therapy procedures.", icon: "ClipboardCheck" },
        { title: "POST-PROCEDURE RECOVERY", text: "Restful recovery zones designed for optimal healing.", icon: "Flower2" },
        { title: "HERB PREPARATION AREA", text: "Specialized spaces for herbal medicine preparation.", icon: "Leaf" },
        { title: "CONSULTATION ROOMS", text: "Private, calming consultation spaces for patient assessment.", icon: "Sparkles" },
        { title: "RECEPTION & WAITING", text: "Welcoming front-of-house areas that set the tone for healing.", icon: "LayoutGrid" },
      ],
    },
    services: [
      { title: "CONSULTANCY & FEASIBILITY", text: "Market study, concept development and strategic planning.", icon: "ClipboardCheck" },
      { title: "ARCHITECTURE & SPACE PLANNING", text: "Functional layouts that align with Ayurveda principles.", icon: "LayoutGrid" },
      { title: "INTERIOR DESIGN", text: "Natural materials, soothing aesthetics and patient-centric design.", icon: "Sparkles" },
      { title: "EQUIPMENT & FURNITURE", text: "Ayurveda specific equipment and custom furniture.", icon: "BedDouble" },
      { title: "OPERATIONAL PLANNING", text: "SOPs, workflow, staff planning and process design.", icon: "Settings" },
      { title: "PROJECT EXECUTION", text: "Turnkey execution with quality, timeline and cost control.", icon: "HardHat" },
      { title: "TRAINING & SUPPORT", text: "Training, hand-holding and post-launch support.", icon: "HandHeart" },
    ],
    process: [
      { number: "01", title: "DISCOVER", text: "Understanding your vision, goals and requirements." },
      { number: "02", title: "PLAN", text: "Space planning, concept development and feasibility." },
      { number: "03", title: "DESIGN", text: "Architectural and interior design with details." },
      { number: "04", title: "EQUIP", text: "Selection and supply of equipment and furniture." },
      { number: "05", title: "EXECUTE", text: "Project execution with precision and transparency." },
      { number: "06", title: "LAUNCH & SUPPORT", text: "Operational readiness and continuous support." },
    ],
    cta: {
      eyebrow: "LET'S BUILD A HEALING SPACE TOGETHER",
      heading: ["Your Vision.", "Our Expertise."],
      description: "Partner with ENSIS to create a Panchkarma clinic that heals, inspires and stands the test of time.",
      buttonText: "DISCUSS YOUR CLINIC PROJECT",
      image: PLACEHOLDER_IMG,
      imageAlt: "Panchkarma healing space",
    },
    seo: {
      metaTitle: "Panchkarma Clinic Setup | ENSIS Wellness",
      metaDescription: "Complete Panchkarma clinic setup by ENSIS. Therapy rooms, equipment and interior design.",
      metaKeywords: "panchkarma clinic setup, ayurveda clinic design",
      canonical: "https://ensis.in/solutions/panchkarma-clinic-setup",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Resort & Spa Setup",
    slug: "resort-spa-setup",
    isActive: true,
    isFeatured: true,
    orderBy: 3,
    viewCount: 0,
    robots: "index, follow",
    hero: {
      eyebrow: "RESORT & SPA SETUP",
      heading: ["Where Luxury Meets", "Wellness And Transformation."],
      description: "From hydrotherapy pool design to treatment suite planning, ENSIS creates resort spas that blend luxury hospitality with holistic wellness experiences.",
      primaryCta: { text: "DISCUSS YOUR PROJECT", url: "/contact" },
      secondaryCta: { text: "EXPLORE OUR APPROACH", url: "#approach" },
      image: PLACEHOLDER_IMG,
      imageAlt: "ENSIS Resort & Spa",
    },
    stats: [
      { icon: "Leaf", top: "20+", text: "YEARS EXPERIENCE" },
      { icon: "Droplets", top: "HYDROTHERAPY", text: "EXPERTISE" },
      { icon: "LayoutGrid", top: "LUXURY", text: "DESIGN" },
      { icon: "HandHeart", top: "FULL SERVICE", text: "WELLNESS" },
    ],
    approach: {
      eyebrow: "THE ENSIS APPROACH",
      heading: "A Resort Designed Around Wellness.",
      description: "A resort spa requires seamless integration of luxury amenities, therapeutic spaces, and operational efficiency to deliver world-class wellness experiences. ENSIS brings together spatial planning, interior design, hydrotherapy systems, equipment sourcing and project support to create complete resort environments that heal, rejuvenate and inspire.",
      image: PLACEHOLDER_IMG,
      imageAlt: "Resort spa interior",
    },
    spaces: {
      eyebrow: "COMPLETE RESORT & SPA INTEGRATION",
      heading: "EVERY ELEMENT. PERFECTLY ALIGNED.",
      description: "We integrate design, equipment and wellness solutions to create seamless resort and spa environments.",
      items: [
        { title: "HYDROTHERAPY POOLS", text: "Custom pool design for therapeutic and recreational wellness.", icon: "Droplets" },
        { title: "MASSAGE SUITES", text: "Luxurious treatment rooms for massage and body therapies.", icon: "BedDouble" },
        { title: "RELAXATION LOUNGE", text: "Tranquil spaces for post-treatment rest and rejuvenation.", icon: "Lamp" },
        { title: "STEAM & SAUNA", text: "Premium wet areas for detoxification and thermal therapy.", icon: "Flower2" },
        { title: "YOGA & MEDITATION", text: "Serene spaces designed for mindful movement and stillness.", icon: "Frame" },
        { title: "RETAIL & RECEPTION", text: "Elegant front-of-house areas that set the tone for luxury.", icon: "Sparkles" },
      ],
    },
    services: [
      { title: "CONSULTANCY & FEASIBILITY", text: "Market study, concept development and strategic planning.", icon: "ClipboardCheck" },
      { title: "ARCHITECTURE & SPACE PLANNING", text: "Functional layouts that align with wellness principles.", icon: "LayoutGrid" },
      { title: "INTERIOR DESIGN", text: "Luxurious aesthetics and guest-centric design.", icon: "Sparkles" },
      { title: "EQUIPMENT & FURNITURE", text: "Premium spa equipment and custom furniture.", icon: "BedDouble" },
      { title: "OPERATIONAL PLANNING", text: "SOPs, workflow, staff planning and process design.", icon: "Settings" },
      { title: "PROJECT EXECUTION", text: "Turnkey execution with quality, timeline and cost control.", icon: "HardHat" },
      { title: "TRAINING & SUPPORT", text: "Training, hand-holding and post-launch support.", icon: "HandHeart" },
    ],
    process: [
      { number: "01", title: "DISCOVER", text: "Understanding your vision, goals and requirements." },
      { number: "02", title: "PLAN", text: "Space planning, concept development and feasibility." },
      { number: "03", title: "DESIGN", text: "Architectural and interior design with details." },
      { number: "04", title: "EQUIP", text: "Selection and supply of equipment and furniture." },
      { number: "05", title: "EXECUTE", text: "Project execution with precision and transparency." },
      { number: "06", title: "LAUNCH & SUPPORT", text: "Operational readiness and continuous support." },
    ],
    cta: {
      eyebrow: "LET'S BUILD A WELLNESS DESTINATION TOGETHER",
      heading: ["Luxury Spaces.", "Wellness Redefined."],
      description: "Partner with ENSIS to create a resort spa that delivers unforgettable wellness experiences.",
      buttonText: "DISCUSS YOUR RESORT PROJECT",
      image: PLACEHOLDER_IMG,
      imageAlt: "Resort spa wellness space",
    },
    seo: {
      metaTitle: "Resort & Spa Setup | ENSIS Wellness",
      metaDescription: "Complete resort and spa setup by ENSIS. Luxury wellness environments.",
      metaKeywords: "resort spa setup, luxury spa design, wellness resort",
      canonical: "https://ensis.in/solutions/resort-spa-setup",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Wellness Retreat Design",
    slug: "wellness-retreat-design",
    isActive: true,
    isFeatured: true,
    orderBy: 4,
    viewCount: 0,
    robots: "index, follow",
    hero: {
      eyebrow: "WELLNESS RETREAT DESIGN",
      heading: ["Where Nature Meets", "Mindful Healing."],
      description: "From meditation hall design to holistic space planning, ENSIS creates wellness retreats that connect people with nature, stillness and inner balance.",
      primaryCta: { text: "DISCUSS YOUR PROJECT", url: "/contact" },
      secondaryCta: { text: "EXPLORE OUR APPROACH", url: "#approach" },
      image: PLACEHOLDER_IMG,
      imageAlt: "ENSIS Wellness Retreat",
    },
    stats: [
      { icon: "Leaf", top: "20+", text: "YEARS EXPERIENCE" },
      { icon: "Flower2", top: "NATURE", text: "INTEGRATION" },
      { icon: "LayoutGrid", top: "RETREAT", text: "DESIGN" },
      { icon: "HandHeart", top: "HOLISTIC", text: "WELLNESS" },
    ],
    approach: {
      eyebrow: "THE ENSIS APPROACH",
      heading: "A Retreat Designed Around Nature.",
      description: "A wellness retreat demands spaces that harmonize with the natural landscape while supporting meditation, yoga, detox therapies and restorative practices. ENSIS brings together sustainable design, natural materials, holistic space planning and equipment integration to create retreat environments that nurture body, mind and spirit.",
      image: PLACEHOLDER_IMG,
      imageAlt: "Wellness retreat surrounded by nature",
    },
    spaces: {
      eyebrow: "COMPLETE RETREAT INTEGRATION",
      heading: "EVERY ELEMENT. PERFECTLY ALIGNED.",
      description: "We integrate design, nature and wellness solutions to create seamless retreat environments.",
      items: [
        { title: "MEDITATION HALLS", text: "Serene spaces crafted for mindfulness and inner stillness.", icon: "Frame" },
        { title: "YOGA STUDIOS", text: "Light-filled studios designed for movement and breathwork.", icon: "LayoutGrid" },
        { title: "DETOX THERAPY ROOMS", text: "Purpose-built rooms for Ayurvedic and holistic therapies.", icon: "BedDouble" },
        { title: "HERBAL GARDENS", text: "Integrated garden spaces for fresh medicinal herbs.", icon: "Leaf" },
        { title: "EATING & NUTRITION", text: "Communal dining spaces that celebrate wholesome, sattvic cuisine.", icon: "Flower2" },
        { title: "POOL & HYDROTHERAPY", text: "Natural water features for relaxation and therapeutic benefit.", icon: "Droplets" },
      ],
    },
    services: [
      { title: "CONSULTANCY & FEASIBILITY", text: "Market study, concept development and strategic planning.", icon: "ClipboardCheck" },
      { title: "ARCHITECTURE & SPACE PLANNING", text: "Functional layouts that align with nature and wellness.", icon: "LayoutGrid" },
      { title: "INTERIOR DESIGN", text: "Natural materials, calming aesthetics and holistic design.", icon: "Sparkles" },
      { title: "EQUIPMENT & FURNITURE", text: "Retreat-specific equipment and natural furniture.", icon: "BedDouble" },
      { title: "OPERATIONAL PLANNING", text: "SOPs, workflow, staff planning and process design.", icon: "Settings" },
      { title: "PROJECT EXECUTION", text: "Turnkey execution with quality, timeline and cost control.", icon: "HardHat" },
      { title: "TRAINING & SUPPORT", text: "Training, hand-holding and post-launch support.", icon: "HandHeart" },
    ],
    process: [
      { number: "01", title: "DISCOVER", text: "Understanding your vision, goals and requirements." },
      { number: "02", title: "PLAN", text: "Space planning, concept development and feasibility." },
      { number: "03", title: "DESIGN", text: "Architectural and interior design with details." },
      { number: "04", title: "EQUIP", text: "Selection and supply of equipment and furniture." },
      { number: "05", title: "EXECUTE", text: "Project execution with precision and transparency." },
      { number: "06", title: "LAUNCH & SUPPORT", text: "Operational readiness and continuous support." },
    ],
    cta: {
      eyebrow: "LET'S CREATE A RETREAT TOGETHER",
      heading: ["Nature-Inspired.", "Soul-Restoring."],
      description: "Partner with ENSIS to create a wellness retreat that heals, inspires and reconnects with nature.",
      buttonText: "DISCUSS YOUR RETREAT PROJECT",
      image: PLACEHOLDER_IMG,
      imageAlt: "Wellness retreat healing space",
    },
    seo: {
      metaTitle: "Wellness Retreat Design | ENSIS Wellness",
      metaDescription: "Complete wellness retreat design by ENSIS. Nature-inspired healing spaces.",
      metaKeywords: "wellness retreat design, retreat planning, holistic retreat",
      canonical: "https://ensis.in/solutions/wellness-retreat-design",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Interior & Equipment Integration",
    slug: "interior-equipment-integration",
    isActive: true,
    isFeatured: true,
    orderBy: 5,
    viewCount: 0,
    robots: "index, follow",
    hero: {
      eyebrow: "INTERIOR & EQUIPMENT INTEGRATION",
      heading: ["Where Design Meets", "Functional Excellence."],
      description: "From custom furniture to Ayurveda-specific equipment sourcing, ENSIS integrates interiors and equipment to create wellness spaces that are beautiful, functional and operationally efficient.",
      primaryCta: { text: "DISCUSS YOUR PROJECT", url: "/contact" },
      secondaryCta: { text: "EXPLORE OUR APPROACH", url: "#approach" },
      image: PLACEHOLDER_IMG,
      imageAlt: "ENSIS Interior & Equipment Integration",
    },
    stats: [
      { icon: "Leaf", top: "20+", text: "YEARS EXPERIENCE" },
      { icon: "Frame", top: "CUSTOM", text: "INTERIORS" },
      { icon: "Settings", top: "EQUIPMENT", text: "SOURCING" },
      { icon: "HandHeart", top: "SEAMLESS", text: "INTEGRATION" },
    ],
    approach: {
      eyebrow: "THE ENSIS APPROACH",
      heading: "Interiors and Equipment Seamlessly Integrated.",
      description: "Wellness spaces require interiors that are not only aesthetically refined but also engineered to house specialized equipment, support therapy workflows and meet clinical standards. ENSIS combines interior design expertise with deep knowledge of Ayurveda and wellness equipment to deliver spaces where every element works in harmony for healing and efficiency.",
      image: PLACEHOLDER_IMG,
      imageAlt: "Interior design and equipment integration",
    },
    spaces: {
      eyebrow: "COMPLETE INTEGRATION SOLUTIONS",
      heading: "EVERY ELEMENT. PERFECTLY ALIGNED.",
      description: "We integrate custom interiors, premium equipment and functional design to create cohesive wellness environments.",
      items: [
        { title: "THERAPY ROOM INTERIORS", text: "Custom-designed rooms that house equipment and inspire calm.", icon: "BedDouble" },
        { title: "RECEPTION & LOBBY", text: "Welcoming spaces that reflect brand identity and warmth.", icon: "Sparkles" },
        { title: "WET AREA DESIGN", text: "Steam, sauna and hydrotherapy zones built to specification.", icon: "Droplets" },
        { title: "FURNITURE & JOINERY", text: "Bespoke furniture crafted for comfort, durability and aesthetics.", icon: "Frame" },
        { title: "LIGHTING & AMBIANCE", text: "Layered lighting systems that enhance mood and functionality.", icon: "Lamp" },
        { title: "UTILITY SYSTEMS", text: "Back-end infrastructure for seamless daily operations.", icon: "Settings" },
      ],
    },
    services: [
      { title: "CONSULTANCY & FEASIBILITY", text: "Market study, concept development and strategic planning.", icon: "ClipboardCheck" },
      { title: "ARCHITECTURE & SPACE PLANNING", text: "Functional layouts optimized for equipment placement.", icon: "LayoutGrid" },
      { title: "INTERIOR DESIGN", text: "Aesthetically refined interiors with clinical precision.", icon: "Sparkles" },
      { title: "EQUIPMENT & FURNITURE", text: "Custom furniture and specialized equipment sourcing.", icon: "BedDouble" },
      { title: "OPERATIONAL PLANNING", text: "SOPs, workflow, staff planning and process design.", icon: "Settings" },
      { title: "PROJECT EXECUTION", text: "Turnkey execution with quality, timeline and cost control.", icon: "HardHat" },
      { title: "TRAINING & SUPPORT", text: "Training, hand-holding and post-launch support.", icon: "HandHeart" },
    ],
    process: [
      { number: "01", title: "DISCOVER", text: "Understanding your vision, goals and requirements." },
      { number: "02", title: "PLAN", text: "Space planning, concept development and feasibility." },
      { number: "03", title: "DESIGN", text: "Architectural and interior design with details." },
      { number: "04", title: "EQUIP", text: "Selection and supply of equipment and furniture." },
      { number: "05", title: "EXECUTE", text: "Project execution with precision and transparency." },
      { number: "06", title: "LAUNCH & SUPPORT", text: "Operational readiness and continuous support." },
    ],
    cta: {
      eyebrow: "LET'S INTEGRATE YOUR WELLNESS SPACE",
      heading: ["Designed to Function.", "Built to Inspire."],
      description: "Partner with ENSIS to integrate interiors and equipment that create cohesive, high-performing wellness spaces.",
      buttonText: "DISCUSS YOUR PROJECT",
      image: PLACEHOLDER_IMG,
      imageAlt: "Interior and equipment integration space",
    },
    seo: {
      metaTitle: "Interior & Equipment Integration | ENSIS Wellness",
      metaDescription: "Complete interior and equipment integration by ENSIS. Functional wellness spaces.",
      metaKeywords: "interior equipment integration, wellness space design",
      canonical: "https://ensis.in/solutions/interior-equipment-integration",
      ogJson: "",
      schema: "",
    },
  },
];

async function seedSolutions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const solution of solutions) {
      await SolutionModel.findOneAndUpdate(
        { slug: solution.slug },
        { $set: solution },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`Seeded: ${solution.title}`);
    }

    console.log("All 5 solutions seeded successfully");
  } catch (error) {
    console.error("Error seeding solutions:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seedSolutions();
