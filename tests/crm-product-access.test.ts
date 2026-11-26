import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './helpers';
import { UserModel } from '../src/models/user.model';
import { crmAuthService } from '../src/modules/crm/auth/auth.service';

describe('CRM Product Access & Login Check', () => {
  let userId: string;
  const email = 'access-test-user@ensis.in';

  beforeEach(async () => {
    await UserModel.deleteMany({ email });
    const user = await UserModel.create({
      name: 'Access Test User',
      email,
      password: 'Password@123',
      role: 'admin',
      crmRole: 'Sales Executive',
      crmAccess: false,
      adminAccess: true,
      productAccess: 'admin',
      isVerified: true,
    });
    userId = user._id.toString();
  });

  it('denies CRM login when productAccess is admin, and allows it after setting productAccess to both', async () => {
    // Initially admin-only -> login must fail with 403 English message
    await expect(crmAuthService.login(email, 'Password@123')).rejects.toThrow(
      'Your account does not have access to Ensis CRM. Please contact your Super Admin for permission.'
    );

    // Toggle productAccess to 'both'
    const res = await request(app)
      .patch(`/api/v1/crm/settings/users/${userId}/product-access`)
      .send({ productAccess: 'both' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: userId,
      crmAccess: true,
      adminAccess: true,
      productAccess: 'both',
    });

    const updated = await UserModel.findById(userId).lean();
    expect(updated?.crmAccess).toBe(true);
    expect(updated?.adminAccess).toBe(true);
    expect(updated?.productAccess).toBe('both');

    // Now login passes the CRM access check
    const loginRes = await crmAuthService.login(email, 'Password@123');
    expect(loginRes).toBeDefined();
  });

  it('rejects invalid productAccess values with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/settings/users/${userId}/product-access`)
      .send({ productAccess: 'invalid' });

    expect(res.status).toBe(400);
  });
});
