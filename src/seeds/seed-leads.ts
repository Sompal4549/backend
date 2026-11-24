import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { LeadModel } from '../models/lead.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dummyLeads = [
  {
    firstName: 'Dr. Vivek',
    lastName: 'Sharma',
    companyName: 'Aarogya Ayurveda Hospital & Research',
    email: 'dr.vivek@aarogyaayurveda.in',
    phone: '+91 98765 43210',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    leadSource: 'Website',
    leadStatus: 'Qualified',
    interestedProduct: 'Clinic Setup & Panchkarma Beds',
    ownerName: 'Simran Kaur',
    ownerTeam: 'Turnkey Sales',
    priority: 'High',
    expectedBudget: '₹8,50,000',
    followUpDate: 'Today',
    followUpTime: '02:30 PM',
    leadNotes: 'Wants full turnkey setup for new 10-bed Ayurvedic facility in Mansarovar.',
  },
  {
    firstName: 'Sunita',
    lastName: 'Rao',
    companyName: 'Serene Heritage Wellness Resort',
    email: 'sunitarao@sereneresort.com',
    phone: '+91 98234 56789',
    city: 'Udaipur',
    state: 'Rajasthan',
    country: 'India',
    leadSource: 'Referral',
    leadStatus: 'Negotiation',
    interestedProduct: 'Spa Setup & Steam Chambers',
    ownerName: 'Amit Mehta',
    ownerTeam: 'Equipment Sales',
    priority: 'High',
    expectedBudget: '₹14,00,000',
    followUpDate: 'Tomorrow',
    followUpTime: '11:00 AM',
    leadNotes: 'Quotation sent. Final meeting scheduled for pricing and delivery timelines.',
  },
  {
    firstName: 'Dr. Meenakshi',
    lastName: 'Iyer',
    companyName: 'AyurVeda Life Centre',
    email: 'drmeenakshi@ayurvedalife.org',
    phone: '+91 99876 54321',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    leadSource: 'LinkedIn',
    leadStatus: 'New',
    interestedProduct: 'Panchkarma Equipment',
    ownerName: 'Ritu Sharma',
    ownerTeam: 'Consultancy',
    priority: 'Medium',
    expectedBudget: '₹5,20,000',
    followUpDate: '25 Nov 2026',
    followUpTime: '04:00 PM',
    leadNotes: 'Inquired on LinkedIn about custom teak wood Droni tables and Shirodhara stands.',
  },
  {
    firstName: 'Rajesh',
    lastName: 'Singhania',
    companyName: 'Bliss Nirvana Luxury Spa',
    email: 'rajesh@blissnirvana.in',
    phone: '+91 97112 34567',
    city: 'Delhi NCR',
    state: 'Delhi',
    country: 'India',
    leadSource: 'Facebook',
    leadStatus: 'Contacted',
    interestedProduct: 'Turnkey Project',
    ownerName: 'Simran Kaur',
    ownerTeam: 'Turnkey Sales',
    priority: 'High',
    expectedBudget: '₹22,00,000',
    followUpDate: 'Today',
    followUpTime: '05:00 PM',
    leadNotes: 'Opening 4-room luxury wellness spa in Aerocity. Needs catalog and layout proposal.',
  },
  {
    firstName: 'Dr. Pradeep',
    lastName: 'Verma',
    companyName: 'Shree Dhanvantari Ayurvedic Clinic',
    email: 'dr.pverma@dhanvantari.in',
    phone: '+91 94140 12345',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    country: 'India',
    leadSource: 'WhatsApp',
    leadStatus: 'Quotation Sent',
    interestedProduct: 'Steam Chamber & Shirodhara Stand',
    ownerName: 'Amit Mehta',
    ownerTeam: 'Equipment Sales',
    priority: 'Medium',
    expectedBudget: '₹3,80,000',
    followUpDate: '26 Nov 2026',
    followUpTime: '01:00 PM',
    leadNotes: 'WhatsApp inquiry converted to quotation. Awaiting clinic committee review.',
  },
  {
    firstName: 'Ananya',
    lastName: 'Sen',
    companyName: 'Ananda Eco Spa Retreat',
    email: 'ananya.sen@anandaretreat.com',
    phone: '+91 98301 23456',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    leadSource: 'Website',
    leadStatus: 'Contacted',
    interestedProduct: 'Spa Setup',
    ownerName: 'Ritu Sharma',
    ownerTeam: 'Consultancy',
    priority: 'Medium',
    expectedBudget: '₹6,50,000',
    followUpDate: 'Tomorrow',
    followUpTime: '03:30 PM',
    leadNotes: 'Looking for 3 wooden massage tables, brass urli bowls, and steam accessories.',
  },
  {
    firstName: 'Dr. Anand',
    lastName: 'Kulkarni',
    companyName: 'Sanjeevani Wellness Hospital',
    email: 'anand.k@sanjeevaniwell.in',
    phone: '+91 98220 98765',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    leadSource: 'Referral',
    leadStatus: 'Qualified',
    interestedProduct: 'Equipment',
    ownerName: 'Simran Kaur',
    ownerTeam: 'Equipment Sales',
    priority: 'High',
    expectedBudget: '₹7,90,000',
    followUpDate: 'Today',
    followUpTime: '04:15 PM',
    leadNotes: 'Referred by Dr. Vivek. Expansion project for 5 consultation rooms.',
  },
  {
    firstName: 'Kavita',
    lastName: 'Nair',
    companyName: 'Kerala Heritage Spa & Holistic Care',
    email: 'kavita@keralaspa.in',
    phone: '+91 94471 23456',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    leadSource: 'Website',
    leadStatus: 'Negotiation',
    interestedProduct: 'Turnkey Project',
    ownerName: 'Vijay Sharma',
    ownerTeam: 'Turnkey Sales',
    priority: 'High',
    expectedBudget: '₹18,50,000',
    followUpDate: '27 Nov 2026',
    followUpTime: '11:30 AM',
    leadNotes: 'Final stage contract review for resort spa setup.',
  },
  {
    firstName: 'Rohan',
    lastName: 'Malhotra',
    companyName: 'The Himalayan Retreat & Wellness',
    email: 'rohan@himalayanretreat.com',
    phone: '+91 98160 54321',
    city: 'Rishikesh',
    state: 'Uttarakhand',
    country: 'India',
    leadSource: 'Instagram',
    leadStatus: 'New',
    interestedProduct: 'Clinic Setup',
    ownerName: 'Amit Mehta',
    ownerTeam: 'Equipment Sales',
    priority: 'Medium',
    expectedBudget: '₹9,00,000',
    followUpDate: '28 Nov 2026',
    followUpTime: '02:00 PM',
    leadNotes: 'Inquired from Rishikesh yoga festival ad campaign.',
  },
  {
    firstName: 'Dr. Shalini',
    lastName: 'Deshmukh',
    companyName: 'Veda Wellness Centre',
    email: 'shalini@vedawellness.com',
    phone: '+91 98690 12345',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    leadSource: 'LinkedIn',
    leadStatus: 'Quotation Sent',
    interestedProduct: 'Panchkarma Equipment',
    ownerName: 'Ritu Sharma',
    ownerTeam: 'Consultancy',
    priority: 'High',
    expectedBudget: '₹6,20,000',
    followUpDate: 'Tomorrow',
    followUpTime: '12:00 PM',
    leadNotes: 'Quote sent for Premium Droni with automatic oil heating Shirodhara setup.',
  },
];

async function seedLeads() {
  const mongoUri = process.env.MONGO_URI_MAIN;
  if (!mongoUri) {
    throw new Error('MONGO_URI_MAIN environment variable is not set in .env');
  }

  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
  console.log(`Connecting to MongoDB at: ${maskedUri}`);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  let inserted = 0;
  for (const leadData of dummyLeads) {
    const existing = await LeadModel.findOne({
      phone: leadData.phone,
      isDeleted: { $ne: true },
    });

    if (existing) {
      await LeadModel.updateOne({ _id: existing._id }, { $set: leadData });
      console.log(`Updated lead: ${leadData.firstName} ${leadData.lastName} (${leadData.companyName}) -> Owner: ${leadData.ownerName}`);
    } else {
      await LeadModel.create(leadData);
      inserted++;
      console.log(`✓ Inserted lead: ${leadData.firstName} ${leadData.lastName} (${leadData.companyName}) -> Owner: ${leadData.ownerName}`);
    }
  }

  console.log(`\nSuccessfully seeded/updated leads! (${inserted} newly inserted, ${dummyLeads.length} total)`);
  await mongoose.disconnect();
}

seedLeads().catch((err) => {
  console.error('Lead seed error:', err);
  process.exit(1);
});
