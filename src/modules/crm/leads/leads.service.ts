import { LeadModel } from '../../../models/lead.model';
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

export const leadsService = {
  async getOverview(): Promise<LeadsOverview> {
    const rawLeads = await LeadModel.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const totalLeads = await LeadModel.countDocuments({ isDeleted: { $ne: true } });

    const leads: LeadListItem[] = rawLeads.map((doc: any) => ({
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
    }));

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
    const doc: any = await LeadModel.findById(id).lean().catch(() => null);

    return {
      id,
      name: doc ? `${doc.firstName || ''} ${doc.lastName || ''}`.trim() : 'Aarogya Ayurveda Clinic',
      stage: mapStage(doc?.leadStatus),
      organisation: doc?.companyName || 'Aarogya Healthcare Ltd',
      city: doc?.city || 'Jaipur',
      phone: doc?.phone || '+91 98765 43210',
      email: doc?.email || 'contact@aarogyaayurveda.in',
      info: [
        { label: 'Source', value: doc?.leadSource || 'Website Form' },
        { label: 'Priority', value: doc?.priority || 'High' },
        { label: 'Budget', value: doc?.expectedBudget || '₹4,50,000' },
        { label: 'Market Type', value: doc?.marketType || 'Domestic' },
      ],
      nextFollowUp: {
        when: doc?.followUpDate ? `${doc.followUpDate} ${doc.followUpTime || ''}` : 'Today, 2:30 PM',
        purpose: 'Technical demonstration & quote review',
        owner: 'Simran Kaur',
      },
      requirement: [
        { label: 'Interest', value: doc?.interestedProduct || 'Panchkarma Clinic Setup' },
        { label: 'Area', value: doc?.area || '1,800 sqft' },
        { label: 'Budget', value: doc?.budget || doc?.expectedBudget || '₹15 – 20 L' },
        { label: 'Expected Start', value: doc?.expectedStart || 'Dec 2026' },
        { label: 'Requirement Brief', value: doc?.requirementBrief || doc?.leadNotes || 'Six-room clinic requiring equipment, interiors and installation.' },
      ],
      opportunity: {
        id: 'OP-2026-081',
        title: 'Turnkey Ayurvedic Center Setup',
        stage: 'Quotation Sent',
        value: doc?.estimatedDealValue || '₹4,50,000',
        expectedClose: '30 Nov 2026',
      },
      latestActivity: 'Quotation Q-2026-042 sent with 5% seasonal discount applied.',
    };
  },

  async createLead(data: Record<string, unknown>): Promise<{ id: string }> {
    const fullName = String(data.fullName || data.name || '').trim();
    const firstName = String(data.firstName || (fullName ? fullName.split(' ')[0] : '') || '').trim();
    const lastName = String(data.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '') || '').trim();
    const typeMap: Record<string, string> = { Call: 'Phone', WhatsApp: 'WhatsApp', Email: 'Email', Meeting: 'Meeting' };
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
      email: data.email || 'lead@example.com',
      phone: data.phone || data.mobile || '9810000000',
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
};