import { connectDatabase } from '../config/database.config';
import { UserModel } from '../models/user.model';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { ComponentContentModel } from '../models/component-content.model';
import { BlogModel } from '../models/blog.model';
import Page from '../models/page.model';
import { OrderModel } from '../models/order.model';
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
  await BlogModel.deleteMany({});
  await OrderModel.deleteMany({});
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

  const regularUser = await UserModel.create({
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
  console.log(`Seeding ${wellnessProducts.length} products...`);
  
  let firstProduct: any = null;

  for (const p of wellnessProducts) {
    const category = categoriesMap[p.categoryKey as keyof typeof categoriesMap];
    
    // Extract 'id' to use for ObjectId mapping
    // categoryKey is extracted but not used further as it's not in Product schema
    const { id, categoryKey: _, ...productData } = p;

    const product = await ProductModel.create({
      ...productData,
      _id: getObjectIdForId(Number(id)),
      category: category?._id,
    });

    if (!firstProduct) firstProduct = product;
  }

  // Seed a sample order for the regular user
  if (regularUser && firstProduct) {
    await OrderModel.create({
      user: regularUser._id,
      items: [{
        product: firstProduct._id,
        quantity: 1,
        price: firstProduct.price
      }],
      totalAmount: firstProduct.price,
      shippingAddress: {
        street: '123 Wellness Way',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        phone: '910000000000'
      },
      paymentStatus: 'pending',
      orderStatus: 'pending'
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

  // ─── Seed Blogs (categories: Voice of Experts, Blog, Article) ───
  const seedBlogs = [
    {
      title: "The Art of Panchakarma: Insights from 20 Years of Practice",
      slug: "art-of-panchakarma-insights",
      author: "Dr. Ananya Deshpande",
      category: "Voice of Experts",
      isActive: true,
      isFeatured: true,
      isVoiceOfExperts: true,
      isPopular: true,
      robots: "index, follow",
      blogImage: {
        image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200",
        alt: "Panchakarma therapy room with wooden massage table and brass bowls",
      },
      banner: {
        title: "The Art of Panchakarma:",
        highlight: "Insights from 20 Years of Practice",
        date: "2026-05-10",
        readingTime: "6 min read",
        category: "Voice of Experts",
        backgroundImage:
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1920",
        backgroundImageAlt: "Authentic Panchakarma therapy setup",
      },
      article: {
        content:
          "<p>Panchakarma is more than a detox protocol — it is a complete system of rejuvenation that has stood the test of time. In two decades of designing wellness spaces, I have seen how a well-executed therapy room can transform both the practitioner's precision and the patient's trust.</p><h2>Why the Space Matters</h2><p>The environment is the first medicine. Wooden tables, warm lighting, brass vessels and the gentle aroma of herbs prepare the body to receive therapy. A poorly planned room silently works against the treatment.</p><h2>The ENSIS Difference</h2><p>Every ENSIS Panchakarma table is built with drainage precision, ergonomic height and authentic Vamana positioning — because therapy outcomes depend on the smallest details.</p><p>Choose equipment that respects the tradition and your therapist will honour your patients with the care they deserve.</p>",
      },
      ctaBanner: {
        title: "Ready to Build an Authentic Panchakarma Space?",
        lotusImage: "",
        description: "Talk to our experts about designing a therapy room that heals.",
        buttonText: "BOOK A CONSULTATION",
        buttonLink: "/consultancy",
        bannerImage:
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1920",
      },
      aboutTheAuthor: {
        title: "About the Author",
        name: "Dr. Ananya Deshpande",
        description:
          "Ayurvedic physician and wellness consultant with 20+ years of experience in Panchakarma therapy and spa design.",
        socialLinks: [
          { iconImage: "", title: "LinkedIn", link: "https://linkedin.com" },
          { iconImage: "", title: "Instagram", link: "https://instagram.com" },
        ],
      },
      onThisPage: { title: "On This Page" },
      expert: {
        image:
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=600",
        name: "Dr. Ananya Deshpande",
        quote:
          "Authenticity in space design is as important as authenticity in therapy.",
        role: "Ayurvedic Physician & Wellness Consultant",
      },
      downloadMedia: {
        title: "Download the Panchakarma Room Guide",
        image: "",
        description: "A practical checklist for planning your therapy room.",
        link: "#",
      },
      newsletter: {
        lotusImage: { image: "", alt: "Lotus" },
        title: "Stay Inspired",
        description: "Get wellness insights from our experts, every month.",
        followText: "Follow us",
        followLinks: [],
      },
      seo: {
        metaTitle: "The Art of Panchakarma — Insights from ENSIS Experts",
        metaDescription:
          "Panchakarma therapy insights from a 20-year Ayurvedic practitioner: why room design, table precision and authenticity matter.",
        metaKeywords: "panchakarma, ayurveda, therapy room design, wellness",
        canonical: "https://ensis.in/blog/art-of-panchakarma-insights",
        ogJson: JSON.stringify({
          "og:type": "article",
          "og:title": "The Art of Panchakarma: Insights from 20 Years of Practice",
        }),
        schema: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "The Art of Panchakarma: Insights from 20 Years of Practice",
          author: { "@type": "Person", name: "Dr. Ananya Deshpande" },
          datePublished: "2026-05-10",
        }),
      },
    },
    {
      title: "How to Choose the Right Spa Equipment for Your Business",
      slug: "how-to-choose-spa-equipment",
      author: "ENSIS Editorial Team",
      category: "Blog",
      isActive: true,
      isFeatured: true,
      isVoiceOfExperts: false,
      isPopular: true,
      robots: "index, follow",
      blogImage: {
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200",
        alt: "Modern spa massage table in a wellness centre",
      },
      banner: {
        title: "How to Choose the Right Spa Equipment",
        highlight: "for Your Business",
        date: "2026-04-22",
        readingTime: "5 min read",
        category: "Blog",
        backgroundImage:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1920",
        backgroundImageAlt: "Spa equipment selection guide",
      },
      article: {
        content:
          "<p>Buying spa equipment is a long-term investment. The right table, steam chamber or oil warmer will serve you for years; the wrong one will drain your budget and your reputation.</p><h2>1. Know Your Therapy Menu</h2><p>List the therapies you actually plan to offer. Ayurvedic centres need Panchakarma tables with drainage; resorts may prioritise massage tables and steam cabins.</p><h2>2. Quality Over Price</h2><p>Teak and seasoned hardwood, marine-grade upholstery and rust-proof fittings cost more upfront but outperform cheap imports within a year.</p><h2>3. After-Sales Support</h2><p>Ask about spare parts, warranty and installation. ENSIS offers end-to-end support across India.</p>",
      },
      ctaBanner: {
        title: "Need Help Choosing Equipment?",
        lotusImage: "",
        description: "Our consultants will shortlist equipment for your space and budget.",
        buttonText: "TALK TO AN EXPERT",
        buttonLink: "/contact",
        bannerImage:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1920",
      },
      aboutTheAuthor: {
        title: "About the Author",
        name: "ENSIS Editorial Team",
        description:
          "The ENSIS content team shares practical guidance on wellness space planning, equipment and Ayurvedic living.",
        socialLinks: [],
      },
      onThisPage: { title: "On This Page" },
      expert: { image: "", name: "", quote: "", role: "" },
      downloadMedia: {
        title: "Equipment Selection Checklist",
        image: "",
        description: "Download our printable checklist before you buy.",
        link: "#",
      },
      newsletter: {
        lotusImage: { image: "", alt: "Lotus" },
        title: "Stay Inspired",
        description: "Practical wellness business tips, straight to your inbox.",
        followText: "Follow us",
        followLinks: [],
      },
      seo: {
        metaTitle: "How to Choose the Right Spa Equipment — ENSIS Blog",
        metaDescription:
          "A practical guide to buying spa equipment: therapy menu, material quality, budget and after-sales support.",
        metaKeywords: "spa equipment, massage table, steam cabin, ayurvedic equipment",
        canonical: "https://ensis.in/blog/how-to-choose-spa-equipment",
        ogJson: JSON.stringify({
          "og:type": "article",
          "og:title": "How to Choose the Right Spa Equipment for Your Business",
        }),
        schema: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Choose the Right Spa Equipment for Your Business",
          author: { "@type": "Organization", name: "ENSIS" },
          datePublished: "2026-04-22",
        }),
      },
    },
    {
      title: "Panchakarma Room Design Guide: Everything You Need to Know",
      slug: "panchakarma-room-design-guide",
      author: "ENSIS Editorial Team",
      category: "Article",
      isActive: true,
      isFeatured: true,
      isVoiceOfExperts: false,
      isPopular: false,
      robots: "index, follow",
      blogImage: {
        image: "https://images.unsplash.com/photo-1584544518415-82d4371f52f0?q=80&w=1200",
        alt: "Detailed Panchakarma room design with treatment table",
      },
      banner: {
        title: "Panchakarma Room Design Guide:",
        highlight: "Everything You Need to Know",
        date: "2026-03-15",
        readingTime: "8 min read",
        category: "Article",
        backgroundImage:
          "https://images.unsplash.com/photo-1584544518415-82d4371f52f0?q=80&w=1920",
        backgroundImageAlt: "Panchakarma treatment room layout",
      },
      article: {
        content:
          "<p>A Panchakarma room is a working clinical space. Its layout determines how comfortably a therapist can move, how easily a patient can be positioned and how quickly the room can be cleaned between sessions.</p><h2>Space Planning</h2><p>Plan for a minimum of 120 square feet per therapy bed. Keep 3 feet of clearance on all sides for movement and assisting.</p><h2>Plumbing & Drainage</h2><p>Vamana and Basti therapies require controlled drainage. Tables with built-in channels and floor gullies with odour traps are non-negotiable.</p><h2>Lighting & Ambience</h2><p>Warm, dimmable lighting reduces patient anxiety. Brass accents and natural wood keep the space authentic.</p><h2>Ventilation & Steam</h2><p>If the room includes a steam component, plan exhaust capacity twice your steam output.</p><p>Get our full planning checklist from the ENSIS turnkey team.</p>",
      },
      ctaBanner: {
        title: "Design Your Panchakarma Room With Us",
        lotusImage: "",
        description: "From floor plans to equipment — we deliver turnkey wellness rooms.",
        buttonText: "START YOUR PROJECT",
        buttonLink: "/enquiry",
        bannerImage:
          "https://images.unsplash.com/photo-1584544518415-82d4371f52f0?q=80&w=1920",
      },
      aboutTheAuthor: {
        title: "About the Author",
        name: "ENSIS Editorial Team",
        description:
          "ENSIS has designed 1000+ wellness rooms across India and exports worldwide.",
        socialLinks: [],
      },
      onThisPage: { title: "On This Page" },
      expert: { image: "", name: "", quote: "", role: "" },
      downloadMedia: {
        title: "Panchakarma Room Layout Blueprint",
        image: "",
        description: "A sample 2D layout with equipment placement.",
        link: "#",
      },
      newsletter: {
        lotusImage: { image: "", alt: "Lotus" },
        title: "Stay Inspired",
        description: "Room design guides and wellness trends, monthly.",
        followText: "Follow us",
        followLinks: [],
      },
      seo: {
        metaTitle: "Panchakarma Room Design Guide — ENSIS Article",
        metaDescription:
          "Complete guide to designing a Panchakarma room: space planning, drainage, lighting, ventilation and equipment.",
        metaKeywords: "panchakarma room design, therapy room layout, ayurveda clinic",
        canonical: "https://ensis.in/blog/panchakarma-room-design-guide",
        ogJson: JSON.stringify({
          "og:type": "article",
          "og:title": "Panchakarma Room Design Guide: Everything You Need to Know",
        }),
        schema: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Panchakarma Room Design Guide: Everything You Need to Know",
          author: { "@type": "Organization", name: "ENSIS" },
          datePublished: "2026-03-15",
        }),
      },
    },
    {
      title: "Steam Chamber Benefits for Detox & Relaxation Therapy",
      slug: "steam-chamber-benefits-detox",
      author: "Dr. Rajeev Kulkarni",
      category: "Voice of Experts",
      isActive: true,
      isFeatured: false,
      isVoiceOfExperts: true,
      isPopular: true,
      robots: "index, follow",
      blogImage: {
        image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200",
        alt: "Herbal steam chamber in a wellness spa",
      },
      banner: {
        title: "Steam Chamber Benefits",
        highlight: "for Detox & Relaxation Therapy",
        date: "2026-02-08",
        readingTime: "4 min read",
        category: "Voice of Experts",
        backgroundImage:
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1920",
        backgroundImageAlt: "Herbal steam therapy chamber",
      },
      article: {
        content:
          "<p>Steam therapy has been part of Ayurvedic practice for centuries. In a controlled herbal steam chamber, the body's pores open, circulation improves and muscle tension releases.</p><h2>Detoxification</h2><p>Sweating helps eliminate toxins through the skin — the body's largest organ. Herbal infusions such as eucalyptus and neem amplify the effect.</p><h2>Relaxation & Recovery</h2><p>Warm steam lowers cortisol, eases joint stiffness and prepares the body for massage or Panchakarma therapy.</p><h2>Choosing a Chamber</h2><p>Look for safe boiler separation, even heat distribution and easy-clean surfaces. ENSIS chambers are built with these principles in mind.</p>",
      },
      ctaBanner: {
        title: "Upgrade Your Spa With a Steam Chamber",
        lotusImage: "",
        description: "Explore our steam & sauna range built for professional wellness spaces.",
        buttonText: "VIEW STEAM RANGE",
        buttonLink: "/products",
        bannerImage:
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1920",
      },
      aboutTheAuthor: {
        title: "About the Author",
        name: "Dr. Rajeev Kulkarni",
        description:
          "Spa medicine consultant specialising in hydrotherapy and steam wellness protocols.",
        socialLinks: [],
      },
      onThisPage: { title: "On This Page" },
      expert: {
        image:
          "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=600",
        name: "Dr. Rajeev Kulkarni",
        quote:
          "The steam chamber is the unsung hero of every successful detox programme.",
        role: "Spa Medicine Consultant",
      },
      downloadMedia: {
        title: "Steam Therapy Guide",
        image: "",
        description: "Therapies, timings and safety protocols in one PDF.",
        link: "#",
      },
      newsletter: {
        lotusImage: { image: "", alt: "Lotus" },
        title: "Stay Inspired",
        description: "Expert views on steam, hydrotherapy and wellness design.",
        followText: "Follow us",
        followLinks: [],
      },
      seo: {
        metaTitle: "Steam Chamber Benefits for Detox & Relaxation — ENSIS",
        metaDescription:
          "Expert insights on herbal steam therapy: detox benefits, relaxation, recovery and how to choose the right chamber.",
        metaKeywords: "steam chamber, steam therapy, herbal steam, detox spa",
        canonical: "https://ensis.in/blog/steam-chamber-benefits-detox",
        ogJson: JSON.stringify({
          "og:type": "article",
          "og:title": "Steam Chamber Benefits for Detox & Relaxation Therapy",
        }),
        schema: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Steam Chamber Benefits for Detox & Relaxation Therapy",
          author: { "@type": "Person", name: "Dr. Rajeev Kulkarni" },
          datePublished: "2026-02-08",
        }),
      },
    },
  ];

  console.log(`Seeding ${seedBlogs.length} blogs...`);
  for (const blog of seedBlogs) {
    await BlogModel.create(blog);
  }

  console.log('Seed data created successfully with superadmin, 24 wellness products, pages, components, and blogs.');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
