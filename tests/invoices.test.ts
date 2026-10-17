import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin, createTestLead } from './helpers';
import { ProductModel } from '../src/models/product.model';
import { CategoryModel } from '../src/models/category.model';
import { OrderModel } from '../src/models/order.model';
import { InvoiceModel } from '../src/models/invoice.model';

describe('Invoices & Estimates Module', () => {
  let adminToken: string;
  let leadToken: string;
  let otherLeadToken: string;
  let leadId: string;
  let testOrder: any;

  beforeEach(async () => {
    const admin = await createTestAdmin('invoice-admin@ensis.in');
    adminToken = admin.token;

    const leadData = await createTestLead('invoice-customer@ensis.in', '9811002233');
    leadToken = leadData.token;
    leadId = leadData.lead._id.toString();

    const otherLeadData = await createTestLead('other-customer@ensis.in', '9811004455');
    otherLeadToken = otherLeadData.token;

    const category = await CategoryModel.create({
      name: 'Invoice Test Cat ' + Date.now(),
      slug: 'invoice-cat-' + Date.now(),
    });

    const product = await ProductModel.create({
      title: 'Invoice Test Table',
      slug: 'invoice-test-table-' + Date.now(),
      description: 'Handcrafted droni table',
      price: 30000,
      stock: 10,
      category: category._id,
      images: ['https://example.com/invoice-table.webp'],
    });

    testOrder = await OrderModel.create({
      user: leadId,
      items: [
        {
          product: product._id,
          name: product.title,
          quantity: 2,
          price: 30000,
          gstRate: 18,
        },
      ],
      subtotal: 60000,
      discount: 4800,
      shipping: 0,
      tax: 10800,
      totalAmount: 66000,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      shippingAddress: {
        label: 'Clinic',
        fullName: 'Test Customer',
        phone: '9811002233',
        street: '456 Wellness Blvd',
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        postalCode: '302001',
      },
    });
  });

  it('creates an invoice from order for the order owner', async () => {
    const res = await request(app)
      .post(`/api/v1/invoices/from-order/${testOrder._id}`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toMatch(/^DHIPL\/FY\d{2}-\d{2}\/TI\/\d+$/);
    expect(res.body.data.totalAmount).toBe(testOrder.totalAmount);
  });

  it('rejects creating an invoice from order if called by another customer', async () => {
    const res = await request(app)
      .post(`/api/v1/invoices/from-order/${testOrder._id}`)
      .set('Authorization', `Bearer ${otherLeadToken}`);

    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to create invoice from any order', async () => {
    const res = await request(app)
      .post(`/api/v1/invoices/from-order/${testOrder._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('creates a proforma estimate and records payment via update', async () => {
    const estimateRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lead: leadId,
        type: 'proforma',
        items: [
          {
            name: 'Custom Swedana Box',
            description: 'Seasoned teak wood with steam outlet',
            quantity: 1,
            unitPrice: 40000,
            gstRate: 18,
          },
        ],
        billingAddress: {
          name: 'Jaipur Wellness Centre',
          city: 'Jaipur',
          state: 'Rajasthan',
        },
      });

    expect(estimateRes.status).toBe(201);
    expect(estimateRes.body.data.type).toBe('proforma');
    expect(estimateRes.body.data.invoiceNumber).toMatch(/^DHIPL\/FY\d{2}-\d{2}\/PI\/\d+$/);

    const invoiceId = estimateRes.body.data._id;

    // Record partial payment
    const updateRes = await request(app)
      .put(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentReceived: 20000,
        status: 'partial',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.paymentReceived).toBe(20000);
    expect(updateRes.body.data.status).toBe('partial');
  });

  it('renders printable HTML view with amount in words', async () => {
    const inv = await InvoiceModel.findOne({ order: testOrder._id });
    const invoiceId = inv ? inv._id : (await request(app).post(`/api/v1/invoices/from-order/${testOrder._id}`).set('Authorization', `Bearer ${adminToken}`)).body.data._id;

    const htmlRes = await request(app)
      .get(`/api/v1/invoices/${invoiceId}/html`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(htmlRes.status).toBe(200);
    expect(htmlRes.text).toContain('Rupees Only');
    expect(htmlRes.text).toContain('Design House India');
  });
});
