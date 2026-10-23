import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import {
  InfraAsset,
  InfraSubscription,
  InfraSslCertificate,
  InfraMetricSample,
  InfraAlert,
  InfraSettings,
  InfraSyncRun,
  InfraCollector,
} from "../models/infrastructure/infrastructure.models";
import { connectDatabase } from "../config/database.config";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export async function seedInfrastructure(): Promise<void> {
  console.log("🌱 Seeding Ensis Infrastructure (Servers, Domains, SSL, Subscriptions)...");

  // 1. Settings
  await InfraSettings.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        key: "default",
        thresholdDays: [30, 15, 7, 3, 1, 0],
        inAppEnabled: true,
        emailEnabled: true,
        extraRecipients: ["admin@ensis.in"],
        defaultCurrency: "INR",
      },
    },
    { upsert: true }
  );

  // 2. Clear old demo assets if any (keep clean)
  await InfraAsset.deleteMany({});
  await InfraSubscription.deleteMany({});
  await InfraSslCertificate.deleteMany({});
  await InfraMetricSample.deleteMany({});
  await InfraAlert.deleteMany({});
  await InfraSyncRun.deleteMany({});
  await InfraCollector.deleteMany({});

  const now = new Date();
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 86400000);
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000);

  // 3. Servers
  const serverApp = await InfraAsset.create({
    type: "SERVER",
    name: "ensis-prod-app",
    technicalId: "13.233.142.85",
    environment: "PRODUCTION",
    provider: "AWS",
    ownerName: "DevOps Team",
    ownerEmail: "devops@ensis.in",
    tags: ["prod", "frontend", "api", "nextjs", "express"],
    notes: "Main application server hosting Ensis API and Web client.",
    server: {
      serverType: "VPS",
      planName: "AWS EC2 t4g.xlarge",
      hostname: "app.ensis.in",
      ipv4: "13.233.142.85",
      region: "ap-south-1",
      datacenter: "Mumbai AZ-1",
      operatingSystem: "Ubuntu 24.04 LTS (Noble Numbat)",
      vcpu: 4,
      ramMb: 8192,
      storageGb: 160,
      storageType: "gp3 NVMe SSD",
      providerStatus: "running",
      providerSuspended: false,
      providerCreatedAt: daysAgo(180),
      lastSyncedAt: now,
      syncState: "SYNCED",
    },
  });

  const serverDb = await InfraAsset.create({
    type: "SERVER",
    name: "ensis-prod-db",
    technicalId: "15.206.82.114",
    environment: "PRODUCTION",
    provider: "AWS",
    ownerName: "Database Team",
    ownerEmail: "dba@ensis.in",
    tags: ["prod", "mongodb", "primary-cluster", "replica-set"],
    notes: "High-performance MongoDB primary node with automated snapshot backup.",
    server: {
      serverType: "DEDICATED",
      planName: "AWS EC2 r6g.xlarge (Memory Optimized)",
      hostname: "db.ensis.in",
      ipv4: "15.206.82.114",
      region: "ap-south-1",
      datacenter: "Mumbai AZ-2",
      operatingSystem: "Ubuntu 22.04 LTS",
      vcpu: 4,
      ramMb: 16384,
      storageGb: 320,
      storageType: "io2 Provisioned IOPS",
      providerStatus: "running",
      providerSuspended: false,
      providerCreatedAt: daysAgo(210),
      lastSyncedAt: now,
      syncState: "SYNCED",
    },
  });

  const serverStaging = await InfraAsset.create({
    type: "SERVER",
    name: "ensis-staging-api",
    technicalId: "194.164.72.33",
    environment: "STAGING",
    provider: "Contabo",
    ownerName: "QA & Testing",
    ownerEmail: "qa@ensis.in",
    tags: ["staging", "test-env", "cicd"],
    notes: "Staging and CI/CD preview deployment environment.",
    server: {
      serverType: "CLOUD_INSTANCE",
      planName: "Contabo Cloud VPS S",
      hostname: "staging.ensis.in",
      ipv4: "194.164.72.33",
      region: "EU",
      datacenter: "European Union 1 (Frankfurt)",
      operatingSystem: "Debian 12 Bookworm",
      vcpu: 4,
      ramMb: 6144,
      storageGb: 100,
      storageType: "NVMe SSD",
      providerStatus: "running",
      providerSuspended: false,
      providerCreatedAt: daysAgo(90),
      lastSyncedAt: now,
      syncState: "SYNCED",
    },
  });

  const serverWorker = await InfraAsset.create({
    type: "SERVER",
    name: "ensis-ai-worker",
    technicalId: "13.127.91.45",
    environment: "PRODUCTION",
    provider: "AWS",
    ownerName: "AI Engineering",
    ownerEmail: "ai@ensis.in",
    tags: ["ai", "embeddings", "cv-screening", "batch-jobs"],
    notes: "Worker instance processing background resume parsing and vector search.",
    server: {
      serverType: "VPS",
      planName: "AWS EC2 c6g.xlarge (Compute Optimized)",
      hostname: "worker.ensis.in",
      ipv4: "13.127.91.45",
      region: "ap-south-1",
      datacenter: "Mumbai AZ-1",
      operatingSystem: "Ubuntu 24.04 LTS",
      vcpu: 4,
      ramMb: 8192,
      storageGb: 80,
      storageType: "gp3 SSD",
      providerStatus: "running",
      providerSuspended: false,
      providerCreatedAt: daysAgo(60),
      lastSyncedAt: now,
      syncState: "SYNCED",
    },
  });

  // 4. Domains
  const domainEnsis = await InfraAsset.create({
    type: "DOMAIN",
    name: "ensis.in",
    technicalId: "ensis.in",
    environment: "PRODUCTION",
    provider: "GoDaddy",
    ownerName: "Ensis Legal & IT",
    ownerEmail: "domains@ensis.in",
    tags: ["primary-domain", "brand", "production"],
    notes: "Primary business domain for Ensis e-commerce and platform.",
    domain: {
      fqdn: "ensis.in",
      unicodeName: "ensis.in",
      tld: "in",
      registrar: "GoDaddy.com, LLC",
      registeredAt: daysAgo(420),
      registryExpiresAt: daysFromNow(45),
      registrarExpiresAt: daysFromNow(45),
      rdapUpdatedAt: daysAgo(2),
      statuses: ["clientTransferProhibited", "active"],
      nameservers: ["ns1.cloudflare.com", "ns2.cloudflare.com"],
      dnssec: true,
      rdapSource: "https://rdap.registry.in/domain/ensis.in",
      rdapState: "OK",
      rdapCheckedAt: now,
      dnsState: "OK",
      dnsCheckedAt: now,
      alertsEnabled: true,
    },
  });

  const domainWellness = await InfraAsset.create({
    type: "DOMAIN",
    name: "ensiswellness.com",
    technicalId: "ensiswellness.com",
    environment: "PRODUCTION",
    provider: "Namecheap",
    ownerName: "Marketing Team",
    ownerEmail: "marketing@ensis.in",
    tags: ["secondary-domain", "wellness", "redirect"],
    notes: "Secondary domain for consumer wellness direct portal.",
    domain: {
      fqdn: "ensiswellness.com",
      unicodeName: "ensiswellness.com",
      tld: "com",
      registrar: "Namecheap, Inc.",
      registeredAt: daysAgo(180),
      registryExpiresAt: daysFromNow(185),
      registrarExpiresAt: daysFromNow(185),
      rdapUpdatedAt: daysAgo(5),
      statuses: ["clientTransferProhibited", "active"],
      nameservers: ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
      dnssec: false,
      rdapSource: "https://rdap.namecheap.com/domain/ensiswellness.com",
      rdapState: "OK",
      rdapCheckedAt: now,
      dnsState: "OK",
      dnsCheckedAt: now,
      alertsEnabled: true,
    },
  });

  await InfraAsset.create({
    type: "DOMAIN",
    name: "admin.ensis.in",
    technicalId: "admin.ensis.in",
    environment: "PRODUCTION",
    provider: "Cloudflare",
    ownerName: "DevOps Team",
    ownerEmail: "devops@ensis.in",
    tags: ["admin-portal", "subdomain"],
    notes: "Ensis Admin Management Portal.",
    domain: {
      fqdn: "admin.ensis.in",
      unicodeName: "admin.ensis.in",
      tld: "in",
      registrar: "GoDaddy.com, LLC",
      registeredAt: daysAgo(420),
      registryExpiresAt: daysFromNow(45),
      statuses: ["active"],
      nameservers: ["ns1.cloudflare.com", "ns2.cloudflare.com"],
      dnssec: true,
      rdapState: "OK",
      rdapCheckedAt: now,
      dnsState: "OK",
      dnsCheckedAt: now,
      alertsEnabled: true,
    },
  });

  await InfraAsset.create({
    type: "DOMAIN",
    name: "web.ensis.in",
    technicalId: "web.ensis.in",
    environment: "PRODUCTION",
    provider: "Cloudflare",
    ownerName: "DevOps Team",
    ownerEmail: "devops@ensis.in",
    tags: ["web-frontend", "subdomain"],
    notes: "Main customer-facing web storefront.",
    domain: {
      fqdn: "web.ensis.in",
      unicodeName: "web.ensis.in",
      tld: "in",
      registrar: "GoDaddy.com, LLC",
      registeredAt: daysAgo(420),
      registryExpiresAt: daysFromNow(45),
      statuses: ["active"],
      nameservers: ["ns1.cloudflare.com", "ns2.cloudflare.com"],
      dnssec: true,
      rdapState: "OK",
      rdapCheckedAt: now,
      dnsState: "OK",
      dnsCheckedAt: now,
      alertsEnabled: true,
    },
  });

  // 5. SSL Certificates
  await InfraSslCertificate.create({
    assetId: domainEnsis._id,
    hostname: "*.ensis.in",
    port: 443,
    commonName: "*.ensis.in",
    sans: ["*.ensis.in", "ensis.in"],
    issuer: "Let's Encrypt Authority X3",
    validFrom: daysAgo(30),
    validTo: daysFromNow(60),
    fingerprint: "E4:8B:92:F1:C7:3A:42:19:90:5B:C3:DF:14:8A:2F:33:C1:89:D2:EE",
    trusted: true,
    autoRenew: "ENABLED",
    lastCheckedAt: now,
    lastSuccessAt: now,
  });

  await InfraSslCertificate.create({
    assetId: domainEnsis._id,
    hostname: "ensis.in",
    port: 443,
    commonName: "ensis.in",
    sans: ["ensis.in", "www.ensis.in"],
    issuer: "Cloudflare Inc ECC CA-3",
    validFrom: daysAgo(45),
    validTo: daysFromNow(75),
    fingerprint: "8F:12:3C:99:A1:B7:E4:05:4F:9A:88:21:BC:CD:AA:12:EF:33:44:55",
    trusted: true,
    autoRenew: "ENABLED",
    lastCheckedAt: now,
    lastSuccessAt: now,
  });

  await InfraSslCertificate.create({
    assetId: domainWellness._id,
    hostname: "ensiswellness.com",
    port: 443,
    commonName: "ensiswellness.com",
    sans: ["ensiswellness.com", "www.ensiswellness.com"],
    issuer: "Sectigo RSA Domain Validation Secure Server CA",
    validFrom: daysAgo(20),
    validTo: daysFromNow(345),
    fingerprint: "A1:44:88:32:FF:EE:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD",
    trusted: true,
    autoRenew: "ENABLED",
    lastCheckedAt: now,
    lastSuccessAt: now,
  });

  // 6. Subscriptions
  await InfraSubscription.create({
    assetId: serverApp._id,
    kind: "SERVER",
    label: "AWS EC2 Production (t4g.xlarge)",
    providerName: "Amazon Web Services",
    billingAccount: "AWS-ENSIS-ACCT-9842",
    cycle: "MONTHLY",
    currency: "INR",
    amount: mongoose.Types.Decimal128.fromString("8500.00"),
    autoRenew: "ENABLED",
    paymentStatus: "PAID",
    lastPaymentDate: daysAgo(6),
    nextDueDate: daysFromNow(24),
    renewalDate: daysFromNow(24),
    invoiceRef: "INV-AWS-2026-10-883",
  });

  await InfraSubscription.create({
    assetId: serverDb._id,
    kind: "SERVER",
    label: "MongoDB Atlas Dedicated Cluster (M30)",
    providerName: "MongoDB Inc",
    billingAccount: "ATLAS-ENSIS-7741",
    cycle: "MONTHLY",
    currency: "INR",
    amount: mongoose.Types.Decimal128.fromString("12500.00"),
    autoRenew: "ENABLED",
    paymentStatus: "PAID",
    lastPaymentDate: daysAgo(12),
    nextDueDate: daysFromNow(18),
    renewalDate: daysFromNow(18),
    invoiceRef: "INV-MDB-2026-10-104",
  });

  await InfraSubscription.create({
    assetId: domainEnsis._id,
    kind: "DOMAIN_REGISTRATION",
    label: "ensis.in Domain Registration",
    providerName: "GoDaddy",
    billingAccount: "GD-ENSIS-DOMAIN",
    cycle: "YEARLY",
    currency: "INR",
    amount: mongoose.Types.Decimal128.fromString("1499.00"),
    autoRenew: "ENABLED",
    paymentStatus: "PENDING",
    lastPaymentDate: daysAgo(320),
    nextDueDate: daysFromNow(45),
    renewalDate: daysFromNow(45),
    expirationDate: daysFromNow(45),
    invoiceRef: "INV-GD-2025-03-492",
  });

  await InfraSubscription.create({
    assetId: serverStaging._id,
    kind: "SERVER",
    label: "Contabo Cloud VPS S Staging",
    providerName: "Contabo",
    billingAccount: "CT-ENSIS-VPS",
    cycle: "MONTHLY",
    currency: "INR",
    amount: mongoose.Types.Decimal128.fromString("1199.00"),
    autoRenew: "ENABLED",
    paymentStatus: "PAID",
    lastPaymentDate: daysAgo(15),
    nextDueDate: daysFromNow(15),
    renewalDate: daysFromNow(15),
    invoiceRef: "INV-CT-2026-10-441",
  });

  await InfraSubscription.create({
    assetId: serverWorker._id,
    kind: "SERVER",
    label: "AWS EC2 AI Worker (c6g.xlarge)",
    providerName: "Amazon Web Services",
    billingAccount: "AWS-ENSIS-ACCT-9842",
    cycle: "MONTHLY",
    currency: "INR",
    amount: mongoose.Types.Decimal128.fromString("7200.00"),
    autoRenew: "ENABLED",
    paymentStatus: "PAID",
    lastPaymentDate: daysAgo(10),
    nextDueDate: daysFromNow(20),
    renewalDate: daysFromNow(20),
    invoiceRef: "INV-AWS-2026-10-912",
  });

  // 7. Metric samples (for live graphs / server fleet metrics)
  const servers = [serverApp, serverDb, serverStaging, serverWorker];
  const sampleBatches: any[] = [];

  for (const s of servers) {
    // Generate 12 samples over the last 1 hour
    for (let i = 12; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 5 * 60000);
      const baseCpu = s === serverDb ? 32 : s === serverApp ? 24 : 15;
      const baseMem = s === serverDb ? 68 : s === serverApp ? 54 : 38;
      const jitter = (Math.sin(i) * 6);

      sampleBatches.push({
        assetId: s._id,
        ts,
        cpuPct: Math.round((baseCpu + jitter) * 10) / 10,
        cpuUserPct: Math.round((baseCpu * 0.75) * 10) / 10,
        cpuSystemPct: Math.round((baseCpu * 0.25) * 10) / 10,
        cpuIowaitPct: 0.2,
        cpuStealPct: 0.0,
        load1: Math.round((baseCpu / 25) * 100) / 100,
        load5: Math.round((baseCpu / 26) * 100) / 100,
        load15: Math.round((baseCpu / 27) * 100) / 100,
        memUsedBytes: Math.round(((baseMem + jitter) / 100) * (s.server?.ramMb || 4096) * 1024 * 1024),
        memTotalBytes: (s.server?.ramMb || 4096) * 1024 * 1024,
        diskUsedBytes: Math.round(0.42 * (s.server?.storageGb || 80) * 1024 * 1024 * 1024),
        diskTotalBytes: (s.server?.storageGb || 80) * 1024 * 1024 * 1024,
        uptimeSec: 86400 * 45 + i * 300,
      });
    }
  }

  await InfraMetricSample.insertMany(sampleBatches);

  // 8. Alerts
  await InfraAlert.create({
    assetId: domainEnsis._id,
    kind: "DOMAIN_EXPIRY",
    severity: "info",
    thresholdDays: 45,
    targetDate: daysFromNow(45),
    dedupeKey: `domain_expiry_${domainEnsis._id}_45d`,
    state: "OPEN",
    title: "Domain ensis.in registry renewal in 45 days",
    message: "Registration for ensis.in will expire on " + daysFromNow(45).toISOString().slice(0, 10) + ". Auto-renewal is enabled via GoDaddy.",
    raisedAt: daysAgo(1),
  });

  await InfraAlert.create({
    assetId: domainEnsis._id,
    kind: "SSL_EXPIRY",
    severity: "info",
    thresholdDays: 60,
    targetDate: daysFromNow(60),
    dedupeKey: `ssl_expiry_${domainEnsis._id}_60d`,
    state: "OPEN",
    title: "SSL Wildcard Certificate *.ensis.in renewal in 60 days",
    message: "Let's Encrypt Wildcard certificate is valid until " + daysFromNow(60).toISOString().slice(0, 10) + ". Automated ACME challenge will run in 30 days.",
    raisedAt: daysAgo(2),
  });

  // 9. Sync run history
  await InfraSyncRun.create({
    kind: "RDAP",
    status: "SUCCEEDED",
    trigger: "scheduled",
    startedAt: daysAgo(1),
    finishedAt: daysAgo(1),
    stats: { checked: 4, updated: 4, errors: 0 },
  });

  await InfraSyncRun.create({
    kind: "DNS",
    status: "SUCCEEDED",
    trigger: "scheduled",
    startedAt: daysAgo(1),
    finishedAt: daysAgo(1),
    stats: { checked: 4, recordsFound: 24, changed: 0 },
  });

  await InfraSyncRun.create({
    kind: "SSL",
    status: "SUCCEEDED",
    trigger: "scheduled",
    startedAt: daysAgo(1),
    finishedAt: daysAgo(1),
    stats: { checked: 3, valid: 3, errors: 0 },
  });

  console.log("✅ Ensis Infrastructure Seeded Successfully!");
  console.log(`   - Servers: ${servers.length}`);
  console.log(`   - Domains: 4`);
  console.log(`   - SSL Certificates: 3`);
  console.log(`   - Subscriptions: 5`);
  console.log(`   - Metric Samples: ${sampleBatches.length}`);
}

// Standalone execution: npx tsx src/seeds/infrastructure.seed.ts
if (require.main === module) {
  connectDatabase()
    .then(seedInfrastructure)
    .then(() => {
      console.log("Infrastructure seed completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Infrastructure seed failed:", err);
      process.exit(1);
    });
}
