export function rentLabel(listing: any): string {
  const rent = listing.buildingRent;
  if (listing.listingScope === 'building' && !listing.duplicateOf) {
    if (rent?.status === 'contact') return 'Contact for price';
    if (rent?.status === 'range' && Number.isFinite(rent.minimum) && rent.minimum > 0 && Number.isFinite(rent.maximum) && rent.maximum >= rent.minimum) {
      return rent.minimum === rent.maximum ? `From $${rent.minimum.toLocaleString()}` : `$${rent.minimum.toLocaleString()}–$${rent.maximum.toLocaleString()}`;
    }
  }
  const price = typeof listing.price === 'object' ? listing.price?.amount : listing.price;
  if (listing.duplicateOf || listing.listingScope === 'building' || ['unknown', 'building'].includes(listing.price?.status) || listing.price?.currency && listing.price.currency !== 'USD') return 'Rent unknown';
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? `$${price.toLocaleString()}` : 'Rent unknown';
}
