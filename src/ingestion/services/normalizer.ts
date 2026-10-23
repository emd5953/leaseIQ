import { splitUnit } from '../../utils/address';
import { parseRent } from '../../utils/rent';
import { canonicalSourceUrl } from '../../utils/source-identity';
import { ParsedListing, NormalizedListing, Address, PetPolicy, BrokerFee } from '../types';

/**
 * Data normalizer that transforms parsed listings into unified schema
 */
export class DataNormalizer {
  /**
   * Normalize parsed listing into unified schema
   */
  async normalize(parsed: ParsedListing): Promise<NormalizedListing> {
    if (!parsed.address?.trim() || !parsed.sourceId?.trim() || !canonicalSourceUrl(parsed.source, parsed.sourceUrl)) {
      throw new Error('Import requires a street address, stable source ID, and a URL on the named source.');
    }
    if (!Number.isFinite(+parsed.scrapedAt) || +parsed.scrapedAt > Date.now() + 60000) throw new Error('Invalid source observation date');
    const price = parseRent(parsed.rawPrice === undefined ? parsed.price : parsed.rawPrice, parsed.pricePeriod, parsed.priceCurrency);
    let buildingRent: NormalizedListing['buildingRent'];
    if (parsed.listingScope === 'building') {
      const low = parseRent(parsed.rentMinimum, parsed.pricePeriod, parsed.priceCurrency);
      const high = parseRent(parsed.rentMaximum, parsed.pricePeriod, parsed.priceCurrency);
      if (low.amount && high.amount && low.amount <= high.amount && low.period === 'monthly') buildingRent = { status: 'range', minimum: low.amount, maximum: high.amount, sourceUrl: parsed.sourceUrl, observedAt: parsed.scrapedAt };
      else if (parsed.contactForPrice) buildingRent = { status: 'contact', minimum: null, maximum: null, sourceUrl: parsed.sourceUrl, observedAt: parsed.scrapedAt };
    }
    return {
      source: parsed.source,
      sourceUrl: parsed.sourceUrl,
      sourceId: parsed.sourceId,
      address: this.normalizeAddress(parsed.address),
      price: parsed.listingScope === 'building' ? { ...price, amount: null, status: buildingRent ? 'building' : 'unknown' } : price,
      listingScope: parsed.listingScope,
      buildingRent,
      rentEvidence: { raw: typeof parsed.rawPrice === 'string' || typeof parsed.rawPrice === 'number' ? parsed.rawPrice : parsed.price, period: String(parsed.pricePeriod || 'monthly (extraction default)'), sourceUrl: parsed.sourceUrl, observedAt: parsed.scrapedAt },
      bedrooms: parsed.bedrooms != null && Number.isInteger(parsed.bedrooms) && parsed.bedrooms >= 0 ? parsed.bedrooms : null,
      bathrooms: parsed.bathrooms != null && parsed.bathrooms > 0 ? parsed.bathrooms : null,
      squareFeet: parsed.squareFeet,
      description: parsed.description,
      images: parsed.images,
      floorPlanImages: parsed.floorPlanImages || [],
      amenities: this.normalizeAmenities(parsed.amenities),
      petPolicy: this.normalizePetPolicy(parsed.petPolicy),
      brokerFee: this.normalizeBrokerFee(parsed.brokerFee),
      // Additional details
      buildingType: parsed.buildingType,
      yearBuilt: parsed.yearBuilt,
      totalUnits: parsed.totalUnits,
      parking: parsed.parking,
      leaseLength: parsed.leaseLength,
      securityDeposit: parsed.securityDeposit,
      applicationFee: parsed.applicationFee,
      availableDate: parsed.availableDate && Number.isFinite(Date.parse(parsed.availableDate)) ? new Date(parsed.availableDate) : null,
      utilities: parsed.utilities || {
        electric: null,
        gas: null,
        water: null,
        internet: null,
        trash: null,
      },
      laundry: parsed.laundry,
      heating: parsed.heating,
      cooling: parsed.cooling,
      contactPhone: parsed.contactPhone,
      contactEmail: parsed.contactEmail,
      scrapedAt: parsed.scrapedAt,
    };
  }

  /**
   * Parse address string into structured components
   * Enhanced for NYC address formats
   */
  private normalizeAddress(addressStr: string | null): Address {
    if (!addressStr) {
      return {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        fullAddress: '',
      };
    }

    // Simple address parsing - split by comma
    const parts = addressStr.replace(/,\s*((?:apt\.?|unit|#)\s*[\w-]+)/i, ' $1').split(',').map(p => p.trim());
    
    let street = '';
    let city = '';
    let state = '';
    let zipCode = '';

    if (parts.length >= 1) street = parts[0];
    if (parts.length >= 2) city = parts[1];
    if (parts.length >= 3) {
      // Last part might be "State ZIP"
      const lastPart = parts[parts.length - 1];
      const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})/i);
      if (stateZipMatch) {
        state = stateZipMatch[1].toUpperCase();
        zipCode = stateZipMatch[2];
      } else {
        state = lastPart;
      }
    }

    // Normalize state variations
    if (/^(new york|ny)$/i.test(state)) {
      state = 'NY';
    }

    // Normalize NYC borough names
    const cityLower = city.toLowerCase();
    if (cityLower === 'manhattan' || cityLower === 'brooklyn' || 
        cityLower === 'queens' || cityLower === 'bronx' || 
        cityLower === 'staten island' || cityLower === 'new york' || cityLower === 'new york city' || cityLower === 'nyc') {
      // Keep borough name but ensure state is NY
      if (!state) state = 'NY';
    }

    // If city is "New York" and we have a NYC zip code, set state to NY
    if (cityLower === 'new york' && zipCode && this.isNYCZipCode(zipCode)) {
      state = 'NY';
    }

    return {
      ...splitUnit(street),
      city,
      state,
      zipCode,
      fullAddress: addressStr,
    };
  }

  /**
   * Check if a zip code is within NYC
   */
  private isNYCZipCode(zip: string): boolean {
    const nycZipRanges = [
      { min: 10001, max: 10282 }, // Manhattan
      { min: 10301, max: 10314 }, // Staten Island
      { min: 10451, max: 10475 }, // Bronx
      { min: 11004, max: 11109 }, // Queens
      { min: 11201, max: 11256 }, // Brooklyn
    ];

    const zipNum = parseInt(zip);
    return nycZipRanges.some(range => zipNum >= range.min && zipNum <= range.max);
  }

  /**
   * Normalize amenity names
   */
  private normalizeAmenities(amenities: string[]): string[] {
    const normalized = amenities.map(a => {
      const lower = a.toLowerCase();
      // Standardize common variations
      if (lower.includes('a/c') || lower.includes('air conditioning')) return 'Air Conditioning';
      if (lower.includes('dishwasher')) return 'Dishwasher';
      if (lower.includes('in-unit') && /washer|laundry/.test(lower)) return 'In-unit Laundry';
      if (lower.includes('laundry')) return 'Laundry';
      if (lower.includes('parking') || lower.includes('garage')) return 'Parking';
      if (lower.includes('gym') || lower.includes('fitness')) return 'Fitness Center';
      if (lower.includes('pool')) return 'Pool';
      if (lower.includes('doorman') || lower.includes('concierge')) return 'Doorman';
      if (lower.includes('elevator')) return 'Elevator';
      if (lower.includes('balcony') || lower.includes('terrace')) return 'Balcony';
      if (lower.includes('hardwood')) return 'Hardwood Floors';
      return a; // Keep original if no match
    });
    
    // Remove duplicates
    return Array.from(new Set(normalized));
  }

  /**
   * Extract pet policy details from text
   */
  private normalizePetPolicy(policyStr: string | null): PetPolicy | null {
    if (!policyStr) return null;

    const lower = policyStr.toLowerCase();
    const species = (name: string) => new RegExp(`${name} (?:are )?(?:not allowed|prohibited)|no ${name}`).test(lower) ? false : new RegExp(`${name} (?:are )?(?:allowed|welcome|ok)`).test(lower) ? true : null;
    const dogsAllowed = species('dogs');
    const catsAllowed = species('cats');
    const allowed = /no pets|pets (?:are )?(?:not allowed|prohibited)/.test(lower) ? false
      : /pet[s -]*(?:friendly|allowed|welcome|ok)/.test(lower) || dogsAllowed === true || catsAllowed === true ? true : null;
    
    // Extract deposit amount
    const depositMatch = policyStr.match(/\$([\d,]+(?:\.\d+)?)/);
    const deposit = depositMatch ? Number(depositMatch[1].replace(/,/g, '')) : null;

    return {
      allowed, dogsAllowed, catsAllowed,
      restrictions: policyStr,
      deposit,
    };
  }

  /**
   * Parse broker fee information
   */
  private normalizeBrokerFee(feeStr: string | null): BrokerFee | null {
    if (!feeStr) return null;

    const lower = feeStr.toLowerCase();
    const required = /unknown|not (?:provided|specified)|ask|contact|information/.test(lower) ? null : /no[- ](?:broker )?fee|fee free/.test(lower) ? false : /fee required|broker fee|\$|%/.test(lower) ? true : null;

    // Extract percentage
    const percentMatch = feeStr.match(/(\d+(?:\.\d+)?)%/);
    const percentage = percentMatch ? Number(percentMatch[1]) : null;

    // Extract fixed amount
    const amountMatch = feeStr.match(/\$([\d,]+(?:\.\d+)?)/);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : null;

    return {
      required,
      amount,
      percentage,
    };
  }
}
