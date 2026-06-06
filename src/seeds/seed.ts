import { connectDatabase } from '../config/database.config';
import { UserModel } from '../models/user.model';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { ComponentContentModel } from '../models/component-content.model';
import Page from '../models/page.model';
import mongoose, { Types } from 'mongoose';
import { ROLE } from '../constants/roles.constants';

// Map a numeric ID (like 2) to a 24-character hex ObjectId
const getObjectIdForId = (id: number): Types.ObjectId => {
  const pad = '600000000000000000000000';
  const idStr = id.toString();
  const finalHex = pad.substring(0, 24 - idStr.length) + idStr;
  return new Types.ObjectId(finalHex);
};

const seed = async () => {
  await connectDatabase();

  const dbName = mongoose.connection.name;
  console.log(`Connected to MongoDB. Active Database: ${dbName}`);
  if (dbName !== 'ensis') {
    console.warn('⚠️ Warning: You are not connected to the "ensis" database. Check your MONGO_URI in .env.');
  }

  try {
    const indexes = await UserModel.collection.listIndexes().toArray();
    if (indexes.some(idx => idx.name === 'username_1')) {
      await UserModel.collection.dropIndex('username_1');
      console.log('Successfully dropped old username_1 index');
    }
  } catch (err) {
    console.log('Note: UserModel index cleanup skipped (likely collection does not exist yet)');
  }

  await UserModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await ProductModel.deleteMany({});
  await ComponentContentModel.deleteMany({});
  await Page.deleteMany({});

  const adminPassword = 'Admin1234';
  const superAdminPassword = 'SuperAdmin1234';
  const userPassword = 'User1234';

  await UserModel.create({
    name: 'Admin User',
    email: 'admin@ecommerce.com',
    password: adminPassword,
    phone: '910000000001',
    role: ROLE.ADMIN,
  });

  await UserModel.create({
    name: 'Super Admin User',
    email: 'superadmin@ecommerce.com',
    password: superAdminPassword,
    phone: '910000000002',
    role: ROLE.SUPERADMIN,
  });

  await UserModel.create({
    name: 'Regular User',
    email: 'user@ecommerce.com',
    password: userPassword,
    role: ROLE.USER,
  });

  // Create wellness categories matching the frontend
  const categoriesMap = {
    panchkarma: await CategoryModel.create({ name: 'Panchkarma Equipment', slug: 'panchkarma', description: 'Ayurvedic Panchkarma therapy tables and stands' }),
    steam: await CategoryModel.create({ name: 'Steam & Sauna', slug: 'steam', description: 'Premium steam boxes and sauna cabins' }),
    ayurvedic: await CategoryModel.create({ name: 'Ayurvedic Accessories', slug: 'ayurvedic', description: 'Authentic Ayurvedic accessories and tools' }),
    oils: await CategoryModel.create({ name: 'Essential Oils', slug: 'oils', description: 'Therapeutic and essential oils' }),
    spa: await CategoryModel.create({ name: 'Spa Furniture', slug: 'spa', description: 'Spa furniture and tables' }),
    decor: await CategoryModel.create({ name: 'Wellness Decor', slug: 'decor', description: 'Aroma diffusers and wellness interior decor' }),
    brass: await CategoryModel.create({ name: 'Brass Ritual Items', slug: 'brass', description: 'Traditional brass deepam lamps and bowls' }),
  };

  const wellnessProducts = [
    {
      id: 1,
      slug: "handcrafted_panchkarma_therapy_table",
      categoryKey: "panchkarma",
      title: "Handcrafted Panchkarma Therapy Table",
      price: 58999,
      description: "Handcrafted Panchkarma Therapy Table is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 2,
      slug: "luxury_steam_sauna_cabin",
      categoryKey: "steam",
      title: "Luxury Steam Sauna Cabin",
      price: 120000,
      description: "Luxury Steam Sauna Cabin is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 3,
      slug: "brass_ayurvedic_bowl_set",
      categoryKey: "ayurvedic",
      title: "Brass Ayurvedic Bowl Set",
      price: 12500,
      description: "Brass Ayurvedic Bowl Set is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 4,
      slug: "wellness_aroma_oil_collection",
      categoryKey: "oils",
      title: "Wellness Aroma Oil Collection",
      price: 4800,
      description: "Wellness Aroma Oil Collection is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 5,
      slug: "spa_lounge_wooden_chair",
      categoryKey: "spa",
      title: "Spa Lounge Wooden Chair",
      price: 18000,
      description: "Spa Lounge Wooden Chair is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 6,
      slug: "shirodhara_therapy_stand",
      categoryKey: "panchkarma",
      title: "Shirodhara Therapy Stand",
      price: 24000,
      description: "Shirodhara Therapy Stand is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 7,
      slug: "brass_deepam_lamp",
      categoryKey: "decor",
      title: "Brass Deepam Lamp",
      price: 6500,
      description: "Brass Deepam Lamp is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 8,
      slug: "massage_table_with_storage",
      categoryKey: "spa",
      title: "Massage Table with Storage",
      price: 36000,
      description: "Massage Table with Storage is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 9,
      slug: "copper_jal_neti_pot",
      categoryKey: "ayurvedic",
      title: "Copper Jal Neti Pot",
      price: 2200,
      description: "Copper Jal Neti Pot is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 10,
      slug: "therapeutic_oil_set_of_6",
      categoryKey: "oils",
      title: "Therapeutic Oil Set of 6",
      price: 7200,
      description: "Therapeutic Oil Set of 6 is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 11,
      slug: "aromatherapy_diffuser",
      categoryKey: "decor",
      title: "Aromatherapy Diffuser",
      price: 3800,
      description: "Aromatherapy Diffuser is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 12,
      slug: "steam_bath_laydown",
      categoryKey: "steam",
      title: "Steam Bath Laydown",
      price: 53350,
      description: "Steam Bath Laydown is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 13,
      slug: "ceremonial_pooja_thali_set",
      categoryKey: "brass",
      title: "Ceremonial Pooja Thali Set",
      price: 5500,
      description: "Ceremonial Pooja Thali Set is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 14,
      slug: "herbal_powder_steam_cabinet",
      categoryKey: "panchkarma",
      title: "Herbal Powder Steam Cabinet",
      price: 45000,
      description: "Herbal Powder Steam Cabinet is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 15,
      slug: "teak_reception_desk",
      categoryKey: "spa",
      title: "Teak Reception Desk",
      price: 62000,
      description: "Teak Reception Desk is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 16,
      slug: "kansa_wand_facial_massager",
      categoryKey: "ayurvedic",
      title: "Kansa Wand Facial Massager",
      price: 1850,
      description: "Kansa Wand Facial Massager is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 17,
      slug: "ashwagandha_infused_body_oil",
      categoryKey: "oils",
      title: "Ashwagandha Infused Body Oil",
      price: 3200,
      description: "Ashwagandha Infused Body Oil is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 18,
      slug: "hand-painted_mandala_wall_panel",
      categoryKey: "decor",
      title: "Hand-Painted Mandala Wall Panel",
      price: 8900,
      description: "Hand-Painted Mandala Wall Panel is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 19,
      slug: "singing_bowl_with_mallet",
      categoryKey: "brass",
      title: "Singing Bowl with Mallet",
      price: 4100,
      description: "Singing Bowl with Mallet is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 20,
      slug: "compact_herbal_steam_box",
      categoryKey: "steam",
      title: "Compact Herbal Steam Box",
      price: 28000,
      description: "Compact Herbal Steam Box is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 21,
      slug: "abhyanga_drizzle_stand",
      categoryKey: "panchkarma",
      title: "Abhyanga Drizzle Stand",
      price: 19500,
      description: "Abhyanga Drizzle Stand is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 22,
      slug: "recliner_zero-gravity_chair",
      categoryKey: "spa",
      title: "Recliner Zero-Gravity Chair",
      price: 42000,
      description: "Recliner Zero-Gravity Chair is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 23,
      slug: "marble_mortar_&_pestle",
      categoryKey: "ayurvedic",
      title: "Marble Mortar & Pestle",
      price: 3600,
      description: "Marble Mortar & Pestle is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 24,
      slug: "bamboo_zen_water_fountain",
      categoryKey: "decor",
      title: "Bamboo Zen Water Fountain",
      price: 9200,
      description: "Bamboo Zen Water Fountain is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    }
  ];

  // Seed Page SEO data
  const seoPages = [
    {
      pageName: "Home Page",
      slug: "/",
      seo: {
        metaTitle: "Ensis - Premium Panchkarma & Wellness Spaces",
        metaDescription: "Leading manufacturer of Ayurvedic, Spa & Wellness equipments. Crafting premium solutions for a healthier & better tomorrow.",
        metaKeywords: "Panchkarma, Spa Equipment, Wellness Setup, Ayurvedic Tables, Sauna Cabin",
        h1: "Where Tradition Meets Transformative Wellness",
        ogTitle: "Ensis - Premium Panchkarma & Wellness Spaces",
        ogDescription: "Leading manufacturer of Ayurvedic, Spa & Wellness equipments. Crafting premium solutions.",
        ogImage: "/uploads/welcome_to_ensis.webp"
      }
    },
    {
      pageName: "About Us",
      slug: "about",
      seo: {
        metaTitle: "About Us - Ensis Wellness",
        metaDescription: "Learn about Ensis, where ancient Ayurvedic wisdom meets exceptional craftsmanship.",
        metaKeywords: "About Ensis, Ayurvedic heritage, wellness manufacturing",
        h1: "About Ensis Wellness",
        ogTitle: "About Us - Ensis Wellness",
        ogDescription: "Learn about Ensis, where ancient Ayurvedic wisdom meets exceptional craftsmanship."
      }
    },
    {
      pageName: "Products",
      slug: "products",
      seo: {
        metaTitle: "Premium Wellness Equipment & Furniture - Ensis",
        metaDescription: "Explore our collection of Panchkarma tables, steam sauna cabins, shirodhara stands, and accessories.",
        metaKeywords: "Ayurvedic products, spa furniture, Panchkarma table",
        h1: "Our Wellness Collection"
      }
    },
    {
      pageName: "Turnkey Solutions",
      slug: "turnkey",
      seo: {
        metaTitle: "Turnkey Wellness Solutions - Ensis",
        metaDescription: "End-to-end setups for Panchkarma clinics, resort spas, retreat designs, and Ayurveda hospitals.",
        metaKeywords: "turnkey spa setup, clinic design, wellness retreat integration",
        h1: "Turnkey Wellness Setup Solutions"
      }
    },
    {
      pageName: "Contact Us",
      slug: "contact",
      seo: {
        metaTitle: "Contact Ensis Wellness - Inquire Today",
        metaDescription: "Get in touch with Ensis experts for inquiries, custom designs, brochures, or clinic consultation.",
        metaKeywords: "contact ensis, wellness inquiry, brochure request",
        h1: "Contact Our Experts"
      }
    },
    {
      pageName: "Blog",
      slug: "blog",
      seo: {
        metaTitle: "Insights & Wellness Knowledge Blog - Ensis",
        metaDescription: "Read the latest guides on Panchkarma room design, choosing spa equipment, steam chamber benefits, and wellness trends.",
        metaKeywords: "ayurveda blog, room design guide, spa equipment tips",
        h1: "Ensis Wellness Insights"
      }
    }
  ];

  // Actually seed the wellness products mapped to their categories
  for (const p of wellnessProducts) {
    const category = categoriesMap[p.categoryKey as keyof typeof categoriesMap];
    
    // Extract 'id' to prevent Mongoose from trying to cast the numeric value to _id
    // Also extract 'categoryKey' as it's not part of the Product schema
    const { id, categoryKey, ...productData } = p;

    await ProductModel.create({
      ...productData,
      _id: getObjectIdForId(Number(id)),
      category: category?._id,
    });
  }

  for (const pageSeo of seoPages) {
    await Page.create(pageSeo);
  }

  // Seed ComponentContent data
  const componentContents = [
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
        mfgImages: [
          "",
          "",
          ""
        ],
        projSubtitle: "OUR PROJECTS",
        projHeading: "Creating Wellness\nSpaces Worldwide",
        projDescription: "Proud to be a trusted partner for 500+ wellness projects across the globe.",
        projButtonText: "VIEW ALL PROJECTS",
        projButtonPath: "/projects",
        projImages: [
          "",
          "",
          "",
          "",
          ""
        ]
      }
    },
    {
      key: "home.globalPresence",
      label: "Home Global Presence",
      page: "home",
      description: "Global presence section text, image, and statistics.",
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
    }
  ];

  for (const componentContent of componentContents) {
    await ComponentContentModel.create(componentContent);
  }

  console.log('Seed data created successfully with superadmin, 24 wellness products, pages, and components.');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
