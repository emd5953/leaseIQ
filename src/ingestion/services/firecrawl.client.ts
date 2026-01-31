import https from 'https';
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
 * Wrapper around the Firecrawl API
 * Handles authentication, request formatting, and error handling
 */
export class FirecrawlClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.firecrawl.apiKey;
    this.apiUrl = config.firecrawl.apiUrl || 'https://api.firecrawl.dev/v1';
    
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is required');
    }
  }

  /**
   * Scrape a single URL with JSON extraction
   */
  async scrape(options: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResult> {
    try {
      const payload: any = {
        url: options.url,
        formats: ['extract'],
      };

      // Add extraction schema if provided
      if (options.jsonOptions) {
        payload.extract = {
          schema: options.jsonOptions.schema,
        };
      }

      const response = await this.makeRequest('/scrape', payload);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.extract || response.data,
        };
      }

      return {
        success: false,
        error: 'Failed to scrape',
      };
    } catch (error) {
      console.error('[FirecrawlClient] Scrape error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make HTTP request to Firecrawl API
   */
  private makeRequest(endpoint: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const url = new URL(this.apiUrl + endpoint);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 60000,
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            resolve(result);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${body.substring(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(payload);
      req.end();
    });
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
    return !!this.apiKey;
  }
}
