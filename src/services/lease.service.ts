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

export interface LeaseAnalysis {
  summary: string;
  redFlags: string[];
  keyTerms: {
    rent?: string;
    deposit?: string;
    term?: string;
    fees?: string;
  };
}

export class LeaseService {
  /**
   * Analyze lease text and extract key information
   * Note: In production, you'd use Reducto API to parse PDF first
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
   * Parse PDF lease using Reducto (placeholder - implement when Reducto API key is available)
   */
  static async parseLeasePDF(pdfBuffer: Buffer): Promise<string> {
    // TODO: Implement Reducto API integration
    // For now, return placeholder
    throw new Error('PDF parsing not yet implemented. Please provide lease text directly.');
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
