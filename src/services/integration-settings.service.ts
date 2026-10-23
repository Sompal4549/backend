import { createHash } from 'crypto';
import { decryptField, encryptField, parseMasterKey } from '../modules/infrastructure/core/encryption.util';
import {
  IntegrationSettingsModel,
  IIntegrationSettings,
  IntegrationServiceKey,
  IntegrationTestResult,
} from '../models/integration-settings.model';
import { AppError } from '../utils/app-error';
import {
  cachedCall,
  clearGoogleCache,
  fetchAnalyticsSummary,
  fetchSearchConsoleSummary,
  normalizeGa4PropertyId,
  normalizeSearchConsoleSite,
  parseServiceAccountJson,
  runPageSpeedInsights,
  AnalyticsSummary,
  PageSpeedRaw,
  SearchConsoleSummary,
  ServiceAccountKey,
} from './google-api.service';

/**
 * Google integration settings (GA4, Search Console, PageSpeed Insights).
 * Secrets are encrypted at rest with AES-256-GCM (ENCRYPTION_MASTER_KEY) and never leave the server.
 */

const SETTINGS_KEY = 'default';
const MAX_SERVICE_ACCOUNT_LENGTH = 20_000;

export const SETUP_HINT = 'set up in Settings → Integrations';

const ANALYTICS_TTL_MS = 20 * 60 * 1000;
const SEARCH_CONSOLE_TTL_MS = 30 * 60 * 1000;
const PAGESPEED_TTL_MS = 30 * 60 * 1000;
const ERROR_TTL_MS = 2 * 60 * 1000;
const PAGESPEED_ERROR_TTL_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------------- *
 * Encryption
 * ------------------------------------------------------------------------- */

let cachedKey: { raw: string; key: Buffer } | null = null;

const masterKey = (): Buffer => {
  const raw = process.env.ENCRYPTION_MASTER_KEY?.trim();
  if (!raw) {
    throw new AppError(503, 'Credential storage is not configured on the server (ENCRYPTION_MASTER_KEY is missing).');
  }
  if (cachedKey?.raw === raw) return cachedKey.key;
  try {
    cachedKey = { raw, key: parseMasterKey(raw) };
  } catch {
    throw new AppError(503, 'ENCRYPTION_MASTER_KEY is invalid: it must be a base64-encoded 32-byte key.');
  }
  return cachedKey.key;
};

const encryptSecret = (plaintext: string) => encryptField(plaintext, masterKey());
const decryptSecret = (stored: string) => decryptField(stored, masterKey());

/* ------------------------------------------------------------------------- *
 * Settings document
 * ------------------------------------------------------------------------- */

const loadDoc = (withSecrets = false) => {
  const query = IntegrationSettingsModel.findOne({ key: SETTINGS_KEY });
  return withSecrets ? query.select('+serviceAccountKeyEnc +pagespeedApiKeyEnc') : query;
};

const envPagespeedKey = () => (process.env.PAGESPEED_API_KEY || process.env.PSI_API_KEY || '').trim();

export type IntegrationSettingsView = {
  ga4PropertyId: string;
  searchConsoleSiteUrl: string;
  serviceAccountConfigured: boolean;
  serviceAccountEmail: string;
  pagespeedKeyConfigured: boolean;
  pagespeedKeySource: 'settings' | 'env' | null;
  encryptionConfigured: boolean;
  lastTest: IIntegrationSettings['lastTest'];
  updatedAt: Date | null;
  updatedBy: string;
};

const encryptionReady = () => {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
};

/** Safe view for the admin panel: flags only, never the secrets themselves. */
export const getIntegrationSettingsView = async (): Promise<IntegrationSettingsView> => {
  const doc = await loadDoc(true).lean<IIntegrationSettings>();
  const pagespeedStored = Boolean(doc?.pagespeedApiKeyEnc);
  return {
    ga4PropertyId: doc?.ga4PropertyId ?? '',
    searchConsoleSiteUrl: doc?.searchConsoleSiteUrl ?? '',
    serviceAccountConfigured: Boolean(doc?.serviceAccountKeyEnc),
    serviceAccountEmail: doc?.serviceAccountKeyEnc ? doc?.serviceAccountEmail ?? '' : '',
    pagespeedKeyConfigured: pagespeedStored || Boolean(envPagespeedKey()),
    pagespeedKeySource: pagespeedStored ? 'settings' : envPagespeedKey() ? 'env' : null,
    encryptionConfigured: encryptionReady(),
    lastTest: doc?.lastTest ?? null,
    updatedAt: doc?.updatedAt ?? null,
    updatedBy: doc?.updatedBy ?? '',
  };
};

export type IntegrationSettingsInput = {
  ga4PropertyId?: unknown;
  searchConsoleSiteUrl?: unknown;
  serviceAccountJson?: unknown;
  pagespeedApiKey?: unknown;
  clearServiceAccount?: unknown;
  clearPagespeedApiKey?: unknown;
};

const asTrimmedString = (value: unknown, field: string): string => {
  if (value === null) return '';
  if (typeof value !== 'string') throw new AppError(400, `${field} must be a string`);
  return value.trim();
};

/**
 * Updates the integration settings. An empty/missing secret keeps the stored one;
 * `clearServiceAccount` / `clearPagespeedApiKey` remove it explicitly.
 */
export const updateIntegrationSettings = async (body: IntegrationSettingsInput, editor: string) => {
  const update: Record<string, unknown> = { updatedBy: editor };

  if (body.ga4PropertyId !== undefined) {
    const raw = asTrimmedString(body.ga4PropertyId, 'GA4 property ID');
    if (raw) {
      const id = normalizeGa4PropertyId(raw);
      if (!id) throw new AppError(400, 'GA4 property ID must be the numeric property ID (e.g. 123456789), not a G- measurement ID');
      update.ga4PropertyId = id;
    } else {
      update.ga4PropertyId = '';
    }
  }

  if (body.searchConsoleSiteUrl !== undefined) {
    const raw = asTrimmedString(body.searchConsoleSiteUrl, 'Search Console property');
    if (raw) {
      const site = normalizeSearchConsoleSite(raw);
      if (!site) throw new AppError(400, 'Search Console property must look like "sc-domain:ensis.in" or "https://ensis.in/"');
      update.searchConsoleSiteUrl = site;
    } else {
      update.searchConsoleSiteUrl = '';
    }
  }

  if (body.clearServiceAccount === true) {
    update.serviceAccountKeyEnc = '';
    update.serviceAccountEmail = '';
  } else if (body.serviceAccountJson !== undefined) {
    const raw = asTrimmedString(body.serviceAccountJson, 'Service account key');
    if (raw) {
      if (raw.length > MAX_SERVICE_ACCOUNT_LENGTH) throw new AppError(400, 'Service account key is too large');
      let account: ServiceAccountKey;
      try {
        account = parseServiceAccountJson(raw);
      } catch (error) {
        throw new AppError(400, error instanceof Error ? error.message : 'Invalid service account key');
      }
      // Store only the two fields we need
      update.serviceAccountKeyEnc = encryptSecret(
        JSON.stringify({ client_email: account.client_email, private_key: account.private_key })
      );
      update.serviceAccountEmail = account.client_email;
    }
  }

  if (body.clearPagespeedApiKey === true) {
    update.pagespeedApiKeyEnc = '';
  } else if (body.pagespeedApiKey !== undefined) {
    const raw = asTrimmedString(body.pagespeedApiKey, 'PageSpeed API key');
    if (raw) {
      if (!/^[A-Za-z0-9_-]{20,200}$/.test(raw)) throw new AppError(400, 'PageSpeed API key looks invalid');
      update.pagespeedApiKeyEnc = encryptSecret(raw);
    }
  }

  await IntegrationSettingsModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: update, $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, new: true, runValidators: true }
  );
  clearGoogleCache();
  return getIntegrationSettingsView();
};

/* ------------------------------------------------------------------------- *
 * Resolved credentials (server-side only)
 * ------------------------------------------------------------------------- */

export type ResolvedIntegrations = {
  ga4PropertyId: string;
  searchConsoleSiteUrl: string;
  serviceAccount: ServiceAccountKey | null;
  /** Set when a stored service account exists but cannot be used (e.g. master key changed) */
  serviceAccountError: string | null;
  pagespeedApiKey: string;
  pagespeedKeyError: string | null;
};

export const resolveIntegrations = async (): Promise<ResolvedIntegrations> => {
  const doc = await loadDoc(true).lean<IIntegrationSettings>();

  let serviceAccount: ServiceAccountKey | null = null;
  let serviceAccountError: string | null = null;
  if (doc?.serviceAccountKeyEnc) {
    try {
      serviceAccount = parseServiceAccountJson(decryptSecret(doc.serviceAccountKeyEnc));
    } catch {
      serviceAccountError = 'The stored service account key cannot be decrypted — re-enter it in Settings → Integrations.';
    }
  }

  let pagespeedApiKey = '';
  let pagespeedKeyError: string | null = null;
  if (doc?.pagespeedApiKeyEnc) {
    try {
      pagespeedApiKey = decryptSecret(doc.pagespeedApiKeyEnc);
    } catch {
      pagespeedKeyError = 'The stored PageSpeed API key cannot be decrypted — re-enter it in Settings → Integrations.';
    }
  }
  if (!pagespeedApiKey && !pagespeedKeyError) pagespeedApiKey = envPagespeedKey();

  return {
    ga4PropertyId: doc?.ga4PropertyId ?? '',
    searchConsoleSiteUrl: doc?.searchConsoleSiteUrl ?? '',
    serviceAccount,
    serviceAccountError,
    pagespeedApiKey,
    pagespeedKeyError,
  };
};

const fingerprint = (...parts: string[]) => createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);

/* ------------------------------------------------------------------------- *
 * Service readiness + cached fetches
 * ------------------------------------------------------------------------- */

type Readiness = { configured: true } | { configured: false; reason: string; isError?: boolean };

export const analyticsReadiness = (creds: ResolvedIntegrations): Readiness => {
  if (!creds.ga4PropertyId && !creds.serviceAccount && !creds.serviceAccountError) {
    return { configured: false, reason: `Google Analytics is not connected — ${SETUP_HINT}.` };
  }
  if (creds.serviceAccountError) return { configured: false, reason: creds.serviceAccountError, isError: true };
  if (!creds.ga4PropertyId) return { configured: false, reason: `GA4 property ID is missing — ${SETUP_HINT}.` };
  if (!creds.serviceAccount) return { configured: false, reason: `Service account key is missing — ${SETUP_HINT}.` };
  return { configured: true };
};

export const searchConsoleReadiness = (creds: ResolvedIntegrations): Readiness => {
  if (!creds.searchConsoleSiteUrl && !creds.serviceAccount && !creds.serviceAccountError) {
    return { configured: false, reason: `Search Console is not connected — ${SETUP_HINT}.` };
  }
  if (creds.serviceAccountError) return { configured: false, reason: creds.serviceAccountError, isError: true };
  if (!creds.searchConsoleSiteUrl) return { configured: false, reason: `Search Console property is missing — ${SETUP_HINT}.` };
  if (!creds.serviceAccount) return { configured: false, reason: `Service account key is missing — ${SETUP_HINT}.` };
  return { configured: true };
};

export const pageSpeedReadiness = (creds: ResolvedIntegrations): Readiness => {
  if (creds.pagespeedKeyError) return { configured: false, reason: creds.pagespeedKeyError, isError: true };
  if (!creds.pagespeedApiKey) return { configured: false, reason: `PageSpeed Insights is not connected — ${SETUP_HINT}.` };
  return { configured: true };
};

export const getAnalyticsSummary = (creds: ResolvedIntegrations, force = false): Promise<AnalyticsSummary> => {
  const account = creds.serviceAccount as ServiceAccountKey;
  const key = `ga4:${fingerprint(creds.ga4PropertyId, account.client_email)}`;
  return cachedCall(key, ANALYTICS_TTL_MS, ERROR_TTL_MS, () => fetchAnalyticsSummary(account, creds.ga4PropertyId), force);
};

export const getSearchConsoleSummary = (creds: ResolvedIntegrations, force = false): Promise<SearchConsoleSummary> => {
  const account = creds.serviceAccount as ServiceAccountKey;
  const key = `gsc:${fingerprint(creds.searchConsoleSiteUrl, account.client_email)}`;
  return cachedCall(
    key,
    SEARCH_CONSOLE_TTL_MS,
    ERROR_TTL_MS,
    () => fetchSearchConsoleSummary(account, creds.searchConsoleSiteUrl),
    force
  );
};

export const getPageSpeedReport = (
  creds: ResolvedIntegrations,
  url: string,
  strategy: 'mobile' | 'desktop',
  force = false
): Promise<PageSpeedRaw> => {
  const key = `psi:${strategy}:${url}:${fingerprint(creds.pagespeedApiKey)}`;
  return cachedCall(
    key,
    PAGESPEED_TTL_MS,
    PAGESPEED_ERROR_TTL_MS,
    () => runPageSpeedInsights(url, strategy, creds.pagespeedApiKey),
    force
  );
};

/* ------------------------------------------------------------------------- *
 * Public site URL
 * ------------------------------------------------------------------------- */

export const publicSiteUrl = (): string => {
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://ensis.in';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://ensis.in';
  }
};

/** Only pages on the public site may be audited with the stored PageSpeed key. */
export const isPublicSiteUrl = (raw: string): boolean => {
  try {
    const target = new URL(raw);
    const host = new URL(publicSiteUrl()).hostname.replace(/^www\./, '');
    return (
      (target.protocol === 'https:' || target.protocol === 'http:') &&
      (target.hostname === host || target.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------------- *
 * Connection test
 * ------------------------------------------------------------------------- */

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

/** Calls each configured service (bypassing the cache) and stores the per-service outcome. */
export const testIntegrations = async () => {
  const creds = await resolveIntegrations();

  const run = async (
    readiness: Readiness,
    probe: () => Promise<string>
  ): Promise<IntegrationTestResult> => {
    if (!readiness.configured) return { ok: false, configured: false, message: readiness.reason };
    try {
      return { ok: true, configured: true, message: await probe() };
    } catch (error) {
      return { ok: false, configured: true, message: errorText(error) };
    }
  };

  const [analytics, searchConsole, pageSpeed] = await Promise.all([
    run(analyticsReadiness(creds), async () => {
      const summary = await getAnalyticsSummary(creds, true);
      return `Connected — ${summary.users} users, ${summary.pageViews} page views in the last 28 days.`;
    }),
    run(searchConsoleReadiness(creds), async () => {
      const summary = await getSearchConsoleSummary(creds, true);
      return `Connected — ${summary.clicks} clicks, ${summary.impressions} impressions in the last 28 days.`;
    }),
    run(pageSpeedReadiness(creds), async () => {
      const report = await getPageSpeedReport(creds, `${publicSiteUrl()}/`, 'mobile', true);
      const score = report.lighthouseResult.categories.performance?.score;
      return `Connected — homepage mobile performance score ${typeof score === 'number' ? Math.round(score * 100) : 'n/a'}.`;
    }),
  ]);

  const results: Record<IntegrationServiceKey, IntegrationTestResult> = { analytics, searchConsole, pageSpeed };
  const lastTest = { testedAt: new Date(), results };
  await IntegrationSettingsModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { lastTest }, $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true }
  );
  return lastTest;
};
