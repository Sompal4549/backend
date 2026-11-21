import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';
import { LeadModel } from '../../../models/lead.model';

export const crmMarketingRouter = Router();

crmMarketingRouter.get('/overview', async (_req, res) => {
  let leadsCount = 86;
  try {
    const count = await LeadModel.countDocuments({ isDeleted: { $ne: true } });
    if (count > 0) leadsCount = count;
  } catch {}

  const overview = {
    kpis: {
      activeCampaigns: 3,
      leadsGenerated: leadsCount,
      leadsChange: '+24%',
      unanswered: 6,
      unansweredChange: '+2',
      overdueFollowUps: 4,
      overdueChange: '+1',
    },
    campaigns: [
      {
        id: 'cmp-1',
        name: 'Panchkarma Clinic Setup',
        channel: 'Meta Ads',
        owner: 'Ritu Sharma',
        leads: 42,
        qualified: 12,
        spend: '₹18,000.00',
        status: 'Active',
      },
      {
        id: 'cmp-2',
        name: 'Spa Equipment Enquiries',
        channel: 'Google Ads',
        owner: 'Ritu Sharma',
        leads: 28,
        qualified: 9,
        spend: '₹12,500.00',
        status: 'Active',
      },
      {
        id: 'cmp-3',
        name: 'Resort Wellness Outreach',
        channel: 'Email',
        owner: 'Simran Kaur',
        leads: 16,
        qualified: 5,
        spend: '₹2,500.00',
        status: 'Active',
      },
    ],
    needsResponse: [
      { key: 'enquiries', title: 'New enquiries', subtitle: 'Require first response', count: 6 },
      { key: 'overdue', title: 'Overdue follow-ups', subtitle: 'Follow-ups pending', count: 4 },
      { key: 'drafts', title: 'Draft campaigns pending review', subtitle: 'Awaiting approval', count: 2 },
    ],
    communications: [
      {
        id: 'com-1',
        date: '14 Oct 2026',
        time: '11:30 AM',
        contact: 'Dr Neha Verma',
        organisation: 'Shree Wellness Clinic',
        channel: 'Phone',
        linkedRecord: 'Lead #LEAD-1048',
        owner: 'Ritu Sharma',
        outcome: 'Interested (Needs details)',
        nextAction: 'Send brochure',
        nextActionDue: 'Today',
        dueIsToday: true,
      },
      {
        id: 'com-2',
        date: '14 Oct 2026',
        time: '10:15 AM',
        contact: 'Rahul Mehta',
        organisation: 'Riverside Resort',
        channel: 'Email',
        linkedRecord: 'Lead #LEAD-1047',
        owner: 'Simran Kaur',
        outcome: 'Requested quotation',
        nextAction: 'Share quotation',
        nextActionDue: 'Today',
        dueIsToday: true,
      },
      {
        id: 'com-3',
        date: '13 Oct 2026',
        time: '04:20 PM',
        contact: 'Dr Anil Rao',
        organisation: 'Arogyam Hospital',
        channel: 'WhatsApp',
        linkedRecord: 'Opportunity #OPP-2035',
        owner: 'Ritu Sharma',
        outcome: 'Site visit scheduled',
        nextAction: 'Confirm schedule',
        nextActionDue: '15 Oct',
        dueIsToday: false,
      },
      {
        id: 'com-4',
        date: '13 Oct 2026',
        time: '11:05 AM',
        contact: 'Pooja Nair',
        organisation: 'Serene Spa',
        channel: 'Email',
        linkedRecord: 'Lead #LEAD-1045',
        owner: 'Simran Kaur',
        outcome: 'More information',
        nextAction: 'Send product details',
        nextActionDue: 'Today',
        dueIsToday: true,
      },
      {
        id: 'com-5',
        date: '12 Oct 2026',
        time: '03:40 PM',
        contact: 'Vikram Singh',
        organisation: 'Nature Retreat',
        channel: 'Phone',
        linkedRecord: 'Lead #LEAD-1044',
        owner: 'Ritu Sharma',
        outcome: 'Not interested (for now)',
        nextAction: 'Follow up in 1 month',
        nextActionDue: '12 Nov',
        dueIsToday: false,
      },
    ],
    channelPerformance: [
      { key: 'website', label: 'Website', count: 12 },
      { key: 'social', label: 'Social Media', count: 7 },
      { key: 'database', label: 'Existing Database', count: 3 },
      { key: 'referral', label: 'Referral', count: 2 },
    ],
    outreach: [
      {
        id: 'out-1',
        date: '14 Oct 2026',
        time: '02:00 PM',
        contact: 'Sunrise Resort',
        campaign: 'Resort Wellness Outreach',
        type: 'Follow-up',
        channel: 'Phone',
        owner: 'Simran Kaur',
        purpose: 'Discuss requirements',
      },
      {
        id: 'out-2',
        date: '14 Oct 2026',
        time: '04:00 PM',
        contact: 'Dr Kavita Joshi',
        campaign: 'Spa Equipment Enquiries',
        type: 'Initial contact',
        channel: 'Email',
        owner: 'Ritu Sharma',
        purpose: 'Send product catalogue',
      },
    ],
  };

  successResponse(res, overview, 'Marketing overview retrieved');
});

const campaignDraft = {
  code: 'CMP-2026-0018',
  name: 'Clinical Equipment Outreach',
  status: 'Draft',
  owner: 'Ritu Sharma',
  leadOwner: 'Simran',
  objective: 'Qualified equipment enquiries',
  expectedLeads: 60,
  audience: 'Ayurveda Clinics / Wellness Centres / Spas',
  regions: 'Delhi NCR / Jaipur / Mumbai',
  start: '2026-11-17',
  end: '2026-11-30',
  channels: ['Meta Ads', 'Google Ads', 'Email'],
  budget: 18000,
  allocation: { 'Meta Ads': 8000, 'Google Ads': 7000, Email: 3000 },
  utm: {
    source: 'clinical_outreach',
    medium: 'paid_ads',
    campaign: 'cmp-2026-0018',
    content: 'equipment_creative',
    term: '',
  },
  landingUrl: 'https://ensis.in',
  integrationsConfigured: false,
  creative: { name: 'clinical_equipment_creative.jpg', size: '1.2 MB' },
  text: 'Advanced clinical equipment for Ayurveda and wellness spaces. Designed for comfort, care and better client outcomes.',
  approver: 'Vijay Sharma',
};

const templateDraft = {
  id: 'TemplateEquipmentQuotationFollowup',
  name: 'QuoteFollowup',
  channel: 'Email',
  status: 'Draft',
  category: 'Sales Followup',
  sender: 'Not configured',
  language: 'English',
  subject: 'Following up on quotation {{quote_no}}',
  body: 'Hi {{client_name}},\n\nfollowing up on the ENSIS equipment quotation. Please let us know a convenient time for discussion.\n\nRegards\n{{owner_name}}',
  variables: [
    { key: 'client_name', label: 'Client name', sample: 'Dr Neha' },
    { key: 'quote_no', label: 'Quotation number', sample: 'QT0130Rev2' },
    { key: 'quote_value', label: 'Quotation amount', sample: '₹2,24,200.00' },
    { key: 'owner_name', label: 'Sales owner name', sample: 'Simran Kaur' },
  ],
};

crmMarketingRouter.get('/campaigns/new', (_req, res) => {
  successResponse(res, campaignDraft, 'New campaign draft');
});

crmMarketingRouter.get('/campaigns/:code', (req, res) => {
  successResponse(res, { ...campaignDraft, code: req.params.code }, 'Campaign retrieved');
});

crmMarketingRouter.get('/templates/new', (_req, res) => {
  successResponse(res, templateDraft, 'New template draft');
});

crmMarketingRouter.get('/templates/:id', (req, res) => {
  successResponse(res, { ...templateDraft, id: req.params.id }, 'Template retrieved');
});

export default crmMarketingRouter;
