import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin, createTestLead } from './helpers';
import { ProductModel } from '../src/models/product.model';
import { CategoryModel } from '../src/models/category.model';
import { ReviewModel } from '../src/models/review.model';

describe('Reviews Module', () => {
  let adminToken: string;
  let leadToken: string;
  let leadId: string;
  let product: any;

  beforeEach(async () => {
    const admin = await createTestAdmin('review-admin@ensis.in');
    adminToken = admin.token;

    const leadData = await createTestLead('review-lead@ensis.in', '9877001122');
    leadToken = leadData.token;
    leadId = leadData.lead._id.toString();

    const category = await CategoryModel.create({
      name: 'Review Cat ' + Date.now(),
      slug: 'review-cat-' + Date.now(),
    });

    product = await ProductModel.create({
      title: 'Review Test Shirodhara Stand',
      slug: 'review-shirodhara-' + Date.now(),
      description: 'Solid brass and teak shirodhara apparatus',
      price: 18000,
      stock: 5,
      category: category._id,
      images: ['https://example.com/stand.webp'],
    });
  });

  it('creates a review ignoring client status, user, and verifiedBuyer overrides', async () => {
    const res = await request(app)
      .post(`/api/v1/reviews/${product._id}`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        rating: 5,
        comment: 'Exceptional craftsmanship and smooth brass finish!',
        status: 'rejected', // should be ignored
        verifiedBuyer: true, // should be ignored unless paid order exists
        user: '600000000000000000000999', // should be ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const saved = await ReviewModel.findById(res.body.data._id);
    expect(saved?.user.toString()).toBe(leadId);
    expect(saved?.status).toBe('approved');
    expect(saved?.verifiedBuyer).toBe(false);

    // Verify product averageRating was updated to 5
    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct?.averageRating).toBe(5);
  });

  it('hides rejected reviews from public queries and recalculates rating', async () => {
    // Add an approved 5-star review
    const reviewRes = await request(app)
      .post(`/api/v1/reviews/${product._id}`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        rating: 5,
        comment: 'Great table!',
      });

    const reviewId = reviewRes.body.data._id;

    // Public query includes it
    let pubRes = await request(app).get(`/api/v1/reviews/${product._id}`);
    expect(pubRes.body.data.reviews.length).toBe(1);

    // Admin rejects / hides the review
    const modRes = await request(app)
      .patch(`/api/v1/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    expect(modRes.status).toBe(200);

    // Public query now returns 0 reviews and average rating 0
    pubRes = await request(app).get(`/api/v1/reviews/${product._id}`);
    expect(pubRes.body.data.reviews.length).toBe(0);

    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct?.averageRating).toBe(0);
  });

  it('recalculates rating on bulk delete of reviews', async () => {
    const review = await ReviewModel.create({
      product: product._id,
      user: leadId,
      rating: 4,
      comment: 'Nice quality',
      status: 'approved',
    });

    await ProductModel.updateOne({ _id: product._id }, { averageRating: 4 });

    const bulkRes = await request(app)
      .post('/api/v1/reviews/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ids: [review._id.toString()],
        action: 'delete',
      });

    expect(bulkRes.status).toBe(200);
    const updatedProduct = await ProductModel.findById(product._id);
    expect(updatedProduct?.averageRating).toBe(0);
  });
});
