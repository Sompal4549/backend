import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { CampaignModel } from '../models/campaign.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const campaignsData = [
  {
    id: 'cmp-101',
    name: 'Panchakarma cata…',
    channel: 'Email',
    channelDetails: 'Email / approved template',
    status: 'Scheduled',
    eligibleAudience: 24,
    excludedCount: 7,
    qualified: 8,
    owner: 'Neha Singh',
    action: 'Open',
    templateName: 'Panchakarma Catalogue 2026',
    calloutText: 'Panchakarma catalogue email: 24 eligible contacts. Review the audience and message before activation.',
    spend: '₹14,500.00',
    leads: 24,
    objective: 'Panchakarma clinic catalogue outreach',
  },
  {
    id: 'cmp-102',
    name: 'Steam chamber en…',
    channel: 'WhatsApp',
    channelDetails: 'WhatsApp / customer enquiry',
    status: 'Active',
    eligibleAudience: 12,
    excludedCount: 2,
    qualified: 6,
    owner: 'Neha Singh',
    action: 'Open',
    templateName: 'Steam Chamber WhatsApp Outreach',
    calloutText: 'Steam chamber enquiries: 12 eligible contacts actively engaged.',
    spend: '₹8,200.00',
    leads: 12,
    objective: 'Steam chamber enquiries qualification',
  },
  {
    id: 'cmp-103',
    name: 'Spa equipment nu…',
    channel: 'Email',
    channelDetails: 'Email / consent recorded',
    status: 'Draft',
    eligibleAudience: 18,
    excludedCount: 4,
    qualified: 4,
    owner: 'Executive B',
    action: 'Edit',
    templateName: 'Spa Equipment Nurture Rev 1',
    calloutText: 'Spa equipment nurture draft awaiting final review by department manager.',
    spend: '₹2,500.00',
    leads: 18,
    objective: 'Spa equipment buyer nurture campaign',
  },
  {
    id: 'cmp-1',
    name: 'Panchkarma Clinic Setup',
    channel: 'Meta Ads',
    channelDetails: 'Meta Ads / Paid Outreach',
    status: 'Active',
    eligibleAudience: 60,
    excludedCount: 18,
    qualified: 12,
    owner: 'Ritu Sharma',
    action: 'Open',
    spend: '₹18,000.00',
    leads: 42,
    objective: 'New Panchakarma clinics across North India',
  },
  {
    id: 'cmp-2',
    name: 'Spa Equipment Enquiries',
    channel: 'Google Ads',
    channelDetails: 'Google Ads / Search',
    status: 'Active',
    eligibleAudience: 40,
    excludedCount: 12,
    qualified: 9,
    owner: 'Ritu Sharma',
    action: 'Open',
    spend: '₹12,500.00',
    leads: 28,
    objective: 'Commercial spa and resort enquiries',
  },
  {
    id: 'cmp-3',
    name: 'Resort Wellness Outreach',
    channel: 'Email',
    channelDetails: 'Email / Direct Nurture',
    status: 'Active',
    eligibleAudience: 20,
    excludedCount: 4,
    qualified: 5,
    owner: 'Simran Kaur',
    action: 'Open',
    spend: '₹2,500.00',
    leads: 16,
    objective: 'Resort wellness centres',
  },
];

export async function seedCampaigns() {
  const uri = process.env.MONGO_URI_MAIN || process.env.MONGODB_URI || 'mongodb://localhost:27017/ensis';
  if (!uri) {
    console.error('MongoDB URI missing');
    return;
  }

  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    await mongoose.connect(uri);
  }

  try {
    for (const c of campaignsData) {
      await CampaignModel.findOneAndUpdate(
        { id: c.id },
        { $set: c },
        { upsert: true, new: true }
      );
    }
    console.log(`Campaigns seeded successfully (${campaignsData.length} records)`);
  } catch (err) {
    console.error('Error seeding campaigns:', err);
  } finally {
    if (!isConnected) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  seedCampaigns().then(() => process.exit(0)).catch(() => process.exit(1));
}
