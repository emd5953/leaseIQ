import { normalizeCity, normalizeStreet, splitUnit } from './address';

export interface SourceObservation {
  url: string;
  finalUrl?: string;
  status?: number;
  checkedAt?: string;
  jsonld?: any[];
}

/** Only an exact unit's own offer can refresh a rental. Building ranges and
 * recommendations elsewhere on the page are deliberately not unit evidence. */
export function verifiedUnitOffer(listing: any, observation: SourceObservation, now = Date.now()) {
  const canonical = (url: string) => { const u = new URL(url); return u.origin + u.pathname.replace(/\/$/, ''); };
  try {
    const url = new URL(observation.url);
    if (url.hostname !== 'streeteasy.com' || url.protocol !== 'https:' || observation.status !== 200) return null;
    if (canonical(observation.finalUrl || '') !== canonical(observation.url)) return null;
    const time = Date.parse(observation.checkedAt || '');
    if (!Number.isFinite(time) || time > now || now - time > 24 * 3600000) return null;
    const nodes = (observation.jsonld || []).flatMap(value => Array.isArray(value) ? value : value['@graph'] || [value]);
    const pages = nodes.filter(node => node['@type'] === 'ItemPage');
    if (pages.length !== 1) return null;
    const page = pages[0], apartment = page.mainEntity, offer = page.about?.offers;
    if (apartment?.['@type'] !== 'Apartment' || page.about?.['@type'] !== 'RealEstateListing' || offer?.['@type'] !== 'Offer') return null;
    if (canonical(offer.url) !== canonical(observation.url) || offer.priceCurrency !== 'USD') return null;
    const price = Number(offer.price);
    const monthly = apartment.additionalProperty?.find((p: any) => p.name === 'Monthly Rent');
    if (!Number.isFinite(price) || price <= 0 || !monthly || Number(String(monthly.value).replace(/[$,]|\/mo.*$/g, '').trim()) !== price) return null;
    const sourceAddress = apartment.address;
    const actual = splitUnit(sourceAddress?.streetAddress || '');
    const expected = splitUnit(listing.address?.street || '');
    const expectedUnit = listing.address?.unit || expected.unit;
    if (!actual.unit || normalizeStreet(actual.street) !== normalizeStreet(expected.street)) return null;
    if (expectedUnit && String(expectedUnit).replace(/^(?:APT\.?|UNIT|#)\s*/i, '').toUpperCase() !== actual.unit) return null;
    if (!['NY', 'New York'].includes(sourceAddress?.addressRegion) || !['NY', 'New York'].includes(listing.address?.state)) return null;
    if (listing.address?.zipCode && sourceAddress.postalCode !== listing.address.zipCode) return null;
    if (normalizeCity(sourceAddress.addressLocality || '') !== normalizeCity(listing.address?.city || '') && (!listing.address?.zipCode || listing.address.zipCode !== sourceAddress.postalCode)) return null;
    const availability = String(offer.availability).split('/').pop() || '';
    if (!['InStock', 'OutOfStock', 'SoldOut', 'Discontinued'].includes(availability)) return null;
    return { price, unit: actual.unit, observedAt: new Date(time), available: availability === 'InStock', sourceUrl: observation.url };
  } catch { return null; }
}

/** Quarantine ambiguous associations, rather than choosing a unit owner or
 * deleting records that saved listings and alert history may still reference. */
export function planListingRepairs(listings: any[], observations: SourceObservation[], now = new Date()) {
  const owners = new Map<string, Set<string>>();
  const key = (s: any) => `${s.source || s.sourceName}:${s.sourceId}`;
  for (const listing of listings) for (const source of listing.sources || []) {
    if (!source.sourceId || !(source.source || source.sourceName)) continue;
    if (!owners.has(key(source))) owners.set(key(source), new Set());
    owners.get(key(source))!.add(String(listing._id));
  }
  const conflicts = new Set([...owners].filter(([, ids]) => ids.size > 1).map(([k]) => k));
  const byUrl = new Map(observations.map(o => [o.url, o]));
  const changes: { id: any; set: Record<string, any>; reasons: string[] }[] = [];
  for (const listing of listings) {
    const set: Record<string, any> = {}, reasons: string[] = [];
    const bad = (listing.sources || []).filter((s: any) => conflicts.has(key(s)));
    let sources = (listing.sources || []).filter((s: any) => !conflicts.has(key(s)));
    if (bad.length) {
      set.sourceConflicts = [...(listing.sourceConflicts || []), ...bad.map((source: any) => ({ sourceKey: key(source), source, quarantinedAt: now, reason: 'Source ID is shared by multiple records; unit ownership is unverified.' }))];
      set.sources = sources;
      reasons.push('quarantined-source-conflict');
    }
    const amount = typeof listing.price === 'object' ? listing.price?.amount : listing.price;
    if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
      set['price.amount'] = null;
      set['price.status'] = 'unknown';
      set['rentReview'] = { originalAmount: amount, reason: 'Invalid legacy rent; exact unit price requires source verification.', reviewedAt: now };
      reasons.push('invalid-rent-marked-unknown');
    }
    const evidence = sources.map((s: any) => {
      const observation = byUrl.get(s.sourceUrl);
      return observation && verifiedUnitOffer(listing, observation, now.getTime());
    }).filter(Boolean);
    // Do not choose among contradictory unit offers or refresh using an older observation.
    const latest = Math.max(0, ...sources.map((s: any) => new Date(s.lastSeenAt || s.scrapedAt).getTime() || 0));
    if (evidence.length && evidence.every((e: any) => e.price === evidence[0].price && e.unit === evidence[0].unit && e.available === evidence[0].available) && evidence[0].observedAt.getTime() > latest) {
      const e = evidence[0];
      set['price.amount'] = e.price;
      set['price.status'] = 'known';
      set['price.period'] = 'monthly';
      set['fieldObservedAt.price_amount'] = e.observedAt;
      set['fieldObservedAt.availability'] = e.observedAt;
      set['address.unit'] = e.unit;
      set.isActive = e.available;
      sources = sources.map((s: any) => { const match = evidence.find((v: any) => v.sourceUrl === s.sourceUrl); return match ? { ...s, lastSeenAt: match.observedAt } : s; });
      set.sources = sources;
      reasons.push(e.available ? 'verified-available-unit' : 'verified-unavailable-unit');
    }
    const sourceKeys = [...new Set(sources.filter((s: any) => s.sourceId && (s.source || s.sourceName)).map(key))];
    if (bad.length || JSON.stringify(listing.sourceKeys || []) !== JSON.stringify(sourceKeys)) { set.sourceKeys = sourceKeys; reasons.push('indexed-source-ownership'); }
    if (reasons.length) changes.push({ id: listing._id, set, reasons });
  }
  return { changes, conflictingSourceKeys: [...conflicts] };
}
