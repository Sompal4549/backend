import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { LeadModel } from '../models/lead.model';
import { OpportunityModel } from '../models/opportunity.model';
import { ClientModel } from '../models/client.model';
import { QuotationModel } from '../models/quotation.model';
import { SalesOrderModel } from '../models/sales-order.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const LEADS_DATA = [
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
    expectedBudget: '₹18,50,000',
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
    expectedBudget: '₹7,20,000',
    followUpDate: 'Tomorrow',
    followUpTime: '11:00 AM',
    leadNotes: 'Quotation sent. Final meeting scheduled for pricing and delivery timelines.',
  },
  {
    firstName: 'Dr. Arvind',
    lastName: 'Vaidya',
    companyName: 'Vaidya Shala Clinic',
    email: 'arvind@vaidyashala.in',
    phone: '+91 98100 23456',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    leadSource: 'Website',
    leadStatus: 'New',
    interestedProduct: 'Clinic Extension & Shirodhara Units',
    ownerName: 'Simran Kaur',
    ownerTeam: 'Clinic Equipment',
    priority: 'High',
    expectedBudget: '₹3,80,000',
    followUpDate: 'Tomorrow',
    followUpTime: '10:00 AM',
    leadNotes: 'Requires 2 Shirodhara units and 1 steam chamber for South Extension branch.',
  },
  {
    firstName: 'Dr. Maheshwar',
    lastName: 'Nath',
    companyName: 'Ananda Ayurveda Retreat',
    email: 'maheshwar@anandaretreat.com',
    phone: '+91 98370 12345',
    city: 'Rishikesh',
    state: 'Uttarakhand',
    country: 'India',
    leadSource: 'Event',
    leadStatus: 'Contacted',
    interestedProduct: 'Panchkarma Suite Upgrade',
    ownerName: 'Ritu Sharma',
    ownerTeam: 'Spa & Wellness',
    priority: 'Medium',
    expectedBudget: '₹6,40,000',
    followUpDate: 'Friday',
    followUpTime: '03:00 PM',
    leadNotes: 'Wooden table finishes and brass accessories required.',
  },
  {
    firstName: 'Vikram',
    lastName: 'Negi',
    companyName: 'Green Leaf Resorts',
    email: 'vikram@greenleafresorts.in',
    phone: '+91 98160 55443',
    city: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    leadSource: 'Meta Ads',
    leadStatus: 'Qualified',
    interestedProduct: 'Turnkey Herbal Wellness Center',
    ownerName: 'Sandeep Kumar',
    ownerTeam: 'Turnkey Project',
    priority: 'High',
    expectedBudget: '₹9,80,000',
    followUpDate: 'Thursday',
    followUpTime: '04:00 PM',
    leadNotes: '3D layout design presented; waiting for civil site readiness.',
  },
  {
    firstName: 'Dr. B. K.',
    lastName: 'Pandey',
    companyName: 'Panchkarma Kendra',
    email: 'drpandey@panchkarmakendra.org',
    phone: '+91 94150 99887',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    country: 'India',
    leadSource: 'Cold Call',
    leadStatus: 'Negotiation',
    interestedProduct: 'Hospital Panchkarma Tables',
    ownerName: 'Simran Kaur',
    ownerTeam: 'Bulk Equipment Order',
    priority: 'High',
    expectedBudget: '₹12,00,000',
    followUpDate: 'Tomorrow',
    followUpTime: '02:00 PM',
    leadNotes: 'Bulk order of 8 Teak Wood therapy tables with brass bowls.',
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
    interestedProduct: 'Panchkarma Equipment Package',
    ownerName: 'Ritu Sharma',
    ownerTeam: 'Consultancy',
    priority: 'High',
    expectedBudget: '₹6,20,000',
    followUpDate: 'Tomorrow',
    followUpTime: '12:00 PM',
    leadNotes: 'Quote sent for Premium Droni with automatic oil heating setup.',
  },
];

const baseLines = [
  { id: 'l1', name: 'Steam Chamber', spec: 'Standard model with brass fittings', qty: 2, unit: 'Nos.', rate: 60000, discount: 0, gst: 18 },
  { id: 'l2', name: 'Therapy Table', spec: 'Teak Wood hand-crafted finish', qty: 1, unit: 'Nos.', rate: 45000, discount: 0, gst: 18 },
  { id: 'l3', name: 'Shirodhara Stand', spec: 'Adjustable brass stand with bowl', qty: 2, unit: 'Nos.', rate: 12500, discount: 0, gst: 18 },
];

async function seedCrmAll() {
  const mongoUri = process.env.MONGO_URI_MAIN || 'mongodb://localhost:27017/ensis';
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  console.log('\n--- 1. Seeding Leads ---');
  const savedLeads: any[] = [];
  for (const leadData of LEADS_DATA) {
    const existing = await LeadModel.findOne({ phone: leadData.phone });
    if (existing) {
      await LeadModel.updateOne({ _id: existing._id }, { $set: leadData });
      savedLeads.push(await LeadModel.findById(existing._id));
      console.log(`Updated lead: ${leadData.firstName} ${leadData.lastName} (${leadData.companyName})`);
    } else {
      const created = await LeadModel.create(leadData);
      savedLeads.push(created);
      console.log(`✓ Inserted lead: ${leadData.firstName} ${leadData.lastName} (${leadData.companyName})`);
    }
  }

  console.log('\n--- 2. Seeding Opportunities (Linked to Leads) ---');
  const opportunitiesSeed = [
    {
      id: 'OP-2026-081',
      title: 'Turnkey Ayurvedic Center Setup',
      client: 'Aarogya Ayurveda Hospital & Research',
      contact: 'Dr. Vivek Sharma',
      city: 'Jaipur',
      value: '₹18,50,000',
      stage: 'quotation',
      owner: 'Simran Kaur',
      salesTeam: 'Turnkey Sales',
      expectedClose: '30 Nov 2026',
      businessType: 'Turnkey Hospital Wing',
      linkedLead: savedLeads[0]?._id?.toString() || 'LD-001',
      scope: '4 Panchkarma Beds, 2 Shirodhara Units, 2 Herbal Steam Cabinets, Site Plumbing & Electrical',
      latestQuotation: {
        id: 'QT-2026-0130',
        revision: 'Rev 1',
        sentOn: '18 Nov 2026',
        value: '₹18,50,000',
        status: { label: 'Approved by Client', tone: 'success' },
      },
      nextAction: { kind: 'meeting', label: 'Final commercial signoff', when: 'Today, 2:30 PM', tone: 'neutral' },
      activity: [
        { id: 'ACT-1', title: 'Commercial signoff scheduled', by: 'Simran Kaur', at: 'Today, 10:00 AM', detail: 'Meeting with hospital director Dr. Vivek Sharma.', tone: 'neutral' },
        { id: 'ACT-2', title: 'Quotation QT-2026-0130 sent', by: 'Simran Kaur', at: '18 Nov 2026', detail: 'Detailed proposal with equipment specifications.', tone: 'neutral' },
      ],
    },
    {
      id: 'OP-2026-082',
      title: 'Steam & Shirodhara Setup',
      client: 'Serene Heritage Wellness Resort',
      contact: 'Sunita Rao',
      city: 'Udaipur',
      value: '₹7,20,000',
      stage: 'quotation',
      owner: 'Amit Mehta',
      salesTeam: 'Equipment Sales',
      expectedClose: '05 Dec 2026',
      businessType: 'Resort Spa Suite',
      linkedLead: savedLeads[1]?._id?.toString() || 'LD-002',
      scope: 'Luxury steam & Shirodhara setup for resort spa wing',
      latestQuotation: {
        id: 'QT-0125',
        revision: 'Rev 2',
        sentOn: '15 Oct 2026',
        value: '₹7,20,000',
        status: { label: 'Approved', tone: 'success' },
      },
      nextAction: { kind: 'call', label: 'Review revised quotation Q-2', when: 'Tomorrow, 11:00 AM', tone: 'neutral' },
      activity: [
        { id: 'ACT-3', title: 'Quotation revised to Rev 2', by: 'Amit Mehta', at: '15 Oct 2026', detail: 'Adjusted terms for luxury wood finish.', tone: 'neutral' },
      ],
    },
    {
      id: 'OP-2026-091',
      title: 'Ayush Clinic Extension',
      client: 'Vaidya Shala Clinic',
      contact: 'Dr. Arvind Vaidya',
      city: 'New Delhi',
      value: '₹3,80,000',
      stage: 'requirement',
      owner: 'Simran Kaur',
      salesTeam: 'Clinic Equipment',
      expectedClose: '15 Dec 2026',
      businessType: 'Clinic Equipment',
      linkedLead: savedLeads[2]?._id?.toString() || 'LD-003',
      scope: '2 Shirodhara units, 1 steam cabin for branch expansion',
      nextAction: { kind: 'meeting', label: 'Site measurement visit', when: 'Tomorrow, 10:00 AM', tone: 'neutral' },
      activity: [
        { id: 'ACT-4', title: 'Site measurement visit scheduled', by: 'Simran Kaur', at: 'Yesterday', detail: 'Confirmed with Dr. Arvind Vaidya.', tone: 'neutral' },
      ],
    },
    {
      id: 'OP-2026-092',
      title: 'Panchkarma Suite Upgrade',
      client: 'Ananda Ayurveda Retreat',
      contact: 'Dr. Maheshwar Nath',
      city: 'Rishikesh',
      value: '₹6,40,000',
      stage: 'requirement',
      owner: 'Ritu Sharma',
      salesTeam: 'Spa & Wellness',
      expectedClose: '20 Dec 2026',
      businessType: 'Spa & Wellness',
      linkedLead: savedLeads[3]?._id?.toString() || 'LD-004',
      scope: 'Wooden table finishes and therapy units upgrade',
      nextAction: { kind: 'call', label: 'Discuss wooden table finishes', when: 'Friday, 3:00 PM', tone: 'neutral' },
      activity: [
        { id: 'ACT-5', title: 'Requirement gathered', by: 'Ritu Sharma', at: '2 days ago', detail: 'Client wants custom teakwood finish with brass fittings.', tone: 'neutral' },
      ],
    },
    {
      id: 'OP-2026-085',
      title: 'Turnkey Herbal Wellness Center',
      client: 'Green Leaf Resorts',
      contact: 'Vikram Negi',
      city: 'Manali',
      value: '₹9,80,000',
      stage: 'proposal',
      owner: 'Sandeep Kumar',
      salesTeam: 'Turnkey Project',
      expectedClose: '28 Dec 2026',
      businessType: 'Turnkey Project',
      linkedLead: savedLeads[4]?._id?.toString() || 'LD-005',
      scope: '3D layout plan and turnkey hospital setup in hill resort',
      nextAction: { kind: 'document', label: 'Send 3D layout plan', when: 'Thursday, 04:00 PM', tone: 'neutral' },
      activity: [
        { id: 'ACT-6', title: 'Draft drawings completed', by: 'Sandeep Kumar', at: '3 days ago', detail: '3D layout submitted for internal review.', tone: 'neutral' },
      ],
    },
    {
      id: 'OP-2026-078',
      title: 'Hospital Panchkarma Tables (Qty 8)',
      client: 'Panchkarma Kendra',
      contact: 'Dr. B. K. Pandey',
      city: 'Varanasi',
      value: '₹12,00,000',
      stage: 'negotiation',
      owner: 'Simran Kaur',
      salesTeam: 'Bulk Equipment Order',
      expectedClose: '30 Nov 2026',
      businessType: 'Bulk Equipment Order',
      linkedLead: savedLeads[5]?._id?.toString() || 'LD-006',
      scope: '8 Teak Wood Panchkarma Tables with brass bowls',
      nextAction: { kind: 'meeting', label: 'Payment terms discussion', when: 'Tomorrow, 02:00 PM', tone: 'neutral' },
      activity: [
        { id: 'ACT-7', title: 'Payment discussion initiated', by: 'Simran Kaur', at: 'Yesterday', detail: 'Client requested 40-40-20 payment structure.', tone: 'neutral' },
      ],
    },
    {
      id: 'OP-2026-095',
      title: 'Panchkarma Equipment Package',
      client: 'Veda Wellness Centre',
      contact: 'Dr. Shalini Deshmukh',
      city: 'Mumbai',
      value: '₹6,20,000',
      stage: 'quotation',
      owner: 'Ritu Sharma',
      salesTeam: 'Consultancy',
      expectedClose: '10 Dec 2026',
      businessType: 'Consultancy',
      linkedLead: savedLeads[6]?._id?.toString() || 'LD-007',
      scope: 'Premium Droni with automatic oil heating setup',
      latestQuotation: {
        id: 'QT-0126',
        revision: 'Rev 1',
        sentOn: '16 Oct 2026',
        value: '₹6,20,000',
        status: { label: 'Awaiting approval', tone: 'warning' },
      },
      nextAction: { kind: 'call', label: 'Follow-up on quotation', when: 'Tomorrow, 12:00 PM', tone: 'neutral' },
      activity: [
        { id: 'ACT-8', title: 'Quotation prepared', by: 'Ritu Sharma', at: 'Yesterday', detail: 'Discount exception requested from Sales Manager.', tone: 'neutral' },
      ],
    },
  ];

  for (const oppData of opportunitiesSeed) {
    await OpportunityModel.findOneAndUpdate(
      { id: oppData.id },
      { $set: oppData },
      { upsert: true, new: true }
    );
    console.log(`✓ Upserted opportunity: ${oppData.id} - ${oppData.title} (Linked lead: ${oppData.linkedLead})`);
  }

  console.log('\n--- 3. Seeding Quotations ---');
  const quotationsSeed = [
    {
      id: 'QT-2026-0130',
      revision: 1,
      status: 'Approved',
      approvalStatus: 'Approved',
      date: '2026-11-16',
      validUntil: '2026-11-30',
      businessType: 'Equipment',
      owner: 'Simran Kaur',
      opportunity: 'OP-2026-081',
      client: {
        name: 'Aarogya Ayurveda Hospital & Research',
        contact: 'Dr. Vivek Sharma',
        email: 'dr.vivek@aarogyaayurveda.in',
        phone: '+91 98765 43210',
        city: 'Jaipur, Rajasthan',
        gstin: '08AAAAA0000A1Z5',
      },
      deliverySameAsBilling: true,
      placeOfSupply: 'Rajasthan',
      lines: baseLines,
      discount: 10000,
      shipping: 0,
      advancePercent: 50,
      terms: {
        payment: '50% advance, balance before dispatch',
        delivery: '2–3 weeks from advance',
        freight: 'Included',
        warranty: '1 Year Comprehensive Warranty',
        note: 'Teak wood high quality polish included.',
      },
      revisions: [],
      totalAmount: 204350,
      isDeleted: false,
    },
    {
      id: 'QT-0125',
      revision: 2,
      status: 'Sent',
      approvalStatus: 'Approved',
      date: '2026-10-15',
      validUntil: '2026-11-15',
      businessType: 'Turnkey',
      owner: 'Amit Mehta',
      opportunity: 'OP-2026-082',
      client: {
        name: 'Serene Heritage Wellness Resort',
        contact: 'Sunita Rao',
        email: 'sunitarao@sereneresort.com',
        phone: '+91 98234 56789',
        city: 'Udaipur, Rajasthan',
        gstin: '08BBBBB1111B1Z6',
      },
      deliverySameAsBilling: true,
      placeOfSupply: 'Rajasthan',
      lines: baseLines,
      discount: 15000,
      shipping: 0,
      advancePercent: 40,
      terms: {
        payment: '40% advance, balance on installation',
        delivery: '3–4 weeks',
        freight: 'Included',
        warranty: '1 Year Warranty',
        note: 'Installation engineer travel covered.',
      },
      revisions: [],
      totalAmount: 340000,
      isDeleted: false,
    },
    {
      id: 'QT-0126',
      revision: 1,
      status: 'Awaiting approval',
      approvalStatus: 'Pending',
      date: '2026-10-16',
      validUntil: '2026-11-16',
      businessType: 'Consultancy',
      owner: 'Ritu Sharma',
      opportunity: 'OP-2026-095',
      client: {
        name: 'Veda Wellness Centre',
        contact: 'Dr. Shalini Deshmukh',
        email: 'shalini@vedawellness.com',
        phone: '+91 98690 12345',
        city: 'Mumbai, Maharashtra',
        gstin: '27CCCCC2222C1Z7',
      },
      deliverySameAsBilling: true,
      placeOfSupply: 'Maharashtra',
      lines: baseLines,
      discount: 20000,
      shipping: 0,
      advancePercent: 50,
      terms: {
        payment: '50% advance, balance before dispatch',
        delivery: '2 weeks',
        freight: 'Included',
        warranty: '1 Year Warranty',
        note: 'Requires special discount approval from Sales Manager.',
      },
      revisions: [],
      totalAmount: 160000,
      isDeleted: false,
    },
    {
      id: 'QT-0124',
      revision: 1,
      status: 'Accepted',
      approvalStatus: 'Approved',
      date: '2026-10-14',
      validUntil: '2026-11-14',
      businessType: 'Equipment',
      owner: 'Simran Kaur',
      opportunity: 'OP-2026-081',
      client: {
        name: 'Aarogya Ayurveda Hospital & Research',
        contact: 'Dr. Vivek Sharma',
        email: 'dr.vivek@aarogyaayurveda.in',
        phone: '+91 98765 43210',
        city: 'Jaipur, Rajasthan',
        gstin: '08AAAAA0000A1Z5',
      },
      deliverySameAsBilling: true,
      placeOfSupply: 'Rajasthan',
      lines: baseLines,
      discount: 5000,
      shipping: 0,
      advancePercent: 50,
      terms: {
        payment: '50% advance, balance before dispatch',
        delivery: '2 weeks from advance',
        freight: 'Included',
        warranty: '1 Year Warranty',
        note: '',
      },
      revisions: [],
      totalAmount: 240000,
      isDeleted: false,
    },
  ];

  for (const quote of quotationsSeed) {
    await QuotationModel.findOneAndUpdate(
      { id: quote.id },
      { $set: quote },
      { upsert: true, new: true }
    );
    console.log(`✓ Upserted quotation: ${quote.id} (${quote.client.name}) - Status: ${quote.status}`);
  }

  console.log('\n--- 4. Seeding Sales Orders ---');
  const salesOrdersSeed = [
    {
      id: 'SO-2026-0090',
      status: 'In Production',
      quotationId: 'QT-2026-0130',
      quotationRevision: 1,
      orderDate: '2026-11-17',
      client: 'Aarogya Ayurveda Hospital & Research',
      clientContact: 'Dr. Vivek Sharma',
      owner: 'Rajesh Kumar',
      dispatchDate: '2026-11-23',
      deliverySite: 'Jaipur',
      address: 'Tonk Road, Jaipur',
      lines: baseLines,
      discount: 10000,
      advancePercent: 50,
      value: 204350,
      stages: [
        { label: 'Confirmed', detail: '17 Nov 2026, 10:20 AM', state: 'done' },
        { label: 'Advance Received', detail: '17 Nov 2026, 11:05 AM', state: 'done' },
        { label: 'Production', detail: 'In Progress', state: 'current' },
        { label: 'QC', detail: 'Pending', state: 'pending' },
        { label: 'Dispatch', detail: 'Planned 23 Nov 2026', state: 'pending' },
      ],
      linkedDocuments: [
        { label: 'Quotation', id: 'QT-2026-0130 Rev 1', note: '(from Draft)' },
        { label: 'Job Bag', id: 'JB0090' },
      ],
      isDeleted: false,
    },
    {
      id: 'SO-2026-0089',
      status: 'In Production',
      quotationId: 'QT-0125',
      quotationRevision: 2,
      orderDate: '2026-11-10',
      client: 'Serene Heritage Wellness Resort',
      clientContact: 'Sunita Rao',
      owner: 'Rajesh Kumar',
      dispatchDate: '2026-11-28',
      deliverySite: 'Udaipur',
      address: 'Fateh Sagar, Udaipur',
      lines: baseLines,
      discount: 15000,
      advancePercent: 40,
      value: 340000,
      stages: [
        { label: 'Confirmed', detail: '10 Nov 2026, 02:00 PM', state: 'done' },
        { label: 'Advance Received', detail: '11 Nov 2026, 10:30 AM', state: 'done' },
        { label: 'Production', detail: 'In Progress', state: 'current' },
        { label: 'QC', detail: 'Pending', state: 'pending' },
        { label: 'Dispatch', detail: 'Planned 28 Nov 2026', state: 'pending' },
      ],
      linkedDocuments: [
        { label: 'Quotation', id: 'QT-0125 Rev 2' },
        { label: 'Job Bag', id: 'JB0089' },
      ],
      isDeleted: false,
    },
  ];

  for (const so of salesOrdersSeed) {
    await SalesOrderModel.findOneAndUpdate(
      { id: so.id },
      { $set: so },
      { upsert: true, new: true }
    );
    console.log(`✓ Upserted sales order: ${so.id} (${so.client})`);
  }

  console.log('\n--- 5. Seeding Clients ---');
  const clientsSeed = [
    {
      name: 'Aarogya Ayurveda Hospital & Research',
      contact: 'Dr. Vivek Sharma',
      type: 'Hospital & Clinic',
      city: 'Jaipur',
      owner: 'Simran Kaur',
      outstanding: '₹4,50,000',
      nextFollowUp: { date: 'Tomorrow', time: '11:30 AM' },
    },
    {
      name: 'Serene Heritage Wellness Resort',
      contact: 'Sunita Rao',
      type: 'Resort & Spa',
      city: 'Udaipur',
      owner: 'Amit Mehta',
      outstanding: '₹6,00,000',
      nextFollowUp: { date: 'Today', time: '03:00 PM' },
    },
    {
      name: 'Vaidya Shala Clinic',
      contact: 'Dr. Arvind Vaidya',
      type: 'Ayurveda Clinic',
      city: 'New Delhi',
      owner: 'Simran Kaur',
      outstanding: '₹1,50,000',
      nextFollowUp: { date: 'Tomorrow', time: '10:00 AM' },
    },
    {
      name: 'Veda Wellness Centre',
      contact: 'Dr. Shalini Deshmukh',
      type: 'Wellness Center',
      city: 'Mumbai',
      owner: 'Ritu Sharma',
      outstanding: '₹2,80,000',
      nextFollowUp: { date: 'Friday', time: '12:00 PM' },
    },
    {
      name: 'Green Leaf Resorts',
      contact: 'Vikram Negi',
      type: 'Resort & Spa',
      city: 'Manali',
      owner: 'Sandeep Kumar',
      outstanding: '₹3,20,000',
      nextFollowUp: { date: 'Thursday', time: '04:00 PM' },
    },
  ];

  for (const client of clientsSeed) {
    await ClientModel.findOneAndUpdate(
      { name: client.name },
      { $set: { ...client, isDeleted: false } },
      { upsert: true, new: true }
    );
    console.log(`✓ Upserted client: ${client.name} (${client.city})`);
  }

  console.log('\n✓ ALL CRM DATA SUCCESSFULLY SEEDED AND CROSS-LINKED!');
  await mongoose.disconnect();
}

seedCrmAll().catch((err) => {
  console.error('Seed CRM error:', err);
  process.exit(1);
});
