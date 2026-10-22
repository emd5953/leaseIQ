import { describe, it, expect } from 'vitest';
import { readBuildingEvidence, buildingMatches, readRealtorUnit } from '../../src/utils/source-verification';
import { planSourceVerification } from '../../src/utils/verification-plan';
import { Listing } from '../../src/models/listing.model';
import { presentListing } from '../../src/utils/listing-presentation';
import { rentLabel } from '../../frontend/src/lib/listing-rent';

const now = new Date('2026-10-22T16:00:00Z'), old = new Date('2026-01-01');
const url = 'https://www.padmapper.com/buildings/p123/the-highland-apartments-at-2840-atlantic-avenue-new-york-ny-11207';
const address = { street: '2840 Atlantic Ave', city: 'New York', state: 'NY', zipCode: '11207' };
const source = { source: 'padmapper', sourceId: 'the-highland', sourceUrl: url, firstSeenAt: old, lastSeenAt: old };
const page = () => ({ url, finalUrl: url, status: 200, checkedAt: now.toISOString(), jsonld: [{ '@type': 'Apartment', name: 'Apartments for Rent at The Highland', address: { streetAddress: '2840 Atlantic Avenue', addressLocality: 'New York', addressRegion: 'NY', postalCode: '11207' }, description: 'Explore apartments for rent for $2,500–$4,426/month. 14 floorplans currently available.' }, { '@type': 'RealEstateListing', url }] });
const listing = (id = 'one') => ({ _id: id, address, price: { amount: 3000 }, bedrooms: 2, bathrooms: 1, sources: [source], isActive: true });
const realtor = () => ({ url: 'https://www.realtor.com/rentals/details/70-W-95th-St_New-York_NY_10025_M35132-32463', finalUrl: 'https://www.realtor.com/rentals/details/70-W-95th-St_New-York_NY_10025_M35132-32463', status: 200, checkedAt: now.toISOString(), jsonld: [], property: { property_id: '3513232463', status: 'for_rent', location: { address: { line: '70 W 95th St', city: 'New York', state_code: 'NY', postal_code: '10025', unit: null } }, community_rental_floorplans: [{}], list_price_min: 4995, list_price_max: 4995 } });

describe('Source evidence and building identity', () => {
  it('requires Hotpads offers to reference the primary building and agree with monthly pricing', () => {
    const hot = 'https://hotpads.com/1077-teller-llc-bronx-ny-10456-1aa1/pad';
    const p: any = { url: hot, finalUrl: hot, status: 200, checkedAt: now.toISOString(), jsonld: [{ '@graph': [
      { '@type': 'WebPage', url: hot, mainEntity: [{ '@id': hot + '#residence' }, { '@id': hot + '#product' }] },
      { '@type': 'ApartmentComplex', '@id': hot + '#residence', url: hot, address: { streetAddress: '1077 Teller Ave', addressLocality: 'Bronx', addressRegion: 'NY', postalCode: '10456' } },
      { '@type': 'Product', '@id': hot + '#product', offers: { '@type': 'AggregateOffer', '@id': hot + '#offer', url: hot, itemOffered: { '@id': hot + '#residence' }, priceCurrency: 'USD', lowPrice: 3753, highPrice: 4077, offerCount: 2 } },
    ] }, { '@id': hot + '#offer', priceSpecification: [{ unitCode: 'MON', priceCurrency: 'USD', price: 3753, maxPrice: 4077 }] }] };
    expect(readBuildingEvidence(p, +now)?.rent).toEqual({ status: 'range', minimum: 3753, maximum: 4077 });
    p.jsonld[1].priceSpecification[0].unitCode = 'DAY';
    expect(readBuildingEvidence(p, +now)).toBeNull();
    p.jsonld[1].priceSpecification[0].unitCode = 'MON';
    p.jsonld[0]['@graph'][2].offers.itemOffered['@id'] = hot + '#neighbor';
    expect(readBuildingEvidence(p, +now)).toBeNull();
  });
  it('keeps a building range separate from exact unit rent and removes invented unit facts', () => {
    const original = listing();
    const plan = planSourceVerification([original], [page()], +now);
    const result = presentListing(plan.changes[0].after, +now);
    expect(result).toMatchObject({ listingScope: 'building', price: null, bedrooms: null, bathrooms: null, freshness: 'recent', rentNeedsReview: false, buildingRent: { minimum: 2500, maximum: 4426 } });
    expect(rentLabel(result)).toBe('$2,500–$4,426');
    expect(original.price.amount).toBe(3000);
    expect(planSourceVerification([plan.changes[0].after], [page()], +now).changes).toEqual([]);
  });
  it('never converts an explicitly identified apartment to a building', () => {
    const d = { ...listing(), address: { ...address, unit: '4B' } };
    expect(buildingMatches(d, readBuildingEvidence(page(), +now)!)).toBe(false);
    const after = planSourceVerification([d], [page()], +now).changes[0].after;
    expect(after).not.toHaveProperty('listingScope');
    expect(after.price.amount).toBe(3000);
    expect(after.sources[0].lastSeenAt).toEqual(old);
  });
  it.each(['redirect', 'wrong-address', 'old', 'future', 'http-error', 'recommendation', 'zero', 'reversed'])('rejects %s as verification', kind => {
    const p: any = page();
    if (kind === 'redirect') p.finalUrl = 'https://www.padmapper.com/apartments/new-york-ny';
    if (kind === 'wrong-address') p.jsonld[0].address.streetAddress = '2842 Atlantic Ave';
    if (kind === 'old') p.checkedAt = old.toISOString();
    if (kind === 'future') p.checkedAt = '2099-01-01';
    if (kind === 'http-error') p.status = 404;
    if (kind === 'recommendation') p.jsonld.push({ ...p.jsonld[0] });
    if (kind === 'zero') p.jsonld[0].description = 'for $0–$4,426/month. 14 floorplans currently available.';
    if (kind === 'reversed') p.jsonld[0].description = 'for $4,426–$2,500/month. 14 floorplans currently available.';
    const e = readBuildingEvidence(p, +now);
    expect(e && buildingMatches(listing(), e)).toBeFalsy();
  });
  it('requires the correct Realtor property ID and distinguishes contact-for-price', () => {
    const p: any = realtor();
    expect(readBuildingEvidence(p, +now)?.rent).toEqual({ status: 'range', minimum: 4995, maximum: 4995 });
    p.property.property_id = 'different';
    expect(readBuildingEvidence(p, +now)).toBeNull();
    p.property.property_id = '3513232463'; p.property.list_price_min = null; p.property.list_price_max = null;
    expect(readBuildingEvidence(p, +now)).toBeNull();
    p.contactForPrice = true;
    expect(readBuildingEvidence(p, +now)?.rent.status).toBe('contact');
  });
  it('assigns one building owner without deleting the duplicate or changing its ID', async () => {
    const conflict = { sourceKey: 'padmapper:the-highland', source };
    const a = { ...listing('a'), sources: [{ ...source, sourceId: 'p123' }], sourceConflicts: [conflict] };
    const b = { ...listing('b'), sources: [], sourceConflicts: [conflict] };
    const plan = planSourceVerification([a, b], [page()], +now);
    const owner = plan.changes.find(c => c.after._id === 'a')!.after;
    const alias = plan.changes.find(c => c.after._id === 'b')!.after;
    expect(owner.sourceKeys).toContain('padmapper:the-highland');
    expect(alias).toMatchObject({ _id: 'b', duplicateOf: 'a', isActive: false, sources: [] });
    expect(alias.sourceKeys).toBeUndefined();
    expect(presentListing(alias, +now).price).toBeNull();
    expect(alias.sourceResolutions[0].originalSources).toEqual([source]);
    await expect(new Listing({ ...alias, _id: undefined }).validate()).resolves.toBeUndefined();
    await expect(new Listing({ ...alias, _id: undefined, sourceResolutions: [] }).validate()).rejects.toThrow('Sources');
    expect(planSourceVerification([owner, alias], [page()], +now).changes).toEqual([]);
  });
  it('retires an ID reassigned to another address without claiming a replacement apartment', async () => {
    const p: any = page(); p.finalUrl = url.replace('2840-atlantic', '2900-atlantic'); p.jsonld[0].address.streetAddress = '2900 Atlantic Avenue'; p.jsonld[1].url = p.finalUrl;
    const conflict = { sourceKey: 'padmapper:the-highland', source };
    const plan = planSourceVerification([{ ...listing(), sources: [], sourceConflicts: [conflict] }], [p], +now);
    const d = plan.changes[0].after;
    expect(d).toMatchObject({ isActive: true, price: { amount: null, status: 'unknown' }, sourceVerification: { status: 'source_mismatch' } });
    expect(d.retiredSourceKeys).toContain('padmapper:the-highland');
    expect(d.sourceConflicts).toBeUndefined();
    expect(d).not.toHaveProperty('duplicateOf');
    await expect(new Listing({ ...d, _id: undefined }).validate()).resolves.toBeUndefined();
    await expect(new Listing({ ...d, _id: undefined, retiredSources: [] }).validate()).rejects.toThrow('Sources');
  });
  it('does not deactivate a record from a search redirect or 404 response', () => {
    for (const p of [{ ...page(), finalUrl: 'https://www.padmapper.com/apartments/new-york-ny' }, { ...page(), status: 404 }]) {
      const d = planSourceVerification([listing()], [p], +now).changes[0].after;
      expect(d.isActive).toBe(true); expect(d.price.amount).toBe(3000); expect(d.sources[0].lastSeenAt).toEqual(old);
    }
  });
  it('resolves two shared IDs to one building owner without an alias chain', () => {
    const replacement = page(), moved = { ...page(), finalUrl: 'https://www.padmapper.com/apartments/new-york-ny' };
    replacement.url = url.replace('/p123/', '/p456/'); replacement.finalUrl = replacement.url; replacement.jsonld[1].url = replacement.url;
    const newer = { ...source, sourceId: 'p456', sourceUrl: replacement.url };
    const oldConflict = { sourceKey: 'padmapper:the-highland', source };
    const newConflict = { sourceKey: 'padmapper:p456', source: newer };
    const records = [
      { ...listing('old'), sources: [source], sourceConflicts: [oldConflict] },
      { ...listing('old-copy'), sources: [], sourceConflicts: [oldConflict] },
      { ...listing('owner'), sources: [{ ...newer, sourceId: 'current' }], sourceConflicts: [newConflict] },
      { ...listing('new-copy'), sources: [], sourceConflicts: [newConflict] },
    ];
    const plan = planSourceVerification(records, [moved, replacement], +now);
    expect(plan.resolutions).toHaveLength(2);
    const after = plan.changes.map(c => c.after);
    expect(after.filter(d => d.duplicateOf).map(d => d.duplicateOf)).toEqual(['owner', 'owner', 'owner']);
    expect(after.find(d => d._id === 'owner').sourceKeys).toEqual(['padmapper:current', 'padmapper:p456']);
    expect(planSourceVerification(after, [moved, replacement], +now).changes).toEqual([]);
  });
  it('requires dated building evidence rather than simply accepting missing rent', async () => {
    const base = { address, price: { amount: null, status: 'building' }, sources: [source] };
    await expect(new Listing(base).validate()).rejects.toThrow('Building pricing');
    const verified = planSourceVerification([listing()], [page()], +now).changes[0].after;
    await expect(new Listing({ ...verified, _id: undefined }).validate()).resolves.toBeUndefined();
  });
  it('verifies an exact Realtor unit but rejects a different or unidentified unit', () => {
    const p: any = realtor(); delete p.property.community_rental_floorplans;
    p.property.location.address.line = '70 W 95th St Apt 12K'; p.property.location.address.unit = 'Apt 12K'; p.property.list_price = 4995;
    const d = { address: { street: '70 West 95th Street', unit: '12K', city: 'New York', state: 'NY', zipCode: '10025' } };
    expect(readRealtorUnit(d, p, +now)).toMatchObject({ unit: '12K', price: 4995, available: true });
    d.address.unit = '12L'; expect(readRealtorUnit(d, p, +now)).toBeNull();
    d.address.unit = '12K'; p.property.status = 'off_market';
    expect(readRealtorUnit(d, p, +now)).toMatchObject({ available: false, price: null });
    p.property.location.address.line = '70 W 95th St'; p.property.location.address.unit = null;
    expect(readRealtorUnit(d, p, +now)).toBeNull();
  });
});
