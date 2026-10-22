import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './helpers';
import { checkEnvironment, config } from '../src/config/app.config';
import { escapeRegex } from '../src/utils/escape-regex';

describe('Security & Environment Checks', () => {
  it('allows CORS for verified domain like https://web.ensis.in', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://web.ensis.in');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://web.ensis.in');
  });

  it('rejects CORS headers for untrusted foreign origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://malicious-hacker-site.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns 204 without CORS allow headers on preflight OPTIONS from unknown origin', async () => {
    const res = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'https://malicious-hacker-site.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('throws in checkEnvironment when in production with default JWT secret', () => {
    const originalEnv = config.env;
    const originalIsProd = config.isProduction;
    const originalDefault = config.usesDefaultJwtSecret;

    try {
      (config as any).env = 'production';
      (config as any).isProduction = true;
      (config as any).usesDefaultJwtSecret = true;
      expect(() => checkEnvironment()).toThrow(/Unsafe production configuration/i);
    } finally {
      (config as any).env = originalEnv;
      (config as any).isProduction = originalIsProd;
      (config as any).usesDefaultJwtSecret = originalDefault;
    }
  });

  it('escapes regex metacharacters in user inputs', () => {
    const dangerous = '.*+?^${}()|[]\\test';
    const escaped = escapeRegex(dangerous);
    expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\test');

    const regex = new RegExp('^' + escaped + '$');
    expect(regex.test(dangerous)).toBe(true);
    expect(regex.test('abc')).toBe(false);
  });
});
