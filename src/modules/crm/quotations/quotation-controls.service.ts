import crypto from 'crypto';
import { CrmRecord } from '../../../models/crm-record.model';
import { QuotationModel, IQuotationLine } from '../../../models/quotation.model';
import { SalesOrderModel } from '../../../models/sales-order.model';
import { CrmActorContext } from '../../../middlewares/crm-access.middleware';

export interface ApprovedPricingConfig {
  priceListVersion: string;
  effectiveFrom: string;
  validThrough: string;
  managerDiscountLimitPercent: number;
  includeFreightInTaxBase: boolean;
  includeInstallationInTaxBase: boolean;
  defaultGstPercent: number;
  roundingMode: 'paise' | 'nearest_rupee';
}

export interface ChannelTemplatePolicy {
  name: string;
  channel: 'email' | 'whatsapp' | 'voice';
  businessApproval: 'Approved' | 'Pending' | 'Rejected';
  providerApproval: 'Approved' | 'Pending' | 'Rejected';
}

export interface ChannelProviderConfig {
  email: {
    adapterConfigured: boolean;
    spfVerified: boolean;
    dkimVerified: boolean;
    verifiedSenders: string[];
    suppressedEmails: string[];
  };
  whatsapp: {
    adapterConfigured: boolean;
    requireProviderAdapter: boolean;
    businessPolicyCompliant: boolean;
    replyWindowHours: number;
    suppressedPhones: string[];
  };
  voice: {
    adapterConfigured: boolean;
    supportedNumberConfigured: boolean;
    providerSupported: boolean;
    dndCheckEnabled: boolean;
    disclosureIntroduction: string;
    recordingTreatment: 'announced_consent' | 'disabled' | 'masked';
    suppressedPhones: string[];
  };
  frequencyCapPer24h: number;
  preferredWindow: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
  templates: ChannelTemplatePolicy[];
}

export interface QuotationCalculationResult {
  subtotal: number;
  discount: number;
  discountPercent: number;
  discountRatio: number;
  shipping: number;
  installation: number;
  taxable: number;
  tax: number;
  total: number;
  advance: number;
  balance: number;
  configVersion: string;
}

export interface BlockerItem {
  code:
    | 'UNKNOWN_DELIVERY_CHARGES'
    | 'CUSTOM_SCOPE_COSTING_REQUIRED'
    | 'EXPIRED_RATE_OR_VALIDITY'
    | 'CHANGED_SPECIFICATION'
    | 'MISSING_REVIEWER_OR_APPROVAL'
    | 'INVALID_CHANNEL_ELIGIBILITY'
    | 'STOP_AWARE_HOLD'
    | 'OWNERSHIP_CONFLICT';
  message: string;
  ownerDepartment: string;
  assignedOwner: string;
}

export const DEFAULT_PRICING_CONFIG: ApprovedPricingConfig = {
  priceListVersion: 'Equipment / V2026.11',
  effectiveFrom: '2026-11-01',
  validThrough: '2026-11-30',
  managerDiscountLimitPercent: 5,
  includeFreightInTaxBase: true,
  includeInstallationInTaxBase: true,
  defaultGstPercent: 18,
  roundingMode: 'paise',
};

export const DEFAULT_CHANNEL_CONFIG: ChannelProviderConfig = {
  email: {
    adapterConfigured: true,
    spfVerified: true,
    dkimVerified: true,
    verifiedSenders: ['sales@ensis.in (verified)', 'support@ensis.in (verified)', 'info@ensis.in (verified)', 'sales@ensis.in', 'support@ensis.in', 'info@ensis.in'],
    suppressedEmails: [],
  },
  whatsapp: {
    adapterConfigured: Boolean(process.env.OPUS_API_KEY),
    requireProviderAdapter: false,
    businessPolicyCompliant: true,
    replyWindowHours: 24,
    suppressedPhones: [],
  },
  voice: {
    adapterConfigured: false,
    supportedNumberConfigured: false,
    providerSupported: false,
    dndCheckEnabled: true,
    disclosureIntroduction: 'Hello, this is a call from ENSIS One sales & automation team (recorded for quality).',
    recordingTreatment: 'announced_consent',
    suppressedPhones: [],
  },
  frequencyCapPer24h: 3,
  preferredWindow: {
    startHour: 8,
    endHour: 21,
    timezone: 'Asia/Kolkata',
  },
  templates: [
    { name: 'Quotation with Payment Terms', channel: 'email', businessApproval: 'Approved', providerApproval: 'Approved' },
    { name: 'Quotation – Short', channel: 'email', businessApproval: 'Approved', providerApproval: 'Approved' },
    { name: 'Revised Quotation', channel: 'email', businessApproval: 'Approved', providerApproval: 'Approved' },
    { name: 'Quotation with Payment Terms', channel: 'whatsapp', businessApproval: 'Approved', providerApproval: 'Approved' },
    { name: 'Quotation – Short', channel: 'whatsapp', businessApproval: 'Approved', providerApproval: 'Approved' },
    { name: 'Revised Quotation', channel: 'whatsapp', businessApproval: 'Approved', providerApproval: 'Approved' },
    { name: 'Quotation delivery / provider pending', channel: 'whatsapp', businessApproval: 'Approved', providerApproval: 'Pending' },
  ],
};

export function round2(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function applyRounding(value: number, mode: ApprovedPricingConfig['roundingMode']): number {
  return mode === 'nearest_rupee' ? Math.round(value) : round2(value);
}

export async function getApprovedPricingConfig(): Promise<ApprovedPricingConfig> {
  try {
    const doc = await CrmRecord.findOne({ key: 'quotations.pricingConfig' }).lean<any>();
    if (doc && !Array.isArray(doc) && doc.data && typeof doc.data === 'object') {
      return { ...DEFAULT_PRICING_CONFIG, ...doc.data };
    }
    await CrmRecord.findOneAndUpdate(
      { key: 'quotations.pricingConfig' },
      { key: 'quotations.pricingConfig', data: DEFAULT_PRICING_CONFIG },
      { upsert: true, new: true }
    );
  } catch {
    // Fallback to default config if DB unavailable during unit tests
  }
  return DEFAULT_PRICING_CONFIG;
}

export async function saveApprovedPricingConfig(patch: Partial<ApprovedPricingConfig>): Promise<ApprovedPricingConfig> {
  const current = await getApprovedPricingConfig();
  const next = { ...current, ...patch };
  await CrmRecord.findOneAndUpdate(
    { key: 'quotations.pricingConfig' },
    { key: 'quotations.pricingConfig', data: next },
    { upsert: true, new: true }
  );
  return next;
}

export async function getChannelProviderConfig(): Promise<ChannelProviderConfig> {
  try {
    const doc = await CrmRecord.findOne({ key: 'quotations.channelConfig' }).lean<any>();
    if (doc && !Array.isArray(doc) && doc.data && typeof doc.data === 'object') {
      return {
        ...DEFAULT_CHANNEL_CONFIG,
        ...doc.data,
        email: { ...DEFAULT_CHANNEL_CONFIG.email, ...(doc.data.email || {}) },
        whatsapp: { ...DEFAULT_CHANNEL_CONFIG.whatsapp, ...(doc.data.whatsapp || {}) },
        voice: { ...DEFAULT_CHANNEL_CONFIG.voice, ...(doc.data.voice || {}) },
        templates: Array.isArray(doc.data.templates) ? doc.data.templates : DEFAULT_CHANNEL_CONFIG.templates,
      };
    }
    await CrmRecord.findOneAndUpdate(
      { key: 'quotations.channelConfig' },
      { key: 'quotations.channelConfig', data: DEFAULT_CHANNEL_CONFIG },
      { upsert: true, new: true }
    );
  } catch {
    // Fallback for unit tests
  }
  return DEFAULT_CHANNEL_CONFIG;
}

export async function saveChannelProviderConfig(patch: Partial<ChannelProviderConfig>): Promise<ChannelProviderConfig> {
  const current = await getChannelProviderConfig();
  const next: ChannelProviderConfig = {
    ...current,
    ...patch,
    email: { ...current.email, ...(patch.email || {}) },
    whatsapp: { ...current.whatsapp, ...(patch.whatsapp || {}) },
    voice: { ...current.voice, ...(patch.voice || {}) },
    templates: Array.isArray(patch.templates) ? patch.templates : current.templates,
  };
  await CrmRecord.findOneAndUpdate(
    { key: 'quotations.channelConfig' },
    { key: 'quotations.channelConfig', data: next },
    { upsert: true, new: true }
  );
  return next;
}

/**
 * Approved quotation total calculation engine:
 * Matches developer handoff v2.1 formula:
 * e.g. Items 96,000 - 5% Discount 4,800 + Freight 2,000 + Installation 3,000
 * => Taxable base 96,200; GST 18% = 17,316; Total = 1,13,516.
 */
export function calculateQuotationTotals(
  input: {
    lines: Partial<IQuotationLine>[];
    discount?: number;
    shipping?: number;
    installation?: number;
    advancePercent?: number;
  },
  config: ApprovedPricingConfig = DEFAULT_PRICING_CONFIG
): QuotationCalculationResult {
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const lineAmount = (l: Partial<IQuotationLine>) =>
    Math.max(0, round2((Number(l.qty) || 0) * (Number(l.rate) || 0)) - (Number(l.discount) || 0));

  const subtotal = round2(lines.reduce((sum, l) => sum + lineAmount(l), 0));
  const safeDiscount = Math.min(Math.max(Number(input.discount) || 0, 0), subtotal);
  const shipping = Math.max(0, Number(input.shipping) || 0);
  const installation = Math.max(0, Number(input.installation) || 0);
  const advancePercent = Math.min(100, Math.max(0, Number(input.advancePercent ?? 50)));

  const itemsTaxable = round2(subtotal - safeDiscount);
  const ratio = subtotal > 0 ? itemsTaxable / subtotal : 0;

  const itemsTax = round2(
    lines.reduce((sum, l) => {
      const gst = l.gst !== undefined && l.gst !== null ? Number(l.gst) : config.defaultGstPercent;
      return sum + round2((lineAmount(l) * ratio * gst) / 100);
    }, 0)
  );

  // Weighted effective GST rate for ancillary freight/installation charges (defaults to configured 18%)
  const weightedGstRate =
    itemsTaxable > 0 && lines.length > 0
      ? (itemsTax / itemsTaxable) * 100
      : config.defaultGstPercent;

  const ancillaryTaxable =
    (config.includeFreightInTaxBase ? shipping : 0) +
    (config.includeInstallationInTaxBase ? installation : 0);

  const ancillaryTax = round2((ancillaryTaxable * weightedGstRate) / 100);
  const taxable = applyRounding(itemsTaxable + ancillaryTaxable, config.roundingMode);
  const tax = applyRounding(itemsTax + ancillaryTax, config.roundingMode);
  const nonTaxableAncillary =
    (config.includeFreightInTaxBase ? 0 : shipping) +
    (config.includeInstallationInTaxBase ? 0 : installation);

  const total = applyRounding(taxable + tax + nonTaxableAncillary, config.roundingMode);
  const advance = applyRounding((total * advancePercent) / 100, config.roundingMode);
  const balance = applyRounding(total - advance, config.roundingMode);
  const discountRatio = subtotal > 0 ? safeDiscount / subtotal : 0;
  const discountPercent = subtotal > 0 ? Math.round(discountRatio * 10000) / 100 : 0;

  return {
    subtotal,
    discount: safeDiscount,
    discountPercent,
    discountRatio,
    shipping,
    installation,
    taxable,
    tax,
    total,
    advance,
    balance,
    configVersion: config.priceListVersion,
  };
}

/**
 * Computes deterministic specification & commercial hash so any post-approval
 * mutation to line items, specs, quantities, rates, discounts or freight is caught.
 */
export function computeSpecHash(quote: {
  lines?: any[];
  discount?: number;
  shipping?: number;
  installation?: number;
  terms?: any;
  businessType?: string;
}): string {
  const canonical = {
    businessType: quote.businessType || 'Equipment',
    discount: Number(quote.discount || 0),
    shipping: Number(quote.shipping || 0),
    installation: Number(quote.installation || 0),
    freightTerm: quote.terms?.freight || '',
    deliveryTerm: quote.terms?.delivery || '',
    lines: (Array.isArray(quote.lines) ? quote.lines : []).map((l) => ({
      name: String(l.name || '').trim(),
      spec: String(l.spec || '').trim(),
      qty: Number(l.qty || 0),
      unit: String(l.unit || 'Nos.'),
      rate: Number(l.rate || 0),
      discount: Number(l.discount || 0),
      gst: Number(l.gst ?? 18),
    })),
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16);
}

/**
 * Creates or retrieves an existing open costing / review / channel task in `tasks.companyTasks`.
 * Never invents prices, discounts, stock status, or delivery dates.
 */
export async function createCostingOrReviewTask(params: {
  quotationId: string;
  clientName: string;
  blockers: BlockerItem[];
  requestedBy: string;
}): Promise<string | null> {
  if (!params.blockers.length) return null;
  const primary = params.blockers[0];
  const taskTitle =
    primary.code === 'UNKNOWN_DELIVERY_CHARGES'
      ? `Costing required: Delivery/freight charges for ${params.quotationId}`
      : primary.code === 'CUSTOM_SCOPE_COSTING_REQUIRED'
        ? `Costing & scope review for ${params.quotationId}`
        : primary.code === 'INVALID_CHANNEL_ELIGIBILITY'
          ? `Channel/template setup check for ${params.quotationId}`
          : `Approval/rate review required for ${params.quotationId}`;

  try {
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    const list: any[] = tasksDoc?.data && Array.isArray(tasksDoc.data) ? [...tasksDoc.data] : [];

    // Reuse active open task for this quotation if already created
    const existing = list.find(
      (t) =>
        t.record?.ref === params.quotationId &&
        t.status !== 'Completed' &&
        t.status !== 'Closed'
    );
    if (existing) {
      existing.instructions = params.blockers.map((b) => `• ${b.message}`).join('\n');
      existing.updatedAt = new Date().toISOString();
      await CrmRecord.findOneAndUpdate(
        { key: 'tasks.companyTasks' },
        { key: 'tasks.companyTasks', data: list },
        { upsert: true, new: true }
      );
      return existing.id;
    }

    const taskId = `TSK-${Date.now().toString().slice(-4)}`;
    const newTask = {
      id: taskId,
      title: taskTitle,
      record: { kind: 'quotation', label: 'Quotation', ref: params.quotationId },
      owner: {
        name: primary.assignedOwner || 'Sales Manager',
        role: primary.ownerDepartment || 'Sales & Costing',
      },
      assignedBy: { name: params.requestedBy || 'ENSIS Controls', role: 'System Guard' },
      department: primary.ownerDepartment || 'Sales',
      due: { day: 'Today', time: '5:00 PM', overdue: false },
      priority: 'High',
      status: 'Awaiting Review',
      action: 'Review',
      linkedRecord: `${params.quotationId} · ${params.clientName}`,
      instructions: params.blockers.map((b) => `• ${b.message}`).join('\n'),
      checklist: params.blockers.map((b, idx) => ({
        id: `chk-${idx + 1}`,
        label: b.message,
        done: false,
      })),
      createdAt: new Date().toISOString(),
    };

    await CrmRecord.findOneAndUpdate(
      { key: 'tasks.companyTasks' },
      { key: 'tasks.companyTasks', data: [newTask, ...list] },
      { upsert: true, new: true }
    );
    return taskId;
  } catch {
    return null;
  }
}

export function evaluateChannelEligibility(params: {
  via: 'email' | 'whatsapp' | 'voice';
  recipient: string;
  sender?: string;
  templateName?: string;
  withinReplyWindow24h?: boolean;
  optedOutChannels?: string[];
  channelConfig: ChannelProviderConfig;
}): { ok: boolean; reasons: string[] } {
  const { via, recipient, sender, templateName, withinReplyWindow24h, optedOutChannels = [], channelConfig } = params;
  const reasons: string[] = [];
  const normalizedRecipient = String(recipient || '').trim().toLowerCase();

  if (optedOutChannels.map((c) => c.toLowerCase()).includes(via)) {
    reasons.push(`Customer opted out of ${via} communication.`);
  }

  // Separate Business Approval & Provider Template Approval check
  if (templateName) {
    const tpl = channelConfig.templates.find(
      (t) => t.name.toLowerCase() === templateName.trim().toLowerCase() && t.channel === via
    );
    if (tpl) {
      if (tpl.businessApproval !== 'Approved') {
        reasons.push(`Business template approval is "${tpl.businessApproval}" for "${tpl.name}".`);
      }
      if (tpl.providerApproval !== 'Approved') {
        reasons.push(`Provider template approval is "${tpl.providerApproval}" for "${tpl.name}" (${via}).`);
      }
    }
  }

  if (via === 'email') {
    if (!channelConfig.email.adapterConfigured) {
      reasons.push('Email provider adapter is not configured.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient)) {
      reasons.push('Valid recipient email address is required.');
    }
    if (channelConfig.email.suppressedEmails.map((e) => e.toLowerCase()).includes(normalizedRecipient)) {
      reasons.push(`Recipient ${normalizedRecipient} is on the email suppression list.`);
    }
    if (!channelConfig.email.spfVerified || !channelConfig.email.dkimVerified) {
      reasons.push('Email sender authentication (SPF/DKIM) is incomplete.');
    }
    const senderClean = String(sender || '').trim();
    if (
      !senderClean ||
      senderClean.toLowerCase().includes('not configured') ||
      !channelConfig.email.verifiedSenders.some((s) => s.toLowerCase() === senderClean.toLowerCase())
    ) {
      reasons.push('Sender email is not authenticated/verified.');
    }
  } else if (via === 'whatsapp') {
    const digits = normalizedRecipient.replace(/\D/g, '');
    if (digits.length < 10) {
      reasons.push('Valid recipient mobile number is required for WhatsApp.');
    }
    if (channelConfig.whatsapp.suppressedPhones.some((p) => p.replace(/\D/g, '') === digits)) {
      reasons.push('Recipient mobile number is suppressed/opted out on WhatsApp.');
    }
    if (!channelConfig.whatsapp.businessPolicyCompliant) {
      reasons.push('WhatsApp outbound messaging is paused by business policy.');
    }
    if (channelConfig.whatsapp.requireProviderAdapter && !channelConfig.whatsapp.adapterConfigured) {
      reasons.push('WhatsApp provider adapter is not configured — complete channel connection first.');
    }
    // Policy: Outside 24h reply window, an approved business+provider template is mandatory
    if (!withinReplyWindow24h && !templateName) {
      reasons.push('WhatsApp outside 24h reply window requires a business & provider approved template.');
    }
  } else if (via === 'voice') {
    const digits = normalizedRecipient.replace(/\D/g, '');
    if (digits.length < 10) {
      reasons.push('Valid phone number is required for voice dialling.');
    }
    if (!channelConfig.voice.adapterConfigured || !channelConfig.voice.supportedNumberConfigured || !channelConfig.voice.providerSupported) {
      reasons.push('Voice calling requires a configured supported number and voice provider adapter.');
    }
    if (channelConfig.voice.dndCheckEnabled && channelConfig.voice.suppressedPhones.some((p) => p.replace(/\D/g, '') === digits)) {
      reasons.push('Voice contact is ineligible / suppressed (DND or opt-out).');
    }
    if (!channelConfig.voice.disclosureIntroduction?.trim()) {
      reasons.push('Voice call requires an approved disclosure introduction.');
    }
    if (!channelConfig.voice.recordingTreatment) {
      reasons.push('Voice call requires configured recording treatment.');
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Stop-aware follow-up check immediately before sending or dialling:
 * Rechecks reply, human takeover, opt-out, order state, preferred time,
 * channel eligibility, frequency cap, and conversation ownershipVersion.
 */
export async function evaluateStopAwareFollowUp(params: {
  quotation: any;
  via: 'email' | 'whatsapp' | 'voice';
  recipient: string;
  sender?: string;
  templateName?: string;
  actorType?: 'ai' | 'human';
  expectedOwnershipVersion?: number;
  now?: Date;
  channelConfig?: ChannelProviderConfig;
  isAutomatedFollowUp?: boolean;
}): Promise<{ allowed: boolean; reasons: string[]; checks: Record<string, boolean> }> {
  const {
    quotation,
    via,
    recipient,
    sender,
    templateName,
    actorType = 'human',
    expectedOwnershipVersion,
    now = new Date(),
    isAutomatedFollowUp = false,
  } = params;

  const channelConfig = params.channelConfig || (await getChannelProviderConfig());
  const conv = quotation?.conversation || {};
  const reasons: string[] = [];

  // 1. Reply stop check (automated follow-up pauses if customer already replied)
  const repliedBlocked = Boolean(isAutomatedFollowUp && conv.replied);
  if (repliedBlocked) {
    reasons.push('Customer has already replied — follow-up sequence paused.');
  }

  // 2. Human takeover & Ownership version check (prevents AI & humans replying simultaneously)
  const humanTakeoverBlocked = Boolean(actorType === 'ai' && (conv.humanTakeover || conv.ownerType === 'human'));
  if (humanTakeoverBlocked) {
    reasons.push('Human executive takeover active — AI replies are paused.');
  }

  const currentVersion = Number(conv.ownershipVersion ?? 1);
  const versionConflict =
    expectedOwnershipVersion !== undefined && Number(expectedOwnershipVersion) !== currentVersion;
  if (versionConflict) {
    reasons.push(
      `Conversation ownership version changed (expected v${expectedOwnershipVersion}, current v${currentVersion}). Refresh before sending.`
    );
  }

  // 3. Opt-out check
  const optedOutChannels: string[] = Array.isArray(conv.optedOutChannels) ? conv.optedOutChannels : [];
  const optOutBlocked = optedOutChannels.map((c) => c.toLowerCase()).includes(via);
  if (optOutBlocked) {
    reasons.push(`Customer opted out of ${via} follow-ups.`);
  }

  // 4. Order state check (linked SalesOrder or Accepted quotation stops follow-ups)
  let orderConfirmed = Boolean(conv.orderConfirmed || quotation?.status === 'Accepted' || quotation?.orderLinkedId);
  if (!orderConfirmed && quotation?.id) {
    try {
      const existingOrder = await SalesOrderModel.findOne({ quotationId: quotation.id, isDeleted: { $ne: true } }).lean();
      if (existingOrder) orderConfirmed = true;
    } catch {
      // Ignore during offline unit tests
    }
  }
  const orderBlocked = Boolean(isAutomatedFollowUp && orderConfirmed);
  if (orderBlocked) {
    reasons.push('Order already confirmed for this quotation — quotation follow-up stopped.');
  }

  // 5. Preferred contact time window check (IST or saved window)
  const windowCfg = conv.preferredWindow || channelConfig.preferredWindow;
  const istHour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: windowCfg?.timezone || 'Asia/Kolkata',
    }).format(now)
  );
  const startH = Number(windowCfg?.startHour ?? 8);
  const endH = Number(windowCfg?.endHour ?? 21);
  const outsidePreferredTime = Boolean(isAutomatedFollowUp && (istHour < startH || istHour >= endH));
  if (outsidePreferredTime) {
    reasons.push(`Outside preferred contact hours (${startH}:00–${endH}:00 ${windowCfg?.timezone || 'IST'}).`);
  }

  // 6. Channel eligibility check
  const channelCheck = evaluateChannelEligibility({
    via,
    recipient,
    sender,
    templateName,
    withinReplyWindow24h: Boolean(conv.replied),
    optedOutChannels,
    channelConfig,
  });
  if (!channelCheck.ok) {
    reasons.push(...channelCheck.reasons);
  }

  // 7. Frequency cap check
  const cap = Number(channelConfig.frequencyCapPer24h ?? 3);
  const freqCount = Number(conv.frequencyCount24h ?? 0);
  const freqBlocked = Boolean(isAutomatedFollowUp && freqCount >= cap);
  if (freqBlocked) {
    reasons.push(`24h outbound frequency cap reached (${freqCount}/${cap}).`);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    checks: {
      replyClear: !repliedBlocked,
      ownershipClear: !humanTakeoverBlocked && !versionConflict,
      optOutClear: !optOutBlocked,
      orderStateClear: !orderBlocked,
      preferredTimeClear: !outsidePreferredTime,
      channelEligible: channelCheck.ok,
      frequencyCapClear: !freqBlocked,
    },
  };
}

/**
 * Evaluates all 6 send-blockers + stop-aware checks before final quotation send:
 * 1. Unknown delivery charges
 * 2. Custom scope without costing
 * 3. Expired rate / validity date
 * 4. Changed specification without re-approval
 * 5. Missing reviewer / approval
 * 6. Invalid channel eligibility
 */
export async function evaluateSendReadiness(params: {
  quotation: any;
  via: 'email' | 'whatsapp' | 'voice';
  recipient: string;
  sender?: string;
  templateName?: string;
  actor?: CrmActorContext;
  expectedOwnershipVersion?: number;
  now?: Date;
  pricingConfig?: ApprovedPricingConfig;
  channelConfig?: ChannelProviderConfig;
}): Promise<{ ready: boolean; blockers: BlockerItem[]; totals: QuotationCalculationResult }> {
  const { quotation, via, recipient, sender, templateName, actor, expectedOwnershipVersion, now = new Date() } = params;
  const pricingConfig = params.pricingConfig || (await getApprovedPricingConfig());
  const channelConfig = params.channelConfig || (await getChannelProviderConfig());
  const blockers: BlockerItem[] = [];

  const totals = calculateQuotationTotals(quotation, pricingConfig);
  const todayIso = now.toISOString().split('T')[0];

  // 1. Unknown delivery charges
  const freightTerm = String(quotation?.terms?.freight || '').trim().toLowerCase();
  const shipping = Number(quotation?.shipping ?? 0);
  const freightKnown = freightTerm === 'included' || freightTerm === 'client arranged' || shipping > 0;
  const unknownFreightKeywords = ['actual', 'tbd', 'unknown', 'confirm', 'pending', 'costing'];
  const explicitlyUnknownFreight = unknownFreightKeywords.some((kw) => freightTerm.includes(kw));

  if (
    shipping < 0 ||
    Number(quotation?.installation ?? 0) < 0 ||
    explicitlyUnknownFreight ||
    !freightKnown ||
    (!quotation?.deliverySameAsBilling && !String(quotation?.deliveryAddress || '').trim())
  ) {
    blockers.push({
      code: 'UNKNOWN_DELIVERY_CHARGES',
      message: 'Delivery/freight charges or delivery destination are incomplete — confirm costing before sending.',
      ownerDepartment: 'Operations & Costing',
      assignedOwner: quotation?.owner || 'Sales Manager',
    });
  }

  // 2. Custom scope / unpriced items (do not invent a price)
  const lines = Array.isArray(quotation?.lines) ? quotation.lines : [];
  const hasZeroOrMissingPrice = lines.length === 0 || lines.some((l: any) => !Number(l.rate) || Number(l.rate) <= 0 || Number(l.qty) <= 0);
  const hasCustomLine = lines.some(
    (l: any) => l.isCustom === true || String(l.name || '').toLowerCase().includes('custom')
  );
  const needsCustomCosting =
    Boolean(quotation?.customScope) ||
    quotation?.businessType === 'Turnkey' && !quotation?.costingApproved ||
    (hasCustomLine && !quotation?.costingApproved) ||
    hasZeroOrMissingPrice;

  if (needsCustomCosting) {
    blockers.push({
      code: 'CUSTOM_SCOPE_COSTING_REQUIRED',
      message: hasZeroOrMissingPrice
        ? 'Line item rate or quantity is missing — do not invent prices; complete costing first.'
        : 'Custom / turnkey scope requires approved estimation & costing sign-off before sending.',
      ownerDepartment: 'Estimation & Costing',
      assignedOwner: quotation?.owner || 'Sales Manager',
    });
  }

  // 3. Expired rate or quotation validity
  const validUntil = String(quotation?.validUntil || '').trim();
  const rateValidUntil = String(quotation?.rateValidUntil || pricingConfig.validThrough || '').trim();
  if (!validUntil || validUntil < todayIso) {
    blockers.push({
      code: 'EXPIRED_RATE_OR_VALIDITY',
      message: validUntil
        ? `Quotation validity expired on ${validUntil} — refresh rate & validity before final send.`
        : 'Quotation validity date is missing — set approved validity before sending.',
      ownerDepartment: 'Sales',
      assignedOwner: quotation?.owner || 'Sales Manager',
    });
  } else if (rateValidUntil && rateValidUntil < todayIso) {
    blockers.push({
      code: 'EXPIRED_RATE_OR_VALIDITY',
      message: `Approved price list rate expired on ${rateValidUntil} — reprice against current list before send.`,
      ownerDepartment: 'Pricing & Management',
      assignedOwner: quotation?.owner || 'Sales Manager',
    });
  }

  // 4. Changed specification without re-approval
  const currentHash = computeSpecHash(quotation);
  const specModified =
    Boolean(quotation?.specChanged) ||
    quotation?.status === 'Revision Draft' ||
    (Boolean(quotation?.approvedSnapshotHash) && quotation.approvedSnapshotHash !== currentHash);

  if (specModified) {
    blockers.push({
      code: 'CHANGED_SPECIFICATION',
      message: 'Specification, quantity, or pricing changed after approval — submit revision for re-approval before send.',
      ownerDepartment: 'Sales Approval',
      assignedOwner: quotation?.reviewer || 'Sales Manager',
    });
  }

  // 5. Missing reviewer / approval
  const exceedsLimit = totals.discountPercent > pricingConfig.managerDiscountLimitPercent;
  const hasReviewerOrApprover = Boolean(quotation?.approvedBy || quotation?.reviewer || actor?.roleTier === 'superadmin');
  if (
    quotation?.approvalStatus !== 'Approved' ||
    (exceedsLimit && !quotation?.approvedBy) ||
    (!hasReviewerOrApprover && exceedsLimit)
  ) {
    blockers.push({
      code: 'MISSING_REVIEWER_OR_APPROVAL',
      message:
        quotation?.approvalStatus !== 'Approved'
          ? `Quotation approval is "${quotation?.approvalStatus || 'Not submitted'}" — an authorized reviewer must approve before sending.`
          : `Discount (${totals.discountPercent}%) exceeds ${pricingConfig.managerDiscountLimitPercent}% limit without reviewer sign-off.`,
      ownerDepartment: 'Management Review',
      assignedOwner: quotation?.reviewer || 'Sales Manager',
    });
  }

  // 6. Invalid channel eligibility & Stop-aware recheck
  const stopCheck = await evaluateStopAwareFollowUp({
    quotation,
    via,
    recipient,
    sender,
    templateName,
    actorType: 'human',
    expectedOwnershipVersion,
    now,
    channelConfig,
    isAutomatedFollowUp: false,
  });

  if (!stopCheck.allowed) {
    for (const reason of stopCheck.reasons) {
      blockers.push({
        code: reason.includes('ownership version') ? 'OWNERSHIP_CONFLICT' : 'INVALID_CHANNEL_ELIGIBILITY',
        message: reason,
        ownerDepartment: 'Channel Admin',
        assignedOwner: quotation?.owner || 'Sales Manager',
      });
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    totals,
  };
}

/**
 * Atomic CAS conversation ownership update:
 * Guarantees one conversation ownership version prevents AI & humans replying simultaneously,
 * and ensures a resolved chat NEVER automatically converts a quotation into a won sale.
 */
export async function updateConversationStateWithCas(params: {
  quotationId: string;
  expectedOwnershipVersion: number;
  patch: {
    ownerType?: 'ai' | 'human';
    ownerName?: string;
    humanTakeover?: boolean;
    replied?: boolean;
    optOutChannel?: 'email' | 'whatsapp' | 'voice';
    optInChannel?: 'email' | 'whatsapp' | 'voice';
    chatStatus?: 'open' | 'resolved';
  };
}): Promise<{ ok: boolean; statusCode: number; message: string; quotation?: any }> {
  const existing = await QuotationModel.findOne({ id: params.quotationId, isDeleted: { $ne: true } }).lean();
  if (!existing) {
    return { ok: false, statusCode: 404, message: 'Quotation not found' };
  }

  const currentVersion = Number(existing.conversation?.ownershipVersion ?? 1);
  if (Number(params.expectedOwnershipVersion) !== currentVersion) {
    return {
      ok: false,
      statusCode: 409,
      message: `Conversation ownership version conflict (expected v${params.expectedOwnershipVersion}, actual v${currentVersion}).`,
    };
  }

  const optedOut = new Set<string>(existing.conversation?.optedOutChannels || []);
  if (params.patch.optOutChannel) optedOut.add(params.patch.optOutChannel);
  if (params.patch.optInChannel) optedOut.delete(params.patch.optInChannel);

  const nextConv = {
    ownerType: params.patch.ownerType ?? existing.conversation?.ownerType ?? 'human',
    ownerName: params.patch.ownerName ?? existing.conversation?.ownerName ?? existing.owner ?? '',
    ownershipVersion: currentVersion + 1,
    humanTakeover: params.patch.humanTakeover ?? existing.conversation?.humanTakeover ?? false,
    replied: params.patch.replied ?? existing.conversation?.replied ?? false,
    optedOutChannels: Array.from(optedOut),
    preferredWindow: existing.conversation?.preferredWindow || { startHour: 8, endHour: 21, timezone: 'Asia/Kolkata' },
    frequencyCount24h: existing.conversation?.frequencyCount24h ?? 0,
    lastOutboundAt: existing.conversation?.lastOutboundAt || '',
    chatStatus: params.patch.chatStatus ?? existing.conversation?.chatStatus ?? 'open',
    // Explicitly enforce: a resolved chat is NOT automatically a won sale
    resolvedIsNotWonSale: true,
    orderConfirmed: existing.conversation?.orderConfirmed ?? false,
  };

  // Use filter matching either exact version or uninitialized conversation on v1
  const versionFilter =
    currentVersion === 1 && existing.conversation?.ownershipVersion === undefined
      ? { id: params.quotationId, $or: [{ 'conversation.ownershipVersion': 1 }, { conversation: { $exists: false } }, { 'conversation.ownershipVersion': { $exists: false } }] }
      : { id: params.quotationId, 'conversation.ownershipVersion': currentVersion };

  const updated = await QuotationModel.findOneAndUpdate(
    versionFilter,
    { $set: { conversation: nextConv } },
    { new: true }
  ).lean();

  if (!updated) {
    return {
      ok: false,
      statusCode: 409,
      message: 'Concurrent conversation update detected — ownership version changed.',
    };
  }

  return { ok: true, statusCode: 200, message: 'Conversation state updated', quotation: updated };
}
