/** Borough names are authoritative here; coarse ZIP ranges also include non-NYC locations. */
export const NYC_CITIES = ['New York', 'New York City', 'NYC', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
export function isNYCAddress(address: { city?: string | null; state?: string | null }, coordinates?: { latitude: number; longitude: number } | null): boolean {
  if (address.state && !/^(ny|new york)$/i.test(address.state.trim())) return false;
  const recognizedCity = NYC_CITIES.some(city => city.toLowerCase() === address.city?.trim().toLowerCase());
  if (!recognizedCity) return false;
  // This bounding box is a consistency check, never enough to establish city membership.
  return !coordinates || (Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)
    && coordinates.latitude >= 40.4774 && coordinates.latitude <= 40.9176 && coordinates.longitude >= -74.2591 && coordinates.longitude <= -73.7004);
}
