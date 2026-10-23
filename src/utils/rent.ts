/** Parse a source quote without turning ranges, concessions or foreign currencies
 * into an exact USD unit rent. Numeric extraction follows the monthly-USD schema. */
export function parseRent(value: unknown, period?: unknown, currency?: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  const periodText = String(period || '').toLowerCase();
  const detected = /weekly|\/wk|\/week|per week/i.test(text) ? 'weekly'
    : /daily|\/day|per day|night/i.test(text) ? 'daily'
    : /monthly|\/mo(?:nth)?|per month/i.test(text) ? 'monthly' : undefined;
  const cadence = (['monthly', 'weekly', 'daily'].includes(periodText) ? periodText : detected || 'monthly') as 'monthly' | 'weekly' | 'daily';
  const invalid = currency != null && currency !== 'USD' || /[€£¥]|\b(?:CAD|EUR|GBP|AUD)\b/i.test(text)
    || periodText && !['monthly', 'weekly', 'daily'].includes(periodText)
    || detected && periodText && detected !== periodText
    || /net effective|starting|from|\+|\d\s*[-–—]\s*\$?\d|\bto\b/i.test(text);
  const cleaned = text.replace(/(?:USD|\$)/gi, '').replace(/(?:\/(?:mo(?:nth)?|wk|week|day)|per (?:month|week|day)|monthly|weekly|daily)/gi, '').trim();
  const numeric = typeof value === 'number' ? value : /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(cleaned) ? Number(cleaned.replace(/,/g, '')) : NaN;
  const amount = !invalid && Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  return { amount, status: amount == null ? 'unknown' as const : 'known' as const, currency: 'USD', period: cadence };
}

/** Email-safe formatting; the caller still escapes the resulting string. */
export function formatAdvertisedRent(listing: any): string {
  const money = (n: number) => `$${n.toLocaleString('en-US')}`;
  if (listing.duplicateOf) return 'Rent unknown';
  if (listing.listingScope === 'building') {
    const rent = listing.buildingRent;
    if (rent?.status === 'contact') return 'Contact for price';
    if (rent?.status === 'range' && Number.isFinite(rent.minimum) && Number.isFinite(rent.maximum) && rent.minimum > 0 && rent.maximum >= rent.minimum) return `${rent.minimum === rent.maximum ? `From ${money(rent.minimum)}` : `${money(rent.minimum)}–${money(rent.maximum)}`} / month · building range`;
    return 'Rent unknown';
  }
  const amount = typeof listing.price === 'object' ? listing.price?.amount : listing.price;
  if (['unknown', 'building'].includes(listing.price?.status) || listing.price?.currency && listing.price.currency !== 'USD' || !Number.isFinite(amount) || amount <= 0) return 'Rent unknown';
  const period = listing.price?.period || listing.pricePeriod;
  return `${money(amount)} / ${period === 'weekly' ? 'week' : period === 'daily' ? 'day' : 'month'}`;
}
