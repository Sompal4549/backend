import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin } from './helpers';
import { UserModel } from '../src/models/user.model';

describe('Staff set-password & auto employee ID', () => {
  let token: string;

  beforeEach(async () => {
    await UserModel.deleteMany({ email: { $in: ['staff-nopwd@ensis.in', 'staff-setpwd@ensis.in'] } });
    ({ token } = await createTestAdmin());
  });

  it('auto-generates an employee ID when creating staff without one', async () => {
    const res = await request(app)
      .post('/api/v1/users/admin/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Emp Id', email: 'staff-nopwd@ensis.in', phone: '9876543210' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.employeeId).toMatch(/^EMP-\d{6}$/);
    expect(res.body.data.user.hasPassword).toBe(true);
    expect(res.body.data.temporaryPassword).toBeTruthy();
  });

  it('reports hasPassword=false for users saved without a password', async () => {
    await UserModel.create({ name: 'No Password', email: 'staff-nopwd@ensis.in', role: 'admin' });

    const res = await request(app)
      .get('/api/v1/users/admin/staff')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const target = res.body.data.find((u: { email: string }) => u.email === 'staff-nopwd@ensis.in');
    expect(target).toBeDefined();
    expect(target.hasPassword).toBe(false);
    expect(target).not.toHaveProperty('password');
  });

  it('lets an admin set a password for an existing password-less user', async () => {
    const user = await UserModel.create({ name: 'Set Pwd', email: 'staff-setpwd@ensis.in', role: 'admin' });

    const res = await request(app)
      .post(`/api/v1/users/admin/staff/${user._id}/set-password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'NewPass@123' });

    expect(res.status).toBe(200);
    expect(res.body.data.hasPassword).toBe(true);

    // Fresh fetch with +password: must be hashed exactly once (pre-save hook only)
    const updated = await UserModel.findById(user._id).select('+password');
    expect(await updated!.comparePassword('NewPass@123')).toBe(true);
    expect(updated!.password).not.toBe('NewPass@123');
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const user = await UserModel.create({ name: 'Short Pwd', email: 'staff-setpwd@ensis.in', role: 'admin' });

    const res = await request(app)
      .post(`/api/v1/users/admin/staff/${user._id}/set-password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'short1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown staff id', async () => {
    const res = await request(app)
      .post('/api/v1/users/admin/staff/64b000000000000000000000/set-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'NewPass@123' });

    expect(res.status).toBe(404);
  });

  it('requires an admin token', async () => {
    const res = await request(app)
      .post('/api/v1/users/admin/staff/64b000000000000000000000/set-password')
      .send({ password: 'NewPass@123' });

    expect(res.status).toBe(401);
  });
});
