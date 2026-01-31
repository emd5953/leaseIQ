import FirecrawlApp from '@mendable/firecrawl-js';
import { config } from '../config';

export interface FirecrawlScrapeOptions {
  url: string;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'extract')[];
  jsonOptions?: {
    schema: any;
  };
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface FirecrawlBatchScrapeOptions {
  urls: string[];
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'extract')[];
  jsonOptions?: {
    schema: any;
  };
}

/**
 * Wrapper around the Firecrawl API client
 * Handles authentication, request formatting, and error handling
 */
export class FirecrawlClient {
  private client: FirecrawlApp;

  constructor(apiKey?: string) {
    const key = apiKey || config.firecrawl.apiKey;
    if (!key) {
      throw new Error('Firecrawl API key is required');
    }
    this.client = new FirecrawlApp({ apiKey: key });
  }

  /**
   * Scrape a single URL with JSON extraction
   */
  async scrape(options: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResult> {
    try {
      const scrapeOptions: any = {
        formats: options.formats || ['extract'],
      };

      if (options.jsonOptions) {
        scrapeOptions.extract = {
          schema: options.jsonOptions.schema,
        };
      }

      const response = await this.client.scrape(options.url, scrapeOptions);

      // Check if response has the expected structure
      if (!response || typeof response !== 'object') {
        return {
          success: false,
          error: 'Invalid response from Firecrawl',
        };
      }

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Scrape multiple URLs in batch
   */
  async batchScrape(options: FirecrawlBatchScrapeOptions): Promise<FirecrawlScrapeResult[]> {
    const results: FirecrawlScrapeResult[] = [];

    for (const url of options.urls) {
      const result = await this.scrape({
        url,
        formats: options.formats,
        jsonOptions: options.jsonOptions,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!config.firecrawl.apiKey;
  }
}
