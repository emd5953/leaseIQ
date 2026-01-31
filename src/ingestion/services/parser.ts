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
      const strategy = this.getParsingStrategy(rawListing.source);
      return strategy(rawListing);
    } catch (error) {
      console.error(`Error parsing listing from ${rawListing.source}:`, error);
      return null;
    }
  }

  /**
   * Get source-specific parsing strategy
   */
  private getParsingStrategy(source: ListingSource): (raw: RawListing) => ParsedListing | null {
    const strategies: Record<ListingSource, (raw: RawListing) => ParsedListing | null> = {
      [ListingSource.STREETEASY]: this.parseStreetEasy.bind(this),
      [ListingSource.ZILLOW]: this.parseZillow.bind(this),
      [ListingSource.APARTMENTS_COM]: this.parseApartments.bind(this),
      [ListingSource.CRAIGSLIST]: this.parseCraigslist.bind(this),
      [ListingSource.FACEBOOK]: this.parseFacebook.bind(this),
    };
    return strategies[source];
  }

  /**
   * Parse StreetEasy listing
   */
  private parseStreetEasy(raw: RawListing): ParsedListing | null {
    const data = raw.rawData;
    if (!data.address && !data.price) return null;

    return {
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      sourceId: raw.sourceId,
      address: this.extractString(data.address),
      price: this.extractNumber(data.price),
      bedrooms: this.extractNumber(data.bedrooms),
      bathrooms: this.extractNumber(data.bathrooms),
      squareFeet: this.extractNumber(data.squareFeet),
      description: this.extractString(data.description),
      images: this.extractArray(data.images),
      amenities: this.extractArray(data.amenities),
      petPolicy: this.extractString(data.petPolicy),
      brokerFee: this.extractString(data.brokerFee),
      scrapedAt: raw.scrapedAt,
    };
  }

  /**
   * Parse Zillow listing
   */
  private parseZillow(raw: RawListing): ParsedListing | null {
    const data = raw.rawData;
    if (!data.address && !data.price) return null;

    return {
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      sourceId: raw.sourceId,
      address: this.extractString(data.address),
      price: this.extractNumber(data.price),
      bedrooms: this.extractNumber(data.bedrooms),
      bathrooms: this.extractNumber(data.bathrooms),
      squareFeet: this.extractNumber(data.squareFeet),
      description: this.extractString(data.description),
      images: this.extractArray(data.images),
      amenities: this.extractArray(data.amenities),
      petPolicy: this.extractString(data.petPolicy),
      brokerFee: this.extractString(data.brokerFee),
      scrapedAt: raw.scrapedAt,
    };
  }

  /**
   * Parse Apartments.com listing
   */
  private parseApartments(raw: RawListing): ParsedListing | null {
    const data = raw.rawData;
    if (!data.address && !data.price) return null;

    return {
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      sourceId: raw.sourceId,
      address: this.extractString(data.address),
      price: this.extractNumber(data.price),
      bedrooms: this.extractNumber(data.bedrooms),
      bathrooms: this.extractNumber(data.bathrooms),
      squareFeet: this.extractNumber(data.squareFeet),
      description: this.extractString(data.description),
      images: this.extractArray(data.images),
      amenities: this.extractArray(data.amenities),
      petPolicy: this.extractString(data.petPolicy),
      brokerFee: this.extractString(data.brokerFee),
      scrapedAt: raw.scrapedAt,
    };
  }

  /**
   * Parse Craigslist listing
   */
  private parseCraigslist(raw: RawListing): ParsedListing | null {
    const data = raw.rawData;
    if (!data.address && !data.price) return null;

    return {
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      sourceId: raw.sourceId,
      address: this.extractString(data.address),
      price: this.extractNumber(data.price),
      bedrooms: this.extractNumber(data.bedrooms),
      bathrooms: this.extractNumber(data.bathrooms),
      squareFeet: this.extractNumber(data.squareFeet),
      description: this.extractString(data.description),
      images: this.extractArray(data.images),
      amenities: this.extractArray(data.amenities),
      petPolicy: this.extractString(data.petPolicy),
      brokerFee: this.extractString(data.brokerFee),
      scrapedAt: raw.scrapedAt,
    };
  }

  /**
   * Parse Facebook Marketplace listing
   */
  private parseFacebook(raw: RawListing): ParsedListing | null {
    const data = raw.rawData;
    if (!data.address && !data.price) return null;

    return {
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      sourceId: raw.sourceId,
      address: this.extractString(data.address),
      price: this.extractNumber(data.price),
      bedrooms: this.extractNumber(data.bedrooms),
      bathrooms: this.extractNumber(data.bathrooms),
      squareFeet: this.extractNumber(data.squareFeet),
      description: this.extractString(data.description),
      images: this.extractArray(data.images),
      amenities: this.extractArray(data.amenities),
      petPolicy: this.extractString(data.petPolicy),
      brokerFee: this.extractString(data.brokerFee),
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
    return isNaN(num) ? null : num;
  }

  /**
   * Extract array value or return empty array
   */
  private extractArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter(v => v !== null && v !== undefined).map(v => String(v));
  }
}
