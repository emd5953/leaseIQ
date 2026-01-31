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

export interface ResearchResult {
  landlordReviews?: string;
  violations?: string;
  summary: string;
}

export class ResearchService {
  /**
   * Research a listing's landlord and building
   */
  static async researchListing(listing: any): Promise<ResearchResult> {
    const address = `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`;
    
    try {
      // Scrape landlord reviews and building violations in parallel
      const [landlordData, violationsData] = await Promise.all([
        this.scrapeLandlordReviews(address, listing.landlord),
        this.scrapeViolations(address),
      ]);

      // Generate AI summary
      const summary = await this.generateSummary(landlordData, violationsData, address);

      return {
        landlordReviews: landlordData,
        violations: violationsData,
        summary,
      };
    } catch (error) {
      console.error('Research error:', error);
      return {
        summary: 'Unable to complete research at this time. Please try again later.',
      };
    }
  }

  /**
   * Send research report via email
   */
  static async sendResearchReport(
    userEmail: string,
    listing: any,
    research: ResearchResult
  ): Promise<{ success: boolean; error?: string }> {
    return EmailService.sendResearchReport(userEmail, listing, research);
  }

  private static async scrapeLandlordReviews(address: string, landlord?: string): Promise<string | undefined> {
    try {
      // Search for landlord reviews on Google
      const searchQuery = landlord
        ? `${landlord} landlord reviews NYC`
        : `${address} landlord reviews`;

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const result = await firecrawl.scrape(searchUrl, {
        formats: ['markdown'],
      });

      if (result.success && result.markdown) {
        // Extract relevant review snippets (first 500 chars)
        const reviews = result.markdown.substring(0, 500);
        return reviews || 'No landlord reviews found.';
      }

      return 'No landlord reviews found.';
    } catch (error) {
      console.error('Error scraping landlord reviews:', error);
      return undefined;
    }
  }

  private static async scrapeViolations(address: string): Promise<string | undefined> {
    try {
      // NYC DOB violations lookup
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(address + ' NYC building violations DOB')}`;
      
      const result = await firecrawl.scrape(searchUrl, {
        formats: ['markdown'],
      });

      if (result.success && result.markdown) {
        const violations = result.markdown.substring(0, 500);
        return violations || 'No violations found.';
      }

      return 'No violations found.';
    } catch (error) {
      console.error('Error scraping violations:', error);
      return undefined;
    }
  }

  private static async generateSummary(
    landlordData?: string,
    violationsData?: string,
    address?: string
  ): Promise<string> {
    try {
      const prompt = `You are a real estate research assistant. Analyze the following information about a rental property and provide a concise summary (2-3 sentences) highlighting key concerns or positive points.

Address: ${address}

Landlord Reviews:
${landlordData || 'No data available'}

Building Violations:
${violationsData || 'No data available'}

Provide a brief, actionable summary for a potential renter.`;

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      });

      return completion.choices[0]?.message?.content || 'Unable to generate summary.';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Research data collected. Please review the details above.';
    }
  }
}
