import { describe, expect, it } from 'vitest';
import { parseRent } from '../../src/utils/rent';
import { canonicalSourceUrl, sourceDetailKey } from '../../src/utils/source-identity';
import { presentListing } from '../../src/utils/listing-presentation';
import { DataNormalizer } from '../../src/ingestion/services/normalizer';
import { DataParser } from '../../src/ingestion/services/parser';
import { ListingSource } from '../../src/ingestion/types';
import { rentLabel } from '../../frontend/src/lib/listing-rent';

describe('Trustworthy source quotes', () => {
  it.each([['$3,450 /mo', 3450, 'monthly'], ['$825/week', 825, 'weekly'], ['USD 125 per day', 125, 'daily'], [3200, 3200, 'monthly']])('normalizes %s without changing its cadence', (input, amount, period) => {
    expect(parseRent(input)).toMatchObject({ amount, period, status: 'known', currency: 'USD' });
  });
  it.each(['$2,000-$4,000', '$2,000–$4,000', 'From $2500', '$2500+', '$2500 net effective', '€2500', 'CAD 2500', true, Infinity, -100, '$2,50', 'Contact for rent', null])('does not invent an exact price for %s', value => {
    expect(parseRent(value).amount).toBeNull();
  });
  it('rejects currency and period conflicts', () => {
    expect(parseRent(2500, 'monthly', 'EUR').amount).toBeNull();
    expect(parseRent('$800/week', 'monthly').amount).toBeNull();
    expect(parseRent(2500, 'yearly').amount).toBeNull();
  });
  it('validates the source domain before ingestion', async () => {
    const parsed = await new DataParser().parse({ source: ListingSource.STREETEASY, sourceId: '1', sourceUrl: 'https://streeteasy.com.attacker.example/rental/1', scrapedAt: new Date(), rawData: { address: '10 Main St, Manhattan, NY', price: 2000 } });
    await expect(new DataNormalizer().normalize(parsed!)).rejects.toThrow('named source');
  });
  it('canonicalizes tracking variants but never assigns a results page a detail key', () => {
    expect(sourceDetailKey('streeteasy', 'https://www.streeteasy.com/rental/123/?utm_source=test#photos')).toBe('url:https://streeteasy.com/rental/123');
    expect(sourceDetailKey('streeteasy', 'https://streeteasy.com/for-rent/nyc')).toBeNull();
    expect(canonicalSourceUrl('zillow', 'https://zillow.com.evil.example/rental')).toBeNull();
    expect(canonicalSourceUrl('zillow', 'https://user:pass@zillow.com/rental')).toBeNull();
  });
  it('preserves millisecond precision for MongoDB Date observations', () => {
    const date = new Date('2026-01-01T12:00:00.456Z');
    expect(presentListing({ sources: [{ lastSeenAt: date }] }).lastSeenAt).toBe(date.toISOString());
  });
  it('does not let a future source timestamp hide an older valid observation', () => {
    const result = presentListing({ sources: [{ lastSeenAt: '2099-01-01' }, { lastSeenAt: '2026-01-01' }] }, +new Date('2026-01-02'));
    expect(result.lastSeenAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.verificationState).toBe('unverified');
  });
  it('never presents a building minimum or non-USD quote as an exact unit price', () => {
    expect(presentListing({ price: { amount: 2400, currency: 'EUR' } }).price).toBeNull();
    expect(presentListing({ listingScope: 'building', price: { amount: 2400 } }).price).toBeNull();
    expect(rentLabel({ listingScope: 'building', price: null, buildingRent: { status: 'range', minimum: 2500, maximum: 4000 } })).toBe('$2,500–$4,000');
  });
});
