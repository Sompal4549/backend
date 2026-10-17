import dotenv from 'dotenv';
import path from 'path';
import { MongoClient } from 'mongodb';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Exact copy of the LIVE MongoDB database (every collection, every document, indexes) into a
 * separate LOCAL database, default "ensis-backup".
 *
 * Usage: put the live connection string in backend/.env as LIVE_MONGO_URI (a read-only database
 * user is best), then run `npm run backup:live:db`.
 *
 * Safety:
 * - Live is only read: listCollections, find and listIndexes. Nothing is ever written to live.
 * - The target must be a localhost MongoDB and can never be the working "ensis" database.
 * - The connection string is never printed.
 */
const SOURCE_URI = process.env.LIVE_MONGO_URI || '';
const SOURCE_DB = process.env.LIVE_MONGO_DB || '';
const TARGET_URI = process.env.BACKUP_MONGO_URI || 'mongodb://localhost:27017';
const TARGET_DB = process.env.BACKUP_DB_NAME || 'ensis-backup';
const BATCH = 1000;

const isLocal = (uri: string) => /^mongodb(\+srv)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(uri);

const main = async (): Promise<void> => {
  if (!SOURCE_URI) throw new Error('Set LIVE_MONGO_URI in backend/.env (the live database connection string).');
  if (isLocal(SOURCE_URI)) throw new Error('LIVE_MONGO_URI points at localhost; it must be the live database.');
  if (!isLocal(TARGET_URI)) throw new Error('The backup target must be a local MongoDB (localhost).');
  if (TARGET_DB === 'ensis') throw new Error('Refusing to overwrite the working "ensis" database.');

  // Read-only intent on the source: secondary reads where available, no writes issued anywhere below
  const source = new MongoClient(SOURCE_URI, { readPreference: 'secondaryPreferred', appName: 'ensis-local-backup' });
  const target = new MongoClient(TARGET_URI);
  await source.connect();
  await target.connect();
  try {
    const sourceDb = source.db(SOURCE_DB || undefined);
    const targetDb = target.db(TARGET_DB);
    console.log(`Reading live database "${sourceDb.databaseName}" (read-only) ...`);

    const collections = (await sourceDb.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.'));

    // The backup is an exact mirror: start from an empty local backup database
    await targetDb.dropDatabase();

    const counts: Record<string, number> = {};
    for (const name of collections.sort()) {
      const cursor = sourceDb.collection(name).find({}, { batchSize: BATCH });
      let batch: any[] = [];
      let total = 0;
      for await (const doc of cursor) {
        batch.push(doc);
        if (batch.length >= BATCH) {
          await targetDb.collection(name).insertMany(batch, { ordered: false });
          total += batch.length;
          batch = [];
        }
      }
      if (batch.length) {
        await targetDb.collection(name).insertMany(batch, { ordered: false });
        total += batch.length;
      }
      if (total === 0) await targetDb.createCollection(name);

      const indexes = (await sourceDb.collection(name).listIndexes().toArray()).filter((ix) => ix.name !== '_id_');
      for (const ix of indexes) {
        const { key, name: indexName, v: _v, ns: _ns, ...options } = ix as any;
        await targetDb.collection(name).createIndex(key, { name: indexName, ...options }).catch((err) => {
          console.warn(`  ! index ${name}.${indexName} not copied: ${err.message}`);
        });
      }
      counts[name] = total;
      console.log(`  ${name.padEnd(28)} ${total}`);
    }

    await targetDb.collection('_backup_info').insertOne({
      source: 'live MongoDB (direct copy)',
      sourceDatabase: sourceDb.databaseName,
      fetchedAt: new Date(),
      counts,
    });
    console.log(`Done: ${collections.length} collections copied to ${TARGET_URI}/${TARGET_DB}`);
  } finally {
    await source.close();
    await target.close();
  }
};

main().catch((error) => {
  // Never echo the connection string, even inside a driver error
  const message = (error instanceof Error ? error.message : String(error)).replace(/mongodb(\+srv)?:\/\/\S+/g, 'mongodb://<hidden>');
  console.error('LIVE DB BACKUP FAILED:', message);
  process.exit(1);
});
