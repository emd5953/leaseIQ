import OpenAI from 'openai';
import { config } from '../config';
import { EmailService } from './email.service';
import { ReductoService } from './reducto.service';

const openai = new OpenAI({
  baseURL: config.openrouter.baseUrl,
  apiKey: config.openrouter.apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://leaseiq.app',
    'X-Title': 'LeaseIQ',
  },
});

export interface LeaseAnalysis {
  summary: string;
  redFlags: string[];
  keyTerms: {
    rent?: string;
    deposit?: string;
    term?: string;
    fees?: string;
  };
  fullText?: string;
}

export class LeaseService {
  /**
   * Analyze lease text and extract key information
   */
  static async analyzeLease(leaseText: string): Promise<LeaseAnalysis> {
    try {
      const prompt = `You are a lease analysis expert. Analyze the following lease agreement and provide:

1. A brief summary (2-3 sentences)
2. List of red flags or concerning clauses
3. Key terms (rent, deposit, lease term, fees)

Lease text:
${leaseText.substring(0, 4000)} // Limit to avoid token limits

Respond in JSON format:
{
  "summary": "...",
  "redFlags": ["...", "..."],
  "keyTerms": {
    "rent": "...",
    "deposit": "...",
    "term": "...",
    "fees": "..."
  }
}`;

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const analysis = JSON.parse(content);
      return {
        summary: analysis.summary || 'Unable to generate summary.',
        redFlags: analysis.redFlags || [],
        keyTerms: analysis.keyTerms || {},
      };
    } catch (error) {
      console.error('Lease analysis error:', error);
      return {
        summary: 'Unable to analyze lease at this time.',
        redFlags: [],
        keyTerms: {},
      };
    }
  }

  /**
   * Parse PDF lease using Reducto API
   */
  static async parseLeasePDF(pdfBuffer: Buffer, fileName?: string): Promise<string> {
    try {
      const reducto = new ReductoService();
      
      if (!reducto.isConfigured()) {
        throw new Error('Reducto API key not configured');
      }

      const result = await reducto.parseLeasePDF({
        file: pdfBuffer,
        fileName: fileName || 'lease.pdf',
      });

      if (!result.success || !result.text) {
        throw new Error(result.error || 'Failed to parse PDF');
      }

      return result.text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to parse PDF. Please try again or provide lease text directly.'
      );
    }
  }

  /**
   * Parse PDF lease from URL using Reducto API
   */
  static async parseLeasePDFFromURL(url: string): Promise<string> {
    try {
      const reducto = new ReductoService();
      
      if (!reducto.isConfigured()) {
        throw new Error('Reducto API key not configured');
      }

      const result = await reducto.parseLeasePDF({ url });

      if (!result.success || !result.text) {
        throw new Error(result.error || 'Failed to parse PDF');
      }

      return result.text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to parse PDF from URL. Please try again.'
      );
    }
  }

  /**
   * Complete workflow: Parse PDF and analyze lease
   */
  static async analyzeLeasePDF(
    pdfBuffer: Buffer,
    fileName?: string
  ): Promise<LeaseAnalysis> {
    const leaseText = await this.parseLeasePDF(pdfBuffer, fileName);
    const analysis = await this.analyzeLease(leaseText);
    return {
      ...analysis,
      fullText: leaseText,
    };
  }

  /**
   * Complete workflow: Parse PDF from URL and analyze lease
   */
  static async analyzeLeasePDFFromURL(url: string): Promise<LeaseAnalysis> {
    const leaseText = await this.parseLeasePDFFromURL(url);
    const analysis = await this.analyzeLease(leaseText);
    return {
      ...analysis,
      fullText: leaseText,
    };
  }

  /**
   * Send lease analysis via email
   */
  static async sendLeaseAnalysis(
    userEmail: string,
    analysis: LeaseAnalysis
  ): Promise<{ success: boolean; error?: string }> {
    return EmailService.sendLeaseAnalysis(userEmail, analysis);
  }
}
