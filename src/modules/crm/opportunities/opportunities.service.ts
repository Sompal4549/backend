import { OpportunityModel } from '../../../models/opportunity.model';
import { QuotationModel } from '../../../models/quotation.model';
import { LeadModel } from '../../../models/lead.model';
import { ClientModel } from '../../../models/client.model';
import { CrmRecord } from '../../../models/crm-record.model';
import { generateDocumentNumber } from '../../../utils/document-series.util';
import type { OpportunityDetails, SalesPipeline, PipelineCard, StatusView } from '../../../types/crm';

export type PipelineStageKey = 'requirement' | 'proposal' | 'quotation' | 'negotiation';

const INITIAL_OPPORTUNITIES = [
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
    linkedLead: 'LD-2026-0041',
    scope: '2 Shirodhara units, 1 steam cabin',
    nextAction: { kind: 'meeting', label: 'Site measurement visit', when: 'Tomorrow, 10:00 AM', tone: 'neutral' },
    activity: [
      { id: 'ACT-1', title: 'Site measurement visit scheduled', by: 'Simran Kaur', at: 'Yesterday', detail: 'Confirmed with Dr. Arvind Vaidya for tomorrow 10 AM.', tone: 'neutral' },
    ],
  },
  {
    id: 'OP-2026-092',
    title: 'Panchkarma Suite Upgrade',
    client: 'Ananda Ayurveda Retreat',
    contact: 'Dr. Maheshwar',
    city: 'Rishikesh',
    value: '₹6,40,000',
    stage: 'requirement',
    owner: 'Ritu Sharma',
    salesTeam: 'Spa & Wellness',
    expectedClose: '20 Dec 2026',
    businessType: 'Spa & Wellness',
    linkedLead: 'LD-2026-0042',
    scope: 'Wooden table finishes and therapy units',
    nextAction: { kind: 'call', label: 'Discuss wooden table finishes', when: 'Friday, 3:00 PM', tone: 'neutral' },
    activity: [
      { id: 'ACT-2', title: 'Requirement gathered', by: 'Ritu Sharma', at: '2 days ago', detail: 'Client wants custom teakwood finish with brass fittings.', tone: 'neutral' },
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
    linkedLead: 'LD-2026-0038',
    scope: '3D layout plan and turnkey hospital setup',
    nextAction: { kind: 'document', label: 'Send 3D layout plan', when: 'Thursday, 04:00 PM', tone: 'neutral' },
    activity: [
      { id: 'ACT-3', title: 'Draft drawings completed', by: 'Sandeep Kumar', at: '3 days ago', detail: '3D layout submitted for internal architect review.', tone: 'neutral' },
    ],
  },
  {
    id: 'OP-2026-081',
    title: 'Turnkey Ayurvedic Center Setup',
    client: 'Aarogya Ayurveda Hospital',
    contact: 'Dr. Vivek Sharma',
    city: 'Jaipur',
    value: '₹18,50,000',
    stage: 'quotation',
    owner: 'Simran Kaur',
    salesTeam: 'Turnkey Projects',
    expectedClose: '30 Nov 2026',
    businessType: 'Turnkey Hospital Wing',
    linkedLead: 'LD-2026-0035',
    scope: '4 Panchkarma Beds, 2 Shirodhara Units, 2 Herbal Steam Cabinets, Site Plumbing',
    latestQuotation: {
      id: 'QT-2026-0130',
      revision: 'Rev 1',
      sentOn: '18 Nov 2026',
      value: '₹18,50,000',
      status: { label: 'Approved by Client', tone: 'success' },
    },
    nextAction: { kind: 'meeting', label: 'Final commercial signoff', when: 'Today, 2:30 PM', tone: 'neutral' },
    activity: [
      { id: 'ACT-4', title: 'Commercial signoff scheduled', by: 'Simran Kaur', at: 'Today, 10:00 AM', detail: 'Meeting with hospital director Dr. Vivek Sharma.', tone: 'neutral' },
      { id: 'ACT-5', title: 'Quotation QT-2026-0130 sent', by: 'Simran Kaur', at: '18 Nov 2026', detail: 'Detailed proposal with equipment specifications.', tone: 'neutral' },
    ],
  },
  {
    id: 'OP-2026-082',
    title: 'Steam & Shirodhara Setup',
    client: 'Serene Heritage Resort',
    contact: 'Rahul Rathore',
    city: 'Udaipur',
    value: '₹7,20,000',
    stage: 'quotation',
    owner: 'Ritu Sharma',
    salesTeam: 'Resort Spa Suite',
    expectedClose: '05 Dec 2026',
    businessType: 'Resort Spa Suite',
    linkedLead: 'LD-2026-0034',
    scope: 'Complete luxury steam & Shirodhara setup',
    latestQuotation: {
      id: 'QT-0125',
      revision: 'Rev 2',
      sentOn: '15 Oct 2026',
      value: '₹7,20,000',
      status: { label: 'Approved', tone: 'success' },
    },
    nextAction: { kind: 'call', label: 'Review revised quotation Q-2', when: 'Tomorrow, 11:00 AM', tone: 'neutral' },
    activity: [
      { id: 'ACT-6', title: 'Quotation revised to Rev 2', by: 'Ritu Sharma', at: '15 Oct 2026', detail: 'Adjusted terms for luxury wood finish.', tone: 'neutral' },
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
    linkedLead: 'LD-2026-0030',
    scope: '8 Teak Wood Panchkarma Tables with brass bowls',
    nextAction: { kind: 'meeting', label: 'Payment terms discussion', when: 'Tomorrow, 02:00 PM', tone: 'neutral' },
    activity: [
      { id: 'ACT-7', title: 'Payment discussion initiated', by: 'Simran Kaur', at: 'Yesterday', detail: 'Client requested 40-40-20 payment structure.', tone: 'neutral' },
    ],
  },
];

function normalizeStage(stage?: string): PipelineStageKey {
  const s = String(stage || '').toLowerCase().trim();
  if (s.includes('prop') || s.includes('design')) return 'proposal';
  if (s.includes('quot') || s.includes('quote')) return 'quotation';
  if (s.includes('neg') || s.includes('clos')) return 'negotiation';
  return 'requirement';
}

function parseAmountToNumber(valStr?: string): number {
  if (!valStr) return 0;
  const cleaned = String(valStr).replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatRupeesInLakhs(totalRupees: number): string {
  if (totalRupees >= 100000) {
    return `₹${(totalRupees / 100000).toFixed(1)}L`;
  }
  return `₹${totalRupees.toLocaleString('en-IN')}`;
}

async function ensureSeedData() {
  try {
    const count = await OpportunityModel.countDocuments({ isDeleted: { $ne: true } });
    if (count === 0) {
      await OpportunityModel.insertMany(INITIAL_OPPORTUNITIES);
    }
  } catch (err: any) {
    console.warn('[CRM Opportunities] Seed warning:', err?.message);
  }
}

export const opportunitiesService = {
  async getPipeline(): Promise<SalesPipeline> {
    await ensureSeedData();

    const dbOpps = await OpportunityModel.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const cards: (PipelineCard & { stageKey: PipelineStageKey; rawValue: number })[] = dbOpps.map((o: any) => {
      const stageKey = normalizeStage(o.stage);
      const rawValue = parseAmountToNumber(o.value);
      const next = o.nextAction || { kind: 'call', label: 'Follow up with client', when: 'Tomorrow', tone: 'neutral' };

      return {
        id: o.id,
        title: o.title || 'Opportunity',
        client: o.client || 'Client',
        city: o.city || 'Delhi NCR',
        value: o.value || '₹5,00,000',
        owner: o.owner || 'Simran Kaur',
        businessType: o.businessType || 'Equipment',
        closeBy: o.expectedClose || 'Next Month',
        expectedClose: o.expectedClose,
        team: o.salesTeam,
        nextAction: {
          kind: next.kind || 'call',
          label: next.label || 'Follow-up',
          when: next.when || 'Tomorrow',
          tone: next.tone || 'neutral',
        },
        stageKey,
        rawValue,
      };
    });

    const requirementCards = cards.filter((c) => c.stageKey === 'requirement');
    const proposalCards = cards.filter((c) => c.stageKey === 'proposal');
    const quotationCards = cards.filter((c) => c.stageKey === 'quotation');
    const negotiationCards = cards.filter((c) => c.stageKey === 'negotiation');

    const totalPipelineValueNum = cards.reduce((sum, c) => sum + c.rawValue, 0);

    const calcColVal = (items: typeof cards) => {
      const sum = items.reduce((acc, curr) => acc + curr.rawValue, 0);
      return formatRupeesInLakhs(sum);
    };

    return {
      kpis: {
        openOpportunities: cards.length,
        pipelineValue: formatRupeesInLakhs(totalPipelineValueNum),
        closingThisMonth: Math.max(1, cards.filter((c) => c.closeBy && c.closeBy.includes('Nov')).length),
        overdueNextActions: 1,
      },
      columns: [
        { key: 'requirement', title: 'Requirement Analysis', deals: requirementCards.length, value: calcColVal(requirementCards), cards: requirementCards },
        { key: 'proposal', title: 'Design & Proposal', deals: proposalCards.length, value: calcColVal(proposalCards), cards: proposalCards },
        { key: 'quotation', title: 'Quotation Sent', deals: quotationCards.length, value: calcColVal(quotationCards), cards: quotationCards },
        { key: 'negotiation', title: 'Negotiation & Closing', deals: negotiationCards.length, value: calcColVal(negotiationCards), cards: negotiationCards },
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
    await ensureSeedData();

    let opp = await OpportunityModel.findOne({ id, isDeleted: { $ne: true } }).lean();
    if (!opp && id.match(/^[0-9a-fA-F]{24}$/)) {
      opp = await OpportunityModel.findById(id).lean();
    }
    if (!opp) {
      opp = INITIAL_OPPORTUNITIES.find((o) => o.id === id) as any;
    }

    if (!opp) {
      throw new Error(`Opportunity ${id} not found`);
    }

    // Try finding real linked quotation from QuotationModel
    const linkedQuote = await QuotationModel.findOne({
      $or: [
        { opportunity: new RegExp(opp.id, 'i') },
        { 'client.name': opp.client },
      ],
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 }).lean().catch(() => null);

    let latestQuotation: { id: string; revision: string; sentOn: string; value: string; status: StatusView };

    if (linkedQuote) {
      let tone: StatusView['tone'] = 'neutral';
      if (linkedQuote.status === 'Accepted' || linkedQuote.status === 'Approved') tone = 'success';
      else if (linkedQuote.status === 'Sent') tone = 'accent';
      else if (linkedQuote.status === 'Awaiting approval') tone = 'warning';

      latestQuotation = {
        id: linkedQuote.id,
        revision: `Rev ${linkedQuote.revision || 1}`,
        sentOn: linkedQuote.date || 'Recently',
        value: linkedQuote.totalAmount ? `₹${linkedQuote.totalAmount.toLocaleString('en-IN')}` : opp.value,
        status: {
          label: linkedQuote.status || 'Draft',
          tone,
        },
      };
    } else if (opp.latestQuotation && opp.latestQuotation.id) {
      let tone: StatusView['tone'] = 'neutral';
      const rawTone = opp.latestQuotation.status?.tone;
      if (rawTone === 'success' || rawTone === 'danger' || rawTone === 'warning' || rawTone === 'accent' || rawTone === 'neutral') {
        tone = rawTone;
      }
      latestQuotation = {
        id: opp.latestQuotation.id,
        revision: opp.latestQuotation.revision || 'Rev 1',
        sentOn: opp.latestQuotation.sentOn || '',
        value: opp.latestQuotation.value || opp.value,
        status: {
          label: opp.latestQuotation.status?.label || 'Draft',
          tone,
        },
      };
    } else {
      latestQuotation = {
        id: 'QT-2026-0130',
        revision: 'Rev 1',
        sentOn: '18 Nov 2026',
        value: opp.value || '₹5,00,000',
        status: { label: 'In Preparation', tone: 'neutral' },
      };
    }

    const stageDisplayMap: Record<string, string> = {
      requirement: 'Requirement Analysis',
      proposal: 'Design & Proposal',
      quotation: 'Quotation Sent',
      negotiation: 'Negotiation & Closing',
    };

    const mappedActivity: Array<{ id: string; title: string; by: string; at: string; detail: string; tone: 'success' | 'neutral' }> =
      Array.isArray(opp.activity) && opp.activity.length > 0
        ? opp.activity.map((a: any) => ({
            id: a.id || 'ACT',
            title: a.title || 'Activity',
            by: a.by || 'Simran Kaur',
            at: a.at || 'Recently',
            detail: a.detail || '',
            tone: a.tone === 'success' ? ('success' as const) : ('neutral' as const),
          }))
        : [
            { id: 'ACT-1', title: 'Opportunity registered', by: opp.owner || 'Simran Kaur', at: 'Recently', detail: opp.scope || 'Initial opportunity created.', tone: 'neutral' as const },
          ];

    return {
      id: opp.id,
      title: opp.title,
      client: opp.client,
      contact: opp.contact || 'Primary Contact',
      city: opp.city || 'Delhi NCR',
      value: opp.value,
      stage: stageDisplayMap[normalizeStage(opp.stage)] || opp.stage || 'Requirement Analysis',
      owner: opp.owner || 'Simran Kaur',
      salesTeam: opp.salesTeam || 'Sales',
      expectedClose: opp.expectedClose || 'Next Month',
      businessType: opp.businessType || 'Equipment Sales',
      linkedLead: opp.linkedLead || '',
      scope: opp.scope || 'Scope and requirements for this client opportunity.',
      latestQuotation,
      activity: mappedActivity,
    };
  },

  async create(data: Record<string, unknown>): Promise<{ id: string }> {
    await ensureSeedData();

    const title = String(data.title || data.name || 'New Opportunity').trim();
    const linkTo = String(data.linkTo || 'lead');
    const leadId = String(data.leadId || '');

    let client = String(data.client || data.clientName || '').trim();
    let contact = String(data.contact || '').trim();
    let city = String(data.city || '').trim();

    if (linkTo === 'lead' && leadId) {
      const lead = await LeadModel.findOne({
        $or: [{ _id: leadId.match(/^[0-9a-fA-F]{24}$/) ? leadId : null }, { _id: null }],
      }).lean().catch(() => null);

      if (lead) {
        if (!client) client = lead.companyName || `${lead.firstName} ${lead.lastName || ''}`.trim() || 'Client';
        if (!contact) contact = `${lead.firstName} ${lead.lastName || ''}`.trim();
        if (!city) city = lead.city || 'Delhi NCR';

        // Update lead with estimated deal value
        if (data.estimatedValue) {
          await LeadModel.findByIdAndUpdate(lead._id, {
            estimatedDealValue: `₹${Number(data.estimatedValue).toLocaleString('en-IN')}`,
            expectedClosingDate: data.expectedClose ? String(data.expectedClose) : undefined,
          }).catch(() => {});
        }
      }
    } else if (linkTo === 'client' && leadId) {
      const clientDoc = await ClientModel.findOne({
        $or: [{ _id: leadId.match(/^[0-9a-fA-F]{24}$/) ? leadId : null }, { _id: null }],
      }).lean().catch(() => null);

      if (clientDoc) {
        if (!client) client = clientDoc.name || 'Client';
        if (!contact) contact = clientDoc.contact || 'Primary Contact';
        if (!city) city = clientDoc.city || 'Delhi NCR';
      }
    }

    if (!client) client = 'Ayurveda Client';

    const count = await OpportunityModel.countDocuments();
    const id = generateDocumentNumber('opportunity', 91 + count);

    const rawVal = data.estimatedValue || data.value;
    const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^\d.]/g, '')) || 0;
    const value = numVal > 0 ? `₹${numVal.toLocaleString('en-IN')}` : '₹3,50,000';

    const stage = normalizeStage(String(data.stage || 'requirement'));
    const owner = String(data.owner || 'Simran Kaur');
    const salesTeam = String(data.salesTeam || 'Equipment Sales');
    const expectedClose = String(data.expectedClose || 'Next Month');
    const businessType = String(data.businessType || 'Equipment Sales');
    const scope = String(data.scope || data.description || 'Client requirement and proposal discussion');

    const nextActionKind = String(data.nextAction || 'call').toLowerCase();
    const nextActionLabel = String(data.followUpNote || `${data.nextAction || 'Call'} with client`).trim();
    const nextActionWhen = data.dueDate ? `${data.dueDate} ${data.dueTime || ''}`.trim() : 'Tomorrow, 11:00 AM';

    const newOpp = await OpportunityModel.create({
      id,
      title,
      client,
      contact,
      city: city || 'Delhi NCR',
      value,
      stage,
      owner,
      salesTeam,
      expectedClose,
      businessType,
      linkedLead: leadId || '',
      scope,
      nextAction: {
        kind: nextActionKind,
        label: nextActionLabel,
        when: nextActionWhen,
        tone: 'neutral',
      },
      latestQuotation: {
        id: '',
        revision: 'Rev 1',
        sentOn: '',
        value,
        status: { label: 'Draft', tone: 'neutral' },
      },
      activity: [
        {
          id: `ACT-${Date.now().toString().slice(-4)}`,
          title: 'Opportunity created',
          by: owner,
          at: 'Just now',
          detail: scope,
          tone: 'neutral',
        },
      ],
      isDeleted: false,
    });

    return { id: newOpp.id };
  },

  async update(id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const opp = await OpportunityModel.findOneAndUpdate(
      { id, isDeleted: { $ne: true } },
      { $set: data },
      { new: true }
    );
    return { id: opp?.id || id };
  },

  async updateStage(id: string, data: any): Promise<{ id: string }> {
    const stage = normalizeStage(data?.stage);
    const reason = String(data?.reason || `Moved stage to ${data?.stage || stage}`);
    const by = String(data?.by || 'Simran Kaur');

    const newActivity = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      title: `Stage updated to ${data?.stage || stage}`,
      by,
      at: 'Just now',
      detail: reason,
      tone: 'neutral' as const,
    };

    const opp = await OpportunityModel.findOneAndUpdate(
      { id },
      {
        $set: { stage },
        $push: { activity: newActivity },
      },
      { new: true }
    );

    return { id: opp?.id || id };
  },

  async logActivity(id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    return this.addActivity(id, data);
  },

  async addActivity(id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const actId = 'ACT-' + Math.floor(1000 + Math.random() * 9000);
    const actTitle = String(data.type || data.channel || 'Activity') + (data.outcome ? ` · ${data.outcome}` : '');
    const by = String(data.handledBy || data.by || data.owner || 'Simran Kaur');
    const detail = String(data.notes || data.summary || data.text || '');

    const newActivity = {
      id: actId,
      title: actTitle,
      by,
      at: 'Just now',
      detail,
      tone: 'neutral' as const,
    };

    // Save directly to the opportunity document
    await OpportunityModel.findOneAndUpdate(
      { id },
      { $push: { activity: { $each: [newActivity], $position: 0 } } }
    );

    // Also push to dashboard activities in CrmRecord
    try {
      const dashDoc = await CrmRecord.findOne({ key: 'dashboard.activities' }).lean().catch(() => null);
      const currentDash = Array.isArray((dashDoc as any)?.data) ? (dashDoc as any).data : [];
      const dashActivity = {
        id: `act-${Date.now().toString().slice(-4)}`,
        at: 'Just now',
        by,
        text: `${actTitle}: ${detail.slice(0, 80)}`,
        module: 'Sales',
      };
      await CrmRecord.findOneAndUpdate(
        { key: 'dashboard.activities' },
        { key: 'dashboard.activities', data: [dashActivity, ...currentDash] },
        { upsert: true, new: true }
      );
    } catch {}

    return { id: actId };
  },

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await OpportunityModel.findOneAndUpdate(
      { id },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || null } }
    );
  },

  async restore(id: string): Promise<{ id: string }> {
    await OpportunityModel.findOneAndUpdate(
      { id },
      { $set: { isDeleted: false, deletedAt: null, deletedBy: null } }
    );
    return { id };
  },
};
export default opportunitiesService;
