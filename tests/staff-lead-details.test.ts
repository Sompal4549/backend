import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from './helpers';
import { UserModel } from '../src/models/user.model';
import { LeadModel } from '../src/models/lead.model';
import { CrmRecord } from '../src/models/crm-record.model';
import { config } from '../src/config/app.config';

describe('Staff Lead Details (Page 16 / Layout 019)', () => {
  let staffToken: string;
  let leadId: string;

  beforeEach(async () => {
    await UserModel.deleteMany({ email: 'staff-lead-test@ensis.in' });
    const staffUser = await UserModel.create({
      name: 'Executive A',
      email: 'staff-lead-test@ensis.in',
      password: 'Password@123',
      role: 'user',
      crmRole: 'User',
      crmAccess: true,
      isVerified: true,
    });
    staffToken = jwt.sign(
      { userId: staffUser._id.toString(), role: staffUser.role },
      config.jwtAccessSecret || 'test-jwt-access-secret-32-chars-ok!',
      { expiresIn: '1h' }
    );

    await LeadModel.deleteMany({ email: 'ananya@wellness-test.in' });
    const lead = await LeadModel.create({
      firstName: 'Ananya',
      companyName: 'Wellness Retreat',
      email: 'ananya@wellness-test.in',
      phone: '9811122334',
      city: 'Delhi',
      zipCode: '110019',
      interestedProduct: 'Steam chamber bed / 2 units',
      leadSource: 'Google Ads',
      eventAttribution: 'campaign DEMO-21',
      ownerName: 'Executive A',
      priorityScore: 80,
      priorityReason: 'quantity + timeline',
      nextAction: 'Confirm installation details',
      followUpDate: '2026-11-26',
      followUpTime: '11:30 AM IST',
    });
    leadId = lead._id.toString();
    await CrmRecord.deleteMany({ key: { $in: [`lead_conv_${leadId}`, `lead_act_${leadId}`] } });
  });

  it('allows Staff to fetch real Lead Details, update next action, log conversation, and blocks reassign', async () => {
    const getRes = await request(app)
      .get(`/api/v1/crm/leads/${leadId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.organisation).toBe('Wellness Retreat');
    expect(getRes.body.data.maskedPhone).toContain('2334');
    expect(getRes.body.data.priorityScore).toBe(80);
    expect(getRes.body.data.conversationMode).toContain('Human handling');

    const nextRes = await request(app)
      .post(`/api/v1/crm/leads/${leadId}/next-action`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        nextAction: 'Confirm room dimensions & send quote',
        followUpDate: '2026-11-27',
        followUpTime: '11:30 AM',
        budget: 'INR 1,13,516',
      });
    expect(nextRes.status).toBe(200);

    const convRes = await request(app)
      .post(`/api/v1/crm/leads/${leadId}/conversation`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        text: 'Customer confirmed Delhi delivery pincode 110019.',
        channel: 'WhatsApp',
        humanTakeover: true,
      });
    expect(convRes.status).toBe(201);

    const afterRes = await request(app)
      .get(`/api/v1/crm/leads/${leadId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(afterRes.body.data.nextAction).toBe('Confirm room dimensions & send quote');
    expect(afterRes.body.data.conversations.some((c: any) => c.text.includes('110019'))).toBe(true);

    // Staff cannot reassign owner
    const reassignRes = await request(app)
      .put(`/api/v1/crm/leads/${leadId}/reassign`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ owner: 'Simran Kaur', reason: 'Reassign attempt by staff' });
    expect(reassignRes.status).toBe(403);
  });

  it('allows Manager to open Lead Details, reassign owner, and resume AI handover', async () => {
    await UserModel.deleteMany({ email: 'manager-lead-test@ensis.in' });
    const managerUser = await UserModel.create({
      name: 'Ritu Sharma',
      email: 'manager-lead-test@ensis.in',
      password: 'Password@123',
      role: 'admin',
      crmRole: 'Sales Manager',
      crmAccess: true,
      isVerified: true,
    });
    const managerToken = jwt.sign(
      { userId: managerUser._id.toString(), role: managerUser.role },
      config.jwtAccessSecret || 'test-jwt-access-secret-32-chars-ok!',
      { expiresIn: '1h' }
    );

    const reassignRes = await request(app)
      .put(`/api/v1/crm/leads/${leadId}/reassign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ owner: 'Simran Kaur', reason: 'Territory reassignment' });
    expect(reassignRes.status).toBe(200);

    const resumeAiRes = await request(app)
      .post(`/api/v1/crm/leads/${leadId}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        text: 'Manager resumed automated AI follow-up.',
        channel: 'System',
        humanTakeover: false,
      });
    expect(resumeAiRes.status).toBe(201);

    const afterRes = await request(app)
      .get(`/api/v1/crm/leads/${leadId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(afterRes.status).toBe(200);
    expect(afterRes.body.data.humanTakeover).toBe(false);
    expect(afterRes.body.data.activities.some((a: any) => a.text.includes('Simran Kaur'))).toBe(true);
  });
});
