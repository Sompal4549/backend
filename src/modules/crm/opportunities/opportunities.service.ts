import type { OpportunityDetails, SalesPipeline, PipelineCard } from '../../../types/crm';

const REQUIREMENT_CARDS: PipelineCard[] = [
  {
    id: 'OP-2026-091',
    title: 'Ayush Clinic Extension',
    client: 'Vaidya Shala Clinic',
    city: 'New Delhi',
    value: '₹3,80,000',
    owner: 'Simran Kaur',
    businessType: 'Clinic Equipment',
    closeBy: '15 Dec 2026',
    nextAction: { kind: 'meeting', label: 'Site measurement visit', when: 'Tomorrow, 10:00 AM', tone: 'neutral' },
  },
  {
    id: 'OP-2026-092',
    title: 'Panchkarma Suite Upgrade',
    client: 'Ananda Ayurveda Retreat',
    city: 'Rishikesh',
    value: '₹6,40,000',
    owner: 'Ritu Sharma',
    businessType: 'Spa & Wellness',
    closeBy: '20 Dec 2026',
    nextAction: { kind: 'call', label: 'Discuss wooden table finishes', when: 'Friday, 3:00 PM', tone: 'neutral' },
  },
];

const PROPOSAL_CARDS: PipelineCard[] = [
  {
    id: 'OP-2026-085',
    title: 'Turnkey Herbal Wellness Center',
    client: 'Green Leaf Resorts',
    city: 'Manali',
    value: '₹9,80,000',
    owner: 'Sandeep Kumar',
    businessType: 'Turnkey Project',
    closeBy: '28 Dec 2026',
    nextAction: { kind: 'document', label: 'Send 3D layout plan', when: 'Thursday, 04:00 PM', tone: 'neutral' },
  },
];

const QUOTATION_CARDS: PipelineCard[] = [
  {
    id: 'OP-2026-081',
    title: 'Turnkey Ayurvedic Center Setup',
    client: 'Aarogya Ayurveda Hospital',
    city: 'Jaipur',
    value: '₹18,50,000',
    owner: 'Simran Kaur',
    businessType: 'Turnkey Hospital Wing',
    closeBy: '30 Nov 2026',
    nextAction: { kind: 'meeting', label: 'Final commercial signoff', when: 'Today, 2:30 PM', tone: 'neutral' },
  },
  {
    id: 'OP-2026-082',
    title: 'Steam & Shirodhara Setup',
    client: 'Serene Heritage Resort',
    city: 'Udaipur',
    value: '₹7,20,000',
    owner: 'Ritu Sharma',
    businessType: 'Resort Spa Suite',
    closeBy: '05 Dec 2026',
    nextAction: { kind: 'call', label: 'Review revised quotation Q-2', when: 'Tomorrow, 11:00 AM', tone: 'neutral' },
  },
];

const NEGOTIATION_CARDS: PipelineCard[] = [
  {
    id: 'OP-2026-078',
    title: 'Hospital Panchkarma Tables (Qty 8)',
    client: 'Panchkarma Kendra',
    city: 'Varanasi',
    value: '₹12,00,000',
    owner: 'Simran Kaur',
    businessType: 'Bulk Equipment Order',
    closeBy: '30 Nov 2026',
    nextAction: { kind: 'meeting', label: 'Payment terms discussion', when: 'Tomorrow, 02:00 PM', tone: 'neutral' },
  },
];

export const opportunitiesService = {
  async getPipeline(): Promise<SalesPipeline> {
    return {
      kpis: {
        openOpportunities: 7,
        pipelineValue: '₹57.7L',
        closingThisMonth: 3,
        overdueNextActions: 1,
      },
      columns: [
        { key: 'requirement', title: 'Requirement Analysis', deals: REQUIREMENT_CARDS.length, value: '₹10.2L', cards: REQUIREMENT_CARDS },
        { key: 'proposal', title: 'Design & Proposal', deals: PROPOSAL_CARDS.length, value: '₹9.8L', cards: PROPOSAL_CARDS },
        { key: 'quotation', title: 'Quotation Sent', deals: QUOTATION_CARDS.length, value: '₹25.7L', cards: QUOTATION_CARDS },
        { key: 'negotiation', title: 'Negotiation & Closing', deals: NEGOTIATION_CARDS.length, value: '₹12.0L', cards: NEGOTIATION_CARDS },
      ],
      teamPerformance: [
        { key: 'equipment', name: 'Equipment Team', leads: 18, won: 6, target: 12 },
        { key: 'turnkey', name: 'Turnkey Projects', leads: 12, won: 4, target: 8 },
        { key: 'consultancy', name: 'Spa Consultancy', leads: 14, won: 5, target: 10 },
      ],
      closed: { won: 8, lost: 2 },
      alerts: { needFollowUp: 2, approvalsPending: 1 },
    };
  },

  async getById(id: string): Promise<OpportunityDetails> {
    return {
      id,
      title: 'Turnkey Ayurvedic Center Setup',
      client: 'Aarogya Ayurveda Hospital',
      contact: 'Dr. Vivek Sharma',
      city: 'Jaipur, Rajasthan',
      value: '₹18,50,000',
      stage: 'Quotation Sent',
      owner: 'Simran Kaur',
      salesTeam: 'Turnkey Projects',
      expectedClose: '30 Nov 2026',
      businessType: 'Hospital Wing Expansion',
      linkedLead: 'LD-2026-042',
      scope: '4 Panchkarma Beds, 2 Shirodhara Units, 2 Herbal Steam Cabinets, Site Plumbing & Electrical Alignment',
      latestQuotation: {
        id: 'Q-2026-042',
        revision: 'Rev 2',
        sentOn: '18 Nov 2026',
        value: '₹18,50,000',
        status: { label: 'Approved by Client', tone: 'success' },
      },
      activity: [
        { id: 'ACT-1', title: 'Quotation revision 2 presented', by: 'Simran Kaur', at: 'Yesterday, 02:30 PM', detail: 'Updated delivery schedule.', tone: 'neutral' },
        { id: 'ACT-2', title: 'Site civil inspection completed', by: 'Sandeep Kumar', at: '15 Nov 2026', detail: 'Drawings handed to client contractor.', tone: 'neutral' },
      ],
    };
  },

  async create(_data: Record<string, unknown>): Promise<{ id: string }> {
    return { id: 'OP-' + Math.floor(100 + Math.random() * 900) };
  },

  async update(id: string, _data: Record<string, unknown>): Promise<{ id: string }> {
    return { id };
  },

  async updateStage(id: string, _data: any): Promise<{ id: string }> {
    return { id };
  },

  async logActivity(_id: string, _data: Record<string, unknown>): Promise<{ id: string }> {
    return { id: 'ACT-' + Math.floor(1000 + Math.random() * 9000) };
  },

  async addActivity(_id: string, _data: Record<string, unknown>): Promise<{ id: string }> {
    return { id: 'ACT-' + Math.floor(1000 + Math.random() * 9000) };
  },

  async softDelete(_id: string, _deletedBy?: string): Promise<void> {
    // Soft-delete
  },

  async restore(id: string): Promise<{ id: string }> {
    return { id };
  },
};