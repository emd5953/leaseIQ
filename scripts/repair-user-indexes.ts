import 'dotenv/config';
import mongoose from 'mongoose';
import { repairUserIndexes } from '../src/maintenance/user-indexes';

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  // Do not let model initialization change indexes before the explicit preflight.
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
  const report = await repairUserIndexes(mongoose.connection.db!.collection('users'), process.argv.includes('--apply'));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
