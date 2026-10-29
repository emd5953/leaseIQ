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
  private apiUrl: string = 'https://platform.reducto.ai';

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
    // First upload the file
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const name = (fileName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

    // Build multipart form data for upload
    const parts: Buffer[] = [];
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${name}"\r\n` +
          `Content-Type: application/pdf\r\n\r\n`,
      ),
    );
    parts.push(buffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const payload = Buffer.concat(parts);

    // Upload file first
    const uploadResponse = await this.makeRequest('/upload', payload, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    });

    if (!uploadResponse || !uploadResponse.file_id) {
      return {
        success: false,
        error: uploadResponse?.error || 'Failed to upload file',
      };
    }

    // Then parse the uploaded file
    const parsePayload = JSON.stringify({
      document_url: uploadResponse.file_id,
    });

    const response = await this.makeRequest('/parse', parsePayload, {
      'Content-Type': 'application/json',
    });

    return this.formatResponse(response);
  }

  /**
   * Parse PDF from URL
   */
  private async parseFromURL(url: string): Promise<ReductoParseResult> {
    const payload = JSON.stringify({ document_url: url });

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
        error: response?.error || response?.detail || 'Failed to parse document',
      };
    }

    // Handle the new API response format
    const result = response.result || response;
    const chunks = result.chunks || [];

    // Extract text content from chunks
    const text = chunks.map((chunk: any) => chunk.content || chunk.text || '').join('\n\n');
    const markdown = result.markdown || text;

    return {
      success: true,
      text,
      markdown,
      chunks: chunks.map((chunk: any) => ({
        content: chunk.content || chunk.text || '',
        page: chunk.blocks?.[0]?.bbox?.page,
        type: chunk.blocks?.[0]?.type,
      })),
      metadata: {
        pages: response.usage?.num_pages || chunks.length,
        title: result.title,
        author: result.author,
      },
    };
  }

  /**
   * Make HTTP request to Reducto API
   */
  private makeRequest(
    endpoint: string,
    data: Buffer | string,
    additionalHeaders: Record<string, string> = {},
  ): Promise<any> {
    return (async () => {
      const response = await fetch(this.apiUrl + endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(45000),
        headers: { Authorization: `Bearer ${this.apiKey}`, ...additionalHeaders },
        body: data as any,
      });
      if (!response.ok || !response.body) throw new Error('Document extraction service failed.');
      const reader = response.body.getReader();
      let size = 0;
      const chunks: Buffer[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 8 * 1024 * 1024) throw new Error('Extracted document exceeds size limit.');
          chunks.push(Buffer.from(value));
        }
      } finally {
        await reader.cancel();
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    })();
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
