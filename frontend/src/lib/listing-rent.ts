export function rentLabel(listing: any): string {
  const rent = listing.buildingRent;
  if (listing.listingScope === 'building' && !listing.duplicateOf) {
    if (rent?.status === 'contact') return 'Contact for price';
    if (rent?.status === 'range' && Number.isFinite(rent.minimum) && rent.minimum > 0 && Number.isFinite(rent.maximum) && rent.maximum >= rent.minimum) {
      return rent.minimum === rent.maximum ? `From $${rent.minimum.toLocaleString()}` : `$${rent.minimum.toLocaleString()}–$${rent.maximum.toLocaleString()}`;
    }
  }
  return listing.price == null ? 'Rent unknown' : `$${listing.price.toLocaleString()}`;
}
