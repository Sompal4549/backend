import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin } from './helpers';
import { CategoryModel } from '../src/models/category.model';
import { ProductModel } from '../src/models/product.model';

describe('Categories Module', () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await createTestAdmin('cat-admin@ensis.in');
    adminToken = admin.token;
    await CategoryModel.deleteMany({ name: { $regex: /^Test Category/i } });
  });

  it('auto-generates slug and creates category', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Category Ayurvedic Tables' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('test-category-ayurvedic-tables');
  });

  it('rejects duplicate category name with 409 Conflict', async () => {
    await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Category Dupe' });

    const dupeRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Category Dupe' });

    expect(dupeRes.status).toBe(409);
    expect(dupeRes.body.success).toBe(false);
  });

  it('blocks category deletion with 409 if products are assigned to it', async () => {
    const createRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Category In Use' });

    const categoryId = createRes.body.data._id;

    // Create a product referencing this category
    const product = await ProductModel.create({
      title: 'Therapy Table Under Cat',
      slug: 'therapy-table-under-cat-' + Date.now(),
      description: 'Solid teak massage table for therapies',
      price: 50000,
      category: categoryId,
      stock: 10,
      images: ['https://example.com/img.webp'],
    });

    const deleteRes = await request(app)
      .delete(`/api/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.success).toBe(false);

    // Clean up test product
    await ProductModel.deleteOne({ _id: product._id });
  });

  it('returns all categories with product counts on ?all=1, but only active on public request', async () => {
    const activeCat = await CategoryModel.create({
      name: 'Test Category Public Active',
      slug: 'test-category-public-active',
      isActive: true,
    });
    const inactiveCat = await CategoryModel.create({
      name: 'Test Category Admin Inactive',
      slug: 'test-category-admin-inactive',
      isActive: false,
    });

    const publicRes = await request(app).get('/api/v1/categories');
    expect(publicRes.status).toBe(200);
    const publicSlugs = publicRes.body.data.map((c: any) => c.slug);
    expect(publicSlugs).toContain('test-category-public-active');
    expect(publicSlugs).not.toContain('test-category-admin-inactive');

    const adminRes = await request(app)
      .get('/api/v1/categories?all=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    const adminSlugs = adminRes.body.data.map((c: any) => c.slug);
    expect(adminSlugs).toContain('test-category-public-active');
    expect(adminSlugs).toContain('test-category-admin-inactive');
    const matched = adminRes.body.data.find((c: any) => c.slug === 'test-category-public-active');
    expect(matched.productCount).toBeDefined();

    await CategoryModel.deleteMany({ _id: { $in: [activeCat._id, inactiveCat._id] } });
  });
});
