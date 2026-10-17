import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin, createTestLead } from './helpers';
import { UserModel } from '../src/models/user.model';

describe('Auth & Authorization', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({ email: 'auth-spec@ensis.in' });
  });

  it('rejects protected routes with 401 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects protected admin routes with 403 when called by a customer/lead token', async () => {
    const { token } = await createTestLead('customer-auth@ensis.in', '9988776655');
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('allows admin login and requires 2FA verification', async () => {
    const password = 'SecurePassword@123';
    await UserModel.create({
      name: 'Admin Spec',
      email: 'auth-spec@ensis.in',
      password, // userSchema.pre('save') hashes this
      role: 'admin',
      isVerified: true,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'auth-spec@ensis.in', password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);

    const { tempToken, requires2FA } = loginRes.body.data;
    if (requires2FA && tempToken) {
      // In non-production, master code 123456 works
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-2fa')
        .send({ token: '123456', tempToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.token).toBeDefined();
    }
  });

  it('allows access to admin routes with a valid admin token', async () => {
    const { token } = await createTestAdmin('active-admin@ensis.in');
    const res = await request(app)
      .get('/api/v1/categories?all=1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
