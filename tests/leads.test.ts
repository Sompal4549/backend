import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin } from './helpers';
import { LeadModel } from '../src/models/lead.model';
import { OrderModel } from '../src/models/order.model';
import { InvoiceModel } from '../src/models/invoice.model';

describe('Leads Module', () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await createTestAdmin('leads-admin@ensis.in');
    adminToken = admin.token;
    await LeadModel.deleteMany({ email: { $regex: /@leadtest\.in$/i } });
  });

  it('populates defaults on create when minimal fields are passed', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Default',
        lastName: 'Tester',
        email: 'default-test@leadtest.in',
        phone: '9811223344',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const lead = res.body.data;
    expect(lead.leadStatus).toBe('New');
    expect(lead.priority).toBe('High');
    expect(lead.industrySector).toBe('Wellness');
    expect(lead.typeOfBusiness).toBe('Other');
    expect(lead.followUpDate).toBeDefined();
  });

  it('rejects duplicate email or phone with 409 Conflict', async () => {
    await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Duplicate',
        email: 'dupe@leadtest.in',
        phone: '9811223355',
      });

    const dupeRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Duplicate Two',
        email: 'dupe@leadtest.in',
        phone: '9811223366',
      });

    expect(dupeRes.status).toBe(409);
    expect(dupeRes.body.success).toBe(false);
  });

  it('blocks deletion with 409 if lead has orders or invoices', async () => {
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'WithOrder',
        email: 'withorder@leadtest.in',
        phone: '9811223377',
      });

    const leadId = createRes.body.data._id;

    // Create an order referencing this lead
    const order = await OrderModel.create({
      user: leadId,
      items: [],
      totalAmount: 15000,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      shippingAddress: {
        label: 'Clinic',
        fullName: 'Test Buyer',
        phone: '9811223377',
        street: '123 Market Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400001',
      },
    });

    const deleteRes = await request(app)
      .delete(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.message).toMatch(/cannot be deleted/i);

    // Clean up test order
    await OrderModel.deleteOne({ _id: order._id });
  });

  it('allows deletion when lead has no orders or invoices', async () => {
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'To Delete',
        email: 'todelete@leadtest.in',
        phone: '9811223388',
      });

    const leadId = createRes.body.data._id;
    const deleteRes = await request(app)
      .delete(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
