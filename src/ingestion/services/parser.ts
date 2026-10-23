import { RawListing, ParsedListing, ListingSource } from '../types';

/**
 * Data parser that extracts structured listing data from raw scraping results
 */
export class DataParser {
  /**
   * Parse raw listing data into structured format
   */
  async parse(rawListing: RawListing): Promise<ParsedListing | null> {
    try {
      return this.parseGeneric(rawListing);
    } catch (error) {
      console.error(`Error parsing listing from ${rawListing.source}:`, error);
      return null;
    }
  }

  /**
   * Generic parser that works for all sources
   * All scrapers now use the same enhanced schema
   */
  private parseGeneric(raw: RawListing): ParsedListing | null {
    const data = raw.rawData;
    if (!data.address && !data.price) return null;

    return {
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      sourceId: raw.sourceId,
      address: this.extractString(data.address),
      price: this.extractNumber(data.price),
      rawPrice: data.price,
      pricePeriod: data.pricePeriod,
      priceCurrency: data.priceCurrency,
      listingScope: ['unit', 'building'].includes(data.listingScope) ? data.listingScope : undefined,
      rentMinimum: this.extractNumber(data.rentMinimum),
      rentMaximum: this.extractNumber(data.rentMaximum),
      contactForPrice: data.contactForPrice === true,
      bedrooms: this.extractNumber(data.bedrooms),
      bathrooms: this.extractNumber(data.bathrooms),
      squareFeet: this.extractNumber(data.squareFeet),
      description: this.extractString(data.description),
      images: this.extractArray(data.images),
      floorPlanImages: this.extractArray(data.floorPlanImages),
      amenities: this.extractArray(data.amenities),
      petPolicy: this.extractString(data.petPolicy),
      brokerFee: this.extractString(data.brokerFee),
      // Additional details
      buildingType: this.extractString(data.buildingType),
      yearBuilt: this.extractNumber(data.yearBuilt),
      totalUnits: this.extractNumber(data.totalUnits),
      parking: this.extractString(data.parking),
      leaseLength: this.extractString(data.leaseLength),
      securityDeposit: this.extractNumber(data.securityDeposit),
      applicationFee: this.extractNumber(data.applicationFee),
      availableDate: this.extractString(data.availableDate),
      utilities: data.utilities ? {
        electric: typeof data.utilities.electric === 'boolean' ? data.utilities.electric : null,
        gas: typeof data.utilities.gas === 'boolean' ? data.utilities.gas : null,
        water: typeof data.utilities.water === 'boolean' ? data.utilities.water : null,
        internet: typeof data.utilities.internet === 'boolean' ? data.utilities.internet : null,
        trash: typeof data.utilities.trash === 'boolean' ? data.utilities.trash : null,
      } : null,
      laundry: this.extractString(data.laundry),
      heating: this.extractString(data.heating),
      cooling: this.extractString(data.cooling),
      contactPhone: this.extractString(data.contactPhone),
      contactEmail: this.extractString(data.contactEmail),
      scrapedAt: raw.scrapedAt,
    };
  }

  /**
   * Extract string value or return null
   */
  private extractString(value: any): string | null {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim();
  }

  /**
   * Extract number value or return null
   */
  private extractNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  /**
   * Extract array value or return empty array
   */
  private extractArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter(v => v !== null && v !== undefined).map(v => String(v));
  }
}
