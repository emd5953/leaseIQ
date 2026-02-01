import { ParsedListing, NormalizedListing, Address, Price, PetPolicy, BrokerFee } from '../types';

/**
 * Data normalizer that transforms parsed listings into unified schema
 */
export class DataNormalizer {
  /**
   * Normalize parsed listing into unified schema
   */
  async normalize(parsed: ParsedListing): Promise<NormalizedListing> {
    return {
      source: parsed.source,
      sourceUrl: parsed.sourceUrl,
      sourceId: parsed.sourceId,
      address: this.normalizeAddress(parsed.address),
      price: this.normalizePrice(parsed.price),
      bedrooms: parsed.bedrooms,
      bathrooms: parsed.bathrooms,
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
      availableDate: parsed.availableDate ? new Date(parsed.availableDate) : null,
      utilities: parsed.utilities || {
        electric: false,
        gas: false,
        water: false,
        internet: false,
        trash: false,
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
    const parts = addressStr.split(',').map(p => p.trim());
    
    let street = '';
    let city = '';
    let state = '';
    let zipCode = '';

    if (parts.length >= 1) street = parts[0];
    if (parts.length >= 2) city = parts[1];
    if (parts.length >= 3) {
      // Last part might be "State ZIP"
      const lastPart = parts[parts.length - 1];
      const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})/);
      if (stateZipMatch) {
        state = stateZipMatch[1];
        zipCode = stateZipMatch[2];
      } else {
        state = lastPart;
      }
    }

    return {
      street,
      city,
      state,
      zipCode,
      fullAddress: addressStr,
    };
  }

  /**
   * Standardize price format (convert to monthly USD)
   */
  private normalizePrice(price: number | null): Price {
    if (!price) {
      return {
        amount: 0,
        currency: 'USD',
        period: 'monthly',
      };
    }

    // Assume all prices are monthly by default
    // In a real implementation, you'd detect weekly/daily and convert
    return {
      amount: price,
      currency: 'USD',
      period: 'monthly',
    };
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
      if (lower.includes('washer') || lower.includes('laundry')) return 'Washer/Dryer';
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
    const allowed = lower.includes('allowed') || lower.includes('friendly') || lower.includes('ok');
    
    // Extract deposit amount
    const depositMatch = policyStr.match(/\$(\d+)/);
    const deposit = depositMatch ? parseInt(depositMatch[1]) : null;

    return {
      allowed,
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
    const required = !lower.includes('no fee') && !lower.includes('no broker');

    // Extract percentage
    const percentMatch = feeStr.match(/(\d+)%/);
    const percentage = percentMatch ? parseInt(percentMatch[1]) : null;

    // Extract fixed amount
    const amountMatch = feeStr.match(/\$(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : null;

    return {
      required,
      amount,
      percentage,
    };
  }
}
