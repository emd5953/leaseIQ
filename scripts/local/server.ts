/** Local Docker harness. This entry point is never imported by the production server. */
import express from 'express';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createApp } from '../../src/api';
import { config } from '../../src/config';
import { generateToken } from '../../src/api/middleware/auth';
import { User, Listing } from '../../src/models';
import { EmailService, EmailOptions } from '../../src/services/email.service';
import { LeaseService } from '../../src/services/lease.service';
import { normalizeLeaseReport } from '../../src/utils/lease-report';

async function main() {
  if (process.env.LOCAL_QA !== 'true' || process.env.NODE_ENV !== 'development'
    || config.mongodb.uri !== 'mongodb://mongo:27017/leaseiq_local'
    || config.jwt.secret !== 'local-qa-only-not-a-production-secret') {
    throw new Error('Local harness requires the isolated Docker Compose configuration.');
  }
  await mongoose.connect(config.mongodb.uri);
  const accounts = await Promise.all(['alice', 'bob'].map(name => User.findOneAndUpdate(
    { email: `${name}@local.invalid` },
    { $setOnInsert: { displayName: `Local QA ${name}`, passwordHash: 'fixture', salt: 'fixture' } },
    { upsert: true, new: true, runValidators: true },
  )));
  for (const [index, amount] of [3200, 4500].entries()) {
    await Listing.findOneAndUpdate({ 'sources.sourceId': `local-qa-${index}` }, { $setOnInsert: {
      address: { street: `${123 + index} Example Street (fictional QA fixture)`, unit: 'TEST', city: 'Brooklyn', state: 'NY', zipCode: '11216' },
      price: { amount, currency: 'USD', period: 'monthly' }, bedrooms: index + 1, bathrooms: 1,
      description: 'FICTIONAL LOCAL TEST LISTING. Not a rental offer.', isActive: true, images: [],
      sources: [{ source: 'Local QA fixture', sourceId: `local-qa-${index}`, sourceUrl: `https://example.invalid/local-qa-${index}`, firstSeenAt: new Date(), lastSeenAt: new Date() }],
    } }, { upsert: true, runValidators: true });
  }
  const outbox: Array<EmailOptions & { id: string }> = [];
  // Capture at the transport boundary; real email templates/routes/history still run.
  EmailService.send = async options => {
    const id = `local-${outbox.length + 1}`;
    outbox.push({ ...options, id });
    return { success: true, messageId: id };
  };
  const fixtureHash = createHash('sha256').update(readFileSync('scripts/local/synthetic-test-lease.pdf')).digest('hex');
  // Only the exact fictional PDF is supported. Never present canned analysis as real OCR.
  LeaseService.analyzeLeasePDF = async buffer => {
    if (createHash('sha256').update(buffer).digest('hex') !== fixtureHash) throw new Error('Local QA accepts only the supplied fictional PDF.');
    return {
      ...normalizeLeaseReport({ summary: 'LOCAL QA FIXTURE — simulated analysis, not OCR or legal advice.', overallRating: 'neutral',
        keyTerms: { monthlyRent: '$3,200', securityDeposit: '$3,200', leaseTerm: '12 months', utilities: { heat: 'included', electricity: 'tenant' }, parking: 'Not specified' },
        importantDates: [{ date: '2026-11-01', description: 'Fictional lease begins' }],
      }),
      limitations: ['LOCAL QA: external extraction and AI are mocked. Only the bundled fictional PDF is accepted.'],
    };
  };
  const app = express();
  app.use(express.json());
  app.post('/api/local/session', (req, res) => {
    const user = accounts.find(account => account.email === req.body.email);
    if (!user) return res.status(400).json({ error: 'Choose a local fixture account.' });
    res.json({ token: generateToken(String(user._id), user.email), user: { id: String(user._id), email: user.email, displayName: user.displayName } });
  });
  app.get('/api/local/health', (_req, res) => res.json({ mode: 'local-qa', database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable', email: 'captured locally', analysis: 'fixture only' }));
  app.get('/api/local/outbox', (_req, res) => res.json(outbox));
  app.use(createApp());
  app.listen(3001, '0.0.0.0', () => console.log('LOCAL QA ONLY — isolated database, captured email, fixture document analysis'));
}
main().catch(error => { console.error(error); process.exit(1); });
