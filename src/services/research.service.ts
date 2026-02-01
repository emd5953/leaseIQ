import OpenAI from 'openai';
import { config } from '../config';
import { EmailService } from './email.service';

const openai = new OpenAI({
  baseURL: config.openrouter.baseUrl,
  apiKey: config.openrouter.apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://leaseiq.app',
    'X-Title': 'LeaseIQ',
  },
});

export interface NeighborhoodInfo {
  crimeLevel?: string;
  crimeDetails?: string;
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
  nearbyAmenities?: string[];
  dining?: string[];
  nightlife?: string;
  culture?: string[];
  parks?: string[];
  groceryStores?: string[];
  vibe?: string;
  demographics?: string;
}

export interface ResearchResult {
  neighborhood?: NeighborhoodInfo;
  summary: string;
  tips?: string[];
  resourceLinks?: { name: string; url: string }[];
}

export class ResearchService {
  static async researchListing(listing: any): Promise<ResearchResult> {
    const addrObj = listing.addressDetails || listing.address;
    const street = typeof addrObj === 'string' ? addrObj : (addrObj?.street || '');
    const city = typeof addrObj === 'string' ? 'New York' : (addrObj?.city || 'New York');
    const state = typeof addrObj === 'string' ? 'NY' : (addrObj?.state || 'NY');
    const zipCode = typeof addrObj === 'string' ? '' : (addrObj?.zipCode || '');
    const neighborhood = listing.neighborhood || addrObj?.neighborhood || '';
    
    const address = typeof listing.address === 'string' && listing.address.length > 5
      ? listing.address
      : `${street}, ${city}, ${state} ${zipCode}`.trim();
    
    console.log(`Researching listing at: ${address}`);
    
    try {
      const research = await this.generateAIResearch(listing, address, city, neighborhood);
      return research;
    } catch (error) {
      console.error('Research error:', error);
      return this.getFallbackResearch(address, city);
    }
  }

  static async sendResearchReport(
    userEmail: string, listing: any, research: ResearchResult
  ): Promise<{ success: boolean; error?: string }> {
    return EmailService.sendResearchReport(userEmail, listing, research);
  }

  private static getResourceLinks(address: string, city: string): { name: string; url: string }[] {
    const isNYC = city.toLowerCase().includes('new york') || city.toLowerCase() === 'nyc' ||
      ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'].some(b => city.toLowerCase().includes(b));
    
    const encodedAddress = encodeURIComponent(address);
    const encodedCity = encodeURIComponent(city);
    
    if (isNYC) {
      return [
        { name: 'NYC HPD Building Lookup', url: 'https://hpdonline.nyc.gov/hpdonline/building/search' },
        { name: 'NYC DOB Building Info', url: 'https://a810-bisweb.nyc.gov/bisweb/bispi00.jsp' },
        { name: 'Who Owns What (JustFix)', url: 'https://whoownswhat.justfix.org' },
        { name: 'NYC Crime Map', url: 'https://maps.nyc.gov/crime/' },
        { name: 'NYC 311 Complaints', url: 'https://portal.311.nyc.gov' },
      ];
    }
    
    return [
      { name: 'Building Permits Search', url: `https://www.google.com/search?q=${encodedCity}+building+permits+lookup` },
      { name: 'Crime Statistics', url: `https://www.neighborhoodscout.com/search?q=${encodedAddress}` },
      { name: 'Walk Score', url: `https://www.walkscore.com/score/${encodedAddress}` },
      { name: 'Tenant Rights', url: `https://www.google.com/search?q=${encodedCity}+tenant+rights+laws` },
    ];
  }


  private static async generateAIResearch(
    listing: any,
    address: string,
    city: string,
    neighborhood: string
  ): Promise<ResearchResult> {
    const prompt = `You are a real estate research assistant with deep knowledge of ${city} neighborhoods.

LISTING DETAILS:
- Address: ${address}
- City: ${city}
- Neighborhood: ${neighborhood || 'Not specified'}
- Price: $${listing.price}/month
- Bedrooms: ${listing.bedrooms === 0 ? 'Studio' : listing.bedrooms}
- Bathrooms: ${listing.bathrooms}
- Square Feet: ${listing.squareFeet || 'Not specified'}

Provide a JSON response:

{
  "summary": "5-7 sentence assessment including price fairness, ideal renter type, pros/cons, recommendation.",
  "neighborhood": {
    "vibe": "2-3 sentence description of neighborhood character",
    "crimeLevel": "low/medium/high",
    "crimeDetails": "Safety info and tips",
    "walkScore": 0-100,
    "transitScore": 0-100,
    "bikeScore": 0-100,
    "demographics": "Who lives here",
    "culture": ["cultural attractions"],
    "dining": ["restaurants and food scene"],
    "nightlife": "Bar and club scene description",
    "parks": ["nearby parks"],
    "groceryStores": ["grocery options"],
    "nearbyAmenities": ["gyms", "pharmacies", "etc"]
  },
  "tips": ["7-10 specific tips for renting here"]
}

Be specific with real names of places. Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';
    const resourceLinks = this.getResourceLinks(address, city);
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Research completed.',
          neighborhood: parsed.neighborhood,
          tips: parsed.tips,
          resourceLinks,
        };
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }

    return this.getFallbackResearch(address, city);
  }

  private static getFallbackResearch(address: string, city: string): ResearchResult {
    return {
      summary: `Research for ${address}. Check the resource links below to verify building history and violations.`,
      tips: [
        'Ask the landlord for references from current tenants',
        'Request to see the actual unit, not just a model',
        'Check for signs of pests, water damage, or mold',
        'Verify all appliances work before signing',
        'Ask about lease renewal and typical rent increases',
        'Get everything in writing',
        'Take photos of the unit condition before moving in',
      ],
      resourceLinks: this.getResourceLinks(address, city),
    };
  }
}
