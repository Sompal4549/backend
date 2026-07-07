import mongoose from "mongoose";
import dotenv from "dotenv";
import { BlogModel } from "../models/blog.model";
import { config } from "../config/app.config";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI_MAIN || process.env.MONGO_URI || config.mongoUri || "mongodb://localhost:27017/ensis";

const blogs = [
  {
    title: "5 Benefits of Regular Sauna Therapy for Mind and Body",
    slug: "benefits-of-regular-sauna-therapy",
    author: "Dr. Ananya Rao",
    category: "Wellness",
    isActive: true,
    isFeatured: true,
    isVoiceOfExperts: false,
    isPopular: true,
    banner: {
      title: "5 Benefits of Regular",
      highlight: "Sauna Therapy",
      date: new Date("2026-06-01"),
      readingTime: "6 min read",
      category: "Wellness",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Wooden sauna room with warm light",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Sauna therapy session",
    },
    ctaBanner: {
      title: "Ready to bring sauna therapy home?",
      lotusImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      description: "Explore our range of premium home and commercial saunas.",
      buttonText: "Explore Saunas",
      buttonLink: "/products?category=sauna",
      bannerImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
    },
    article: {
      content: "<p>Sauna therapy has been used for centuries to promote relaxation, detoxification, and cardiovascular health. Regular sessions can help reduce muscle tension, improve circulation, and support recovery after physical activity.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Dr. Ananya Rao",
      description: "Wellness physician specializing in thermal and hydrotherapy treatments.",
      socialLinks: [
        { iconImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    expert: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      name: "Dr. Ananya Rao",
      quote: "Consistent sauna use is one of the simplest ways to support long-term cardiovascular health.",
      role: "Wellness Physician",
    },
    newsletter: {
      lotusImage: { image: "/icons/lotus.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "/icons/instagram.svg", path: "https://instagram.com" }],
    },
    downloadMedia: {
      title: "Sauna Buying Guide",
      image: "/blog/sauna-guide-cover.webp",
      description: "Download our free guide to choosing the right sauna.",
      link: "/downloads/sauna-buying-guide.pdf",
    },
    seo: {
      metaTitle: "5 Benefits of Regular Sauna Therapy | Ensis",
      metaDescription: "Discover how regular sauna therapy improves circulation, recovery, and overall wellness.",
      metaKeywords: "sauna, sauna therapy, wellness, heat therapy",
      canonical: "/blog/benefits-of-regular-sauna-therapy",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Steam Room vs Sauna: Which One Is Right for You?",
    slug: "steam-room-vs-sauna",
    author: "Rohan Malhotra",
    category: "Guides",
    isActive: true,
    isFeatured: false,
    isVoiceOfExperts: false,
    isPopular: true,
    banner: {
      title: "Steam Room vs",
      highlight: "Sauna",
      date: new Date("2026-06-04"),
      readingTime: "5 min read",
      category: "Guides",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Steam room and sauna comparison",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Steam room interior",
    },
    ctaBanner: {
      title: "Not sure which to pick?",
      lotusImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      description: "Talk to our consultants for a personalized recommendation.",
      buttonText: "Get Consultation",
      buttonLink: "/consultancy",
      bannerImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
    },
    article: {
      content: "<p>Both steam rooms and saunas offer therapeutic heat, but they work in different ways. Steam rooms use moist heat, which is gentler on the respiratory system, while saunas use dry heat for deeper muscle relaxation.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Rohan Malhotra",
      description: "Spa design consultant with 10+ years of industry experience.",
      socialLinks: [
        { iconImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    newsletter: {
      lotusImage: { image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", path: "https://instagram.com" }],
    },
    seo: {
      metaTitle: "Steam Room vs Sauna: Which Is Right for You? | Ensis",
      metaDescription: "Compare steam rooms and saunas to find the best fit for your wellness goals.",
      metaKeywords: "steam room, sauna, wellness comparison",
      canonical: "/blog/steam-room-vs-sauna",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "The Science Behind Cold Plunge Therapy",
    slug: "science-behind-cold-plunge-therapy",
    author: "Dr. Neha Kapoor",
    category: "Voice of Experts",
    isActive: true,
    isFeatured: true,
    isVoiceOfExperts: true,
    isPopular: false,
    banner: {
      title: "The Science Behind",
      highlight: "Cold Plunge Therapy",
      date: new Date("2026-06-08"),
      readingTime: "7 min read",
      category: "Voice of Experts",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Cold plunge pool",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Cold plunge therapy",
    },
    article: {
      content: "<p>Cold plunge therapy triggers a physiological stress response that, over time, may improve resilience, reduce inflammation, and support faster muscle recovery when combined with proper warm-up and rewarming protocols.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Dr. Neha Kapoor",
      description: "Sports medicine specialist focused on recovery and performance therapies.",
      socialLinks: [
        { iconImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    expert: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      name: "Dr. Neha Kapoor",
      quote: "Cold exposure, done correctly, can be a powerful tool for recovery and mental resilience.",
      role: "Sports Medicine Specialist",
    },
    newsletter: {
      lotusImage: { image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", path: "https://instagram.com" }],
    },
    seo: {
      metaTitle: "The Science Behind Cold Plunge Therapy | Ensis",
      metaDescription: "Learn how cold plunge therapy affects recovery, inflammation, and resilience.",
      metaKeywords: "cold plunge, cold therapy, recovery, wellness",
      canonical: "/blog/science-behind-cold-plunge-therapy",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "How to Design a Home Wellness Room on Any Budget",
    slug: "design-home-wellness-room-on-any-budget",
    author: "Priya Sharma",
    category: "Design",
    isActive: true,
    isFeatured: false,
    isVoiceOfExperts: false,
    isPopular: false,
    banner: {
      title: "Design a Home",
      highlight: "Wellness Room",
      date: new Date("2026-06-10"),
      readingTime: "8 min read",
      category: "Design",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Home wellness room setup",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Home wellness room",
    },
    ctaBanner: {
      title: "Build your dream wellness room",
      lotusImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      description: "Our turnkey solutions cover design to installation.",
      buttonText: "View Turnkey Solutions",
      buttonLink: "/turnkey",
      bannerImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
    },
    article: {
      content: "<p>Creating a wellness space at home doesn't require a large budget. Start with one focal element — a compact sauna, a steam shower, or a plunge tub — and build the ambiance around lighting, ventilation, and natural materials.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Priya Sharma",
      description: "Interior designer specializing in spa and wellness spaces.",
      socialLinks: [
        { iconImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", title: "Instagram", link: "https://instagram.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    newsletter: {
      lotusImage: { image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", path: "https://instagram.com" }],
    },
    downloadMedia: {
      title: "Home Wellness Room Checklist",
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      description: "A step-by-step checklist to plan your wellness room.",
      link: "/downloads/wellness-room-checklist.pdf",
    },
    seo: {
      metaTitle: "How to Design a Home Wellness Room on Any Budget | Ensis",
      metaDescription: "Practical tips to design a home wellness room, from compact saunas to full spa setups.",
      metaKeywords: "home wellness room, spa design, sauna at home",
      canonical: "/blog/design-home-wellness-room-on-any-budget",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Infrared vs Traditional Saunas: A Complete Comparison",
    slug: "infrared-vs-traditional-saunas",
    author: "Rohan Malhotra",
    category: "Guides",
    isActive: true,
    isFeatured: false,
    isVoiceOfExperts: false,
    isPopular: true,
    banner: {
      title: "Infrared vs Traditional",
      highlight: "Saunas",
      date: new Date("2026-06-13"),
      readingTime: "6 min read",
      category: "Guides",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Infrared sauna panel",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Infrared sauna",
    },
    article: {
      content: "<p>Infrared saunas heat the body directly using infrared light, allowing lower ambient temperatures compared to traditional saunas, which heat the air around you. Each has distinct benefits depending on your comfort and health goals.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Rohan Malhotra",
      description: "Spa design consultant with 10+ years of industry experience.",
      socialLinks: [
        { iconImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    newsletter: {
      lotusImage: { image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", path: "https://instagram.com" }],
    },
    seo: {
      metaTitle: "Infrared vs Traditional Saunas: A Complete Comparison | Ensis",
      metaDescription: "Compare infrared and traditional saunas to choose what fits your wellness routine.",
      metaKeywords: "infrared sauna, traditional sauna, comparison",
      canonical: "/blog/infrared-vs-traditional-saunas",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Hydrotherapy 101: Healing Power of Water-Based Treatments",
    slug: "hydrotherapy-101-healing-power-of-water",
    author: "Dr. Ananya Rao",
    category: "Wellness",
    isActive: true,
    isFeatured: false,
    isVoiceOfExperts: true,
    isPopular: false,
    banner: {
      title: "Hydrotherapy 101",
      highlight: "Healing Power of Water",
      date: new Date("2026-06-16"),
      readingTime: "6 min read",
      category: "Wellness",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Hydrotherapy jet pool",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Hydrotherapy pool",
    },
    article: {
      content: "<p>Hydrotherapy uses water in various forms and temperatures to relieve pain, improve circulation, and promote relaxation. From jet massages to contrast baths, the applications are wide-ranging and backed by decades of clinical use.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Dr. Ananya Rao",
      description: "Wellness physician specializing in thermal and hydrotherapy treatments.",
      socialLinks: [
        { iconImage: "/icons/linkedin.svg", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    expert: {
      image: "/blog/expert-ananya.webp",
      name: "Dr. Ananya Rao",
      quote: "Water-based therapies remain one of the most versatile tools in physical rehabilitation.",
      role: "Wellness Physician",
    },
    newsletter: {
      lotusImage: { image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", path: "https://instagram.com" }],
    },
    seo: {
      metaTitle: "Hydrotherapy 101: Healing Power of Water | Ensis",
      metaDescription: "Explore how hydrotherapy treatments support pain relief, circulation, and relaxation.",
      metaKeywords: "hydrotherapy, water therapy, wellness treatments",
      canonical: "/blog/hydrotherapy-101-healing-power-of-water",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Top 7 Spa Trends to Watch in 2026",
    slug: "top-spa-trends-2026",
    author: "Priya Sharma",
    category: "Trends",
    isActive: true,
    isFeatured: true,
    isVoiceOfExperts: false,
    isPopular: true,
    banner: {
      title: "Top 7 Spa Trends",
      highlight: "to Watch in 2026",
      date: new Date("2026-06-19"),
      readingTime: "5 min read",
      category: "Trends",
      backgroundImage: "/blog/spa-trends-banner.webp",
      backgroundImageAlt: "Modern spa interior",
    },
    blogImage: {
      image: "/blog/spa-trends-thumb.webp",
      alt: "Spa trends 2026",
    },
    ctaBanner: {
      title: "Bring these trends to your space",
      lotusImage: "/icons/lotus.webp",
      description: "See how our latest products align with 2026's biggest spa trends.",
      buttonText: "Browse Products",
      buttonLink: "/products",
      bannerImage: "/blog/spa-trends-cta.webp",
    },
    article: {
      content: "<p>From biophilic design to AI-personalized wellness routines, 2026 is shaping up to be a defining year for the spa industry. Here are seven trends reshaping how people experience wellness spaces.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Priya Sharma",
      description: "Interior designer specializing in spa and wellness spaces.",
      socialLinks: [
        { iconImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", title: "Instagram", link: "https://instagram.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    newsletter: {
      lotusImage: { image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", path: "https://instagram.com" }],
    },
    seo: {
      metaTitle: "Top 7 Spa Trends to Watch in 2026 | Ensis",
      metaDescription: "Discover the biggest spa and wellness trends shaping 2026.",
      metaKeywords: "spa trends, wellness trends, 2026",
      canonical: "/blog/top-spa-trends-2026",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "Why Manufacturing Quality Matters in Wellness Equipment",
    slug: "why-manufacturing-quality-matters",
    author: "Vikram Singh",
    category: "Industry Insights",
    isActive: true,
    isFeatured: false,
    isVoiceOfExperts: true,
    isPopular: false,
    banner: {
      title: "Why Manufacturing Quality",
      highlight: "Matters",
      date: new Date("2026-06-22"),
      readingTime: "7 min read",
      category: "Industry Insights",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Wellness equipment manufacturing floor",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Manufacturing quality control",
    },
    article: {
      content: "<p>Wellness equipment is used in high-moisture, high-heat environments daily. Poor manufacturing quality leads to early failures, safety risks, and costly maintenance. Understanding what separates durable equipment from the rest can save operators significant money over time.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Vikram Singh",
      description: "Head of manufacturing with two decades of experience in wellness equipment production.",
      socialLinks: [
        { iconImage: "/icons/linkedin.svg", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    expert: {
      image: "/blog/expert-vikram.webp",
      name: "Vikram Singh",
      quote: "The difference between a two-year sauna and a fifteen-year sauna comes down to materials and manufacturing discipline.",
      role: "Head of Manufacturing",
    },
    newsletter: {
      lotusImage: { image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp", path: "https://instagram.com" }],
    },
    seo: {
      metaTitle: "Why Manufacturing Quality Matters in Wellness Equipment | Ensis",
      metaDescription: "Learn why manufacturing quality is critical for durable, safe wellness equipment.",
      metaKeywords: "wellness equipment manufacturing, sauna quality, spa equipment",
      canonical: "/blog/why-manufacturing-quality-matters",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "A Beginner's Guide to Building a Commercial Spa",
    slug: "beginners-guide-building-commercial-spa",
    author: "Rohan Malhotra",
    category: "Guides",
    isActive: true,
    isFeatured: false,
    isVoiceOfExperts: false,
    isPopular: false,
    banner: {
      title: "Beginner's Guide to",
      highlight: "Building a Commercial Spa",
      date: new Date("2026-06-25"),
      readingTime: "9 min read",
      category: "Guides",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Commercial spa facility",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Commercial spa build",
    },
    ctaBanner: {
      title: "Planning a commercial spa?",
      lotusImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      description: "Our consultancy team can guide you from planning to execution.",
      buttonText: "Talk to Us",
      buttonLink: "/consultancy",
      bannerImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
    },
    article: {
      content: "<p>Building a commercial spa involves far more than choosing equipment — layout planning, plumbing, ventilation, and regulatory compliance all play a role in the final experience. Here's what first-time operators should know.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Rohan Malhotra",
      description: "Spa design consultant with 10+ years of industry experience.",
      socialLinks: [
        { iconImage: "/icons/linkedin.svg", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    newsletter: {
      lotusImage: { image: "/icons/lotus.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "/icons/instagram.svg", path: "https://instagram.com" }],
    },
    downloadMedia: {
      title: "Commercial Spa Planning Checklist",
      image: "/blog/commercial-spa-checklist-cover.webp",
      description: "A practical checklist for planning your commercial spa build.",
      link: "/downloads/commercial-spa-checklist.pdf",
    },
    seo: {
      metaTitle: "A Beginner's Guide to Building a Commercial Spa | Ensis",
      metaDescription: "Everything first-time operators need to know about building a commercial spa.",
      metaKeywords: "commercial spa, spa construction, spa planning",
      canonical: "/blog/beginners-guide-building-commercial-spa",
      ogJson: "",
      schema: "",
    },
  },
  {
    title: "The Mental Health Benefits of Regular Spa Rituals",
    slug: "mental-health-benefits-of-spa-rituals",
    author: "Dr. Neha Kapoor",
    category: "Wellness",
    isActive: true,
    isFeatured: false,
    isVoiceOfExperts: true,
    isPopular: true,
    banner: {
      title: "The Mental Health Benefits",
      highlight: "of Spa Rituals",
      date: new Date("2026-06-28"),
      readingTime: "6 min read",
      category: "Wellness",
      backgroundImage: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      backgroundImageAlt: "Relaxing spa ritual setting",
    },
    blogImage: {
      image: "https://res.cloudinary.com/dn34qdd2q/image/upload/v1782496140/ensis/dw0szds3ymbfxxznoy0k.webp",
      alt: "Spa ritual for mental wellness",
    },
    article: {
      content: "<p>Beyond physical relaxation, regular spa rituals can lower stress hormones, improve sleep quality, and create structured moments of mindfulness that support overall mental well-being.</p>",
    },
    aboutTheAuthor: {
      title: "About the Author",
      name: "Dr. Neha Kapoor",
      description: "Sports medicine specialist focused on recovery and performance therapies.",
      socialLinks: [
        { iconImage: "/icons/linkedin.svg", title: "LinkedIn", link: "https://linkedin.com" },
      ],
    },
    onThisPage: { title: "On This Page" },
    expert: {
      image: "/blog/expert-neha.webp",
      name: "Dr. Neha Kapoor",
      quote: "A consistent spa ritual can be as much a mental health practice as a physical one.",
      role: "Sports Medicine Specialist",
    },
    newsletter: {
      lotusImage: { image: "/icons/lotus.webp", alt: "Lotus icon" },
      title: "Stay in the Loop",
      description: "Get wellness insights delivered to your inbox.",
      followText: "Follow us",
      followLinks: [{ image: "/icons/instagram.svg", path: "https://instagram.com" }],
    },
    seo: {
      metaTitle: "The Mental Health Benefits of Regular Spa Rituals | Ensis",
      metaDescription: "Discover how regular spa rituals support stress reduction and mental well-being.",
      metaKeywords: "spa rituals, mental health, stress relief, wellness",
      canonical: "/blog/mental-health-benefits-of-spa-rituals",
      ogJson: "",
      schema: "",
    },
  },
];

async function seedBlogs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    for (const blog of blogs) {
      await BlogModel.findOneAndUpdate(
        { slug: blog.slug },
        { $set: blog },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✅ Seeded: ${blog.title}`);
    }

    console.log("🎉 All 10 blogs seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding blogs:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

seedBlogs();