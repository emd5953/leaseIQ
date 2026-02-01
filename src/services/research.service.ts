import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';
import { config } from '../config';
import { EmailService } from './email.service';

const firecrawl = new FirecrawlApp({ apiKey: config.firecrawl.apiKey });
const openai = new OpenAI({
  baseURL: config.openrouter.baseUrl,
  apiKey: config.openrouter.apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://leaseiq.app',
    'X-Title': 'LeaseIQ',
  },
});

export interface LandlordReview {
  source: string;
  rating?: number;
  comment: string;
  date?: string;
}

export interface BuildingViolation {
  type: string;
  description: string;
  date?: string;
  status?: string;
}

export interface NeighborhoodInfo {
  crimeLevel?: string;
  walkScore?: number;
  transitScore?: number;
  nearbyAmenities?: string[];
}

export interface ResearchResult {
  landlordReviews?: LandlordReview[];
  violations?: BuildingViolation[];
  neighborhood?: NeighborhoodInfo;
  rawData?: {
    landlord?: string;
    violations?: string;
    neighborhood?: string;
  };
  summary: string;
}

export class ResearchService {
  static async researchListing(listing: any): Promise<ResearchResult> {
    const street = listing.address?.street || listing.address;
    const city = listing.address?.city || 'New York';
    const state = listing.address?.state || 'NY';
    const zipCode = listing.address?.zipCode || '';
    const address = `${street}, ${city}, ${state} ${zipCode}`.trim();
    
    console.log(`Researching listing at: ${address}`);
    
    try {
      const [landlordData, violationsData, neighborhoodData] = await Promise.all([
        this.scrapeLandlordReviews(address, listing.landlord, city),
        this.scrapeViolations(address, city),
        this.scrapeNeighborhood(address, city),
      ]);

      const parsedData = await this.parseResearchData(
        landlordData, violationsData, neighborhoodData, address
      );
      const summary = await this.generateSummary(parsedData, address);

      return {
        ...parsedData,
        rawData: { landlord: landlordData, violations: violationsData, neighborhood: neighborhoodData },
        summary,
      };
    } catch (error) {
      console.error('Research error:', error);
      return { summary: 'Unable to complete research. Please try again later.' };
    }
  }

  static async sendResearchReport(
    userEmail: string, listing: any, research: ResearchResult
  ): Promise<{ success: boolean; error?: string }> {
    return EmailService.sendResearchReport(userEmail, listing, research);
  }


  private static async scrapeLandlordReviews(
    address: string, landlord?: string, city?: string
  ): Promise<string> {
    const results: string[] = [];
    const sources = [
      {
        name: 'Apartment Reviews',
        url: `https://www.apartments.com/search/${encodeURIComponent(
          address.replace(/,/g, '').replace(/\s+/g, '-')
        )}/`,
      },
      {
        name: 'Landlord Reviews',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `"${landlord || address}" landlord reviews tenant experience ${city || 'NYC'}`
        )}`,
      },
      {
        name: 'Building Reviews',
        url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(
          address
        )}&find_loc=${encodeURIComponent(city || 'New York, NY')}`,
      },
    ];

    for (const source of sources) {
      try {
        console.log(`Scraping ${source.name}`);
        const result = await firecrawl.scrapeUrl(source.url, {
          formats: ['markdown'],
          timeout: 30000,
        }) as any;

        if (result.success && result.markdown && result.markdown.length > 100) {
          results.push(`=== ${source.name} ===\n${result.markdown.substring(0, 2500)}`);
        }
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    }

    return results.length > 0 ? results.join('\n\n') : 'No landlord reviews found.';
  }

  private static async scrapeViolations(address: string, city?: string): Promise<string> {
    const results: string[] = [];
    const isNYC = !city || city.toLowerCase().includes('new york') || city === 'nyc';

    const sources = isNYC ? [
      {
        name: 'NYC Building Violations',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `site:nyc.gov "${address}" building violations OR complaints`
        )}`,
      },
      {
        name: 'NYC HPD Complaints',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `"${address}" HPD complaints housing violations NYC`
        )}`,
      },
      {
        name: 'JustFix Building Info',
        url: `https://whoownswhat.justfix.org/en/address/${encodeURIComponent(
          address.split(',')[0]
        )}/NEW%20YORK/NY`,
      },
    ] : [
      {
        name: 'Building Violations',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `"${address}" building violations code enforcement`
        )}`,
      },
      {
        name: 'Health & Safety',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `"${address}" health department violations`
        )}`,
      },
    ];

    for (const source of sources) {
      try {
        console.log(`Scraping ${source.name}`);
        const result = await firecrawl.scrapeUrl(source.url, {
          formats: ['markdown'],
          timeout: 30000,
        }) as any;

        if (result.success && result.markdown && result.markdown.length > 100) {
          results.push(`=== ${source.name} ===\n${result.markdown.substring(0, 2500)}`);
        }
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    }

    return results.length > 0 ? results.join('\n\n') : 'No building violations found.';
  }

  private static async scrapeNeighborhood(address: string, city?: string): Promise<string> {
    const results: string[] = [];
    const sources = [
      {
        name: 'Neighborhood Info',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `${address} neighborhood safety walkability amenities`
        )}`,
      },
      {
        name: 'Area Safety',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `${address} crime statistics safety ${city || ''}`
        )}`,
      },
    ];

    for (const source of sources) {
      try {
        console.log(`Scraping ${source.name}`);
        const result = await firecrawl.scrapeUrl(source.url, {
          formats: ['markdown'],
          timeout: 30000,
        }) as any;

        if (result.success && result.markdown && result.markdown.length > 100) {
          results.push(`=== ${source.name} ===\n${result.markdown.substring(0, 1500)}`);
        }
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    }

    return results.length > 0 ? results.join('\n\n') : 'No neighborhood info found.';
  }


  private static async parseResearchData(
    landlordData: string,
    violationsData: string,
    neighborhoodData: string,
    address: string
  ): Promise<Partial<ResearchResult>> {
    try {
      const prompt = `You are a real estate research analyst. Parse the following raw scraped data and extract structured information.

Address: ${address}

RAW LANDLORD/REVIEW DATA:
${landlordData}

RAW VIOLATIONS DATA:
${violationsData}

RAW NEIGHBORHOOD DATA:
${neighborhoodData}

Extract and return a JSON object with:
1. "landlordReviews": array of {source, rating (1-5 if found), comment (key points)}
2. "violations": array of {type, description, status}
3. "neighborhood": {crimeLevel (low/medium/high), walkScore, transitScore, nearbyAmenities array}

Only include data you can actually extract. If data is not available, omit that field.
Return ONLY valid JSON, no explanation.`;

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          console.error('Failed to parse AI response as JSON');
        }
      }
    } catch (error) {
      console.error('Error parsing research data:', error);
    }
    return {};
  }

  private static async generateSummary(
    parsedData: Partial<ResearchResult>,
    address: string
  ): Promise<string> {
    try {
      const reviewCount = parsedData.landlordReviews?.length || 0;
      const violationCount = parsedData.violations?.length || 0;

      const prompt = `You are a helpful real estate advisor. Based on the research data below, provide a clear, actionable summary (4-6 sentences) for someone considering renting this property.

Address: ${address}

Landlord Reviews (${reviewCount} found):
${JSON.stringify(parsedData.landlordReviews || [], null, 2)}

Building Violations (${violationCount} found):
${JSON.stringify(parsedData.violations || [], null, 2)}

Neighborhood Info:
${JSON.stringify(parsedData.neighborhood || {}, null, 2)}

Provide:
1. Overall assessment (positive/neutral/concerning)
2. Key highlights or red flags
3. Specific recommendations for the renter

Be direct and helpful. If data is limited, acknowledge that and suggest what the renter should ask about.`;

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      });

      return completion.choices[0]?.message?.content || 'Unable to generate summary.';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Research data collected. Please review the details above.';
    }
  }
}
