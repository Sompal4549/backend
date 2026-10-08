import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { ProductModel } from '../models/product.model';

type AnyRec = Record<string, any>;

interface SeedRecord {
  code: string;
  title?: string;
  material?: string;
  tags?: string[];
  overview?: AnyRec;
  _expected?: AnyRec;
}

interface Change {
  field: string;
  from: string;
  to: string;
}

const DATA_FILE = path.join(__dirname, 'products.seed.data.ts');
const BACKUP_DIR = path.join(__dirname, 'backups');

const MATCH_KEY = 'code';

const UPDATABLE_FIELDS = [
  'title',
  'material',
  'tags',
  'overview.productSpecifications',
  'overview.smartDesignAppearance.sizeOptions',
];

const NEVER_UPDATED_FIELDS = [
  'images',
  'price',
  'discountPrice',
  'gstRate',
  'stock',
  'description',
  'shortDescription',
  'category',
  'code',
  'slug',
  'orderBy',
  '_id',
  'variants',
  'averageRating',
  'reviews',
  'hsnCode',
  'subcategory',
  'isActive',
  'isFeatured',
  'createdAt',
  'updatedAt',
  'overview.idealFor',
  'overview.smartDesignAppearance.woodFinish',
  'overview.emiOptions',
  'overview.customSize',
  'overview.whatisInclueded',
  'overview.productPricingFeatures',
];

const PROTECTED_TOP_LEVEL = [
  'images',
  'price',
  'discountPrice',
  'gstRate',
  'stock',
  'description',
  'shortDescription',
  'category',
  'slug',
  'orderBy',
];

const args = process.argv.slice(2);
const hasFlag = (name: string): boolean => args.includes(name);

const DRY_RUN = hasFlag('--dry-run');
const UPDATE_TITLES = hasFlag('--update-titles');
const ALLOW_CREATE = hasFlag('--allow-create');
const FORCE = hasFlag('--force');

const log = (line = '') => console.log(line);
const rule = (label: string) => log(`\n${'─'.repeat(20)} ${label} ${'─'.repeat(20)}`);

const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  return false;
};

const stableStringify = (value: any): string => {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const preview = (value: any): string => {
  const text = typeof value === 'string' ? value : stableStringify(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
};

const loadSeedData = (): SeedRecord[] => {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Seed data file not found: ${DATA_FILE}`);
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  const jsonish = raw
    .replace(/^\s*export\s+default\s+/, '')
    .replace(/^\s*export\s+const\s+\w+\s*=\s*/, '')
    .replace(/;\s*$/, '');
  let parsed: any;
  try {
    parsed = JSON.parse(jsonish);
  } catch (error) {
    throw new Error(`Seed data file is not valid JSON: ${(error as Error).message}`);
  }
  if (!Array.isArray(parsed)) throw new Error('Seed data must be an array of product records');

  const seen = new Set<string>();
  parsed.forEach((record: AnyRec, index: number) => {
    const code = record?.code;
    if (typeof code !== 'string' || !code.trim()) {
      throw new Error(`Seed record #${index + 1} has no "${MATCH_KEY}" — matching key is mandatory`);
    }
    const normalized = code.trim();
    if (seen.has(normalized)) throw new Error(`Duplicate "${MATCH_KEY}" in seed data: ${normalized}`);
    seen.add(normalized);
  });

  return parsed as SeedRecord[];
};

const mergeProductSpecifications = (seedSpecs: any[] | undefined, dbSpecs: any[]): any[] | undefined => {
  if (!seedSpecs || seedSpecs.length === 0) return undefined;
  const dbBlocks = Array.isArray(dbSpecs) ? dbSpecs : [];
  return seedSpecs.map((block, index) => {
    if (block && block.image) return block;
    let source = dbBlocks[index];
    if (!source || !source.image) {
      source = dbBlocks.find((candidate) => {
        const candidateTitle = String(candidate?.title ?? '').trim().toLowerCase();
        const blockTitle = String(block?.title ?? '').trim().toLowerCase();
        return candidateTitle !== '' && candidateTitle === blockTitle;
      });
    }
    if (source && source.image) return { ...block, image: source.image };
    return block;
  });
};

const collectChanges = (seedRecord: SeedRecord, dbRecord: AnyRec): { set: AnyRec; changes: Change[] } => {
  const set: AnyRec = {};
  const changes: Change[] = [];

  const put = (field: string, nextValue: any, previousValue: any) => {
    if (isEmptyValue(nextValue)) return;
    if (stableStringify(nextValue) === stableStringify(previousValue)) return;
    set[field] = nextValue;
    changes.push({ field, from: preview(previousValue), to: preview(nextValue) });
  };

  if (UPDATE_TITLES && !isEmptyValue(seedRecord.title)) {
    put('title', seedRecord.title, dbRecord.title);
  }

  if (!isEmptyValue(seedRecord.material)) {
    put('material', seedRecord.material, dbRecord.material);
  }

  if (Array.isArray(seedRecord.tags) && seedRecord.tags.length > 0) {
    put('tags', seedRecord.tags, dbRecord.tags ?? []);
  }

  const dbOverview = dbRecord.overview ?? {};
  const seedOverview = seedRecord.overview ?? {};

  const mergedSpecs = mergeProductSpecifications(seedOverview.productSpecifications, dbOverview.productSpecifications ?? []);
  if (mergedSpecs && mergedSpecs.length > 0) {
    put('overview.productSpecifications', mergedSpecs, dbOverview.productSpecifications ?? []);
  }

  const seedDesign = seedOverview.smartDesignAppearance;
  const dbDesign = dbOverview.smartDesignAppearance ?? {};
  if (seedDesign && !isEmptyValue(seedDesign.sizeOptions)) {
    put('overview.smartDesignAppearance.sizeOptions', seedDesign.sizeOptions, dbDesign.sizeOptions ?? []);
  }

  const protectedWrite = Object.keys(set).find((field) => PROTECTED_TOP_LEVEL.some((p) => field === p || field.startsWith(`${p}.`)));
  if (protectedWrite) {
    throw new Error(`Safety abort: attempted write to protected field "${protectedWrite}"`);
  }
  const unknownWrite = Object.keys(set).find((field) => !UPDATABLE_FIELDS.includes(field));
  if (unknownWrite) {
    throw new Error(`Safety abort: attempted write to non-whitelisted field "${unknownWrite}"`);
  }

  return { set, changes };
};

const collectProtectedMismatches = (seedRecord: SeedRecord, dbRecord: AnyRec): string[] => {
  const expected = seedRecord._expected ?? {};
  const mismatches: string[] = [];
  if (typeof expected.priceINR === 'number' && expected.priceINR !== dbRecord.price) {
    mismatches.push(`price: PDF ${expected.priceINR} vs DB ${dbRecord.price}`);
  }
  if (typeof expected.urlSlug === 'string' && expected.urlSlug !== dbRecord.slug) {
    mismatches.push(`slug: PDF "${expected.urlSlug}" vs DB "${dbRecord.slug}"`);
  }
  if (typeof expected.orderBy === 'number' && expected.orderBy !== dbRecord.orderBy) {
    mismatches.push(`orderBy: PDF ${expected.orderBy} vs DB ${dbRecord.orderBy}`);
  }
  const categoryValue = dbRecord.category;
  const dbCategoryName =
    typeof categoryValue === 'object' && categoryValue !== null ? String(categoryValue.name ?? '') : '';
  if (typeof expected.category === 'string' && dbCategoryName && expected.category !== dbCategoryName) {
    mismatches.push(`category: PDF "${expected.category}" vs DB "${dbCategoryName}"`);
  }
  if (typeof seedRecord.title === 'string' && seedRecord.title !== dbRecord.title) {
    mismatches.push(`title: PDF "${seedRecord.title}" vs DB "${dbRecord.title}"`);
  }
  return mismatches;
};

const writeBackup = (documents: AnyRec[]): string => {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `products.preseed-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(documents, null, 2));
  return file;
};

const main = async () => {
  const seedRecords = loadSeedData();

  await connectDatabase();

  const dbName = mongoose.connection.name;
  const host = mongoose.connection.host;
  const dbProductCount = await ProductModel.countDocuments();

  rule(DRY_RUN ? 'DRY RUN — no writes will be performed' : 'APPLY MODE — writes enabled');
  log(`Database          : ${dbName} @ ${host}`);
  log(`Products in DB    : ${dbProductCount}`);
  log(`Seed records      : ${seedRecords.length}`);
  log(`Match key          : ${MATCH_KEY}`);
  log(`Mode flags         : ${[DRY_RUN && '--dry-run', UPDATE_TITLES && '--update-titles', ALLOW_CREATE && '--allow-create', FORCE && '--force'].filter(Boolean).join(' ') || '(none)'}`);

  if (dbProductCount !== seedRecords.length) {
    log(`\nWARNING: DB product count (${dbProductCount}) differs from seed count (${seedRecords.length}). Verify you are on the right database.`);
  }

  const dbRecords = await ProductModel.find({})
    .populate('category', 'name slug')
    .lean();

  const dbByCode = new Map<string, AnyRec>();
  const duplicateCodes: string[] = [];
  dbRecords.forEach((record: AnyRec) => {
    const code = String(record[MATCH_KEY] ?? '').trim();
    if (!code) return;
    if (dbByCode.has(code)) duplicateCodes.push(code);
    else dbByCode.set(code, record);
  });

  if (duplicateCodes.length) {
    throw new Error(`Duplicate "${MATCH_KEY}" values in database — aborting: ${[...new Set(duplicateCodes)].join(', ')}`);
  }

  let matched = 0;
  let newRecords = 0;
  let wouldUpdate = 0;
  let noOp = 0;
  let totalSetOps = 0;
  const fieldHits: Record<string, number> = {};
  const updatePlan: { record: SeedRecord; db: AnyRec; set: AnyRec; changes: Change[] }[] = [];
  const newRecordCodes: string[] = [];
  const protectedReport: string[] = [];
  const skippedTitles: string[] = [];

  seedRecords.forEach((seedRecord) => {
    const code = seedRecord.code.trim();
    const dbRecord = dbByCode.get(code);
    if (!dbRecord) {
      newRecords += 1;
      newRecordCodes.push(code);
      return;
    }
    matched += 1;

    if (!UPDATE_TITLES && typeof seedRecord.title === 'string' && seedRecord.title !== dbRecord.title) {
      skippedTitles.push(code);
    }

    collectProtectedMismatches(seedRecord, dbRecord).forEach((line) => protectedReport.push(`${code} :: ${line}`));

    const { set, changes } = collectChanges(seedRecord, dbRecord);
    if (changes.length === 0) {
      noOp += 1;
      return;
    }
    wouldUpdate += 1;
    totalSetOps += changes.length;
    changes.forEach((change) => {
      fieldHits[change.field] = (fieldHits[change.field] ?? 0) + 1;
    });
    updatePlan.push({ record: seedRecord, db: dbRecord, set, changes });
  });

  const seedCodes = new Set(seedRecords.map((record) => record.code.trim()));
  const orphanDbRecords = dbRecords.filter((record: AnyRec) => !seedCodes.has(String(record[MATCH_KEY] ?? '').trim()));

  rule('SUMMARY');
  log(`Seed records found        : ${seedRecords.length}`);
  log(`DB products found         : ${dbRecords.length}`);
  log(`Matched (by ${MATCH_KEY})      : ${matched}`);
  log(`New (not in DB)           : ${newRecords}${newRecords ? `  -> ${newRecordCodes.join(', ')}` : ''}`);
  log(`Would UPDATE              : ${wouldUpdate} product(s), ${totalSetOps} field write(s)`);
  log(`No-op (already identical) : ${noOp}`);
  log(`DB products not in seed   : ${orphanDbRecords.length} (never touched)`);

  rule('FIELDS THAT WILL CHANGE');
  if (Object.keys(fieldHits).length === 0) log('  (none)');
  Object.entries(fieldHits)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => log(`  ${field.padEnd(52)} ${count} / ${matched}`));

  rule('FIELDS THAT WILL NEVER CHANGE');
  NEVER_UPDATED_FIELDS.forEach((field) => log(`  ${field.padEnd(52)} protected`));
  log(`  ${'seed values that are null/empty (skipped)'.padEnd(52)} protected`);

  if (protectedReport.length) {
    rule(`PROTECTED MISMATCHES — PDF ALAG HAI, DB HI RAHEGA (${protectedReport.length})`);
    protectedReport.slice(0, 40).forEach((line) => log(`  ${line}`));
    if (protectedReport.length > 40) log(`  … +${protectedReport.length - 40} more`);
  }

  if (skippedTitles.length) {
    rule(`TITLE CHANGES SKIPPED — pass --update-titles to allow (${skippedTitles.length})`);
    log(`  ${skippedTitles.join(', ')}`);
  }

  if (wouldUpdate > 0) {
    rule(`CHANGES (${wouldUpdate} products)`);
    updatePlan.slice(0, 15).forEach(({ record, changes }) => {
      log(`  ${record.code}`);
      changes.forEach((change) => log(`      ~ ${change.field}`));
    });
    if (updatePlan.length > 15) log(`  … +${updatePlan.length - 15} more products`);
  }

  if (newRecords > 0) {
    rule('NEW RECORDS — SEED WILL NOT CREATE THEM');
    log(`  ${newRecordCodes.join(', ')}`);
    log('  Reason: seed data intentionally excludes protected required fields');
    log('  (description, price, category) which are mandatory to create a product.');
    log('  Create these manually in the admin panel, then re-run the seed.');
    if (ALLOW_CREATE) {
      log('\n  --allow-create was passed but creation stays disabled for the reason above.');
    }
  }

  rule('BEFORE APPLYING — BACKUP');
  log('  1) mongodump --uri="<PRODUCTION_MONGO_URI>" --db=' + dbName + ' --out="./backup/' + dbName + '-$(date +%Y%m%d-%H%M)"');
  log('  2) The seed also writes a local snapshot of every matched product to:');
  log(`     ${BACKUP_DIR}/products.preseed-<timestamp>.json`);

  if (DRY_RUN) {
    rule('RESULT');
    log(`  DRY RUN complete. 0 documents written.`);
    log(`  Re-run without --dry-run to apply ${totalSetOps} field write(s) across ${wouldUpdate} product(s).`);
    await mongoose.disconnect();
    process.exit(newRecords > 0 ? 2 : 0);
  }

  if (matched === 0) {
    log('\nABORT: 0 products matched — this is most likely the wrong database. Nothing was written.');
    await mongoose.disconnect();
    process.exit(3);
  }

  if (!FORCE && orphanDbRecords.length > 0 && orphanDbRecords.length > dbRecords.length / 2) {
    log(`\nABORT: ${orphanDbRecords.length}/${dbRecords.length} DB products are missing from the seed — wrong database? Re-run with --force to proceed.`);
    await mongoose.disconnect();
    process.exit(4);
  }

  if (updatePlan.length === 0) {
    rule('RESULT');
    log('  Nothing to update — database already matches the seed. 0 documents written.');
    await mongoose.disconnect();
    process.exit(newRecords > 0 ? 2 : 0);
  }

  const backupDocs = await ProductModel.find({ _id: { $in: updatePlan.map((item) => item.db._id) } })
    .populate('category', 'name slug')
    .lean();
  const backupFile = writeBackup(backupDocs);
  log(`\nPre-seed snapshot written: ${backupFile} (${backupDocs.length} products)`);

  const operations = updatePlan.map((item) => ({
    updateOne: {
      filter: { _id: item.db._id },
      update: { $set: item.set },
    },
  }));

  const result = await ProductModel.bulkWrite(operations, { ordered: false });

  rule('RESULT');
  log(`  Matched      : ${matched}`);
  log(`  Updated      : ${result.modifiedCount} / ${updatePlan.length}`);
  log(`  Unmatched    : ${newRecords} (not created)`);
  log(`  Field writes : ${totalSetOps}`);
  log(`  Protected fields written: 0`);
  log(`  Backup       : ${backupFile}`);
  log('\n  Re-running this seed is safe — it is idempotent and will report 0 changes.');

  await mongoose.disconnect();
  process.exit(newRecords > 0 ? 2 : 0);
};

main().catch((error) => {
  console.error('\nSEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
