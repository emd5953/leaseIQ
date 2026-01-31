import https from 'https';
import { config } from '../config';

export interface ReductoParseOptions {
  file?: Buffer;
  url?: string;
  fileName?: string;
}

export interface ReductoParseResult {
  success: boolean;
  text?: string;
  markdown?: string;
  chunks?: Array<{
    content: string;
    page?: number;
    type?: string;
  }>;
  metadata?: {
    pages?: number;
    title?: string;
    author?: string;
  };
  error?: string;
}

/**
 * Reducto API Client for PDF and document parsing
 * Converts PDFs to structured text/markdown for AI analysis
 */
export class ReductoService {
  private apiKey: string;
  private apiUrl: string = 'https://api.reducto.ai/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.reducto.apiKey;
    
    if (!this.apiKey) {
      throw new Error('Reducto API key is required');
    }
  }

  /**
   * Parse a PDF from a buffer or URL
   */
  async parsePDF(options: ReductoParseOptions): Promise<ReductoParseResult> {
    try {
      if (options.file) {
        return await this.parseFromBuffer(options.file, options.fileName);
      } else if (options.url) {
        return await this.parseFromURL(options.url);
      } else {
        throw new Error('Either file buffer or URL must be provided');
      }
    } catch (error) {
      console.error('[ReductoService] Parse error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse PDF from buffer (uploaded file)
   */
  private async parseFromBuffer(buffer: Buffer, fileName?: string): Promise<ReductoParseResult> {
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const name = fileName || 'document.pdf';
    
    // Build multipart form data
    const parts: Buffer[] = [];
    
    // Add file part
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${name}"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
    ));
    parts.push(buffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    
    const payload = Buffer.concat(parts);

    const response = await this.makeRequest('/parse', payload, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    });

    return this.formatResponse(response);
  }

  /**
   * Parse PDF from URL
   */
  private async parseFromURL(url: string): Promise<ReductoParseResult> {
    const payload = JSON.stringify({ url });

    const response = await this.makeRequest('/parse', payload, {
      'Content-Type': 'application/json',
    });

    return this.formatResponse(response);
  }

  /**
   * Format Reducto API response
   */
  private formatResponse(response: any): ReductoParseResult {
    if (!response || response.error) {
      return {
        success: false,
        error: response?.error || 'Failed to parse document',
      };
    }

    // Extract text content from chunks
    const chunks = response.chunks || [];
    const text = chunks.map((chunk: any) => chunk.content || chunk.text || '').join('\n\n');
    const markdown = response.markdown || text;

    return {
      success: true,
      text,
      markdown,
      chunks: chunks.map((chunk: any) => ({
        content: chunk.content || chunk.text || '',
        page: chunk.page,
        type: chunk.type,
      })),
      metadata: {
        pages: response.pages || chunks.length,
        title: response.title,
        author: response.author,
      },
    };
  }

  /**
   * Make HTTP request to Reducto API
   */
  private makeRequest(
    endpoint: string,
    data: Buffer | string,
    additionalHeaders: Record<string, string> = {}
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.apiUrl + endpoint);
      const payload = typeof data === 'string' ? Buffer.from(data) : data;

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': payload.length,
          ...additionalHeaders,
        },
        timeout: 120000, // 2 minutes for large PDFs
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            resolve(result);
          } catch (e) {
            // If not JSON, return as text
            resolve({ text: body });
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
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Parse lease PDF specifically (optimized for lease documents)
   */
  async parseLeasePDF(options: ReductoParseOptions): Promise<ReductoParseResult> {
    const result = await this.parsePDF(options);
    
    if (result.success && result.text) {
      // Clean up common lease document artifacts
      result.text = this.cleanLeaseText(result.text);
    }
    
    return result;
  }

  /**
   * Clean up lease text for better AI analysis
   */
  private cleanLeaseText(text: string): string {
    return text
      .replace(/\[Page \d+\]/g, '') // Remove page markers
      .replace(/_{3,}/g, '') // Remove underscores
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }
}
