import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-32-chars-ok!';
  process.env.JWT_SECRET = 'test-jwt-access-secret-32-chars-ok!';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-32-chars-ok!';
  process.env.RAZORPAY_API_KEY = 'rzp_test_mock';
  process.env.RAZORPAY_TEST_SECRET = 'mock_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'mock_webhook_secret';

  try {
    mongoServer = await MongoMemoryServer.create({
      instance: { dbName: 'ensis-test' },
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  } catch (err) {
    console.warn('MongoMemoryServer fallback to local MongoDB test db:', (err as any)?.message || err);
    await mongoose.connect('mongodb://localhost:27017/ensis-test-memory');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
