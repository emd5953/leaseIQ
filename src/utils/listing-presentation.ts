/** Compatibility at the read boundary for records written by the former schemas. */
export function presentListing(listing: any, now = Date.now()): any {
  if (!listing) return null;
  const address = listing.address || {};
  const price = listing.price?.currency && listing.price.currency !== 'USD' || listing.listingScope === 'building' || listing.duplicateOf || ['unknown', 'building'].includes(listing.price?.status) ? null : typeof listing.price === 'object' ? listing.price?.amount : listing.price;
  const timestamp = (value: any) => value instanceof Date ? value.getTime() : Date.parse(value);
  const sources = [...(listing.sources || [])].sort((a, b) => (timestamp(b.lastSeenAt || b.scrapedAt) || 0) - (timestamp(a.lastSeenAt || a.scrapedAt) || 0));
  const sourceIdentityNeedsReview = !!listing.sourceConflicts?.length || listing.sourceVerification?.status === 'source_mismatch' || listing.listingScope !== 'building' && !address.unit && sources.some(s => new Set(sources.filter(other => other.source === s.source).map(other => other.sourceUrl)).size > 1);
  const observations = sources.map(s => timestamp(s.lastSeenAt || s.scrapedAt)).filter(time => Number.isFinite(time) && time <= now);
  const observed = observations.length ? Math.max(...observations) : NaN;
  const lastSeenAt = Number.isFinite(observed) && observed <= now ? new Date(observed).toISOString() : null;
  const freshness = !lastSeenAt ? 'unknown' : now - observed > 72 * 3600000 ? 'stale' : 'recent';
  const pets = listing.petPolicy;
  const petsAllowed = pets?.allowed ?? (pets?.dogsAllowed === true || pets?.catsAllowed === true ? true : pets?.dogsAllowed === false && pets?.catsAllowed === false ? false : null);
  // Older writes defaulted missing fee/pet/utility fields to false. Without
  // evidence of extraction, false is ambiguous and must not become a fact.
  const hasEvidence = (key: string) => (listing.fieldObservedAt instanceof Map ? listing.fieldObservedAt.get(key) : listing.fieldObservedAt?.[key]) != null;
  const feeRequired = listing.brokerFee?.required;
  const noFee = typeof feeRequired === 'boolean' && (feeRequired || hasEvidence('brokerFee_required')) ? !feeRequired : null;
  const utilities = Object.fromEntries(Object.entries(listing.utilities || {}).map(([key, value]) => [key, value === true || hasEvidence(`utilities_${key}`) ? value : null]));
  return { ...listing, utilities,
    title: address.street || (typeof address === 'string' ? address : 'Address unavailable'),
    address: typeof address === 'string' ? address : [address.street, address.unit ? `#${address.unit}` : null, address.city, address.state, address.zipCode].filter(Boolean).join(', '),
    addressDetails: typeof address === 'object' ? address : undefined,
    price: Number.isFinite(price) && price > 0 ? price : null,
    pricePeriod: listing.price?.period || 'monthly',
    squareFeet: listing.squareFootage ?? listing.squareFeet ?? null,
    source: sources[0]?.source || sources[0]?.sourceName || 'Source unknown',
    sourceUrl: /^https?:\/\//i.test(sources[0]?.sourceUrl) ? sources[0].sourceUrl : null,
    sources, lastSeenAt, freshness, sourceIdentityNeedsReview,
    verificationState: !sourceIdentityNeedsReview && ['building_verified', 'unit_verified'].includes(listing.sourceVerification?.status) && Number.isFinite(+new Date(listing.sourceVerification?.checkedAt)) && +new Date(listing.sourceVerification.checkedAt) <= now ? 'verified' : 'unverified',
    rentObservedAt: listing.buildingRent?.observedAt || listing.fieldObservedAt?.price_amount || null,
    rentNeedsReview: listing.price?.status === 'unknown' && !listing.duplicateOf,
    petsAllowed: petsAllowed === false && !hasEvidence('petPolicy_allowed') ? null : petsAllowed,
    noFee,
  };
}
