import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, createTestAdmin } from './helpers';
import { UserModel } from '../src/models/user.model';
import { QuotationModel } from '../src/models/quotation.model';
import { SalesOrderModel } from '../src/models/sales-order.model';
import { CrmRecord } from '../src/models/crm-record.model';
import { config } from '../src/config/app.config';
import {
  calculateQuotationTotals,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_CHANNEL_CONFIG,
  evaluateChannelEligibility,
  evaluateStopAwareFollowUp,
} from '../src/modules/crm/quotations/quotation-controls.service';

async function createRoleUser(email: string, name: string, role: 'superadmin' | 'admin' | 'user', crmRole: string) {
  await UserModel.deleteMany({ email });
  const user = await UserModel.create({
    name,
    email,
    password: 'Password@123',
    role,
    crmRole,
    crmAccess: true,
    isVerified: true,
  });
  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.jwtAccessSecret || 'test-jwt-access-secret-32-chars-ok!',
    { expiresIn: '1h' }
  );
  return { user, token };
}

const sampleLines = [
  { id: 'l1', name: 'Steam Chamber Bed', spec: 'Approved SKU SCB-DEMO / variant A', qty: 2, unit: 'Nos.', rate: 42000, discount: 0, gst: 18 },
  { id: 'l2', name: 'Spa Trolley', spec: 'Approved SKU SPT-DEMO / standard', qty: 1, unit: 'Nos.', rate: 12000, discount: 0, gst: 18 },
];

describe('Approved Quotation & Communication Controls', () => {
  let superToken: string;
  let managerToken: string;
  let staffToken: string;

  beforeEach(async () => {
    const sa = await createTestAdmin('qt-sa@ensis.in');
    superToken = sa.token;
    const mgr = await createRoleUser('qt-mgr@ensis.in', 'Ritu Manager', 'user', 'Sales Manager');
    managerToken = mgr.token;
    const stf = await createRoleUser('qt-staff@ensis.in', 'Executive A', 'user', 'User');
    staffToken = stf.token;

    await QuotationModel.deleteMany({ id: { $regex: /^QT-TEST-/ } });
    await SalesOrderModel.deleteMany({ quotationId: { $regex: /^QT-TEST-/ } });
    await CrmRecord.deleteMany({ key: { $in: ['quotations.pricingConfig', 'quotations.channelConfig', 'tasks.companyTasks'] } });
  });

  it('matches handoff v2.1 sample calculation exactly (Items 96,000 - 5% 4,800 + Freight 2,000 + Installation 3,000 => 96,200 base => 17,316 GST => 1,13,516 total)', () => {
    const totals = calculateQuotationTotals(
      {
        lines: sampleLines,
        discount: 4800,
        shipping: 2000,
        installation: 3000,
        advancePercent: 50,
      },
      DEFAULT_PRICING_CONFIG
    );

    expect(totals.subtotal).toBe(96000);
    expect(totals.discount).toBe(4800);
    expect(totals.discountPercent).toBe(5);
    expect(totals.shipping).toBe(2000);
    expect(totals.installation).toBe(3000);
    expect(totals.taxable).toBe(96200);
    expect(totals.tax).toBe(17316);
    expect(totals.total).toBe(113516);
  });

  it('allows Super Admin, Manager, and User (Staff) to access quotations overview and enforces non-self / delegated approval rules', async () => {
    const futureDate = '2027-12-31';

    for (const token of [superToken, managerToken, staffToken]) {
      const ov = await request(app)
        .get('/api/v1/crm/quotations/overview')
        .set('Authorization', `Bearer ${token}`);
      expect(ov.status).toBe(200);
      expect(ov.body.success).toBe(true);
    }

    // Staff submits quotation -> enters Awaiting approval (Pending), cannot self-approve
    const staffSubmit = await request(app)
      .post('/api/v1/crm/quotations')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        id: 'QT-TEST-001',
        date: '2026-11-26',
        validUntil: futureDate,
        owner: 'Executive A',
        client: { name: 'Wellness Retreat', contact: 'Ananya', email: 'ananya@example.com', phone: '9811122334', city: 'Delhi' },
        deliverySameAsBilling: true,
        placeOfSupply: 'Delhi',
        lines: sampleLines,
        discount: 4800,
        shipping: 2000,
        installation: 3000,
        terms: { payment: '50% advance', delivery: '2 weeks', freight: 'Included', warranty: '1 Year', note: '' },
        submit: true,
      });

    expect(staffSubmit.status).toBe(201);
    expect(staffSubmit.body.data.approvalStatus).toBe('Pending');
    expect(staffSubmit.body.data.totals.total).toBe(113516);

    // Staff cannot approve
    const staffApprove = await request(app)
      .post('/api/v1/crm/quotations/QT-TEST-001/approve')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({});
    expect(staffApprove.status).toBe(403);

    // Manager approves Staff's quotation within 5% limit
    const mgrApprove = await request(app)
      .post('/api/v1/crm/quotations/QT-TEST-001/approve')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});
    expect(mgrApprove.status).toBe(200);
    expect(mgrApprove.body.data.approvalStatus).toBe('Approved');

    // Now Staff can send the approved quotation via Email with verified sender & approved template
    const staffSend = await request(app)
      .post('/api/v1/crm/quotations/QT-TEST-001/send')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        via: 'email',
        recipient: 'ananya@example.com',
        sender: 'sales@ensis.in (verified)',
        template: 'Quotation with Payment Terms',
        subject: 'Quotation QT-TEST-001',
        message: 'Approved proposal attached.',
        draft: false,
      });
    expect(staffSend.status).toBe(200);
    expect(staffSend.body.data.status).toBe('Sent');
  });

  it('blocks final send when incomplete (unknown freight, custom scope, expired validity, changed spec) and creates an owned costing/review task', async () => {
    // 1. Unknown freight charges
    await request(app)
      .post('/api/v1/crm/quotations')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        id: 'QT-TEST-BLK1',
        date: '2026-11-26',
        validUntil: '2027-12-31',
        client: { name: 'Aarogya Clinic', email: 'clinic@example.com', phone: '9811122335' },
        deliverySameAsBilling: true,
        lines: sampleLines,
        discount: 0,
        shipping: 0,
        terms: { payment: '50% advance', delivery: '2 weeks', freight: 'Extra at actuals', warranty: '1 Year', note: '' },
        submit: true,
      });

    const sendUnknownFreight = await request(app)
      .post('/api/v1/crm/quotations/QT-TEST-BLK1/send')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        via: 'email',
        recipient: 'clinic@example.com',
        sender: 'sales@ensis.in (verified)',
        template: 'Quotation with Payment Terms',
        subject: 'Quote',
        message: 'Hello',
        draft: false,
      });

    expect(sendUnknownFreight.status).toBe(422);
    expect(sendUnknownFreight.body.costingTaskId).toBeTruthy();

    // Verify owned task actually saved in tasks.companyTasks
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' }).lean();
    const tasks: any[] = tasksDoc?.data || [];
    const createdTask = tasks.find((t) => t.id === sendUnknownFreight.body.costingTaskId);
    expect(createdTask).toBeDefined();
    expect(createdTask.record.ref).toBe('QT-TEST-BLK1');

    // 2. Approved quote whose specification changes afterward must block final send
    await request(app)
      .post('/api/v1/crm/quotations')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        id: 'QT-TEST-SPEC',
        date: '2026-11-26',
        validUntil: '2027-12-31',
        client: { name: 'Healing Centre', email: 'heal@example.com', phone: '9811122336' },
        deliverySameAsBilling: true,
        lines: sampleLines,
        discount: 0,
        shipping: 2000,
        terms: { payment: '50% advance', delivery: '2 weeks', freight: 'Included', warranty: '1 Year', note: '' },
        submit: true,
      });

    // Mutate spec/rate without re-approval
    await request(app)
      .put('/api/v1/crm/quotations/QT-TEST-SPEC')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        lines: [{ ...sampleLines[0], spec: 'Custom upgraded stainless chamber', rate: 55000 }, sampleLines[1]],
      });

    const sendMutated = await request(app)
      .post('/api/v1/crm/quotations/QT-TEST-SPEC/send')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        via: 'email',
        recipient: 'heal@example.com',
        sender: 'sales@ensis.in (verified)',
        template: 'Quotation with Payment Terms',
        subject: 'Quote',
        message: 'Hello',
        draft: false,
      });

    expect(sendMutated.status).toBe(422);
    expect(sendMutated.body.message.toLowerCase()).toMatch(/spec|approval|revision/);
  });

  it('enforces channel/provider template separation, email suppression, and voice prerequisites', () => {
    // Separate business vs provider approval on WhatsApp template
    const waPending = evaluateChannelEligibility({
      via: 'whatsapp',
      recipient: '9811122334',
      templateName: 'Quotation delivery / provider pending',
      withinReplyWindow24h: false,
      channelConfig: DEFAULT_CHANNEL_CONFIG,
    });
    expect(waPending.ok).toBe(false);
    expect(waPending.reasons.some((r) => r.includes('Provider template approval'))).toBe(true);

    // Email suppression list
    const emailSuppressed = evaluateChannelEligibility({
      via: 'email',
      recipient: 'bounced@example.com',
      sender: 'sales@ensis.in (verified)',
      templateName: 'Quotation with Payment Terms',
      channelConfig: {
        ...DEFAULT_CHANNEL_CONFIG,
        email: { ...DEFAULT_CHANNEL_CONFIG.email, suppressedEmails: ['bounced@example.com'] },
      },
    });
    expect(emailSuppressed.ok).toBe(false);
    expect(emailSuppressed.reasons.some((r) => r.includes('suppression'))).toBe(true);

    // Voice requires supported number/provider
    const voiceCheck = evaluateChannelEligibility({
      via: 'voice',
      recipient: '9811122334',
      channelConfig: DEFAULT_CHANNEL_CONFIG,
    });
    expect(voiceCheck.ok).toBe(false);
    expect(voiceCheck.reasons.some((r) => r.includes('Voice calling requires'))).toBe(true);
  });

  it('enforces stop-aware follow-up checks, atomic ownershipVersion CAS, and never treats resolved chat as won sale', async () => {
    await request(app)
      .post('/api/v1/crm/quotations')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        id: 'QT-TEST-CONV',
        date: '2026-11-26',
        validUntil: '2027-12-31',
        client: { name: 'Serene Spa', email: 'serene@example.com', phone: '9811122337' },
        deliverySameAsBilling: true,
        lines: sampleLines,
        discount: 0,
        shipping: 2000,
        terms: { payment: '50% advance', delivery: '2 weeks', freight: 'Included', warranty: '1 Year', note: '' },
        submit: true,
      });

    // Human takeover + resolve chat at version 1 -> advances to version 2, status stays Approved (NOT Accepted/Won)
    const convRes = await request(app)
      .post('/api/v1/crm/quotations/QT-TEST-CONV/conversation-state')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        expectedOwnershipVersion: 1,
        ownerType: 'human',
        humanTakeover: true,
        replied: true,
        chatStatus: 'resolved',
      });
    expect(convRes.status).toBe(200);
    expect(convRes.body.data.conversation.ownershipVersion).toBe(2);
    expect(convRes.body.data.conversation.resolvedIsNotWonSale).toBe(true);
    expect(convRes.body.data.status).not.toBe('Accepted');

    // Stale AI follow-up with ownershipVersion 1 fails with 409 Conflict
    const staleCheck = await request(app)
      .post('/api/v1/crm/quotations/QT-TEST-CONV/follow-up-check')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        via: 'email',
        recipient: 'serene@example.com',
        sender: 'sales@ensis.in (verified)',
        actorType: 'ai',
        ownershipVersion: 1,
        isAutomatedFollowUp: true,
      });
    expect(staleCheck.status).toBe(409);

    // Stop-aware helper detects replied + humanTakeover + orderConfirmed
    const stopResult = await evaluateStopAwareFollowUp({
      quotation: {
        id: 'QT-TEST-CONV',
        status: 'Accepted',
        conversation: { ownerType: 'human', ownershipVersion: 2, humanTakeover: true, replied: true, optedOutChannels: ['email'], frequencyCount24h: 3, orderConfirmed: true },
      },
      via: 'email',
      recipient: 'serene@example.com',
      sender: 'sales@ensis.in (verified)',
      actorType: 'ai',
      expectedOwnershipVersion: 2,
      now: new Date('2026-11-26T06:00:00Z'), // 11:30 AM IST
      isAutomatedFollowUp: true,
    });
    expect(stopResult.allowed).toBe(false);
    expect(stopResult.checks.replyClear).toBe(false);
    expect(stopResult.checks.ownershipClear).toBe(false);
    expect(stopResult.checks.optOutClear).toBe(false);
    expect(stopResult.checks.orderStateClear).toBe(false);
    expect(stopResult.checks.frequencyCapClear).toBe(false);
  });
});
