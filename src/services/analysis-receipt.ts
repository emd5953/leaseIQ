import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
function ordered(value: any): any {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, ordered(value[key])]),
    );
  return value;
}
export function analysisDigest(analysis: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(ordered(analysis)))
    .digest('hex');
}
export function analysisReceipt(analysis: unknown, userId: string) {
  return jwt.sign(
    { kind: 'analysis-receipt', digest: analysisDigest(analysis), userId },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: '23h' },
  );
}
export function verifyAnalysis(analysis: unknown, receipt: string, userId: string) {
  const payload = jwt.verify(receipt, config.jwt.secret, { algorithms: ['HS256'] });
  if (
    typeof payload === 'string' ||
    payload.kind !== 'analysis-receipt' ||
    payload.userId !== userId ||
    payload.digest !== analysisDigest(analysis)
  )
    throw new Error('Invalid analysis receipt');
  return `analysis/${userId}/${payload.digest}`;
}
