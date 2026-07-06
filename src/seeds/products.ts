import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProductModel } from '../models/product.model'; // apna actual path daal do
import { CategoryModel } from '../models/category.model'; // apna actual path daal do

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ensis';

async function getOrCreateCategory(name: string) {
  let category = await CategoryModel.findOne({ name });
  if (!category) {
    category = await CategoryModel.create({ name });
  }
  return category._id;
}

async function seedProducts() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const saunaCategoryId = await getOrCreateCategory('Sauna');
  const spaCategoryId = await getOrCreateCategory('Spa & Hydrotherapy');

  await ProductModel.deleteMany({});

  const products = [
    {
      title: 'Nordic Cedar Barrel Sauna',
      code: 'ENS-SAU-001',
      description:
        'A traditional barrel sauna crafted from premium Nordic cedar, designed to deliver an authentic deep-heat sauna experience for home or outdoor spaces.',
      shortDescription: 'Authentic cedar barrel sauna for home wellness.',
      price: 189999,
      discountPrice: 174999,
      category: saunaCategoryId,
      subcategory: 'Barrel Sauna',
      material: 'Nordic Cedar Wood',
      weight: '320 kg',
      images: [
        'https://res.cloudinary.com/ensis/image/upload/products/sauna-barrel-1.jpg',
        'https://res.cloudinary.com/ensis/image/upload/products/sauna-barrel-2.jpg',
      ],
      stock: 12,
      tags: ['sauna', 'cedar', 'outdoor', 'wellness'],
      isFeatured: true,
      overview: {
        title: 'Nordic Cedar Barrel Sauna Overview',
        description:
          'Engineered for durability and warmth retention, this barrel sauna brings a traditional Finnish experience to any backyard or wellness space.',
        overviewList: [
          'Handcrafted from premium Nordic cedar',
          'Barrel design for optimal heat circulation',
          'Insulated door with tempered glass window',
        ],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [
            { title: 'Capacity', description: '4-5 persons' },
            { title: 'Heater', description: '6kW electric heater included' },
            { title: 'Wall Thickness', description: '45mm' },
          ],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [
            {
              image: 'https://res.cloudinary.com/ensis/image/upload/products/sauna-real-1.jpg',
              imageAlt: 'Cedar barrel sauna installed in backyard',
            },
            {
              image: 'https://res.cloudinary.com/ensis/image/upload/products/sauna-real-2.jpg',
              imageAlt: 'Cedar barrel sauna interior view',
            },
          ],
        },
        productPricingFeatures: [
          { title: 'Free Installation', image: 'https://res.cloudinary.com/ensis/image/upload/icons/install.svg' },
          { title: '5 Year Warranty', image: 'https://res.cloudinary.com/ensis/image/upload/icons/warranty.svg' },
        ],
        emiOptions: true,
        customSize: true,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Weatherproof cedar exterior', 'Electric heater included', 'UV-protected glass door'],
        },
        idealFor: 'Backyard wellness retreats and home spa setups',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [
            { title: 'Length', description: '210 cm' },
            { title: 'Diameter', description: '195 cm' },
          ],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Solid Nordic cedar; wipe down with a dry cloth after each use and apply cedar oil annually.',
        },
        productSpecifications: [
          {
            highlight: 'Heating',
            title: 'Electric Heater Unit',
            image: 'https://res.cloudinary.com/ensis/image/upload/products/sauna-heater.jpg',
            specifications: [{ title: 'Power', description: '6kW' }],
          },
        ],
        whatisInclueded: ['Barrel sauna unit', 'Electric heater', 'Installation kit', 'User manual'],
        items: [
          {
            image: 'https://res.cloudinary.com/ensis/image/upload/products/sauna-bench.jpg',
            title: 'Cedar Bench',
            description: 'Ergonomically curved cedar benches for two-tier seating.',
          },
        ],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [
            { image: 'https://res.cloudinary.com/ensis/image/upload/finishes/natural-cedar.jpg', title: 'Natural Cedar' },
          ],
          sizeOptions: [{ title: '4-Person', description: 'Compact backyard fit' }],
        },
        faqs: [
          { question: 'Can this be installed outdoors?', description: 'Yes, it is fully weatherproofed for outdoor use.' },
        ],
      },
    },
    {
      title: 'Infrared Panel Sauna Cabin',
      code: 'ENS-SAU-002',
      description:
        'A compact infrared sauna cabin using low-EMF carbon panels for gentle, deep-penetrating heat therapy.',
      shortDescription: 'Compact infrared sauna for daily use.',
      price: 129999,
      category: saunaCategoryId,
      subcategory: 'Infrared Sauna',
      material: 'Hemlock Wood',
      weight: '180 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/infrared-sauna-1.jpg'],
      stock: 20,
      tags: ['infrared', 'sauna', 'indoor'],
      isFeatured: false,
      overview: {
        title: 'Infrared Panel Sauna Cabin Overview',
        description: 'Low-EMF carbon fiber panels deliver even heat distribution for effective infrared therapy sessions.',
        overviewList: ['Low-EMF carbon panels', 'Quick 10-minute heat-up time', 'Chromotherapy lighting included'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [
            { title: 'Capacity', description: '2 persons' },
            { title: 'Panel Type', description: 'Carbon Fiber' },
          ],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [
            { image: 'https://res.cloudinary.com/ensis/image/upload/products/infrared-real-1.jpg', imageAlt: 'Infrared sauna in home spa room' },
          ],
        },
        productPricingFeatures: [
          { title: 'Easy Assembly', image: 'https://res.cloudinary.com/ensis/image/upload/icons/assembly.svg' },
        ],
        emiOptions: true,
        customSize: false,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Low-EMF technology', 'Chromotherapy lighting', 'Bluetooth speakers'],
        },
        idealFor: 'Apartment and indoor personal wellness use',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [
            { title: 'Height', description: '190 cm' },
            { title: 'Width', description: '110 cm' },
          ],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Hemlock wood panels; clean interior with a damp cloth weekly.',
        },
        productSpecifications: [
          {
            highlight: 'Heating',
            title: 'Carbon Fiber Panels',
            image: 'https://res.cloudinary.com/ensis/image/upload/products/infrared-panel.jpg',
            specifications: [{ title: 'Panels', description: '6 carbon panels' }],
          },
        ],
        whatisInclueded: ['Sauna cabin', 'Control panel', 'Assembly hardware'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [{ image: 'https://res.cloudinary.com/ensis/image/upload/finishes/hemlock.jpg', title: 'Natural Hemlock' }],
          sizeOptions: [{ title: '2-Person', description: 'Fits compact rooms' }],
        },
        faqs: [{ question: 'How long to heat up?', description: 'Approximately 10 minutes to reach optimal temperature.' }],
      },
    },
    {
      title: 'Hydrotherapy Whirlpool Bathtub',
      code: 'ENS-SPA-001',
      description:
        'A freestanding acrylic whirlpool bathtub with multi-jet hydrotherapy massage for full-body relaxation.',
      shortDescription: 'Multi-jet whirlpool tub for hydrotherapy.',
      price: 249999,
      discountPrice: 229999,
      category: spaCategoryId,
      subcategory: 'Whirlpool Bathtub',
      material: 'Acrylic',
      weight: '95 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/whirlpool-1.jpg'],
      stock: 8,
      tags: ['hydrotherapy', 'bathtub', 'spa'],
      isFeatured: true,
      overview: {
        title: 'Hydrotherapy Whirlpool Bathtub Overview',
        description: 'Delivers targeted hydrotherapy massage through strategically placed adjustable jets.',
        overviewList: ['16 adjustable massage jets', 'Built-in heater maintains water temperature', 'LED chromotherapy lighting'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [
            { title: 'Jets', description: '16 jets' },
            { title: 'Capacity', description: '250 litres' },
          ],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/whirlpool-real-1.jpg', imageAlt: 'Whirlpool bathtub in modern bathroom' }],
        },
        productPricingFeatures: [
          { title: '3 Year Warranty', image: 'https://res.cloudinary.com/ensis/image/upload/icons/warranty.svg' },
        ],
        emiOptions: true,
        customSize: false,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Adjustable jet pressure', 'Built-in water heater', 'Anti-slip base'],
        },
        idealFor: 'Master bathrooms and luxury home spa setups',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [
            { title: 'Length', description: '170 cm' },
            { title: 'Width', description: '80 cm' },
          ],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'High-gloss acrylic shell; clean with a non-abrasive bathroom cleaner.',
        },
        productSpecifications: [
          {
            highlight: 'Jets',
            title: 'Massage Jet System',
            image: 'https://res.cloudinary.com/ensis/image/upload/products/whirlpool-jets.jpg',
            specifications: [{ title: 'Jet Count', description: '16' }],
          },
        ],
        whatisInclueded: ['Bathtub unit', 'Jet pump system', 'Drain kit'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [],
          sizeOptions: [{ title: 'Standard', description: '170x80 cm freestanding' }],
        },
        faqs: [{ question: 'Does it include a heater?', description: 'Yes, a built-in heater maintains water temperature throughout use.' }],
      },
    },
    {
      title: 'Outdoor Cedar Hot Tub',
      code: 'ENS-SPA-002',
      description:
        'A wood-fired cedar hot tub offering a rustic, off-grid hydrotherapy experience for outdoor spaces.',
      shortDescription: 'Wood-fired cedar hot tub for outdoor relaxation.',
      price: 159999,
      category: spaCategoryId,
      subcategory: 'Hot Tub',
      material: 'Cedar Wood',
      weight: '210 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/hottub-1.jpg'],
      stock: 6,
      tags: ['hot tub', 'outdoor', 'cedar'],
      isFeatured: false,
      overview: {
        title: 'Outdoor Cedar Hot Tub Overview',
        description: 'A wood-fired heating system paired with a cedar shell for an authentic, sustainable hot tub experience.',
        overviewList: ['Wood-fired external heater', 'Cedar wood shell', 'Insulated cover included'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [{ title: 'Capacity', description: '6 persons' }],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/hottub-real-1.jpg', imageAlt: 'Cedar hot tub in garden setting' }],
        },
        productPricingFeatures: [{ title: 'Free Delivery', image: 'https://res.cloudinary.com/ensis/image/upload/icons/delivery.svg' }],
        emiOptions: false,
        customSize: true,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Off-grid wood-fired heating', 'Durable cedar construction', 'Insulated thermal cover'],
        },
        idealFor: 'Gardens, farmhouses, and off-grid outdoor spaces',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [{ title: 'Diameter', description: '200 cm' }],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Solid cedar shell; drain and clean monthly, reapply wood sealant yearly.',
        },
        productSpecifications: [],
        whatisInclueded: ['Cedar tub shell', 'Wood-fired heater', 'Insulated cover'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [{ image: 'https://res.cloudinary.com/ensis/image/upload/finishes/cedar-natural.jpg', title: 'Natural Cedar' }],
          sizeOptions: [{ title: '6-Person', description: 'Round tub, family size' }],
        },
        faqs: [{ question: 'Does it need electricity?', description: 'No, it is heated using a wood-fired external stove.' }],
      },
    },
    {
      title: 'Traditional Finnish Sauna Room',
      code: 'ENS-SAU-003',
      description: 'A built-in style traditional Finnish sauna room using spruce wood, ideal for permanent home installations.',
      shortDescription: 'Built-in Finnish sauna room in spruce.',
      price: 279999,
      category: saunaCategoryId,
      subcategory: 'Traditional Sauna',
      material: 'Spruce Wood',
      weight: '410 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/finnish-sauna-1.jpg'],
      stock: 5,
      tags: ['sauna', 'traditional', 'spruce'],
      isFeatured: true,
      overview: {
        title: 'Traditional Finnish Sauna Room Overview',
        description: 'Modular spruce panels assemble into a permanent sauna room delivering an authentic Finnish steam experience.',
        overviewList: ['Modular spruce wall panels', 'Traditional stone sauna heater', 'Ventilated design for optimal airflow'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [{ title: 'Capacity', description: '6-8 persons' }],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/finnish-real-1.jpg', imageAlt: 'Finnish sauna room installed indoors' }],
        },
        productPricingFeatures: [{ title: 'Professional Installation', image: 'https://res.cloudinary.com/ensis/image/upload/icons/install.svg' }],
        emiOptions: true,
        customSize: true,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Modular assembly', 'Traditional stone heater', 'Tiered bench seating'],
        },
        idealFor: 'Permanent home or gym sauna installations',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [
            { title: 'Length', description: '250 cm' },
            { title: 'Width', description: '200 cm' },
          ],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Nordic spruce wood; ventilate after each use to prevent moisture buildup.',
        },
        productSpecifications: [],
        whatisInclueded: ['Wall panels', 'Stone heater', 'Bench kit', 'Door with glass panel'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [{ image: 'https://res.cloudinary.com/ensis/image/upload/finishes/spruce.jpg', title: 'Natural Spruce' }],
          sizeOptions: [{ title: '6-8 Person', description: 'Large room installation' }],
        },
        faqs: [{ question: 'Is professional installation required?', description: 'Yes, we recommend professional installation which is included with purchase.' }],
      },
    },
    {
      title: 'Portable Steam Sauna Tent',
      code: 'ENS-SAU-004',
      description: 'A lightweight, foldable steam sauna tent designed for portable personal steam therapy sessions.',
      shortDescription: 'Foldable personal steam sauna tent.',
      price: 24999,
      category: saunaCategoryId,
      subcategory: 'Portable Sauna',
      material: 'Polyester Fabric',
      weight: '8 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/steam-tent-1.jpg'],
      stock: 40,
      tags: ['portable', 'steam', 'sauna'],
      isFeatured: false,
      overview: {
        title: 'Portable Steam Sauna Tent Overview',
        description: 'A compact, easy-to-fold steam tent paired with a portable steam generator for on-demand personal steam sessions.',
        overviewList: ['Foldable frame design', 'Includes portable steam generator', 'Fits in most small rooms'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [{ title: 'Capacity', description: '1 person' }],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/steam-tent-real-1.jpg', imageAlt: 'Portable steam tent set up indoors' }],
        },
        productPricingFeatures: [{ title: 'Cash on Delivery', image: 'https://res.cloudinary.com/ensis/image/upload/icons/cod.svg' }],
        emiOptions: false,
        customSize: false,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Foldable and portable', 'Quick 5-minute setup', 'Includes seat and steam generator'],
        },
        idealFor: 'Small apartments and travel-friendly personal use',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [{ title: 'Height', description: '150 cm' }],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Water-resistant polyester; wipe dry and fold after each use.',
        },
        productSpecifications: [],
        whatisInclueded: ['Tent frame', 'Steam generator', 'Folding seat'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [],
          sizeOptions: [{ title: 'One Size', description: 'Fits most adults' }],
        },
        faqs: [{ question: 'How long does setup take?', description: 'Around 5 minutes for full setup.' }],
      },
    },
    {
      title: 'Swim Spa Hydrotherapy Pool',
      code: 'ENS-SPA-003',
      description: 'A dual-purpose swim spa combining a resistance swim current with hydrotherapy massage seating.',
      shortDescription: 'Swim spa with hydrotherapy massage seating.',
      price: 899999,
      discountPrice: 849999,
      category: spaCategoryId,
      subcategory: 'Swim Spa',
      material: 'Fiberglass Composite',
      weight: '1200 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/swimspa-1.jpg'],
      stock: 3,
      tags: ['swim spa', 'hydrotherapy', 'pool'],
      isFeatured: true,
      overview: {
        title: 'Swim Spa Hydrotherapy Pool Overview',
        description: 'Combines an adjustable current swim lane with a separate hydrotherapy massage zone in one unit.',
        overviewList: ['Adjustable resistance swim current', 'Separate hydrotherapy massage seats', 'Insulated composite shell'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [{ title: 'Capacity', description: '8 persons' }],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/swimspa-real-1.jpg', imageAlt: 'Swim spa installed in backyard deck' }],
        },
        productPricingFeatures: [{ title: 'Free Site Survey', image: 'https://res.cloudinary.com/ensis/image/upload/icons/survey.svg' }],
        emiOptions: true,
        customSize: true,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Adjustable swim current', 'Dedicated massage seating', 'Energy-efficient insulation'],
        },
        idealFor: 'Fitness-focused homeowners and dual-purpose outdoor spaces',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [
            { title: 'Length', description: '500 cm' },
            { title: 'Width', description: '220 cm' },
          ],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Fiberglass composite shell; service filtration system every 3 months.',
        },
        productSpecifications: [],
        whatisInclueded: ['Swim spa unit', 'Filtration system', 'Cover', 'Steps'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [],
          sizeOptions: [{ title: 'Standard', description: '500x220 cm' }],
        },
        faqs: [{ question: 'Can it be used for swimming and relaxation both?', description: 'Yes, it has a dedicated swim current lane and a separate massage seating zone.' }],
      },
    },
    {
      title: 'Salt Therapy Halotherapy Booth',
      code: 'ENS-SPA-004',
      description: 'A single-person halotherapy booth that disperses micronized salt particles for respiratory wellness sessions.',
      shortDescription: 'Personal halotherapy salt booth.',
      price: 349999,
      category: spaCategoryId,
      subcategory: 'Halotherapy',
      material: 'Himalayan Salt Panels',
      weight: '150 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/halotherapy-1.jpg'],
      stock: 4,
      tags: ['halotherapy', 'salt therapy', 'wellness'],
      isFeatured: false,
      overview: {
        title: 'Salt Therapy Halotherapy Booth Overview',
        description: 'Uses a halogenerator to disperse fine-grade salt particles within a Himalayan salt-panel booth.',
        overviewList: ['Halogenerator with adjustable output', 'Himalayan salt wall panels', 'Ambient LED lighting'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [{ title: 'Capacity', description: '1 person' }],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/halotherapy-real-1.jpg', imageAlt: 'Halotherapy booth in wellness studio' }],
        },
        productPricingFeatures: [{ title: 'Annual Maintenance Included', image: 'https://res.cloudinary.com/ensis/image/upload/icons/maintenance.svg' }],
        emiOptions: true,
        customSize: false,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Adjustable halogenerator output', 'Himalayan salt panel walls', 'Comfortable reclining seat'],
        },
        idealFor: 'Wellness studios and respiratory therapy centers',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [{ title: 'Height', description: '210 cm' }],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Himalayan salt panels; refill halogenerator salt chamber monthly.',
        },
        productSpecifications: [],
        whatisInclueded: ['Salt booth', 'Halogenerator', 'Reclining seat'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [],
          sizeOptions: [{ title: 'One Size', description: 'Single occupant booth' }],
        },
        faqs: [{ question: 'Is it safe for daily use?', description: 'Yes, sessions of 20-30 minutes are recommended and safe for daily use.' }],
      },
    },
    {
      title: 'Cold Plunge Ice Bath Tub',
      code: 'ENS-SPA-005',
      description: 'A stainless steel cold plunge tub with an integrated chiller for consistent cold therapy sessions.',
      shortDescription: 'Chilled cold plunge tub for recovery therapy.',
      price: 179999,
      category: spaCategoryId,
      subcategory: 'Cold Plunge',
      material: 'Stainless Steel',
      weight: '85 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/coldplunge-1.jpg'],
      stock: 10,
      tags: ['cold plunge', 'ice bath', 'recovery'],
      isFeatured: true,
      overview: {
        title: 'Cold Plunge Ice Bath Tub Overview',
        description: 'An insulated stainless steel tub paired with a built-in chiller unit for consistent sub-15°C recovery sessions.',
        overviewList: ['Integrated chiller unit', 'Insulated stainless steel body', 'Digital temperature control'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [{ title: 'Temperature Range', description: '3°C - 15°C' }],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/coldplunge-real-1.jpg', imageAlt: 'Cold plunge tub in recovery gym' }],
        },
        productPricingFeatures: [{ title: '2 Year Warranty', image: 'https://res.cloudinary.com/ensis/image/upload/icons/warranty.svg' }],
        emiOptions: true,
        customSize: false,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Built-in chiller', 'Digital temperature display', 'Antimicrobial filtration'],
        },
        idealFor: 'Athletes, gyms, and recovery-focused home setups',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [{ title: 'Length', description: '150 cm' }],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Marine-grade stainless steel; clean filtration screen weekly.',
        },
        productSpecifications: [],
        whatisInclueded: ['Cold plunge tub', 'Chiller unit', 'Filtration system'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [],
          sizeOptions: [{ title: 'Standard', description: '150 cm single occupant' }],
        },
        faqs: [{ question: 'How cold can it get?', description: 'The integrated chiller can bring water temperature down to 3°C.' }],
      },
    },
    {
      title: 'Steam Shower Enclosure Cabin',
      code: 'ENS-SPA-006',
      description: 'A glass steam shower enclosure combining a rainfall shower head with an integrated steam generator.',
      shortDescription: 'Glass steam shower cabin with rainfall head.',
      price: 219999,
      category: spaCategoryId,
      subcategory: 'Steam Shower',
      material: 'Tempered Glass & Acrylic',
      weight: '140 kg',
      images: ['https://res.cloudinary.com/ensis/image/upload/products/steamshower-1.jpg'],
      stock: 7,
      tags: ['steam shower', 'spa', 'bathroom'],
      isFeatured: false,
      overview: {
        title: 'Steam Shower Enclosure Cabin Overview',
        description: 'Combines everyday showering with on-demand steam therapy in a compact glass enclosure.',
        overviewList: ['Integrated steam generator', 'Rainfall and handheld shower heads', 'Built-in seat and shelving'],
        specifications: {
          title: 'Technical Specifications',
          specificationsList: [{ title: 'Steam Output', description: '3kW generator' }],
        },
        seeItInRealSpaces: {
          title: 'See It In Real Spaces',
          images: [{ image: 'https://res.cloudinary.com/ensis/image/upload/products/steamshower-real-1.jpg', imageAlt: 'Steam shower cabin in modern bathroom' }],
        },
        productPricingFeatures: [{ title: 'Free Installation', image: 'https://res.cloudinary.com/ensis/image/upload/icons/install.svg' }],
        emiOptions: true,
        customSize: false,
        keyFeatures: {
          title: 'Key Features',
          keyFeaturesList: ['Built-in steam generator', 'Rainfall shower head', 'Bluetooth speaker system'],
        },
        idealFor: 'Modern bathrooms wanting shower and steam in one unit',
        dimensions: {
          title: 'Dimensions',
          dimensionsList: [
            { title: 'Height', description: '220 cm' },
            { title: 'Width', description: '90 cm' },
          ],
        },
        materialAndCare: {
          title: 'Material & Care',
          description: 'Tempered glass and acrylic base; clean glass panels weekly with a squeegee.',
        },
        productSpecifications: [],
        whatisInclueded: ['Shower enclosure', 'Steam generator', 'Control panel'],
        items: [],
        smartDesignAppearance: {
          highlight: 'Design',
          title: 'Smart Design & Appearance',
          woodFinish: [],
          sizeOptions: [{ title: 'Standard', description: '90x90 cm corner fit' }],
        },
        faqs: [{ question: 'Does it need separate plumbing for steam?', description: 'No, the steam generator connects to the same water supply line as the shower.' }],
      },
    },
  ];

  await ProductModel.insertMany(products);
  console.log(`Seeded ${products.length} products successfully`);

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

seedProducts().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});