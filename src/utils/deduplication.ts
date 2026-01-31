import { Listing, IListing, IListingSource } from '../models/listing.model';

/**
 * Address abbreviation mappings for normalization
 */
const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  'street': 'st',
  'avenue': 'ave',
  'road': 'rd',
  'boulevard': 'blvd',
  'drive': 'dr',
  'lane': 'ln',
  'court': 'ct',
  'place': 'pl',
  'terrace': 'ter',
  'parkway': 'pkwy',
  'apartment': 'apt',
  'suite': 'ste',
  'floor': 'fl',
  'building': 'bldg',
  'north': 'n',
  'south': 's',
  'east': 'e',
  'west': 'w',
};

/**
 * Normalize an address string for comparison
 * - Converts to lowercase
 * - Removes punctuation (except hyphens in unit numbers)
 * - Standardizes common abbreviations
 * - Removes extra whitespace
 * 
 * @param address - The address string to normalize
 * @returns Normalized address string
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  // Convert to lowercase
  let normalized = address.toLowerCase().trim();
  
  // Remove punctuation except hyphens
  normalized = normalized.replace(/[.,;:!?'"]/g, '');
  
  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Standardize abbreviations
  Object.entries(ADDRESS_ABBREVIATIONS).forEach(([full, abbrev]) => {
    // Match whole words only
    const regex = new RegExp(`\\b${full}\\b`, 'g');
    normalized = normalized.replace(regex, abbrev);
  });
  
  // Final trim to remove any leading/trailing spaces
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param coord1 - First coordinate [longitude, latitude]
 * @param coord2 - Second coordinate [longitude, latitude]
 * @returns Distance in meters
 */
export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371e3; // Earth's radius in meters
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Find potential duplicate listings based on address and coordinates
 * 
 * @param street - Street address to search for
 * @param unit - Unit number (or null)
 * @param coordinates - Coordinates [longitude, latitude]
 * @param maxDistanceMeters - Maximum distance in meters for coordinate matching (default: 50)
 * @returns Array of potential duplicate listings
 */
export async function findDuplicates(
  street: string,
  unit: string | null,
  coordinates: [number, number],
  maxDistanceMeters: number = 50
): Promise<IListing[]> {
  const normalizedStreet = normalizeAddress(street);
  const normalizedUnit = unit ? normalizeAddress(unit) : null;
  
  // Get all listings (we'll filter in memory since addresses aren't stored normalized)
  // In production, you might want to add a normalized address field to the schema
  const allListings = await Listing.find({});
  
  // Filter by normalized address match, unit match, and coordinate proximity
  const duplicates = allListings.filter(listing => {
    // Check normalized street match
    const listingStreet = normalizeAddress(listing.address.street);
    if (listingStreet !== normalizedStreet) return false;
    
    // Check unit match
    const listingUnit = listing.address.unit ? normalizeAddress(listing.address.unit) : null;
    if (normalizedUnit !== listingUnit) return false;
    
    // Check coordinate proximity
    const listingCoords = listing.address.coordinates.coordinates as [number, number];
    const distance = calculateDistance(coordinates, listingCoords);
    
    return distance <= maxDistanceMeters;
  });
  
  return duplicates;
}

/**
 * Merge a new listing source into an existing listing
 * - Combines sources array
 * - Preserves earliest createdAt
 * - Uses most recent price and availability
 * - Updates other fields with most recent data
 * 
 * @param existingListing - The existing listing document
 * @param newListingData - The new listing data to merge
 * @returns Updated listing document
 */
export async function mergeListing(
  existingListing: IListing,
  newListingData: Partial<IListing> & { sources: IListingSource[] }
): Promise<IListing> {
  // Store original createdAt before any modifications
  const originalCreatedAt = existingListing.createdAt;
  
  // Add new source to sources array if not already present
  const newSource = newListingData.sources[0];
  const sourceExists = existingListing.sources.some(
    s => s.sourceName === newSource.sourceName && s.sourceId === newSource.sourceId
  );
  
  if (!sourceExists) {
    existingListing.sources.push(newSource);
  } else {
    // Update existing source's scrapedAt timestamp
    const existingSourceIndex = existingListing.sources.findIndex(
      s => s.sourceName === newSource.sourceName && s.sourceId === newSource.sourceId
    );
    existingListing.sources[existingSourceIndex].scrapedAt = newSource.scrapedAt;
  }
  
  // Update with most recent data
  if (newListingData.price !== undefined) {
    existingListing.price = newListingData.price;
  }
  
  if (newListingData.availableDate !== undefined) {
    existingListing.availableDate = newListingData.availableDate;
  }
  
  if (newListingData.description !== undefined && newListingData.description) {
    existingListing.description = newListingData.description;
  }
  
  if (newListingData.images !== undefined && newListingData.images.length > 0) {
    // Merge images, avoiding duplicates
    const existingImages = new Set(existingListing.images);
    newListingData.images.forEach(img => existingImages.add(img));
    existingListing.images = Array.from(existingImages);
  }
  
  if (newListingData.amenities !== undefined && newListingData.amenities.length > 0) {
    // Merge amenities, avoiding duplicates
    const existingAmenities = new Set(existingListing.amenities);
    newListingData.amenities.forEach(amenity => existingAmenities.add(amenity));
    existingListing.amenities = Array.from(existingAmenities);
  }
  
  if (newListingData.squareFootage !== undefined && newListingData.squareFootage !== null) {
    existingListing.squareFootage = newListingData.squareFootage;
  }
  
  if (newListingData.bedrooms !== undefined) {
    existingListing.bedrooms = newListingData.bedrooms;
  }
  
  if (newListingData.bathrooms !== undefined) {
    existingListing.bathrooms = newListingData.bathrooms;
  }
  
  if (newListingData.petPolicy !== undefined) {
    existingListing.petPolicy = {
      ...existingListing.petPolicy,
      ...newListingData.petPolicy
    };
  }
  
  if (newListingData.brokerFee !== undefined) {
    existingListing.brokerFee = {
      ...existingListing.brokerFee,
      ...newListingData.brokerFee
    };
  }
  
  if (newListingData.isActive !== undefined) {
    existingListing.isActive = newListingData.isActive;
  }
  
  // Mark the document as modified to ensure Mongoose saves changes
  existingListing.markModified('sources');
  existingListing.markModified('petPolicy');
  existingListing.markModified('brokerFee');
  
  // Save the document
  const savedListing = await existingListing.save();
  
  // Ensure createdAt is preserved (Mongoose should handle this, but double-check)
  if (savedListing.createdAt.getTime() !== originalCreatedAt.getTime()) {
    savedListing.createdAt = originalCreatedAt;
    await savedListing.save();
  }
  
  return savedListing;
}

/**
 * Process a new listing for deduplication
 * - Checks for duplicates
 * - Merges if duplicate found
 * - Creates new listing if no duplicate
 * 
 * @param listingData - The new listing data
 * @returns The created or updated listing document
 */
export async function processListing(
  listingData: Partial<IListing> & {
    address: IListing['address'];
    price: number;
    bedrooms: number;
    bathrooms: number;
    sources: IListingSource[];
  }
): Promise<IListing> {
  // Find potential duplicates
  const duplicates = await findDuplicates(
    listingData.address.street,
    listingData.address.unit || null,
    listingData.address.coordinates.coordinates as [number, number]
  );
  
  if (duplicates.length > 0) {
    // Merge with first duplicate found
    return await mergeListing(duplicates[0], listingData);
  } else {
    // Create new listing
    const newListing = new Listing(listingData);
    await newListing.save();
    return newListing;
  }
}
