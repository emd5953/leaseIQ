const hosts: Record<string, string> = {
  streeteasy: 'streeteasy.com', zillow: 'zillow.com', apartments_com: 'apartments.com', trulia: 'trulia.com',
  realtor: 'realtor.com', zumper: 'zumper.com', renthop: 'renthop.com', rent_com: 'rent.com', hotpads: 'hotpads.com',
  apartment_guide: 'apartmentguide.com', rentals_com: 'rentals.com', apartment_list: 'apartmentlist.com',
  padmapper: 'padmapper.com', craigslist: 'craigslist.org', facebook: 'facebook.com',
};

/** Query strings on these detail pages are tracking, not property identity. */
export function canonicalSourceUrl(source: string, value: string): string | null {
  try {
    const u = new URL(value), host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (!hosts[source] || !['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
    if (host !== hosts[source] && !(source === 'craigslist' && host.endsWith('.craigslist.org'))) return null;
    if (!u.pathname || u.pathname === '/') return null;
    return `https://${host}${u.pathname.replace(/\/+$/, '')}`;
  } catch { return null; }
}

export function sourceDetailKey(source: string, value: string): string | null {
  const url = canonicalSourceUrl(source, value);
  if (!url) return null;
  const path = new URL(url).pathname;
  // Do not give a search results page ownership of every apartment on it.
  if (source === 'streeteasy' && !/^\/(?:rental\/[^/]+|building\/[^/]+\/[^/]+)$/.test(path)) return null;
  if (/\/(?:search|for-rent|apartments-for-rent)(?:\/|$)/i.test(path)) return null;
  return `url:${url}`;
}
