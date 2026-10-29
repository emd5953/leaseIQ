import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ResearchSnapshot } from '../models/researchSnapshot.model';
import { ResearchResult } from '../research/types';
const digest = (report: unknown) =>
  createHash('sha256').update(JSON.stringify(report)).digest('hex');
export function reportReceipt(report: ResearchResult): string {
  return jwt.sign({ kind: 'research-receipt', digest: digest(report) }, config.jwt.secret, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}
export function verifyReport(report: unknown, receipt: string): string {
  const payload = jwt.verify(receipt, config.jwt.secret, { algorithms: ['HS256'] });
  if (
    typeof payload === 'string' ||
    payload.kind !== 'research-receipt' ||
    payload.digest !== digest(report)
  )
    throw new Error('Invalid report receipt');
  return payload.digest;
}
export async function saveSnapshot(userId: string, report: ResearchResult, receipt: string) {
  const hash = verifyReport(report, receipt);
  return ResearchSnapshot.findOneAndUpdate(
    { userId, digest: hash },
    { $setOnInsert: { userId, digest: hash, report } },
    { new: true, upsert: true },
  );
}
