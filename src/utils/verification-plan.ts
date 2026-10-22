import { buildingMatches, readBuildingEvidence, readRealtorUnit, sourceUrlKey, SourceDocument } from './source-verification';

const sourceKey = (s: any) => `${s.source || s.sourceName}:${s.sourceId}`;
const nameKey = (s: string) => s.toLowerCase().replace(/^apartments for rent at /, '').replace(/[^a-z0-9]/g, '');

export function planSourceVerification(before: any[], documents: SourceDocument[], now = Date.now()) {
  const byUrl = new Map(documents.map(d => [sourceUrlKey(d.url), d]));
  const evidence = documents.map(d => readBuildingEvidence(d, now)).filter((e): e is NonNullable<typeof e> => !!e);
  const observed = new Map(evidence.map(e => [sourceUrlKey(e.url), e]));
  const checkedAt = new Date(Math.max(...documents.map(d => +new Date(d.checkedAt)).filter(Number.isFinite)));
  if (!Number.isFinite(+checkedAt) || +checkedAt > now || now - +checkedAt > 86400000) throw new Error('Recent source documents are required.');
  const docs = before.map(d => ({ ...d, address: { ...d.address }, price: { ...d.price }, sources: (d.sources || []).map((s: any) => ({ ...s })), sourceConflicts: [...(d.sourceConflicts || [])] }));
  const retired = (d: any, s: any, reason: string) => {
    d.retiredSourceKeys = [...new Set([...(d.retiredSourceKeys || []), sourceKey(s)])];
    if (!(d.retiredSources || []).some((r: any) => sourceKey(r.source) === sourceKey(s))) d.retiredSources = [...(d.retiredSources || []), { source: s, reason, checkedAt }];
  };
  const groups = new Map<string, any[]>();
  for (const d of docs) for (const c of d.sourceConflicts) { if (!groups.has(c.sourceKey)) groups.set(c.sourceKey, []); groups.get(c.sourceKey)!.push(d); }
  const resolutions: any[] = [];
  for (const [key, members] of groups) {
    const refs = members.flatMap(d => d.sourceConflicts.filter((c: any) => c.sourceKey === key).map((c: any) => c.source));
    const direct = evidence.find(e => refs.some(r => sourceUrlKey(r.sourceUrl) === sourceUrlKey(e.url)) && members.every(d => buildingMatches(d, e)));
    // A removed building page can be superseded only by an independently verified
    // source with the exact building name, street, and postal code.
    const fallback = !direct && refs.every(r => byUrl.has(sourceUrlKey(r.sourceUrl)) && sourceUrlKey(byUrl.get(sourceUrlKey(r.sourceUrl))!.finalUrl) !== sourceUrlKey(r.sourceUrl))
      ? evidence.filter(e => nameKey(e.name) === nameKey(key.split(':').slice(1).join(':')) && members.every(d => d.address.zipCode && buildingMatches(d, e)))
        .sort((a, b) => Number(docs.some(d => d.sourceConflicts.some((c: any) => sourceUrlKey(c.source.sourceUrl) === sourceUrlKey(b.url)))) - Number(docs.some(d => d.sourceConflicts.some((c: any) => sourceUrlKey(c.source.sourceUrl) === sourceUrlKey(a.url)))))[0] : undefined;
    const verified = direct || fallback;
    const candidates = verified ? (direct ? members : docs.filter(d => !d.duplicateOf && d.sources.some((s: any) => sourceUrlKey(s.sourceUrl) === sourceUrlKey(verified.url)) && buildingMatches(d, verified))) : [];
    const owner = candidates.sort((a, b) => b.sources.length - a.sources.length || String(a._id).localeCompare(String(b._id)))[0];
    if (owner && verified && members.every(d => String(d._id) === String(owner._id) || !d.sources.length || d.sources.every((s: any) => {
      const e = observed.get(sourceUrlKey(s.sourceUrl)), page = byUrl.get(sourceUrlKey(s.sourceUrl));
      return e && buildingMatches(d, e) || fallback && page && sourceUrlKey(page.finalUrl) !== sourceUrlKey(page.url);
    }))) {
      for (const d of members) {
        const originals = [...d.sources, ...d.sourceConflicts.filter((c: any) => c.sourceKey === key).map((c: any) => c.source)];
        const resolution = { sourceKey: key, status: direct ? 'building-owner' : 'replaced-source', canonicalListingId: String(owner._id), evidenceUrl: verified.url, originalSources: originals.map((s: any) => ({ ...s })), checkedAt };
        d.sourceResolutions = [...(d.sourceResolutions || []), resolution];
        for (const s of originals) {
          const e = observed.get(sourceUrlKey(s.sourceUrl));
          if (e && buildingMatches(owner, e)) {
            const existing = owner.sources.find((o: any) => sourceKey(o) === sourceKey(s));
            if (!existing) owner.sources.push({ ...s, lastSeenAt: e.observedAt });
            else if (+new Date(s.firstSeenAt) < +new Date(existing.firstSeenAt)) existing.firstSeenAt = s.firstSeenAt;
          } else { retired(owner, s, 'Original building page redirects away; replaced by verified building source.'); retired(d, s, 'Original building page redirects away.'); }
        }
        d.sourceConflicts = d.sourceConflicts.filter((c: any) => c.sourceKey !== key);
        if (String(d._id) !== String(owner._id)) { d.duplicateOf = String(owner._id); d.isActive = false; d.sources = []; d.sourceVerification = { status: 'duplicate', checkedAt, canonicalListingId: String(owner._id) }; }
      }
      resolutions.push({ sourceKey: key, status: direct ? 'building-owner' : 'replaced-source', owner: String(owner._id) });
    } else {
      const mismatch = refs.every(r => {
        const page = byUrl.get(sourceUrlKey(r.sourceUrl));
        if (!page) return false;
        const moved = readBuildingEvidence({ ...page, url: page.finalUrl }, now);
        return !!moved && members.every(d => !buildingMatches(d, moved));
      });
      if (!mismatch) continue;
      for (const d of members) {
        for (const s of [...d.sources, ...d.sourceConflicts.filter((c: any) => c.sourceKey === key).map((c: any) => c.source)]) {
          const page = byUrl.get(sourceUrlKey(s.sourceUrl));
          const e = page && readBuildingEvidence({ ...page, url: page.finalUrl }, now);
          if (e && !buildingMatches(d, e)) { retired(d, s, 'Primary source address differs from the stored property.'); d.sources = d.sources.filter((s2: any) => sourceKey(s2) !== sourceKey(s)); }
        }
        d.sourceConflicts = d.sourceConflicts.filter((c: any) => c.sourceKey !== key);
        d.sourceResolutions = [...(d.sourceResolutions || []), { sourceKey: key, status: 'rejected-address-mismatch', checkedAt }];
        d.sourceVerification = { status: 'source_mismatch', checkedAt };
        if (!d.sources.length) { d.price = { ...d.price, amount: null, status: 'unknown' }; d.bedrooms = null; d.bathrooms = null; d.squareFeet = null; d.squareFootage = null; d.images = []; d.description = 'The original source no longer identifies this property. An exact unit and replacement source are required.'; }
      }
      resolutions.push({ sourceKey: key, status: 'rejected-address-mismatch' });
    }
  }
  for (const d of docs) {
    if (!d.isActive || d.duplicateOf || d.sourceVerification?.status === 'source_mismatch') continue;
    const ownEvidence = d.sources.map((s: any) => observed.get(sourceUrlKey(s.sourceUrl))).filter((e: any) => e && buildingMatches(d, e));
    if (ownEvidence.length) {
      const e = ownEvidence.sort((a: any, b: any) => +b.observedAt - +a.observedAt)[0];
      d.listingScope = 'building'; d.buildingRent = { ...e.rent, sourceUrl: e.url, observedAt: e.observedAt };
      d.price = { ...d.price, amount: null, status: 'building', currency: 'USD', period: 'monthly' };
      d.bedrooms = null; d.bathrooms = null; d.squareFootage = null; d.squareFeet = null; d.availableDate = null;
      d.description = 'Building-level listing. See the original source for current floor plans, exact unit rents, fees, and availability.';
      for (const s of d.sources) { const e = observed.get(sourceUrlKey(s.sourceUrl)); if (e && buildingMatches(d, e) && +e.observedAt > +new Date(s.lastSeenAt || 0)) s.lastSeenAt = e.observedAt; }
      d.fieldObservedAt = { ...d.fieldObservedAt, buildingRent: e.observedAt };
      d.sourceVerification = { status: 'building_verified', checkedAt: e.observedAt, evidenceUrl: e.url };
    } else {
      const units = d.sources.map((s: any) => { const page = byUrl.get(sourceUrlKey(s.sourceUrl)); return page && readRealtorUnit(d, page, now); }).filter(Boolean);
      if (units.length && units.every((e: any) => e.unit === units[0].unit && e.price === units[0].price && e.available === units[0].available)) {
        const e = units[0]; d.address.unit = e.unit; d.isActive = e.available; d.listingScope = 'unit';
        if (e.price != null) d.price = { amount: e.price, status: 'known', currency: 'USD', period: 'monthly' };
        d.fieldObservedAt = { ...d.fieldObservedAt, availability: e.observedAt, ...(e.price != null ? { price_amount: e.observedAt } : {}) };
        for (const s of d.sources) if (units.some((e: any) => sourceUrlKey(e.url) === sourceUrlKey(s.sourceUrl))) s.lastSeenAt = e.observedAt;
        d.sourceVerification = { status: 'unit_verified', checkedAt: e.observedAt, evidenceUrl: e.url };
      } else {
        const checks = [...new Set(d.sources.map((s: any) => sourceUrlKey(s.sourceUrl)))].map(url => {
          const page = byUrl.get(url as string);
          return { url, status: !page ? 'not-retrieved' : page.status !== 200 ? `http-${page.status}` : sourceUrlKey(page.finalUrl) !== sourceUrlKey(page.url) ? 'redirected' : 'exact-unit-not-verified', ...(page ? { checkedAt: new Date(page.checkedAt), finalUrl: page.finalUrl } : {}) };
        });
        d.sourceVerification = { status: 'unverified', checkedAt, checks };
      }
    }
  }
  for (const d of docs) {
    const keys = [...new Set(d.sources.map(sourceKey))];
    if (keys.length) d.sourceKeys = keys; else delete d.sourceKeys;
    if (!d.sourceConflicts.length) delete d.sourceConflicts;
  }
  const changes = docs.flatMap((after, i) => JSON.stringify(after) === JSON.stringify(before[i]) ? [] : [{ before: before[i], after }]);
  return { changes, resolutions };
}
