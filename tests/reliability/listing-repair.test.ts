import { describe, it, expect } from 'vitest';
import { planListingRepairs, verifiedUnitOffer } from '../../src/utils/listing-repair';
import { presentListing } from '../../src/utils/listing-presentation';
import { Listing } from '../../src/models/listing.model';

const now = new Date('2026-10-22T15:00:00Z');
const old = new Date('2026-01-01');
const url = 'https://streeteasy.com/building/420-carroll/607';
const listing = () => ({ _id: 'one', address: { street: '420 Carroll St', city: 'Brooklyn', state: 'NY', zipCode: '11215' }, price: { amount: 4200, period: 'monthly' }, isActive: true, sources: [{ source: 'streeteasy', sourceId: '607', sourceUrl: url, firstSeenAt: old, lastSeenAt: old }] });
const observation = () => ({ url, finalUrl: url, status: 200, checkedAt: now.toISOString(), jsonld: [{ '@graph': [{ '@type': 'ItemPage', about: { '@type': 'RealEstateListing', offers: { '@type': 'Offer', price: 4450, priceCurrency: 'USD', url, availability: 'https://schema.org/OutOfStock' } }, mainEntity: { '@type': 'Apartment', address: { streetAddress: '420 Carroll Street #607', addressLocality: 'BROOKLYN', addressRegion: 'NY', postalCode: '11215' }, additionalProperty: [{ name: 'Monthly Rent', value: '$4,450/mo' }] } }] }] });

describe('Conservative live listing repairs', () => {
  it('accepts an exact unit offer, preserves first-seen, and marks confirmed unavailability', () => {
    const l = listing();
    const { changes } = planListingRepairs([l], [observation()], now);
    expect(changes[0].set).toMatchObject({ 'price.amount': 4450, 'price.period': 'monthly', 'address.unit': '607', isActive: false });
    expect(changes[0].set.sources[0]).toMatchObject({ firstSeenAt: old, lastSeenAt: now });
    expect(l.isActive).toBe(true); // planning cannot mutate the input snapshot
  });
  it.each(['wrong-unit', 'wrong-street', 'wrong-zip', 'wrong-city', 'redirect', 'building-offer', 'unknown-availability', 'not-monthly', 'future', 'old', 'http-error'])('rejects %s without changing price, activity, or observation dates', reason => {
    const l: any = listing(), o: any = observation();
    const page = o.jsonld[0]['@graph'][0];
    if (reason === 'wrong-unit') l.address.unit = '608';
    if (reason === 'wrong-street') page.mainEntity.address.streetAddress = '422 Carroll Street #607';
    if (reason === 'wrong-zip') page.mainEntity.address.postalCode = '10001';
    if (reason === 'wrong-city') { delete l.address.zipCode; page.mainEntity.address.addressLocality = 'Albany'; }
    if (reason === 'redirect') o.finalUrl = 'https://streeteasy.com/building/420-carroll';
    if (reason === 'building-offer') page.about.offers['@type'] = 'AggregateOffer';
    if (reason === 'unknown-availability') delete page.about.offers.availability;
    if (reason === 'not-monthly') page.mainEntity.additionalProperty = [];
    if (reason === 'future') o.checkedAt = '2099-01-01';
    if (reason === 'old') o.checkedAt = '2026-01-01';
    if (reason === 'http-error') o.status = 404;
    expect(verifiedUnitOffer(l, o, +now)).toBeNull();
    const { set } = planListingRepairs([l], [o], now).changes[0];
    expect(set).not.toHaveProperty('price.amount');
    expect(set).not.toHaveProperty('isActive');
    expect(set).not.toHaveProperty('sources');
  });
  it('does not refresh from a neighboring recommendation or contradicting duplicate ItemPages', () => {
    const o: any = observation();
    o.jsonld[0]['@graph'].push(structuredClone(o.jsonld[0]['@graph'][0]));
    expect(verifiedUnitOffer(listing(), o, +now)).toBeNull();
  });
  it('quarantines both ambiguous source owners without deleting or merging records', () => {
    const a = listing(), b = { ...listing(), _id: 'two', bedrooms: 2 };
    const plan = planListingRepairs([a, b], [observation()], now);
    expect(plan.conflictingSourceKeys).toEqual(['streeteasy:607']);
    expect(plan.changes).toHaveLength(2);
    for (const change of plan.changes) {
      expect(change.set.sources).toEqual([]);
      expect(change.set.sourceKeys).toEqual([]);
      expect(change.set.sourceConflicts[0].source).toEqual(a.sources[0]);
      expect(change.set).not.toHaveProperty('isActive');
      expect(change.set).not.toHaveProperty('bedrooms');
    }
  });
  it('keeps stale unverified listings visible and does not stamp maintenance time as freshness', () => {
    const l = listing();
    const plan = planListingRepairs([l], [], now);
    const result = presentListing({ ...l, ...plan.changes[0].set, updatedAt: now }, +now);
    expect(result).toMatchObject({ isActive: true, freshness: 'stale', price: 4200 });
    expect(result.lastSeenAt).toBe(old.toISOString());
  });
  it('represents invalid rent as explicitly unknown while retaining the original for review', async () => {
    const l: any = listing(); l.price.amount = 0;
    const set = planListingRepairs([l], [], now).changes[0].set;
    expect(set).toMatchObject({ 'price.amount': null, 'price.status': 'unknown', rentReview: { originalAmount: 0 } });
    const repaired = new Listing({ ...l, _id: undefined, price: { amount: null, status: 'unknown' } });
    await expect(repaired.validate()).resolves.toBeUndefined();
    expect(presentListing(repaired.toObject(), +now)).toMatchObject({ price: null, rentNeedsReview: true, freshness: 'stale' });
    for (const amount of [0, -1]) await expect(new Listing({ ...l, _id: undefined, price: { amount, status: 'unknown' } }).validate()).rejects.toThrow(/positive/);
    await expect(new Listing({ ...l, _id: undefined, price: { amount: null } }).validate()).rejects.toThrow(/required/);
  });
  it('is idempotent after source-key backfill and explicit unknown-rent repair', () => {
    const l = { ...listing(), price: { amount: null, status: 'unknown' }, sourceKeys: ['streeteasy:607'] };
    expect(planListingRepairs([l], [], now).changes).toEqual([]);
  });
  it('does not reapply a verified observation whose BSON Date has milliseconds', () => {
    const checkedAt = new Date('2026-10-22T15:00:00.357Z');
    const l = { ...listing(), sourceKeys: ['streeteasy:607'] };
    l.sources[0].lastSeenAt = checkedAt;
    const o = { ...observation(), checkedAt: checkedAt.toISOString() };
    expect(planListingRepairs([l], [o], checkedAt).changes).toEqual([]);
  });
});
