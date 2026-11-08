import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Runs inside the QA container, through Next's proxy to the real API and local MongoDB.
const base = 'http://web:3000';
async function call(path, method = 'GET', body, token) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
const alice = (await call('/api/local/session', 'POST', { email: 'alice@local.invalid' })).data;
const bob = (await call('/api/local/session', 'POST', { email: 'bob@local.invalid' })).data;
assert.ok(alice.token && bob.token, 'Both local fixture accounts must authenticate');
const search = await call('/api/search?maxPrice=4000');
assert.equal(search.status, 200);
const listing = search.data.listings.find(row => JSON.stringify(row).includes('fictional QA fixture'));
assert.ok(listing, 'The isolated fixture must be searchable');
const id = listing._id || listing.id;
const savedPath = `/api/user/saved-listings/${id}`;
const alerts = [];
try {
  assert.equal((await call(savedPath, 'POST', { notes: 'Docker smoke test' }, alice.token)).status, 200);
  assert.equal((await call(savedPath, 'PATCH', { status: 'touring' }, alice.token)).status, 200);
  await call(savedPath, 'POST', {}, alice.token);
  const saved = (await call('/api/user/saved-listings', 'GET', undefined, alice.token)).data;
  assert.equal(saved.filter(row => row._id === id).length, 1);
  assert.equal(saved.find(row => row._id === id).status, 'touring');
  assert.equal((await call(savedPath, 'PATCH', { status: 'lease' }, bob.token)).status, 404);
  for (const maxPrice of [4000, 1]) {
    const created = await call('/api/user/saved-searches', 'POST', { name: `Docker smoke ${maxPrice}`, criteria: { maxPrice }, alertsEnabled: false }, alice.token);
    assert.equal(created.status, 201); alerts.push(created.data._id);
  }
  const before = (await call('/api/local/outbox')).data.length;
  assert.equal((await call(`/api/alerts/send/${alerts[0]}`, 'POST', {}, bob.token)).status, 404);
  assert.equal((await call('/api/alerts/process', 'POST', {}, alice.token)).status, 403);
  const sent = await call(`/api/user/saved-searches/${alerts[0]}/test-alert`, 'POST', {}, alice.token);
  assert.equal(sent.status, 200); assert.equal(sent.data.success, true);
  const noMatch = await call(`/api/user/saved-searches/${alerts[1]}/test-alert`, 'POST', {}, alice.token);
  assert.equal(noMatch.status, 400); assert.match(noMatch.data.error, /No matching/);
  const outbox = (await call('/api/local/outbox')).data;
  assert.equal(outbox.length, before + 1); assert.equal(outbox.at(-1).to, 'alice@local.invalid');
  assert.match(outbox.at(-1).html, /fictional QA fixture/);
  const upload = async token => {
    const body = new FormData();
    body.append('file', new Blob([await readFile('scripts/local/synthetic-test-lease.pdf')], { type: 'application/pdf' }), 'synthetic-test-lease.pdf');
    return fetch(base + '/api/lease/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body });
  };
  assert.equal((await upload()).status, 401);
  const document = await upload(alice.token);
  assert.equal(document.status, 200);
  const report = (await document.json()).analysis;
  assert.equal(report.financialSummary.totalMoveInCost, '$6,400');
  assert.match(report.limitations[0], /mocked/);
  console.log(JSON.stringify({ passed: true, checks: ['Next-to-API proxy', 'two isolated accounts', 'save/reload/stage/idempotency', 'ownership enforcement', 'alert creation and local email capture', 'no-match error', 'authenticated multipart upload', 'deterministic financial subtotal'], externalEmailSent: false, analysis: 'labeled fixture; external providers mocked' }, null, 2));
} finally {
  for (const alert of alerts) await call(`/api/user/saved-searches/${alert}`, 'DELETE', undefined, alice.token);
  await call(savedPath, 'DELETE', undefined, alice.token);
}
