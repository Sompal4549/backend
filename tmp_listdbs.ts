import mongoose from 'mongoose';
const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/admin');
  const admin = mongoose.connection.db!.admin();
  const info = await admin.listDatabases();
  for (const d of info.databases) {
    if (['admin','local','config'].includes(d.name)) continue;
    const db = mongoose.connection.client.db(d.name);
    const cols = await db.listCollections().toArray();
    const counts: any = {};
    for (const c of cols) counts[c.name] = await db.collection(c.name).countDocuments();
    console.log(d.name, JSON.stringify(counts));
  }
  await mongoose.disconnect();
};
run().catch(e => { console.error(e); process.exit(1); });
