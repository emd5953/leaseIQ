/** Dry-run by default. Back up before an explicitly requested transactional repair. */
import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { planListingRepairs } from '../src/utils/listing-repair';

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const apply = args.includes('--apply');
  const backupDir = arg('--backup-dir');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (apply && !backupDir) throw new Error('--apply requires --backup-dir outside the repository.');
  if (backupDir && (resolve(backupDir) === process.cwd() || resolve(backupDir).startsWith(process.cwd() + '/'))) throw new Error('Keep private backups outside the repository.');
  const observations = arg('--observations') ? JSON.parse(await readFile(arg('--observations')!, 'utf8')) : [];
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const db = mongoose.connection.db!;
  const listings = await db.collection('listings').find({}).toArray();
  const plan = planListingRepairs(listings, observations);
  const summary = { apply, total: listings.length, changes: plan.changes.length, conflictingSourceKeys: plan.conflictingSourceKeys, reasons: plan.changes.flatMap(c => c.reasons).reduce((counts: Record<string, number>, reason) => { counts[reason] = (counts[reason] || 0) + 1; return counts; }, {}) };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply || !plan.changes.length) return;
  await mkdir(backupDir!, { recursive: true, mode: 0o700 });
  const serialize = (value: any) => mongoose.mongo.BSON.EJSON.stringify(value, { relaxed: false });
  const ids = plan.changes.map(c => c.id);
  for (const [name, docs] of [
    ['listings', listings],
    ['listinginteractions', await db.collection('listinginteractions').find({ listingId: { $in: ids } }).toArray()],
    ['alerthistories', await db.collection('alerthistories').find({ $or: [{ listingIds: { $in: ids } }, { clickedListingIds: { $in: ids } }] }).toArray()],
  ] as const) await writeFile(resolve(backupDir!, `${name}.before.ejson`), serialize(docs), { mode: 0o600, flag: 'wx' });
  await writeFile(resolve(backupDir!, 'plan.ejson'), serialize(plan), { mode: 0o600, flag: 'wx' });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Exact snapshots prevent stale plans from overwriting a concurrent import.
      const currentDocs = await db.collection('listings').find({ _id: { $in: ids } }, { session }).toArray();
      for (const change of plan.changes) {
        const before = listings.find(d => d._id.equals(change.id))!;
        const current = currentDocs.find(d => d._id.equals(change.id));
        if (serialize(before) !== serialize(current)) throw new Error(`Listing changed after backup: ${change.id}`);
      }
      const result = await db.collection('listings').bulkWrite(plan.changes.map(change => {
        const set = { ...change.set, updatedAt: new Date() };
        const unset: Record<string, ''> = {};
        if (Array.isArray(set.sourceKeys) && !set.sourceKeys.length) { delete set.sourceKeys; unset.sourceKeys = ''; }
        return { updateOne: { filter: { _id: change.id }, update: { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}), $inc: { __v: 1 } } } };
      }), { session });
      if (result.matchedCount !== plan.changes.length) throw new Error('Listing disappeared during repair.');
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
  await writeFile(resolve(backupDir!, 'result.json'), JSON.stringify({ ...summary, completedAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' });
  console.log('Repairs committed. Records and saved-listing/alert references were preserved.');
}
main().catch(error => { console.error(error.name === 'MongoParseError' ? 'Invalid MongoDB configuration.' : error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
