import type { Collection } from 'mongodb';

/** Build replacement constraints before removing only the known obsolete indexes.
 * Never rewrites accounts or drops unrelated indexes. Safe to rerun after interruption.
 */
export async function repairUserIndexes(users: Collection, apply = false) {
  const before = await users.indexes();
  const emailConflicts = await users.aggregate([
    { $group: { _id: '$email', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }, { $count: 'count' },
  ]).toArray();
  if (emailConflicts.length) throw new Error('Duplicate account emails require manual review; no indexes changed.');
  const invalidEmails = await users.countDocuments({ $or: [{ email: { $exists: false } }, { email: null }, { email: '' }] });
  if (invalidEmails) throw new Error('Accounts with missing emails require manual review; no indexes changed.');
  const report = { applied: apply, accountCount: await users.countDocuments(), before, after: before };
  if (!apply) return report;

  await users.createIndex({ email: 1 }, { name: 'user_email_unique', unique: true });
  await users.createIndex({ supabaseId: 1 }, { name: 'user_supabase_sparse_unique', unique: true, sparse: true });
  for (const index of before) {
    const single = Object.keys(index.key).length === 1;
    if (single && index.name === 'supabaseId_1' && index.key.supabaseId === 1 && index.unique && !index.sparse && !index.partialFilterExpression) {
      await users.dropIndex(index.name);
    }
    if (single && index.name === 'email_1' && index.key.email === 1 && !index.unique && !index.partialFilterExpression) {
      await users.dropIndex(index.name);
    }
  }
  report.after = await users.indexes();
  return report;
}
