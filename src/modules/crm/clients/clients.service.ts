import { ClientModel } from '../../../models/client.model';
import { LeadModel } from '../../../models/lead.model';
import { OpportunityModel } from '../../../models/opportunity.model';
import { QuotationModel } from '../../../models/quotation.model';
import { SalesOrderModel } from '../../../models/sales-order.model';
import { InvoiceModel } from '../../../models/invoice.model';
import { ProjectModel } from '../../../models/project.model';
import { CrmRecord } from '../../../models/crm-record.model';
import { WhatsAppLog } from '../../../models/WhatsAppLog';
import type { CrmActorContext } from '../../../middlewares/crm-access.middleware';
import { ApiError } from '../../../utils/app-error';
import { escapeRegex } from '../../../utils/escape-regex';
import type { ClientsOverview, ClientDetails, ClientListItem } from '../../../types/crm';

export type ConsentState = 'yes' | 'pending' | 'opted_out';

export interface Customer360Preferences {
  preferredLanguage: string;
  preferredChannel: 'WhatsApp' | 'Email' | 'Phone';
  contactTime: string;
  timeZone: string;
  emailMarketingConsent: ConsentState;
  whatsappMarketingConsent: ConsentState;
  voiceConsent: ConsentState;
  channelOptOuts: string[];
  globalDoNotContact: boolean;
  stopNote?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Customer360SiteContact {
  id: string;
  siteName: string;
  contactName: string;
  role: string;
  phone: string;
  email: string;
  city: string;
  isPrimary: boolean;
}

export interface Customer360Data {
  id: string;
  clientCode: string;
  name: string;
  status: string;
  type: string;
  city: string;
  state: string;
  pincode: string;
  accountOwner: string;
  primaryBranchSite: string;
  primaryContact: string;
  phone: string;
  email: string;
  gstin: string;
  billingAddress: string;
  outstanding: string;
  activeOpportunitiesCount: number;
  distinctRequirementsCount: number;
  preferences: Customer360Preferences;
  latestQuotation: {
    id: string;
    revision: number;
    status: string;
    approvalStatus: string;
    totalAmount: number;
    date: string;
  } | null;
  latestOrder: {
    id: string;
    status: string;
    orderDate: string;
    value: string;
    dispatchDate?: string;
  } | null;
  serviceSummary: {
    openCount: number;
    closedCount: number;
    records: Array<{
      id: string;
      equipment: string;
      issue: string;
      status: string;
      assignedTo: string;
      responseDue: string;
    }>;
  };
  sitesAndContacts: Customer360SiteContact[];
  opportunities: Array<{
    id: string;
    title: string;
    stage: string;
    value: string;
    owner: string;
    expectedClose: string;
  }>;
  quotations: Array<{
    id: string;
    revision: number;
    status: string;
    approvalStatus: string;
    totalAmount: number;
    date: string;
  }>;
  orders: Array<{
    id: string;
    status: string;
    orderDate: string;
    value: string;
    deliverySite?: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    location: string;
    status: string;
    category: string;
  }>;
  conversations: Array<{
    id: string;
    sender: string;
    channel: string;
    at: string;
    text: string;
    kind: 'inbound' | 'human' | 'ai' | 'system';
  }>;
  activities: Array<{
    id: string;
    at: string;
    by: string;
    text: string;
    channel: string;
  }>;
  totals: {
    business: string;
    received: string;
    outstanding: string;
    overdue: string;
  };
  billing: {
    paymentTerms: string;
    latestInvoice: string;
  };
  nextAction: {
    when: string;
    description: string;
    owner: string;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    paymentReceived: number;
    dueDate: string;
  }>;
  files: Array<{
    id: string;
    name: string;
    kind: string;
    uploadedAt: string;
  }>;
}

function parseNumericAmount(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  const cleaned = String(raw || '').replace(/[^\d.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatInrCompact(amount: number): string {
  if (amount <= 0) return '₹0';
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatInrFull(raw: unknown): string {
  const num = parseNumericAmount(raw);
  if (num <= 0) return String(raw || '₹0');
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

function normalizeConsent(val: unknown, fallback: ConsentState = 'pending'): ConsentState {
  const s = String(val || '').toLowerCase();
  if (s === 'yes' || s === 'allowed' || s === 'true') return 'yes';
  if (s === 'opted_out' || s === 'no' || s === 'stop' || s === 'stopped') return 'opted_out';
  if (s === 'pending') return 'pending';
  return fallback;
}

function isObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/** Resolves a client from ClientModel or linked LeadModel strictly from MongoDB. */
async function resolveClientOrLead(id: string): Promise<{ source: 'client' | 'lead'; doc: any }> {
  const trimmed = decodeURIComponent(String(id || '')).trim();
  if (!trimmed) throw ApiError.notFound('Client identifier is required');

  let clientDoc: any = null;
  if (isObjectId(trimmed)) {
    clientDoc = await ClientModel.findOne({ _id: trimmed, isDeleted: { $ne: true } }).lean();
  }
  if (!clientDoc) {
    const safe = escapeRegex(trimmed);
    clientDoc = await ClientModel.findOne({
      isDeleted: { $ne: true },
      $or: [
        { linkedLead: trimmed },
        ...(isObjectId(trimmed) ? [{ linkedLeadId: trimmed }] : []),
        { name: new RegExp(`^${safe}`, 'i') },
      ],
    }).lean();
  }
  if (clientDoc) {
    return { source: 'client', doc: clientDoc };
  }

  let leadDoc: any = null;
  if (isObjectId(trimmed)) {
    leadDoc = await LeadModel.findOne({ _id: trimmed, isDeleted: { $ne: true } }).lean();
  }
  if (!leadDoc) {
    const safe = escapeRegex(trimmed);
    leadDoc = await LeadModel.findOne({
      isDeleted: { $ne: true },
      companyName: new RegExp(`^${safe}`, 'i'),
    }).lean();
  }
  if (leadDoc) {
    return { source: 'lead', doc: leadDoc };
  }

  throw ApiError.notFound('Client record not found in database');
}

function checkClientAccessScope(doc: any, source: 'client' | 'lead', actor?: CrmActorContext) {
  if (!actor || actor.roleTier !== 'user') return;
  const ownerField = source === 'client' ? doc.owner : doc.ownerName;
  const actorLower = (actor.name || '').trim().toLowerCase();
  const ownerLower = String(ownerField || '').trim().toLowerCase();
  const assignedToId = doc.assignedTo ? String(doc.assignedTo) : '';

  const isAssignedToActor =
    (actorLower && ownerLower && ownerLower === actorLower) ||
    (assignedToId && assignedToId === actor.id);

  if (!isAssignedToActor) {
    throw ApiError.forbidden('You only have access to your assigned client records');
  }
}

export const clientsService = {
  async getOverview(filter?: { roleTier?: 'superadmin' | 'manager' | 'user'; ownerName?: string }): Promise<ClientsOverview> {
    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (filter?.roleTier === 'user' && filter.ownerName) {
      query.owner = new RegExp(`^${escapeRegex(filter.ownerName)}$`, 'i');
    }

    const dbClients = await ClientModel.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    const mappedClients: ClientListItem[] = dbClients.map((c: any) => ({
      id: c._id.toString(),
      name: c.name || 'Client',
      contact: c.contact || 'Primary Contact',
      type: c.type || 'Ayurveda Clinic',
      city: c.city || 'Delhi NCR',
      owner: typeof c.owner === 'string' ? c.owner : c.owner?.name || 'Unassigned',
      activeWork: c.billingAddress || c.city || '',
      outstanding: c.outstanding || '₹0',
      nextFollowUp: {
        date: c.nextFollowUp?.date || 'Scheduled',
        time: c.nextFollowUp?.time || '',
        overdue: Boolean(c.nextFollowUp?.overdue),
      },
    }));

    const total = mappedClients.length;
    const totalOutstanding = dbClients.reduce((sum: number, c: any) => sum + parseNumericAmount(c.outstanding), 0);
    const totalOverdue = dbClients
      .filter((c: any) => c.nextFollowUp?.overdue)
      .reduce((sum: number, c: any) => sum + parseNumericAmount(c.outstanding), 0);

    const assignedCount = dbClients.filter((c: any) => Boolean(c.owner && String(c.owner).trim())).length;
    const unassignedCount = Math.max(0, total - assignedCount);

    const equipCount = dbClients.filter((c: any) => /clinic|hospital|spa|equipment/i.test(String(c.type || ''))).length;
    const turnkeyCount = dbClients.filter((c: any) => /resort|turnkey|retreat|centre|center/i.test(String(c.type || ''))).length;
    const consultCount = Math.max(0, total - equipCount - turnkeyCount);

    const needsAttention = dbClients
      .filter((c: any) => parseNumericAmount(c.outstanding) > 0 || c.nextFollowUp?.overdue)
      .slice(0, 4)
      .map((c: any) => ({
        id: c._id.toString(),
        count: 1,
        label: `${c.name}: outstanding ${formatInrFull(c.outstanding)}${c.nextFollowUp?.overdue ? ' (follow-up overdue)' : ''}`,
      }));

    const upcomingActions = dbClients
      .filter((c: any) => c.nextFollowUp?.date || c.owner)
      .slice(0, 6)
      .map((c: any) => ({
        id: c._id.toString(),
        client: c.name,
        city: c.city || 'India',
        action: 'Account follow-up & requirement review',
        owner: c.owner || 'Unassigned',
        due: c.nextFollowUp?.date ? `${c.nextFollowUp.date}${c.nextFollowUp.time ? `, ${c.nextFollowUp.time}` : ''}` : 'Scheduled',
        status: {
          label: c.nextFollowUp?.overdue ? 'Overdue' : 'Scheduled',
          tone: c.nextFollowUp?.overdue ? ('danger' as const) : ('accent' as const),
        },
      }));

    return {
      kpis: {
        total,
        active: total,
        outstanding: formatInrCompact(totalOutstanding),
        overdue: formatInrCompact(totalOverdue),
      },
      clients: mappedClients,
      total,
      needsAttention,
      coverage: { assigned: assignedCount, unassigned: unassignedCount },
      businessMix: [
        { key: 'equipment', label: 'Equipment', count: equipCount },
        { key: 'turnkey', label: 'Turnkey', count: turnkeyCount },
        { key: 'consultancy', label: 'Consultancy', count: consultCount },
      ],
      upcomingActions,
    };
  },

  async getById(id: string): Promise<ClientDetails> {
    const c360 = await this.getCustomer360(id);
    const salesRecords = [
      ...c360.quotations.map((q) => ({
        id: q.id,
        type: 'Quotation',
        typeNote: `Rev ${q.revision}`,
        description: `Quotation (${q.approvalStatus})`,
        value: formatInrFull(q.totalAmount),
        status: {
          label: q.status,
          tone: q.status === 'Approved' || q.status === 'Accepted' ? ('success' as const) : ('neutral' as const),
        },
      })),
      ...c360.orders.map((o) => ({
        id: o.id,
        type: 'Sales Order',
        typeNote: o.status,
        description: o.deliverySite ? `Delivery: ${o.deliverySite}` : 'Confirmed Order',
        value: o.value,
        status: { label: o.status, tone: 'success' as const },
      })),
    ];

    const activeWork = c360.orders.map((o) => ({
      orderNo: o.id,
      description: o.deliverySite ? `Order delivery to ${o.deliverySite}` : 'Equipment Order',
      value: o.value,
      status: { label: o.status, tone: 'success' as const },
      dispatchTarget: c360.accountOwner,
    }));

    return {
      id: c360.id,
      name: c360.name,
      status: c360.status,
      contact: c360.primaryContact,
      phone: c360.phone,
      email: c360.email,
      type: c360.type,
      city: c360.city,
      totals: {
        business: formatInrFull(
          c360.orders.reduce((sum, o) => sum + parseNumericAmount(o.value), 0) ||
            c360.quotations.reduce((sum, q) => sum + q.totalAmount, 0),
        ),
        received: '₹0',
        outstanding: c360.outstanding,
        overdue: '₹0',
      },
      activeWork,
      salesRecords,
      activity: c360.activities.map((a) => ({
        id: a.id,
        date: a.at,
        time: '',
        activity: a.text,
        details: a.channel,
        by: a.by,
      })),
      nextAction: {
        when: c360.preferences.contactTime,
        description: c360.opportunities[0]?.title || 'Follow up on customer preferences & active requirements',
        owner: c360.accountOwner,
      },
      billing: {
        paymentTerms: 'As per approved quotation terms',
        latestInvoice: c360.latestOrder ? `${c360.latestOrder.id} (${c360.latestOrder.status})` : 'No order yet',
      },
    };
  },

  async getCustomer360(id: string, actor?: CrmActorContext): Promise<Customer360Data> {
    const { source, doc } = await resolveClientOrLead(id);
    checkClientAccessScope(doc, source, actor);

    const recordId = doc._id.toString();
    const clientCode = `CL-${recordId.slice(-4).toUpperCase()}`;
    const name = source === 'client' ? doc.name : (doc.companyName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim());
    const contactName = source === 'client'
      ? (doc.contact || 'Primary Contact')
      : (`${doc.firstName || ''} ${doc.lastName || ''}`.trim() || name);
    const phone = String(doc.phone || '');
    const email = String(doc.email || '');
    const city = String(doc.city || '');
    const state = String(doc.state || '');
    const pincode = String(doc.pincode || doc.zipCode || '');
    const owner = source === 'client' ? (doc.owner || 'Unassigned') : (doc.ownerName || 'Unassigned');

    const safeName = escapeRegex(name);
    const namePattern = safeName ? new RegExp(safeName, 'i') : null;

    // 1. Linked Leads
    const leadOrConds: any[] = [];
    if (source === 'lead') leadOrConds.push({ _id: doc._id });
    if (doc.linkedLeadId) leadOrConds.push({ _id: doc.linkedLeadId });
    if (namePattern) leadOrConds.push({ companyName: namePattern });
    if (email) leadOrConds.push({ email: email.toLowerCase() });
    if (phone) leadOrConds.push({ phone });

    const linkedLeads = leadOrConds.length
      ? await LeadModel.find({ isDeleted: { $ne: true }, $or: leadOrConds }).sort({ createdAt: -1 }).lean()
      : [];
    const leadIds = linkedLeads.map((l: any) => l._id.toString());

    // 2. Opportunities
    const oppOrConds: any[] = [];
    if (namePattern) oppOrConds.push({ client: namePattern });
    if (leadIds.length) oppOrConds.push({ linkedLead: { $in: leadIds } });
    const rawOpps = oppOrConds.length
      ? await OpportunityModel.find({ isDeleted: { $ne: true }, $or: oppOrConds }).sort({ createdAt: -1 }).lean()
      : [];

    const activeOpps = rawOpps.filter((o: any) => !['won', 'lost'].includes(String(o.stage || '').toLowerCase()));
    const distinctReqs = new Set(
      [
        ...activeOpps.map((o: any) => String(o.title || '').trim()),
        ...linkedLeads.map((l: any) => String(l.interestedProduct || '').trim()),
      ].filter(Boolean),
    );

    // 3. Quotations
    const quoteOrConds: any[] = [{ 'client.id': recordId }];
    if (namePattern) quoteOrConds.push({ 'client.name': namePattern });
    if (email) quoteOrConds.push({ 'client.email': email.toLowerCase() });
    const rawQuotes = await QuotationModel.find({
      isDeleted: { $ne: true },
      $or: quoteOrConds,
    }).sort({ createdAt: -1 }).limit(20).lean();

    const quotations = rawQuotes.map((q: any) => ({
      id: q.id,
      revision: Number(q.revision || 1),
      status: String(q.status || 'Draft'),
      approvalStatus: String(q.approvalStatus || 'Draft'),
      totalAmount: Number(q.totalAmount || 0),
      date: String(q.date || ''),
    }));

    // 4. Orders
    const orderOrConds: any[] = [{ clientId: recordId }];
    if (namePattern) orderOrConds.push({ client: namePattern });
    const rawOrders = await SalesOrderModel.find({
      isDeleted: { $ne: true },
      $or: orderOrConds,
    }).sort({ createdAt: -1 }).limit(20).lean();

    const orders = rawOrders.map((o: any) => ({
      id: o.id,
      status: String(o.status || 'Confirmed'),
      orderDate: String(o.orderDate || ''),
      value: formatInrFull(o.value),
      dispatchDate: o.dispatchDate ? String(o.dispatchDate) : undefined,
      deliverySite: o.deliverySite ? String(o.deliverySite) : undefined,
    }));

    // 5. Projects
    const rawProjects = namePattern
      ? await ProjectModel.find({ client: namePattern }).sort({ createdAt: -1 }).limit(10).lean()
      : [];
    const projects = rawProjects.map((p: any) => ({
      id: p._id.toString(),
      title: String(p.title || ''),
      location: String(p.location || ''),
      status: String(p.status || 'ongoing'),
      category: String(p.category || ''),
    }));

    // 6. Service records from persisted CrmRecord ('service.tickets') + companyTasks for this client
    const serviceDoc = await CrmRecord.findOne({ key: 'service.tickets' }).lean<any>();
    const rawServiceRows: any[] =
      serviceDoc && !Array.isArray(serviceDoc) && Array.isArray(serviceDoc.data?.rows)
        ? serviceDoc.data.rows
        : serviceDoc && !Array.isArray(serviceDoc) && Array.isArray(serviceDoc.data)
          ? serviceDoc.data
          : [];
    const matchingService = rawServiceRows.filter((r: any) =>
      namePattern ? namePattern.test(String(r.client || r.customer || '')) : false,
    );
    const closedCount = matchingService.filter((r: any) => /closed|resolved|done/i.test(String(r.status?.label || r.status || ''))).length;
    const openCount = Math.max(0, matchingService.length - closedCount);

    // 7. Preferences from CrmRecord
    const prefsDoc = await CrmRecord.findOne({ key: `client_prefs_${recordId}` }).lean<any>();
    const savedPrefs = prefsDoc && !Array.isArray(prefsDoc) && prefsDoc.data ? prefsDoc.data : {};
    const channelOptOuts: string[] = Array.isArray(savedPrefs.channelOptOuts) ? savedPrefs.channelOptOuts.map(String) : [];

    const preferences: Customer360Preferences = {
      preferredLanguage: String(savedPrefs.preferredLanguage || 'Hindi / English'),
      preferredChannel:
        savedPrefs.preferredChannel === 'Email' || savedPrefs.preferredChannel === 'Phone'
          ? savedPrefs.preferredChannel
          : 'WhatsApp',
      contactTime: String(savedPrefs.contactTime || '10:00 AM-6:00 PM'),
      timeZone: String(savedPrefs.timeZone || 'Asia/Kolkata'),
      emailMarketingConsent: normalizeConsent(savedPrefs.emailMarketingConsent, 'pending'),
      whatsappMarketingConsent: normalizeConsent(savedPrefs.whatsappMarketingConsent, 'pending'),
      voiceConsent: normalizeConsent(savedPrefs.voiceConsent, 'pending'),
      channelOptOuts,
      globalDoNotContact: Boolean(savedPrefs.globalDoNotContact),
      stopNote: savedPrefs.stopNote ? String(savedPrefs.stopNote) : undefined,
      updatedAt: savedPrefs.updatedAt ? String(savedPrefs.updatedAt) : undefined,
      updatedBy: savedPrefs.updatedBy ? String(savedPrefs.updatedBy) : undefined,
    };

    // 8. Sites & Contacts derived from real ClientModel + linked LeadModel + saved extra contacts
    const sitesAndContacts: Customer360SiteContact[] = [
      {
        id: `site-primary-${recordId}`,
        siteName: doc.billingAddress || `${city || 'Primary'} clinic / primary site`,
        contactName,
        role: 'Primary Contact',
        phone,
        email,
        city: [city, state, pincode].filter(Boolean).join(', '),
        isPrimary: true,
      },
    ];
    if (doc.deliverySameAsBilling === false || doc.consigneeAddress || doc.consigneeName) {
      sitesAndContacts.push({
        id: `site-delivery-${recordId}`,
        siteName: doc.consigneeAddress || 'Delivery / Consignee Site',
        contactName: doc.consigneeName || contactName,
        role: 'Site / Delivery Contact',
        phone: doc.consigneeContact || phone,
        email,
        city: [city, state].filter(Boolean).join(', '),
        isPrimary: false,
      });
    }
    for (const l of linkedLeads) {
      const lName = `${l.firstName || ''} ${l.lastName || ''}`.trim();
      if (lName && lName.toLowerCase() !== contactName.toLowerCase()) {
        sitesAndContacts.push({
          id: `lead-contact-${l._id.toString()}`,
          siteName: l.addressLine || `${l.city || city || 'Branch'} enquiry site`,
          contactName: lName,
          role: l.designation || 'Enquiry Contact',
          phone: l.phone || phone,
          email: l.email || email,
          city: [l.city, l.state, l.zipCode].filter(Boolean).join(', '),
          isPrimary: false,
        });
      }
    }

    // 9. Conversations from client_conv_<id>, lead_conv_<leadId>, and WhatsAppLog
    const convKeys = [`client_conv_${recordId}`, ...leadIds.map((lid) => `lead_conv_${lid}`)];
    const convDocs = await CrmRecord.find({ key: { $in: convKeys } }).lean<any[]>();
    const conversations: Customer360Data['conversations'] = [];
    for (const cd of convDocs) {
      const msgs = Array.isArray(cd?.data?.messages) ? cd.data.messages : [];
      for (const m of msgs) {
        conversations.push({
          id: String(m.id || `${cd.key}-${conversations.length}`),
          sender: String(m.sender || 'Executive'),
          channel: String(m.channel || 'WhatsApp'),
          at: String(m.at || ''),
          text: String(m.text || ''),
          kind: m.kind === 'system' || m.kind === 'ai' || m.kind === 'inbound' ? m.kind : 'human',
        });
      }
    }
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length >= 7) {
      const waLogs = await WhatsAppLog.find({ recipient: new RegExp(digits) }).sort({ sentAt: -1 }).limit(10).lean();
      for (const w of waLogs) {
        conversations.push({
          id: w._id.toString(),
          sender: w.name || 'ENSIS System',
          channel: 'WhatsApp',
          at: w.sentAt ? new Date(w.sentAt).toLocaleString('en-IN') : '',
          text: w.message,
          kind: 'system',
        });
      }
    }

    // 10. Activities from client_act_<id> & lead_act_<leadId>
    const actKeys = [`client_act_${recordId}`, ...leadIds.map((lid) => `lead_act_${lid}`)];
    const actDocs = await CrmRecord.find({ key: { $in: actKeys } }).lean<any[]>();
    const activities: Customer360Data['activities'] = [];
    for (const ad of actDocs) {
      const list = Array.isArray(ad?.data) ? ad.data : [];
      for (const item of list) {
        activities.push({
          id: String(item.id || `act-${activities.length}`),
          at: String(item.at || ''),
          by: String(item.by || owner),
          text: String(item.text || ''),
          channel: String(item.channel || 'Sales'),
        });
      }
    }

    // 11. Invoices & financial totals (real InvoiceModel + SalesOrderModel + QuotationModel)
    const invOrConds: any[] = [];
    if (leadIds.length) invOrConds.push({ lead: { $in: leadIds } });
    if (namePattern) invOrConds.push({ 'billingAddress.name': namePattern });
    if (email) invOrConds.push({ 'billingAddress.email': email.toLowerCase() });
    const rawInvoices = invOrConds.length
      ? await InvoiceModel.find({ $or: invOrConds, status: { $ne: 'cancelled' } })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      : [];

    const invoices = rawInvoices.map((inv: any) => ({
      id: inv._id.toString(),
      invoiceNumber: String(inv.invoiceNumber || ''),
      status: String(inv.status || 'draft'),
      totalAmount: Number(inv.totalAmount || 0),
      paymentReceived: Number(inv.paymentReceived ?? inv.paymentDetails?.amountReceived ?? 0),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '',
    }));

    const orderBusinessSum = rawOrders.reduce((s: number, o: any) => s + parseNumericAmount(o.value), 0);
    const invBusinessSum = rawInvoices.reduce((s: number, inv: any) => s + Number(inv.totalAmount || 0), 0);
    const quoteBusinessSum = rawQuotes.reduce((s: number, q: any) => s + Number(q.totalAmount || 0), 0);
    const totalBusinessNum = invBusinessSum || orderBusinessSum || quoteBusinessSum;
    const totalReceivedNum = rawInvoices.reduce(
      (s: number, inv: any) => s + Number(inv.paymentReceived ?? inv.paymentDetails?.amountReceived ?? 0),
      0,
    );
    const invOutstandingNum = rawInvoices.reduce((s: number, inv: any) => {
      const rem = inv.paymentDetails?.outstandingAmount ?? Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paymentReceived || 0));
      return s + Math.max(0, Number(rem || 0));
    }, 0);
    const clientOutstandingNum = source === 'client' ? parseNumericAmount(doc.outstanding) : 0;
    const totalOutstandingNum = invOutstandingNum || clientOutstandingNum;
    const totalOverdueNum = rawInvoices
      .filter((inv: any) => inv.status === 'overdue')
      .reduce((s: number, inv: any) => {
        const rem = inv.paymentDetails?.outstandingAmount ?? Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paymentReceived || 0));
        return s + Math.max(0, Number(rem || 0));
      }, 0);

    const latestInv = rawInvoices[0];
    const latestQuoteDoc = rawQuotes[0];
    const paymentTerms =
      latestInv?.paymentDetails?.paymentTerms ||
      latestQuoteDoc?.terms?.payment ||
      'As per approved quotation terms';
    const latestInvoiceLabel = latestInv
      ? `${latestInv.invoiceNumber} (${latestInv.status}${Number(latestInv.paymentReceived || 0) > 0 ? ` · Paid ${formatInrFull(latestInv.paymentReceived)}` : ''})`
      : 'No invoice generated yet';

    const filesDoc = await CrmRecord.findOne({ key: `client_files_${recordId}` }).lean<any>();
    const files: Customer360Data['files'] =
      filesDoc && !Array.isArray(filesDoc) && Array.isArray(filesDoc.data) ? filesDoc.data : [];

    const nextWhen = doc.nextFollowUp?.date
      ? `${doc.nextFollowUp.date}${doc.nextFollowUp.time ? `, ${doc.nextFollowUp.time}` : ''}`
      : (doc.followUpDate ? `${doc.followUpDate}${doc.followUpTime ? `, ${doc.followUpTime}` : ''}` : preferences.contactTime);
    const nextDesc =
      activeOpps[0]?.nextAction?.label ||
      linkedLeads[0]?.nextAction ||
      activeOpps[0]?.title ||
      'Review customer requirement and communication preferences';

    const primaryBranchSite = doc.billingAddress
      ? doc.billingAddress
      : city
        ? `${city} / primary site`
        : 'Primary site';

    return {
      id: recordId,
      clientCode,
      name,
      status: source === 'client' ? 'Active' : String(doc.leadStatus || 'Enquiry'),
      type: String(doc.type || doc.industrySector || 'Wellness Client'),
      city,
      state,
      pincode,
      accountOwner: owner,
      primaryBranchSite,
      primaryContact: contactName,
      phone,
      email,
      gstin: String(doc.gstin || ''),
      billingAddress: String(doc.billingAddress || ''),
      outstanding: formatInrFull(totalOutstandingNum),
      activeOpportunitiesCount: activeOpps.length || (source === 'lead' ? 1 : 0),
      distinctRequirementsCount: Math.max(distinctReqs.size, activeOpps.length),
      preferences,
      latestQuotation: quotations[0] || null,
      latestOrder: orders[0] || null,
      serviceSummary: {
        openCount,
        closedCount,
        records: matchingService.map((r: any, idx: number) => ({
          id: String(r.id || `SR-${idx + 1}`),
          equipment: String(r.equipment || 'Equipment'),
          issue: String(r.issue || r.subject || 'Service record'),
          status: String(r.status?.label || r.status || 'Open'),
          assignedTo: String(r.assignedTo || owner),
          responseDue: String(r.responseDue?.label || r.responseDue || ''),
        })),
      },
      sitesAndContacts,
      opportunities: rawOpps.map((o: any) => ({
        id: o.id,
        title: o.title,
        stage: o.stage,
        value: String(o.value || '₹0'),
        owner: String(o.owner || owner),
        expectedClose: String(o.expectedClose || ''),
      })),
      quotations,
      orders,
      projects,
      conversations,
      activities,
      totals: {
        business: formatInrFull(totalBusinessNum),
        received: formatInrFull(totalReceivedNum),
        outstanding: formatInrFull(totalOutstandingNum),
        overdue: formatInrFull(totalOverdueNum),
      },
      billing: {
        paymentTerms: String(paymentTerms),
        latestInvoice: latestInvoiceLabel,
      },
      nextAction: {
        when: nextWhen,
        description: String(nextDesc),
        owner,
      },
      invoices,
      files,
    };
  },

  async updatePreferences(
    id: string,
    data: Partial<Customer360Preferences>,
    actor?: CrmActorContext,
  ): Promise<Customer360Preferences> {
    const { source, doc } = await resolveClientOrLead(id);
    checkClientAccessScope(doc, source, actor);

    const recordId = doc._id.toString();
    const existingDoc = await CrmRecord.findOne({ key: `client_prefs_${recordId}` }).lean<any>();
    const prev = existingDoc && !Array.isArray(existingDoc) && existingDoc.data ? existingDoc.data : {};

    const channelOptOuts = Array.isArray(data.channelOptOuts)
      ? data.channelOptOuts.map(String)
      : Array.isArray(prev.channelOptOuts)
        ? prev.channelOptOuts.map(String)
        : [];

    const nextPrefs: Customer360Preferences = {
      preferredLanguage: String(data.preferredLanguage || prev.preferredLanguage || 'Hindi / English').trim(),
      preferredChannel:
        data.preferredChannel === 'Email' || data.preferredChannel === 'Phone' || data.preferredChannel === 'WhatsApp'
          ? data.preferredChannel
          : (prev.preferredChannel || 'WhatsApp'),
      contactTime: String(data.contactTime || prev.contactTime || '10:00 AM-6:00 PM').trim(),
      timeZone: String(data.timeZone || prev.timeZone || 'Asia/Kolkata').trim(),
      emailMarketingConsent: normalizeConsent(data.emailMarketingConsent ?? prev.emailMarketingConsent, 'pending'),
      whatsappMarketingConsent: normalizeConsent(data.whatsappMarketingConsent ?? prev.whatsappMarketingConsent, 'pending'),
      voiceConsent: normalizeConsent(data.voiceConsent ?? prev.voiceConsent, 'pending'),
      channelOptOuts,
      globalDoNotContact:
        data.globalDoNotContact !== undefined ? Boolean(data.globalDoNotContact) : Boolean(prev.globalDoNotContact),
      stopNote: data.stopNote !== undefined ? String(data.stopNote) : (prev.stopNote || undefined),
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || 'CRM User',
    };

    await CrmRecord.findOneAndUpdate(
      { key: `client_prefs_${recordId}` },
      { key: `client_prefs_${recordId}`, data: nextPrefs },
      { upsert: true, new: true },
    );

    const actDoc = await CrmRecord.findOne({ key: `client_act_${recordId}` }).lean<any>();
    const prevActs = actDoc && !Array.isArray(actDoc) && Array.isArray(actDoc.data) ? actDoc.data : [];
    const entry = {
      id: `act-${Date.now().toString().slice(-5)}`,
      at: new Date().toLocaleString('en-IN'),
      by: actor?.name || 'CRM User',
      text: `Updated communication preferences (${nextPrefs.preferredChannel}, ${nextPrefs.preferredLanguage}${nextPrefs.globalDoNotContact ? ', Global Do-Not-Contact ON' : ''}).`,
      channel: 'Preferences',
    };
    await CrmRecord.findOneAndUpdate(
      { key: `client_act_${recordId}` },
      { key: `client_act_${recordId}`, data: [entry, ...prevActs] },
      { upsert: true, new: true },
    );

    return nextPrefs;
  },

  async recordConversation(
    id: string,
    data: { text?: string; channel?: string },
    actor?: CrmActorContext,
  ) {
    const { source, doc } = await resolveClientOrLead(id);
    checkClientAccessScope(doc, source, actor);

    const text = String(data.text || '').trim();
    if (!text) throw ApiError.badRequest('Conversation message text is required');

    const recordId = doc._id.toString();
    const convDoc = await CrmRecord.findOne({ key: `client_conv_${recordId}` }).lean<any>();
    const current = convDoc && !Array.isArray(convDoc) && convDoc.data ? convDoc.data : { messages: [] };
    const messages = Array.isArray(current.messages) ? [...current.messages] : [];
    const msg = {
      id: `c-${Date.now().toString().slice(-6)}`,
      sender: actor?.name || 'Executive',
      channel: String(data.channel || 'WhatsApp'),
      at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      text,
      kind: 'human',
    };
    messages.push(msg);

    await CrmRecord.findOneAndUpdate(
      { key: `client_conv_${recordId}` },
      { key: `client_conv_${recordId}`, data: { messages } },
      { upsert: true, new: true },
    );

    return msg;
  },

  async create(data: Record<string, unknown>): Promise<{ id: string }> {
    const ownerName: string = typeof data.owner === 'string' ? data.owner : (String(data.ownerName || '') || 'Simran Kaur');
    const client = new ClientModel({
      name: data.name || data.fullName || 'New Client',
      contact: data.contact || data.primaryContact || data.name || 'Primary Contact',
      phone: data.phone || data.mobile || '9810000000',
      email: data.email || data.officialEmail || 'client@example.com',
      type: data.type || data.clientType || 'Clinic',
      pincode: data.pincode || '',
      city: data.city || 'Delhi NCR',
      state: data.state || '',
      owner: ownerName,
      outstanding: data.outstanding || '0',
      linkedLead: typeof data.linkedLead === 'string' ? data.linkedLead : '',
      gstin: data.gstin || '',
      panNumber: data.panNumber || '',
      isGstRegistered: data.isGstRegistered ?? Boolean(data.gstin),
      gstAddress: data.gstAddress || '',
      billingAddress: data.billingAddress || '',
      deliverySameAsBilling: data.deliverySameAsBilling ?? true,
      consigneeName: data.consigneeName || '',
      consigneeContact: data.consigneeContact || '',
      consigneeAddress: data.consigneeAddress || '',
      consigneeGstin: data.consigneeGstin || '',
    });
    await client.save();
    return { id: client._id.toString() };
  },

  async update(id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    await ClientModel.findByIdAndUpdate(id, { $set: data }).catch(() => null);
    return { id };
  },

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await ClientModel.findByIdAndUpdate(id, {
      $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || 'system' },
    }).catch(() => null);
  },

  async restore(id: string): Promise<void> {
    await ClientModel.findByIdAndUpdate(id, {
      $set: { isDeleted: false, deletedAt: null, deletedBy: null },
    }).catch(() => null);
  },
};
