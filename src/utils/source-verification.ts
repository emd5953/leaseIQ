import { normalizeCity, normalizeStreet, splitUnit } from './address';

export interface SourceDocument {
  url: string; finalUrl: string; status: number; checkedAt: string;
  jsonld: any[];
  property?: any; // Realtor's primary propertyDetails, never recommendation results
  contactForPrice?: boolean;
}
export interface BuildingEvidence {
  scope: 'building'; url: string; observedAt: Date; name: string;
  address: { street: string; city: string; state: string; zipCode: string };
  rent: { status: 'range' | 'contact'; minimum: number | null; maximum: number | null };
}
export function sourceUrlKey(value: string): string {
  try { const u = new URL(value); return u.origin + u.pathname.replace(/\/$/, ''); } catch { return ''; }
}
const types = (node: any, type: string) => [node?.['@type']].flat().includes(type);
const positive = (n: any): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Extract only the page's primary building and its offers. A successful HTTP
 * response alone, a search redirect, or a neighboring recommendation is not evidence. */
export function readBuildingEvidence(doc: SourceDocument, now = Date.now()): BuildingEvidence | null {
  try {
    const u = new URL(doc.url), observedAt = new Date(doc.checkedAt);
    if (u.protocol !== 'https:' || doc.status !== 200 || !Number.isFinite(+observedAt) || +observedAt > now || now - +observedAt > 86400000) return null;
    if (sourceUrlKey(doc.url) !== sourceUrlKey(doc.finalUrl)) return null;
    const nodes = doc.jsonld.flat(Infinity).flatMap(n => n['@graph'] || [n]);
    let address: any, name = '', low: any, high: any, contact = false;
    if (u.hostname === 'www.realtor.com' && u.pathname.startsWith('/rentals/details/')) {
      const p = doc.property;
      if (!p || p.status !== 'for_rent' || !Array.isArray(p.community_rental_floorplans) || !p.community_rental_floorplans.length) return null;
      const a = p.location?.address;
      if (!a || a.unit || !u.pathname.endsWith(`_M${String(p.property_id).slice(0,5)}-${String(p.property_id).slice(5)}`)) return null;
      address = { streetAddress: a.line, addressLocality: a.city, addressRegion: a.state_code, postalCode: a.postal_code };
      name = p.branding?.[0]?.name || nodes.find(n => types(n, 'ApartmentComplex'))?.name || a.line;
      low = p.list_price_min; high = p.list_price_max;
      contact = !positive(low) && !positive(high) && doc.contactForPrice === true;
    } else if (u.hostname === 'www.zumper.com' && u.pathname.startsWith('/apartment-buildings/')) {
      const buildings = nodes.filter(n => types(n, 'ApartmentComplex') && sourceUrlKey(n.mainEntityOfPage) === sourceUrlKey(doc.url));
      const offers = nodes.filter(n => types(n, 'Product') && sourceUrlKey(n.offers?.url) === sourceUrlKey(doc.url));
      if (buildings.length !== 1 || offers.length !== 1 || !types(offers[0].offers, 'AggregateOffer') || offers[0].offers.priceCurrency !== 'USD' || !(offers[0].offers.offerCount > 0)) return null;
      address = buildings[0].address; name = buildings[0].name; low = offers[0].offers.lowPrice; high = offers[0].offers.highPrice;
    } else if (u.hostname === 'www.padmapper.com' && u.pathname.startsWith('/buildings/')) {
      const buildings = nodes.filter(n => types(n, 'Apartment'));
      if (buildings.length !== 1 || !nodes.some(n => types(n, 'RealEstateListing') && sourceUrlKey(n.url) === sourceUrlKey(doc.url))) return null;
      const b = buildings[0];
      const price = b.description?.match(/for \$([\d,]+)(?:[–—-]\$([\d,]+))?\/month\.\s*(\d+) floorplans currently available/);
      if (!price || Number(price[3]) < 1) return null;
      address = b.address; name = b.name; low = Number(price[1].replace(/,/g, '')); high = Number((price[2] || price[1]).replace(/,/g, ''));
    } else if (u.hostname === 'www.trulia.com' && u.pathname.startsWith('/building/')) {
      const buildings = nodes.filter(n => types(n, 'RealEstateListing') && types(n.mainEntity, 'ApartmentComplex') && sourceUrlKey(new URL(n.url, doc.url).href) === sourceUrlKey(doc.url));
      const products = nodes.filter(n => types(n, 'Product') && sourceUrlKey(n.offers?.url) === sourceUrlKey(doc.url));
      if (buildings.length !== 1 || products.length !== 1) return null;
      const b = buildings[0].mainEntity, offer = products[0].offers;
      if (!types(offer, 'AggregateOffer') || offer.priceCurrency !== 'USD' || offer.availability !== 'https://schema.org/InStock') return null;
      address = { ...b.address, streetAddress: b.address.streetAddress.split(',')[0] }; name = b.name; low = offer.lowPrice; high = offer.highPrice;
    } else if (u.hostname === 'www.zillow.com' && (u.pathname.startsWith('/apartments/') || u.pathname.startsWith('/b/'))) {
      const buildings = nodes.filter(n => types(n, 'RealEstateListing') && types(n.about, 'ApartmentComplex') && sourceUrlKey(n.url) === sourceUrlKey(doc.url));
      if (buildings.length !== 1) return null;
      const b = buildings[0], offers = [b.offers].flat();
      if (!offers.length || offers.some(o => !o || o.priceCurrency !== 'USD' || o.availability !== 'https://schema.org/InStock' || o.priceSpecification?.eligibleQuantity?.unitCode !== 'MON' || sourceUrlKey(o.url) !== sourceUrlKey(doc.url))) return null;
      const lows = offers.map(o => types(o, 'AggregateOffer') ? o.lowPrice : o.price), highs = offers.map(o => types(o, 'AggregateOffer') ? o.highPrice : o.price);
      if (![...lows, ...highs].every(positive)) return null;
      address = b.about.address; name = b.name; low = Math.min(...lows); high = Math.max(...highs);
    } else if (u.hostname === 'hotpads.com') {
      const pages = nodes.filter(n => types(n, 'WebPage') && sourceUrlKey(n.url) === sourceUrlKey(doc.url));
      const buildings = nodes.filter(n => types(n, 'ApartmentComplex') && sourceUrlKey(n.url) === sourceUrlKey(doc.url));
      if (pages.length !== 1 || buildings.length !== 1) return null;
      const b = buildings[0], primaryIds = [pages[0].mainEntity].flat().map(n => n?.['@id']);
      const products = nodes.filter(n => types(n, 'Product') && primaryIds.includes(n['@id']) && n.offers?.itemOffered?.['@id'] === b['@id']);
      if (!primaryIds.includes(b['@id']) || products.length !== 1) return null;
      const offer = products[0].offers;
      const monthly = nodes.filter(n => n['@id'] === offer['@id']).flatMap(n => n.priceSpecification || []).filter(p => p.unitCode === 'MON' && p.priceCurrency === 'USD');
      if (!types(offer, 'AggregateOffer') || sourceUrlKey(offer.url) !== sourceUrlKey(doc.url) || offer.priceCurrency !== 'USD' || !(offer.offerCount > 0) || offer.availability && offer.availability !== 'https://schema.org/InStock' || monthly.length !== 1 || monthly[0].price !== offer.lowPrice || monthly[0].maxPrice !== offer.highPrice) return null;
      address = b.address; name = b.name; low = offer.lowPrice; high = offer.highPrice;
    } else if (u.hostname === 'www.apartmentlist.com') {
      const buildings = nodes.filter(n => types(n, 'ApartmentComplex') && types(n, 'RealEstateListing'));
      if (buildings.length !== 1) return null;
      const b = buildings[0], offer = b.offers;
      if (!types(offer, 'AggregateOffer') || sourceUrlKey(offer.url) !== sourceUrlKey(doc.url) || offer.priceCurrency !== 'USD' || offer.availability !== 'https://schema.org/InStock') return null;
      address = b.address; name = b.name; low = offer.lowPrice; high = offer.highPrice;
    } else return null;
    if (!address?.streetAddress || !address.addressLocality || !['NY', 'New York'].includes(address.addressRegion) || !/^\d{5}$/.test(address.postalCode || '') || splitUnit(address.streetAddress).unit) return null;
    if (!contact && (!positive(low) || !positive(high) || low > high)) return null;
    return { scope: 'building', url: doc.url, observedAt, name: String(name || address.streetAddress), address: { street: address.streetAddress, city: address.addressLocality, state: 'NY', zipCode: address.postalCode }, rent: { status: contact ? 'contact' : 'range', minimum: contact ? null : low, maximum: contact ? null : high } };
  } catch { return null; }
}

export function readRealtorUnit(listing: any, doc: SourceDocument, now = Date.now()) {
  try {
    const u = new URL(doc.url), p = doc.property, time = new Date(doc.checkedAt), a = p?.location?.address;
    if (u.hostname !== 'www.realtor.com' || u.protocol !== 'https:' || doc.status !== 200 || sourceUrlKey(doc.url) !== sourceUrlKey(doc.finalUrl) || !Number.isFinite(+time) || +time > now || now - +time > 86400000) return null;
    if (!p || !a || p.community_rental_floorplans?.length || !u.pathname.endsWith(`_M${String(p.property_id).slice(0,5)}-${String(p.property_id).slice(5)}`)) return null;
    const actual = splitUnit(a.line || ''), expected = splitUnit(listing.address?.street || '');
    const expectedUnit = String(listing.address?.unit || expected.unit || '').replace(/^(?:APT\.?|UNIT|#)\s*/i, '').toUpperCase();
    if (!actual.unit || expectedUnit && expectedUnit !== actual.unit || normalizeStreet(actual.street) !== normalizeStreet(expected.street)) return null;
    if (a.state_code !== 'NY' || !['NY', 'New York'].includes(listing.address?.state) || (listing.address?.zipCode ? a.postal_code !== listing.address.zipCode : normalizeCity(a.city) !== normalizeCity(listing.address?.city || ''))) return null;
    if (!['for_rent', 'off_market'].includes(p.status) || p.status === 'for_rent' && !positive(p.list_price)) return null;
    return { unit: actual.unit, available: p.status === 'for_rent', price: p.status === 'for_rent' ? p.list_price : null, observedAt: time, url: doc.url };
  } catch { return null; }
}

export function buildingMatches(listing: any, evidence: BuildingEvidence): boolean {
  const a = listing.address || {}, street = splitUnit(a.street || '');
  if (a.unit || street.unit || normalizeStreet(street.street) !== normalizeStreet(evidence.address.street)) return false;
  if (!['NY', 'New York'].includes(a.state)) return false;
  if (a.zipCode && a.zipCode !== evidence.address.zipCode) return false;
  return normalizeCity(a.city || '') === normalizeCity(evidence.address.city) || !!a.zipCode && a.zipCode === evidence.address.zipCode;
}
