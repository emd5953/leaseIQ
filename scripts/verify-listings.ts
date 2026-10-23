import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { planSourceVerification } from '../src/utils/verification-plan';

async function main() {
  const args = process.argv.slice(2), option = (key: string) => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : undefined; };
  const input = option('--documents'), backup = option('--backup-dir'), apply = args.includes('--apply');
  if (!input || !process.env.MONGODB_URI) throw new Error('--documents and MONGODB_URI are required.');
  if (apply && (!backup || resolve(backup) === process.cwd() || resolve(backup).startsWith(process.cwd() + '/'))) throw new Error('Applying requires a new private --backup-dir outside the repository.');
  const documents = JSON.parse(await readFile(input, 'utf8'));
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const db = mongoose.connection.db!, collection = db.collection('listings');
  const before = await collection.find({}).toArray();
  const plan = planSourceVerification(before, documents);
  const after = before.map(d => plan.changes.find(c => String(c.before._id) === String(d._id))?.after || d);
  const owners = new Map<string, string>();
  for (const d of after) for (const key of d.sourceKeys || []) { if (owners.has(key) && owners.get(key) !== String(d._id)) throw new Error(`Source key still conflicts: ${key}`); owners.set(key, String(d._id)); }
  const summary = { apply, documents: documents.length, total: before.length, changed: plan.changes.length, resolutions: plan.resolutions, states: after.reduce((a: Record<string, number>, d) => { const key = d.sourceVerification?.status || 'previously-verified'; a[key] = (a[key] || 0) + 1; return a; }, {}) };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply || !plan.changes.length) return;
  const json = (value: any) => mongoose.mongo.BSON.EJSON.stringify(value, { relaxed: false });
  await mkdir(backup!, { recursive: true, mode: 0o700 });
  for (const [name, data] of [['listings', before], ['listinginteractions', await db.collection('listinginteractions').find({}).toArray()], ['alerthistories', await db.collection('alerthistories').find({}).toArray()]] as const) await writeFile(resolve(backup!, `${name}.before.ejson`), json(data), { mode: 0o600, flag: 'wx' });
  await writeFile(resolve(backup!, 'plan.ejson'), json(plan), { mode: 0o600, flag: 'wx' });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await collection.find({ _id: { $in: plan.changes.map(c => c.before._id) } }, { session }).toArray();
      for (const change of plan.changes) if (json(current.find(d => String(d._id) === String(change.before._id))) !== json(change.before)) throw new Error('A listing changed after the backup; repair aborted.');
      const result = await collection.bulkWrite(plan.changes.map(c => ({ replaceOne: { filter: { _id: c.before._id }, replacement: { ...c.after, __v: (c.before.__v || 0) + 1, updatedAt: new Date() } } })), { session });
      if (result.matchedCount !== plan.changes.length) throw new Error('A listing disappeared during verification.');
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
  await writeFile(resolve(backup!, 'result.json'), JSON.stringify({ ...summary, completedAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' });
  console.log('Verification applied; original records and references are preserved in the backup.');
}
main().catch(e => { console.error(e.name === 'MongoParseError' ? 'Invalid database configuration.' : e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
