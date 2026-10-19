import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin, createTestLead } from './helpers';
import { ProductModel } from '../src/models/product.model';
import { CategoryModel } from '../src/models/category.model';
import { InvoiceModel } from '../src/models/invoice.model';
import { LeadModel } from '../src/models/lead.model';
import { UserModel } from '../src/models/user.model';

describe('Mass assignment protection & Concurrency control', () => {
  let adminToken: string;
  let categoryId: string;

  beforeEach(async () => {
    const admin = await createTestAdmin(`admin-ma-${Date.now()}@ensis.in`);
    adminToken = admin.token;

    const category = await CategoryModel.create({
      name: 'Panchkarma Beds',
      slug: `beds-${Date.now()}`,
    });
    categoryId = category._id.toString();
  });

  it('product create and update ignore mass-assignment of sensitive fields', async () => {
    // 1. Create product with attempted injection of averageRating, reviews, isDeleted
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Luxury Droni Bed',
        price: 85000,
        category: categoryId,
        description: 'Authentic teakwood bed',
        averageRating: 5.0,
        reviews: ['600000000000000000000001'],
        isDeleted: true,
      });

    expect(res.status).toBe(201);
    const productId = res.body.data._id;

    const saved = await ProductModel.findById(productId).lean();
    expect(saved).toBeTruthy();
    // Default averageRating is 0, not 5.0 injected
    expect(saved?.averageRating).toBe(0);
    expect(saved?.reviews?.length).toBe(0);
    // Not deleted
    expect(saved?.isDeleted).toBeFalsy();

    // 2. Update product with attempted injection
    const updateRes = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Luxury Droni Bed Updated',
        averageRating: 4.9,
        isDeleted: true,
      });

    expect(updateRes.status).toBe(200);
    const updated = await ProductModel.findById(productId).lean();
    expect(updated?.title).toBe('Luxury Droni Bed Updated');
    expect(updated?.averageRating).toBe(0);
    expect(updated?.isDeleted).toBeFalsy();
  });

  it('product update with older updatedAt returns 409 conflict (stale-tab protection)', async () => {
    const product = await ProductModel.create({
      title: 'Therapy Table',
      slug: `therapy-table-${Date.now()}`,
      price: 50000,
      category: categoryId,
      description: 'Solid teakwood',
      stock: 10,
    });

    const oldTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

    // Attempting to update with an older timestamp than the doc has
    const res = await request(app)
      .put(`/api/v1/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Conflict Update',
        updatedAt: oldTimestamp,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/modified by someone else/i);
  });

  it('invoice update rejects changes to invoiceNumber, createdBy, and lead', async () => {
    const { lead } = await createTestLead(`lead-inv-${Date.now()}@test.com`, `9876${Math.floor(100000 + Math.random() * 900000)}`);

    const createRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'proforma',
        lead: lead._id.toString(),
        items: [{ name: 'Ayurvedic Table', quantity: 1, unitPrice: 20000, gstRate: 5 }],
        billingAddress: { name: 'Test Corp', city: 'Delhi', state: 'Delhi' },
      });

    expect(createRes.status).toBe(201);
    const invoiceId = createRes.body.data._id;
    const originalNumber = createRes.body.data.invoiceNumber;
    const originalCreatedBy = createRes.body.data.createdBy;

    // Attacking update to change invoiceNumber and createdBy
    const fakeLeadId = '507f1f77bcf86cd799439011';
    const fakeUserId = '507f1f77bcf86cd799439012';

    const updateRes = await request(app)
      .put(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceNumber: 'HACKED/001',
        createdBy: fakeUserId,
        lead: fakeLeadId,
        notes: 'Legitimate update note',
      });

    expect(updateRes.status).toBe(200);
    const updatedInvoice = await InvoiceModel.findById(invoiceId).lean();
    expect(updatedInvoice?.invoiceNumber).toBe(originalNumber);
    expect(updatedInvoice?.createdBy?.toString()).toBe(originalCreatedBy.toString());
    expect(updatedInvoice?.lead?.toString()).toBe(lead._id.toString());
    expect(updatedInvoice?.notes).toBe('Legitimate update note');
  });

  it('profile update never accepts role, password, refreshToken, or emailVerified', async () => {
    const customerUser = await UserModel.create({
      name: 'Regular Customer',
      email: `customer-${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'user',
      emailVerified: false,
    });

    const jwt = await import('jsonwebtoken');
    const { config } = await import('../src/config/app.config');
    const userToken = jwt.default.sign(
      { userId: customerUser._id.toString(), role: 'user' },
      config.jwtAccessSecret || 'test-jwt-access-secret-32-chars-ok!',
      { expiresIn: '15m' }
    );

    const res = await request(app)
      .put('/api/v1/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Updated Name',
        role: 'admin',
        password: 'HackedPassword123!',
        refreshToken: 'fake-refresh-token',
        emailVerified: true,
      });

    expect(res.status).toBe(200);

    const doc = await UserModel.findById(customerUser._id).select('+password +refreshToken').lean();
    expect(doc?.name).toBe('Updated Name');
    expect(doc?.role).toBe('user'); // Unchanged!
    expect(doc?.emailVerified).toBe(false); // Unchanged!
    expect(doc?.refreshToken).toBeFalsy(); // Unchanged!
  });
});
