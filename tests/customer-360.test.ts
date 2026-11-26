import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from './helpers';
import { UserModel } from '../src/models/user.model';
import { ClientModel } from '../src/models/client.model';
import { OpportunityModel } from '../src/models/opportunity.model';
import { QuotationModel } from '../src/models/quotation.model';
import { SalesOrderModel } from '../src/models/sales-order.model';
import { CrmRecord } from '../src/models/crm-record.model';
import { config } from '../src/config/app.config';

describe('Customer 360 & Communication Preferences (Page 19 / Layout 028)', () => {
  let managerToken: string;
  let staffToken: string;
  let otherStaffToken: string;
  let clientId: string;

  beforeEach(async () => {
    await UserModel.deleteMany({
      email: { $in: ['c360-manager@ensis.in', 'c360-staff@ensis.in', 'c360-other@ensis.in'] },
    });

    const [manager, staff, otherStaff] = await UserModel.create([
      {
        name: 'Ritu Sharma',
        email: 'c360-manager@ensis.in',
        password: 'Password@123',
        role: 'admin',
        crmRole: 'Sales Manager',
        crmAccess: true,
        isVerified: true,
      },
      {
        name: 'Executive A',
        email: 'c360-staff@ensis.in',
        password: 'Password@123',
        role: 'user',
        crmRole: 'User',
        crmAccess: true,
        isVerified: true,
      },
      {
        name: 'Executive B',
        email: 'c360-other@ensis.in',
        password: 'Password@123',
        role: 'user',
        crmRole: 'User',
        crmAccess: true,
        isVerified: true,
      },
    ]);

    const secret = config.jwtAccessSecret || 'test-jwt-access-secret-32-chars-ok!';
    managerToken = jwt.sign({ userId: manager._id.toString(), role: manager.role }, secret, { expiresIn: '1h' });
    staffToken = jwt.sign({ userId: staff._id.toString(), role: staff.role }, secret, { expiresIn: '1h' });
    otherStaffToken = jwt.sign({ userId: otherStaff._id.toString(), role: otherStaff.role }, secret, { expiresIn: '1h' });

    await ClientModel.deleteMany({ email: 'ananya@wellness360.in' });
    const client = await ClientModel.create({
      name: 'Wellness Retreat Test',
      contact: 'Ananya',
      phone: '9811122334',
      email: 'ananya@wellness360.in',
      type: 'Wellness Retreat',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110019',
      owner: 'Executive A',
      outstanding: '₹1,13,516',
      billingAddress: 'Delhi clinic / primary site',
    });
    clientId = client._id.toString();

    await OpportunityModel.deleteMany({ client: 'Wellness Retreat Test' });
    await OpportunityModel.create({
      id: 'OP-C360-1',
      title: 'Steam chamber bed / 2 units',
      client: 'Wellness Retreat Test',
      contact: 'Ananya',
      city: 'Delhi',
      value: '₹1,13,516',
      stage: 'proposal',
      owner: 'Executive A',
      salesTeam: 'Sales',
      expectedClose: '30 Nov 2026',
      businessType: 'Equipment',
      linkedLead: '',
      scope: 'Equipment',
    });

    await QuotationModel.deleteMany({ 'client.name': 'Wellness Retreat Test' });
    await QuotationModel.create({
      id: 'QT-C360-1',
      revision: 2,
      date: '24 Nov 2026',
      validUntil: '30 Nov 2026',
      status: 'Approved',
      approvalStatus: 'Approved',
      client: { name: 'Wellness Retreat Test', contact: 'Ananya', email: 'ananya@wellness360.in', city: 'Delhi' },
      opportunity: 'OP-C360-1',
      owner: 'Executive A',
      businessType: 'Equipment',
      lines: [{ id: 'l1', name: 'Steam chamber bed', qty: 2, unit: 'Nos', rate: 48000, discount: 0, gst: 18 }],
      freightCharges: 0,
      installationCharges: 0,
      totalAmount: 113516,
    });

    await SalesOrderModel.deleteMany({ client: 'Wellness Retreat Test' });
    await SalesOrderModel.create({
      id: 'SO-C360-1',
      status: 'Confirmed',
      quotationId: 'QT-C360-1',
      quotationRevision: 2,
      orderDate: '25 Nov 2026',
      client: 'Wellness Retreat Test',
      clientContact: 'Ananya',
      owner: 'Executive A',
      deliverySite: 'Delhi clinic',
      value: 113516,
    });

    await CrmRecord.deleteMany({
      key: { $in: [`client_prefs_${clientId}`, `client_act_${clientId}`, `client_conv_${clientId}`] },
    });
  });

  it('aggregates real MongoDB client, opportunity, quotation, order and persists preferences for Manager & assigned Staff', async () => {
    const getRes = await request(app)
      .get(`/api/v1/crm/clients/${clientId}/customer-360`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('Wellness Retreat Test');
    expect(getRes.body.data.latestQuotation.id).toBe('QT-C360-1');
    expect(getRes.body.data.latestQuotation.revision).toBe(2);
    expect(getRes.body.data.latestOrder.id).toBe('SO-C360-1');
    expect(getRes.body.data.activeOpportunitiesCount).toBe(1);
    expect(getRes.body.data.totals.business).toContain('1,13,516');
    expect(getRes.body.data.billing.latestInvoice).toBeDefined();
    expect(getRes.body.data.nextAction.owner).toBe('Executive A');
    expect(Array.isArray(getRes.body.data.files)).toBe(true);

    // Manager updates communication preferences
    const putRes = await request(app)
      .put(`/api/v1/crm/clients/${clientId}/preferences`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        preferredLanguage: 'Hindi',
        preferredChannel: 'Email',
        contactTime: '11:00 AM-5:00 PM',
        emailMarketingConsent: 'yes',
        whatsappMarketingConsent: 'opted_out',
        channelOptOuts: ['WhatsApp'],
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.preferredLanguage).toBe('Hindi');
    expect(putRes.body.data.whatsappMarketingConsent).toBe('opted_out');

    // Assigned Staff can view Customer 360 and log conversation
    const staffGet = await request(app)
      .get(`/api/v1/crm/clients/${clientId}/customer-360`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffGet.status).toBe(200);
    expect(staffGet.body.data.preferences.preferredChannel).toBe('Email');
    expect(staffGet.body.data.activities.some((a: any) => a.text.includes('Updated communication preferences'))).toBe(true);

    // Unassigned Staff is blocked from another owner's client 360
    const denied = await request(app)
      .get(`/api/v1/crm/clients/${clientId}/customer-360`)
      .set('Authorization', `Bearer ${otherStaffToken}`);
    expect(denied.status).toBe(403);

    // Missing client ID returns 404 (no mock fallback)
    const missing = await request(app)
      .get('/api/v1/crm/clients/non-existent-client-999/customer-360')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(missing.status).toBe(404);
  });
});
