import { connectDatabase } from '../config/database.config';
import { UserModel } from '../models/user.model';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { Types } from 'mongoose';

// Map a numeric ID (like 2) to a 24-character hex ObjectId
const getObjectIdForId = (id: number): Types.ObjectId => {
  const pad = '600000000000000000000000';
  const idStr = id.toString();
  const finalHex = pad.substring(0, 24 - idStr.length) + idStr;
  return new Types.ObjectId(finalHex);
};

const seed = async () => {
  await connectDatabase();

  try {
    await UserModel.collection.dropIndex('username_1');
    console.log('Successfully dropped old username_1 index');
  } catch {
    // Ignore if it doesn't exist
  }

  await UserModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await ProductModel.deleteMany({});

  const adminPassword = 'Admin1234';
  const userPassword = 'User1234';

  await UserModel.create({
    name: 'Admin User',
    email: 'admin@ecommerce.com',
    password: adminPassword,
    role: 'admin',
  });

  await UserModel.create({
    name: 'Regular User',
    email: 'user@ecommerce.com',
    password: userPassword,
    role: 'user',
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
      name: "Handcrafted Panchkarma Therapy Table",
      price: 58999,
      description: "Handcrafted Panchkarma Therapy Table is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 2,
      slug: "luxury_steam_sauna_cabin",
      categoryKey: "steam",
      name: "Luxury Steam Sauna Cabin",
      price: 120000,
      description: "Luxury Steam Sauna Cabin is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 3,
      slug: "brass_ayurvedic_bowl_set",
      categoryKey: "ayurvedic",
      name: "Brass Ayurvedic Bowl Set",
      price: 12500,
      description: "Brass Ayurvedic Bowl Set is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 4,
      slug: "wellness_aroma_oil_collection",
      categoryKey: "oils",
      name: "Wellness Aroma Oil Collection",
      price: 4800,
      description: "Wellness Aroma Oil Collection is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 5,
      slug: "spa_lounge_wooden_chair",
      categoryKey: "spa",
      name: "Spa Lounge Wooden Chair",
      price: 18000,
      description: "Spa Lounge Wooden Chair is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 6,
      slug: "shirodhara_therapy_stand",
      categoryKey: "panchkarma",
      name: "Shirodhara Therapy Stand",
      price: 24000,
      description: "Shirodhara Therapy Stand is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 7,
      slug: "brass_deepam_lamp",
      categoryKey: "decor",
      name: "Brass Deepam Lamp",
      price: 6500,
      description: "Brass Deepam Lamp is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 8,
      slug: "massage_table_with_storage",
      categoryKey: "spa",
      name: "Massage Table with Storage",
      price: 36000,
      description: "Massage Table with Storage is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 9,
      slug: "copper_jal_neti_pot",
      categoryKey: "ayurvedic",
      name: "Copper Jal Neti Pot",
      price: 2200,
      description: "Copper Jal Neti Pot is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 10,
      slug: "therapeutic_oil_set_of_6",
      categoryKey: "oils",
      name: "Therapeutic Oil Set of 6",
      price: 7200,
      description: "Therapeutic Oil Set of 6 is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 11,
      slug: "aromatherapy_diffuser",
      categoryKey: "decor",
      name: "Aromatherapy Diffuser",
      price: 3800,
      description: "Aromatherapy Diffuser is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 12,
      slug: "steam_bath_laydown",
      categoryKey: "steam",
      name: "Steam Bath Laydown",
      price: 53350,
      description: "Steam Bath Laydown is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 13,
      slug: "ceremonial_pooja_thali_set",
      categoryKey: "brass",
      name: "Ceremonial Pooja Thali Set",
      price: 5500,
      description: "Ceremonial Pooja Thali Set is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 14,
      slug: "herbal_powder_steam_cabinet",
      categoryKey: "panchkarma",
      name: "Herbal Powder Steam Cabinet",
      price: 45000,
      description: "Herbal Powder Steam Cabinet is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 15,
      slug: "teak_reception_desk",
      categoryKey: "spa",
      name: "Teak Reception Desk",
      price: 62000,
      description: "Teak Reception Desk is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 16,
      slug: "kansa_wand_facial_massager",
      categoryKey: "ayurvedic",
      name: "Kansa Wand Facial Massager",
      price: 1850,
      description: "Kansa Wand Facial Massager is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 17,
      slug: "ashwagandha_infused_body_oil",
      categoryKey: "oils",
      name: "Ashwagandha Infused Body Oil",
      price: 3200,
      description: "Ashwagandha Infused Body Oil is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 18,
      slug: "hand-painted_mandala_wall_panel",
      categoryKey: "decor",
      name: "Hand-Painted Mandala Wall Panel",
      price: 8900,
      description: "Hand-Painted Mandala Wall Panel is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 19,
      slug: "singing_bowl_with_mallet",
      categoryKey: "brass",
      name: "Singing Bowl with Mallet",
      price: 4100,
      description: "Singing Bowl with Mallet is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 20,
      slug: "compact_herbal_steam_box",
      categoryKey: "steam",
      name: "Compact Herbal Steam Box",
      price: 28000,
      description: "Compact Herbal Steam Box is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 21,
      slug: "abhyanga_drizzle_stand",
      categoryKey: "panchkarma",
      name: "Abhyanga Drizzle Stand",
      price: 19500,
      description: "Abhyanga Drizzle Stand is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 22,
      slug: "recliner_zero-gravity_chair",
      categoryKey: "spa",
      name: "Recliner Zero-Gravity Chair",
      price: 42000,
      description: "Recliner Zero-Gravity Chair is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    },
    {
      id: 23,
      slug: "marble_mortar_&_pestle",
      categoryKey: "ayurvedic",
      name: "Marble Mortar & Pestle",
      price: 3600,
      description: "Marble Mortar & Pestle is crafted for professional wellness spaces with durable materials, refined finishing, and practical day-to-day usability.",
    },
    {
      id: 24,
      slug: "bamboo_zen_water_fountain",
      categoryKey: "decor",
      name: "Bamboo Zen Water Fountain",
      price: 9200,
      description: "Bamboo Zen Water Fountain is designed for modern Ayurveda, spa, and wellness facilities with reliable construction and a premium finish.",
    }
  ];

  for (const p of wellnessProducts) {
    const categoryId = (categoriesMap as any)[p.categoryKey]._id;
    await ProductModel.create({
      _id: getObjectIdForId(p.id),
      title: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      category: categoryId,
      images: [`/uploads/${p.slug}.webp`],
      stock: 100,
      averageRating: 4.8,
      variants: [{ color: 'Natural Teak', size: 'standard', stock: 100, price: p.price }]
    });
  }

  console.log('Seed data created successfully with 24 wellness products mapped to deterministic ObjectIds.');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
