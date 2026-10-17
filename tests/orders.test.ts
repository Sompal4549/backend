import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin, createTestLead } from './helpers';
import { ProductModel } from '../src/models/product.model';
import { CategoryModel } from '../src/models/category.model';
import { OrderModel } from '../src/models/order.model';

describe('Orders Module', () => {
  let adminToken: string;
  let leadToken: string;
  let leadId: string;
  let testProduct: any;

  beforeEach(async () => {
    const admin = await createTestAdmin('order-admin@ensis.in');
    adminToken = admin.token;
    const leadData = await createTestLead('order-customer@ensis.in', '9899887766');
    leadToken = leadData.token;
    leadId = leadData.lead._id.toString();

    const category = await CategoryModel.create({
      name: 'Order Category Test ' + Date.now(),
      slug: 'order-category-' + Date.now(),
    });

    testProduct = await ProductModel.create({
      title: 'Order Spec Table',
      slug: 'order-spec-table-' + Date.now(),
      description: 'Teak wood therapy table',
      price: 25000,
      stock: 5,
      category: category._id,
      gstRate: 18,
      images: ['https://example.com/order-table.webp'],
    });
  });

  it('creates an order with idempotencyKey, reducing product stock', async () => {
    const idempotencyKey = 'key-' + Date.now() + '-unique';
    const orderPayload = {
      idempotencyKey,
      items: [
        {
          product: testProduct._id.toString(),
          quantity: 2,
        },
      ],
      shippingAddress: {
        label: 'Home',
        fullName: 'Test Customer',
        phone: '9899887766',
        street: '123 Order Ave',
        city: 'Noida',
        state: 'Uttar Pradesh',
        country: 'India',
        postalCode: '201301',
      },
    };

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${leadToken}`)
      .send(orderPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.idempotencyKey).toBe(idempotencyKey);

    // Verify stock was reduced from 5 to 3
    const updatedProduct = await ProductModel.findById(testProduct._id);
    expect(updatedProduct?.stock).toBe(3);

    // Calling again with the same idempotencyKey returns the same order without deducting stock again
    const dupeRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${leadToken}`)
      .send(orderPayload);

    expect(dupeRes.status).toBe(201);
    expect(dupeRes.body.data._id).toBe(res.body.data._id);

    const recheckedProduct = await ProductModel.findById(testProduct._id);
    expect(recheckedProduct?.stock).toBe(3);
  });

  it('supports admin list, search, and summary on /orders/admin/all', async () => {
    const res = await request(app)
      .get('/api/v1/orders/admin/all?search=Noida')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orders).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
  });

  it('restores stock when an order is cancelled', async () => {
    const idempotencyKey = 'cancel-test-' + Date.now();
    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        idempotencyKey,
        items: [
          {
            product: testProduct._id.toString(),
            quantity: 2,
          },
        ],
        shippingAddress: {
          label: 'Home',
          fullName: 'Test Customer',
          phone: '9899887766',
          street: '123 Order Ave',
          city: 'Noida',
          state: 'Uttar Pradesh',
          country: 'India',
          postalCode: '201301',
        },
      });

    const orderId = createRes.body.data._id;
    let prod = await ProductModel.findById(testProduct._id);
    expect(prod?.stock).toBe(3);

    // Cancel order
    const cancelRes = await request(app)
      .put(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ orderStatus: 'cancelled' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.orderStatus).toBe('cancelled');

    // Stock should be restored to 5
    prod = await ProductModel.findById(testProduct._id);
    expect(prod?.stock).toBe(5);
  });

  it('dispatches an order with tracking number and courier partner', async () => {
    const idempotencyKey = 'dispatch-test-' + Date.now();
    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        idempotencyKey,
        items: [{ product: testProduct._id.toString(), quantity: 1 }],
        shippingAddress: {
          label: 'Home',
          fullName: 'Test Customer',
          phone: '9899887766',
          street: '123 Order Ave',
          city: 'Noida',
          state: 'Uttar Pradesh',
          country: 'India',
          postalCode: '201301',
        },
      });

    const orderId = createRes.body.data._id;

    const dispatchRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        trackingNumber: 'TRK123456789',
        courierPartner: 'BlueDart Express',
      });

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.success).toBe(true);
    expect(dispatchRes.body.data.orderStatus).toBe('shipped');
    expect(dispatchRes.body.data.trackingNumber).toBe('TRK123456789');
  });
});
