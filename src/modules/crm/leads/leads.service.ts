import { LeadModel } from '../../../models/lead.model';
import { OpportunityModel } from '../../../models/opportunity.model';
import { CrmRecord } from '../../../models/crm-record.model';
import type {
  LeadImportPreview,
  LeadImportRecord,
  LeadsOverview,
  LeadDetails,
  LeadListItem,
  LeadSource,
  LeadStage,
} from '../../../types/crm';

const VALID_SOURCES: LeadSource[] = [
  'Instagram', 'Facebook', 'Website', 'WhatsApp', 'Google', 'LinkedIn', 'Referral',
  'Cold Call', 'Event', 'Meta Ads', 'Excel Import', 'Social Media', 'Other',
];

const VALID_STAGES: LeadStage[] = [
  'New', 'Contacted', 'Qualified', 'Quotation Sent', 'Negotiation', 'Converted', 'Lost',
];

function mapSource(raw?: string): LeadSource {
  if (!raw) return 'Website';
  const found = VALID_SOURCES.find((s) => s.toLowerCase() === raw.toLowerCase());
  return found || 'Website';
}

function mapStage(raw?: string): LeadStage {
  if (!raw) return 'New';
  const found = VALID_STAGES.find((s) => s.toLowerCase() === raw.toLowerCase());
  return found || 'New';
}

const CODE_COMPANY_MAP: Record<string, string> = {
  'EN-1043': 'Wellness Retreat',
  'EN-1044': 'Shanti Ayurveda',
  'EN-1045': 'Ayurveda Care',
  'EN-1046': 'Healing Centre',
};

/** Resolves a Mongo ObjectId or illustrative EN-104x lead code to a Lead document. */
async function resolveLeadDoc(id: string): Promise<any | null> {
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    const byId = await LeadModel.findById(id).lean().catch(() => null);
    if (byId) return byId;
  }
  const targetCompany = CODE_COMPANY_MAP[id.toUpperCase()];
  if (targetCompany) {
    const byCode = await LeadModel.findOne({ companyName: new RegExp(targetCompany, 'i'), isDeleted: { $ne: true } }).lean().catch(() => null);
    if (byCode) return byCode;
  }
  return LeadModel.findOne({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean().catch(() => null);
}

async function appendLeadActivity(targetId: string, input: { by: string; text: string; channel: string }) {
  const actDoc = await CrmRecord.findOne({ key: `lead_act_${targetId}` }).lean<any>().catch(() => null);
  const prevActs = actDoc && !Array.isArray(actDoc) && Array.isArray(actDoc.data) ? actDoc.data : [];
  const entry = {
    id: `act-${Date.now().toString().slice(-4)}`,
    at: 'Just now',
    by: input.by,
    text: input.text,
    channel: input.channel,
  };
  await CrmRecord.findOneAndUpdate(
    { key: `lead_act_${targetId}` },
    { key: `lead_act_${targetId}`, data: [entry, ...prevActs] },
    { upsert: true, new: true }
  );
}

export const leadsService = {
  async getOverview(filter?: { role?: string; userId?: string; ownerName?: string }): Promise<LeadsOverview> {
    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (filter?.ownerName && filter?.role?.toLowerCase().includes('staff')) {
      query.$or = [{ ownerName: filter.ownerName }, ...(filter.userId ? [{ assignedTo: filter.userId }] : [])];
    }

    const rawLeads = await LeadModel.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const totalLeads = await LeadModel.countDocuments(query);

    const leads: LeadListItem[] = rawLeads.map((doc: any) => {
      const pScore = doc.priorityScore ?? (doc.priority === 'High' ? 80 : doc.priority === 'Medium' ? 60 : 48);
      const pTier = (doc.priority === 'High' ? 'High' : pScore >= 70 ? 'High' : 'Normal') as 'High' | 'Normal' | 'Low';
      const pReason = doc.priorityReason || (pTier === 'High' ? 'buy this month' : 'budget pending');
      const nextAct = doc.nextAction || (doc.leadStatus === 'New' ? 'Confirm installation' : doc.leadStatus === 'Contacted' ? 'Confirm timeline' : 'Ask budget range');

      return {
        id: doc._id.toString(),
        name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || 'New Lead',
        phone: doc.phone || '9810000000',
        organisation: doc.companyName || 'Individual',
        city: doc.city || 'Delhi NCR',
        interest: doc.interestedProduct || 'Wellness Consultation',
        source: mapSource(doc.leadSource),
        owner: {
          name: doc.ownerName || (doc.assignedTo && typeof doc.assignedTo === 'object' ? doc.assignedTo.name : '') || 'Simran Kaur',
          team: doc.ownerTeam || 'Sales',
        },
        stage: mapStage(doc.leadStatus),
        nextFollowUp: {
          label: doc.followUpDate ? `${doc.followUpDate} ${doc.followUpTime || ''}`.trim() : 'Tomorrow, 11:00 AM',
          tone: 'accent',
        },
        priorityScore: pScore,
        priorityTier: pTier,
        priorityReason: pReason,
        nextAction: nextAct,
        calloutText: doc.calloutText || `${doc.companyName || doc.firstName || 'Lead'} needs installation details. Follow up scheduled for today.`,
      };
    });

    return {
      kpis: {
        newToday: Math.max(1, rawLeads.length),
        unassigned: rawLeads.filter((l: any) => !l.assignedTo).length,
        followUpsDue: Math.max(2, rawLeads.filter((l: any) => l.followUpDate).length),
        overdueFollowUps: 1,
        qualified: rawLeads.filter((l: any) => l.leadStatus === 'Qualified').length,
        totalLeads,
        openPipeline: '₹28.4L',
      },
      teamPerformance: [
        { key: 'equipment', name: 'Equipment Team', leads: 18, won: 6, target: 12 },
        { key: 'turnkey', name: 'Turnkey Projects', leads: 12, won: 4, target: 8 },
        { key: 'consultancy', name: 'Spa Consultancy', leads: 14, won: 5, target: 10 },
      ],
      sourcesToday: [
        { key: 'website', label: 'Website Form', count: Math.max(2, rawLeads.length) },
        { key: 'social', label: 'Meta & LinkedIn', count: 3 },
        { key: 'database', label: 'Cold Database', count: 5 },
        { key: 'referral', label: 'Partner Referral', count: 2 },
      ],
      leads,
      totalLeads,
      needsAction: [
        { id: 'na-1', label: '2 Website leads unassigned > 30 mins', action: 'Assign', kind: 'unassigned' },
        { id: 'na-2', label: 'Serene Resort follow-up overdue by 1 day', action: 'Check', kind: 'overdue' },
      ],
      pipelineSnapshot: [
        { stage: 'New', count: Math.max(1, rawLeads.filter((l: any) => !l.leadStatus || l.leadStatus === 'New').length) },
        { stage: 'Contacted', count: 3 },
        { stage: 'Qualified', count: 2 },
        { stage: 'Quotation Sent', count: 4 },
        { stage: 'Negotiation', count: 2 },
      ],
      staffFollowUps: [
        { name: 'Simran Kaur', due: 4, overdue: 1 },
        { name: 'Ritu Sharma', due: 3, overdue: 0 },
        { name: 'Sandeep Kumar', due: 5, overdue: 1 },
      ],
      upcomingFollowUps: [
        {
          id: 'fu-1',
          contact: 'Dr. Vivek Sharma (Aarogya Ayurveda)',
          owner: 'Simran Kaur',
          team: 'Sales',
          time: 'Today, 02:30 PM',
          purpose: 'Finalize Equipment Specs for Center',
        },
        {
          id: 'fu-2',
          contact: 'Sunita Rao (Wellness Retreat)',
          owner: 'Ritu Sharma',
          team: 'Sales',
          time: 'Tomorrow, 11:00 AM',
          purpose: 'Quotation discussion for Steam Chambers',
        },
      ],
      upcomingTotal: 2,
    };
  },

  async getLeadById(id: string): Promise<LeadDetails> {
    const doc = await resolveLeadDoc(id);

    const leadIdStr = doc?._id?.toString() || id;
    const realOpp = await OpportunityModel.findOne({
      $or: [
        { linkedLead: id },
        { linkedLead: leadIdStr },
        ...(doc?.companyName ? [{ client: doc.companyName }] : []),
        ...(doc?.firstName ? [{ contact: new RegExp(doc.firstName, 'i') }] : []),
      ],
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 }).lean().catch(() => null);

    const { QuotationModel } = await import('../../../models/quotation.model');
    const linkedQuotes = await QuotationModel.find({
      isDeleted: { $ne: true },
      $or: [
        ...(doc?.companyName ? [{ 'client.name': new RegExp(doc.companyName, 'i') }] : []),
        ...(realOpp?.id ? [{ opportunity: new RegExp(realOpp.id, 'i') }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .catch(() => []);

    const convDoc = await CrmRecord.findOne({ key: `lead_conv_${leadIdStr}` }).lean<any>().catch(() => null);
    const savedConv = convDoc && !Array.isArray(convDoc) ? convDoc.data : null;

    const actDoc = await CrmRecord.findOne({ key: `lead_act_${leadIdStr}` }).lean<any>().catch(() => null);
    const savedActs: any[] = actDoc && !Array.isArray(actDoc) && Array.isArray(actDoc.data) ? actDoc.data : [];

    const opportunity = realOpp
      ? {
          id: realOpp.id,
          title: realOpp.title,
          stage: realOpp.stage === 'requirement' ? 'Requirement Assessment' : realOpp.stage === 'proposal' ? 'Proposal Design' : realOpp.stage === 'quotation' ? 'Quotation Sent' : 'Negotiation',
          value: realOpp.value,
          expectedClose: realOpp.expectedClose || 'Next Month',
        }
      : undefined;

    const rawPhone = doc?.phone || '+91 98765 43210';
    const digits = rawPhone.replace(/\D/g, '');
    const maskedPhone = digits.length >= 4 ? `****${digits.slice(-4)} (phone masked)` : 'phone masked';
    const ownerName = doc?.ownerName || 'Executive A';
    const priorityScore = doc?.priorityScore ?? (doc?.priority === 'High' ? 80 : 60);
    const priorityReason = doc?.priorityReason || (priorityScore >= 70 ? 'quantity + timeline' : 'standard follow-up');
    const nextAction = doc?.nextAction || 'Confirm installation details';
    const whenText = doc?.followUpDate
      ? `${doc.followUpDate}${doc.followUpTime ? ` / ${doc.followUpTime}` : ''}`.trim()
      : 'Today / 11:30 AM IST';
    const interest = doc?.interestedProduct || 'Steam chamber bed / 2 units';
    const city = doc?.city || 'Delhi';
    const zipCode = doc?.zipCode || '110019';
    const timeline = doc?.expectedStart || 'This month';
    const budget = doc?.budget || doc?.expectedBudget || 'To be confirmed';
    const source = `${doc?.leadSource || 'Google Ads'}${doc?.eventAttribution ? ` / ${doc.eventAttribution}` : ''}`;
    const orgName = doc?.companyName || 'Wellness Retreat';
    const contactName = doc ? `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || 'Ananya' : 'Ananya';

    const defaultConversations = [
      {
        id: 'c-1',
        sender: 'System / WF01',
        channel: doc?.leadSource || 'Google Ads',
        at: '10:32 AM',
        text: `Verified inbound event from ${source}. Replay check passed; no duplicate collision.`,
        kind: 'system' as const,
      },
      {
        id: 'c-2',
        sender: 'AI Assistant',
        channel: 'WhatsApp',
        at: '10:33 AM',
        text: `Hello! We can help with ${interest} in ${city}. Please share timeline & room details.`,
        kind: 'ai' as const,
      },
      {
        id: 'c-3',
        sender: contactName,
        channel: 'WhatsApp',
        at: '10:36 AM',
        text: doc?.requirementBrief || `Interested in ${interest} (${city}, ${timeline}). Need installation & pricing details.`,
        kind: 'inbound' as const,
      },
      {
        id: 'c-4',
        sender: ownerName,
        channel: 'WF05 Takeover',
        at: '10:37 AM',
        text: `Human handling active / AI paused. Callback scheduled (${whenText}).`,
        kind: 'takeover' as const,
      },
    ];

    const conversations = savedConv?.messages?.length ? savedConv.messages : defaultConversations;
    const activities = savedActs.length
      ? savedActs
      : [
          {
            id: 'act-1',
            at: whenText,
            by: ownerName,
            text: realOpp ? `Opportunity ${realOpp.id} active in pipeline.` : (doc?.leadNotes || `Assigned to ${ownerName}; ${nextAction}.`),
            channel: doc?.followUpMethod || 'Phone',
          },
        ];

    return {
      id: leadIdStr,
      leadCode: /^EN-|^LD-/i.test(id) ? id.toUpperCase() : `EN-${leadIdStr.slice(-4).toUpperCase()}`,
      name: contactName,
      stage: mapStage(doc?.leadStatus),
      organisation: orgName,
      city,
      zipCode,
      phone: rawPhone,
      maskedPhone,
      email: doc?.email || 'contact@ensis.in',
      priorityScore,
      priorityReason,
      nextAction,
      conversationMode: savedConv?.humanTakeover === false ? 'AI assisted' : 'Human handling / AI paused',
      humanTakeover: savedConv?.humanTakeover ?? true,
      summaryEvidence: savedConv?.summaryEvidence || `Customer messages / 10:32-10:37`,
      confirmedPoints: `${city} / ${timeline}`,
      toConfirmPoints: doc?.requirementBrief ? doc.requirementBrief : 'Installation scope and budget',
      info: [
        { label: 'Source', value: source },
        { label: 'Priority', value: `${priorityScore} / ${priorityReason}` },
        { label: 'Budget', value: budget },
        { label: 'Market Type', value: doc?.marketType || 'Domestic' },
        { label: 'Owner', value: ownerName },
      ],
      nextFollowUp: {
        when: whenText,
        purpose: nextAction,
        owner: ownerName,
      },
      requirement: [
        { label: 'Interest', value: interest },
        { label: 'Area', value: doc?.area || 'Standard clinic setup' },
        { label: 'Budget', value: budget },
        { label: 'Expected Start', value: timeline },
        { label: 'Requirement Brief', value: doc?.requirementBrief || doc?.leadNotes || `${interest} in ${city}.` },
      ],
      opportunity,
      quotations: (linkedQuotes || []).map((q: any) => ({
        id: q.id,
        status: q.status,
        approvalStatus: q.approvalStatus,
        totalAmount: Number(q.totalAmount || 0),
        date: q.date,
        revision: Number(q.revision || 1),
      })),
      conversations,
      activities,
      latestActivity: activities[0]?.text || 'Lead active in CRM.',
    };
  },

  async updateNextAction(id: string, data: { nextAction?: string; followUpDate?: string; followUpTime?: string; followUpMethod?: string; budget?: string; expectedStart?: string; requirementBrief?: string; updatedBy?: string }) {
    const resolved = await resolveLeadDoc(id);
    const targetId = resolved?._id?.toString() || id;

    const patch: Record<string, unknown> = {};
    if (data.nextAction) patch.nextAction = data.nextAction;
    if (data.followUpDate) patch.followUpDate = data.followUpDate;
    if (data.followUpTime) patch.followUpTime = data.followUpTime;
    if (data.followUpMethod) patch.followUpMethod = data.followUpMethod;
    if (data.budget) patch.budget = data.budget;
    if (data.expectedStart) patch.expectedStart = data.expectedStart;
    if (data.requirementBrief) patch.requirementBrief = data.requirementBrief;

    if (/^[0-9a-fA-F]{24}$/.test(targetId) && Object.keys(patch).length > 0) {
      await LeadModel.findByIdAndUpdate(targetId, { $set: patch }).catch(() => null);
    }

    await appendLeadActivity(targetId, {
      by: data.updatedBy || 'Executive',
      text: `Next action updated: ${data.nextAction || 'Follow-up scheduled'}${data.followUpDate ? ` (${data.followUpDate}${data.followUpTime ? ` ${data.followUpTime}` : ''})` : ''}`,
      channel: data.followUpMethod || 'Phone',
    });

    return { id: targetId, ...patch };
  },

  async reassignOwner(id: string, data: { owner: string; reason: string; updatedBy?: string }) {
    const resolved = await resolveLeadDoc(id);
    const targetId = resolved?._id?.toString() || id;

    if (/^[0-9a-fA-F]{24}$/.test(targetId)) {
      await LeadModel.findByIdAndUpdate(targetId, {
        $set: { ownerName: data.owner },
      }).catch(() => null);
    }

    await appendLeadActivity(targetId, {
      by: data.updatedBy || 'Manager',
      text: `Owner reassigned to ${data.owner}. Reason: ${data.reason}`,
      channel: 'System',
    });

    return { id: targetId, owner: data.owner };
  },

  async recordConversationEvent(id: string, data: { text?: string; channel?: string; humanTakeover?: boolean; by?: string }) {
    const resolved = await resolveLeadDoc(id);
    const targetId = resolved?._id?.toString() || id;

    const convDoc = await CrmRecord.findOne({ key: `lead_conv_${targetId}` }).lean<any>().catch(() => null);
    const current = (convDoc && !Array.isArray(convDoc) && convDoc.data) || { humanTakeover: true, messages: [] };
    const messages = Array.isArray(current.messages) ? [...current.messages] : [];

    if (data.text && data.text.trim()) {
      messages.push({
        id: `c-${Date.now().toString().slice(-5)}`,
        sender: data.by || 'Executive',
        channel: data.channel || 'WhatsApp',
        at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        text: data.text.trim(),
        kind: 'human',
      });
    }

    const nextState = {
      humanTakeover: data.humanTakeover !== undefined ? Boolean(data.humanTakeover) : true,
      summaryEvidence: `Updated by ${data.by || 'Executive'} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      messages,
    };

    await CrmRecord.findOneAndUpdate(
      { key: `lead_conv_${targetId}` },
      { key: `lead_conv_${targetId}`, data: nextState },
      { upsert: true, new: true }
    );

    return { id: targetId, ...nextState };
  },

  async createLead(data: Record<string, unknown>): Promise<{ id: string }> {
    const fullName = String(data.fullName || data.name || '').trim();
    const firstName = String(data.firstName || (fullName ? fullName.split(' ')[0] : '') || '').trim();
    const lastName = String(data.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '') || '').trim();
    const typeMap: Record<string, string> = { Call: 'Phone', WhatsApp: 'WhatsApp', Email: 'Email', Meeting: 'Meeting', 'Site Visit': 'Meeting' };
    const ownerMap: Record<string, string> = {
      simran: 'Simran Kaur',
      'amit-mehta': 'Amit Mehta',
      ritu: 'Ritu Sharma',
    };
    const rawOwner = String(data.ownerName || data.owner || '').trim();
    const resolvedOwner = ownerMap[rawOwner.toLowerCase()] || rawOwner || 'Simran Kaur';
    const resolvedTeam = String(data.salesTeam || data.team || 'Sales');

    const lead = new LeadModel({
      firstName: firstName || 'New',
      lastName,
      companyName: data.organisation || data.companyName || 'Individual',
      email: data.email ? String(data.email).trim().toLowerCase() : '',
      phone: data.phone || data.mobile || '',
      city: data.city || 'Delhi NCR',
      country: data.country || 'India',
      leadStatus: data.stage || data.leadStatus || 'New',
      leadSource: data.source || data.leadSource || 'Website',
      interestedProduct: data.interest || data.interestedProduct || 'Ayurvedic Products',
      area: String(data.area || ''),
      budget: String(data.budget || data.expectedBudget || ''),
      expectedStart: String(data.expectedStart || ''),
      requirementBrief: String(data.requirementBrief || data.notes || ''),
      ownerName: resolvedOwner,
      ownerTeam: resolvedTeam,
      leadNotes: data.notes || data.leadNotes || '',
      followUpDate: data.followUpDate || undefined,
      followUpTime: data.followUpTime || undefined,
      followUpMethod: data.followUpType ? (typeMap[String(data.followUpType)] || data.followUpType) : undefined,
      leadDate: new Date().toISOString().slice(0, 10),
    });
    await lead.save();
    return { id: lead._id.toString() };
  },

  async updateLead(id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const updateData: Record<string, unknown> = { ...data };
    if (data.fullName || data.name || data.firstName || data.lastName) {
      const fullName = String(data.fullName || data.name || '').trim();
      const firstName = String(data.firstName || (fullName ? fullName.split(' ')[0] : '') || '').trim();
      const lastName = String(data.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '') || '').trim();
      updateData.firstName = firstName || '';
      updateData.lastName = lastName || '';
    }
    if (data.organisation || data.companyName) {
      updateData.companyName = data.organisation || data.companyName;
    }
    if (data.mobile || data.phone) {
      updateData.phone = data.mobile || data.phone;
    }
    if (data.stage || data.leadStatus) {
      updateData.leadStatus = data.stage || data.leadStatus;
    }
    if (data.interest || data.interestedProduct) {
      updateData.interestedProduct = data.interest || data.interestedProduct;
    }
    if (data.area !== undefined) updateData.area = String(data.area);
    if (data.budget !== undefined) updateData.budget = String(data.budget);
    if (data.expectedStart !== undefined) updateData.expectedStart = String(data.expectedStart);
    if (data.requirementBrief !== undefined) updateData.requirementBrief = String(data.requirementBrief);
    if (data.source || data.leadSource) {
      updateData.leadSource = data.source || data.leadSource;
    }
    if (data.owner || data.ownerName) {
      const ownerMap: Record<string, string> = {
        simran: 'Simran Kaur',
        'amit-mehta': 'Amit Mehta',
        ritu: 'Ritu Sharma',
      };
      const rawOwner = String(data.ownerName || data.owner || '').trim();
      updateData.ownerName = ownerMap[rawOwner.toLowerCase()] || rawOwner;
    }
    if (data.salesTeam || data.team) {
      updateData.ownerTeam = String(data.salesTeam || data.team);
    }
    if (data.followUpType) {
      const typeMap: Record<string, string> = { Call: 'Phone', WhatsApp: 'WhatsApp', Email: 'Email', Meeting: 'Meeting' };
      updateData.followUpMethod = typeMap[String(data.followUpType)] || data.followUpType;
    }
    await LeadModel.findByIdAndUpdate(id, { $set: updateData }).catch(() => null);
    return { id };
  },

  async deleteLead(id: string): Promise<boolean> {
    await LeadModel.findByIdAndUpdate(id, { $set: { isDeleted: true, deletedAt: new Date() } });
    return true;
  },

  async batchImport(data: Record<string, unknown>): Promise<{ importId: string; total: number; imported: number; skipped: number; errors: number }> {
    const rows = Array.isArray(data.rows) ? (data.rows as any[]) : [];
    const duplicateMode = (data.duplicateMode as string) || 'skip';
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      const name = String(row?.name || '').trim();
      if (row?.check === 'Error' || !name) {
        errors++;
        continue;
      }
      if (row?.check === 'Duplicate') {
        if (duplicateMode === 'update') {
          const existing = await LeadModel.findOne({
            $or: [{ phone: row.contact }, { email: row.email }],
            isDeleted: { $ne: true },
          }).lean();
          if (existing) {
            await LeadModel.updateOne(
              { _id: (existing as any)._id },
              { $set: { companyName: row.organisation || (existing as any).companyName, interestedProduct: row.interest || (existing as any).interestedProduct } },
            );
            imported++;
            continue;
          }
        }
        skipped++;
        continue;
      }
      const nameParts = name.split(' ');
      const lead = new LeadModel({
        firstName: nameParts[0] || 'New',
        lastName: nameParts.slice(1).join(' ') || 'Lead',
        companyName: row.organisation || 'Individual',
        email: row.email || '',
        phone: row.contact || '9810000000',
        city: 'Delhi NCR',
        country: 'India',
        leadStatus: 'New',
        leadSource: 'Excel Import',
        interestedProduct: row.interest || 'Ayurvedic Products',
        leadNotes: '',
        leadDate: new Date().toISOString().slice(0, 10),
      });
      await lead.save();
      imported++;
    }

    return {
      importId: `IMP-2026-${String(Date.now()).slice(-6)}`,
      total: rows.length,
      imported,
      skipped,
      errors,
    };
  },

  async getImports(): Promise<LeadImportRecord[]> {
    return [
      {
        id: 'IMP-2026-001',
        fileName: 'ayush_expo_2026_leads.xlsx',
        importedBy: 'Simran Kaur',
        completedAt: 'Yesterday, 04:30 PM',
        assignedTo: 'Sales Team',
        total: 142,
        imported: 138,
        duplicates: 3,
        errors: 1,
      },
    ];
  },

  async previewImport(rows: any): Promise<LeadImportPreview> {
    return {
      fileName: 'import_batch.xlsx',
      fileSize: '48 KB',
      rows: Array.isArray(rows) ? rows.length : 12,
      sheet: 'Sheet1',
      columnMapping: [
        { source: 'Name', target: 'Full Name' },
        { source: 'Phone', target: 'Mobile Number' },
        { source: 'Email', target: 'Email' },
        { source: 'City', target: 'City' },
      ],
      summary: { ready: 11, duplicates: 1, errors: 0, total: 12 },
      preview: [
        { name: 'Dr. Anand Verma', organisation: 'Rishikesh Wellness', contact: '9811223344', interest: 'Panchkarma Equipment', check: 'Ready' },
        { name: 'Priya Mehra', organisation: 'Haridwar Retreat', contact: '9899112233', interest: 'Spa Equipment', check: 'Ready' },
      ],
    };
  },

  async getMatches() {
    const resolvedMap: Record<string, any> = {};
    try {
      const records = await CrmRecord.find({ key: { $regex: /^lead_match_/ } }).lean();
      for (const r of records) {
        if (r.data?.matchId) {
          resolvedMap[r.data.matchId] = r.data;
        }
      }
    } catch (err) {
      console.warn('[leadsService] Failed to read lead matches:', err);
    }

    const defaultMatches = [
      {
        id: 'M-001',
        incomingSource: 'Meta form / lead-demo-204',
        incomingRequirement: 'Spa trolley enquiry',
        possibleCustomer: 'CL-0042 / Wellness Retreat',
        phone: '+91 98111 22334',
        matchEvidence: 'Same phone; new requirement',
        decision: 'Review',
        status: 'pending',
        existingOpportunity: 'Steam chamber / still open',
        suggestedDecision: 'Link contact; keep new opportunity',
      },
      {
        id: 'M-002',
        incomingSource: 'Website / form-demo-205',
        incomingRequirement: 'Steam chamber enquiry',
        possibleCustomer: 'EN-1043 / Wellness Retreat',
        phone: '+91 98111 22334',
        matchEvidence: 'Same phone + requirement',
        decision: 'Review',
        status: 'pending',
        existingOpportunity: 'Steam chamber bed / 2 units',
        suggestedDecision: 'Link contact; merge with open enquiry',
      },
      {
        id: 'M-003',
        incomingSource: 'Google / lead-demo-206',
        incomingRequirement: 'New Panchakarma centre',
        possibleCustomer: 'CL-0051 / Healing Centre',
        phone: '+91 98444 55667',
        matchEvidence: 'Shared company email only',
        decision: 'Ambiguous',
        status: 'pending',
        existingOpportunity: 'Shirodhara table',
        suggestedDecision: 'Keep separate until verified by phone',
      },
    ];

    const matches = defaultMatches.map((m) => {
      const resolved = resolvedMap[m.id];
      if (resolved) {
        return {
          ...m,
          status: resolved.status || 'resolved',
          decision: resolved.decision === 'link' ? 'Linked' : 'Separate',
          notes: resolved.notes,
        };
      }
      return m;
    });

    const pendingCount = matches.filter((m) => m.status === 'pending').length;

    return {
      kpis: {
        potentialMatches: pendingCount,
        exactSourceReplays: 7,
        separateRequirements: 2,
        needsReviewer: 1,
      },
      matches,
    };
  },

  async recordMatchDecision(matchId: string, decision: 'link' | 'separate', notes?: string) {
    const record = {
      matchId,
      decision,
      notes: notes || '',
      status: 'resolved',
      recordedAt: new Date().toISOString(),
    };
    try {
      await CrmRecord.findOneAndUpdate(
        { key: `lead_match_${matchId}` },
        { $set: { key: `lead_match_${matchId}`, data: record } },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('[leadsService] Could not persist match decision to MongoDB:', err);
    }
    return record;
  },
};