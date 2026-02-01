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
  overallRating: 'favorable' | 'neutral' | 'concerning';
  redFlags: Array<{
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  keyTerms: {
    monthlyRent?: string;
    securityDeposit?: string;
    leaseTerm?: string;
    moveInDate?: string;
    moveOutDate?: string;
    lateFee?: string;
    lateFeeGracePeriod?: string;
    petPolicy?: string;
    petDeposit?: string;
    utilities?: string;
    parking?: string;
    maintenanceResponsibility?: string;
  };
  importantDates: Array<{
    date: string;
    description: string;
  }>;
  financialSummary: {
    totalMoveInCost?: string;
    monthlyTotal?: string;
    annualCost?: string;
  };
  tenantRights: string[];
  landlordObligations: string[];
  terminationClauses: string[];
  recommendations: string[];
  fullText?: string;
}

export class LeaseService {
  /**
   * Analyze lease text and extract key information
   */
  static async analyzeLease(leaseText: string): Promise<LeaseAnalysis> {
    try {
      // Log text length for debugging
      console.log(`[LeaseService] Analyzing lease text, length: ${leaseText.length} chars`);
      
      // Use more text for better analysis (up to 15k chars)
      const textToAnalyze = leaseText.substring(0, 15000);
      
      const prompt = `Analyze this Pennsylvania apartment lease and extract ALL information into JSON.

LEASE TEXT:
${textToAnalyze}

Return this exact JSON structure with ALL fields filled in based on the lease:

{
  "summary": "Brief 2-3 sentence summary of this specific lease including tenant name, property, rent amount, and term",
  "overallRating": "neutral",
  "redFlags": [
    {"title": "Double Rent Penalty", "description": "Tenant must pay double rent if staying past lease end - this is aggressive", "severity": "high"},
    {"title": "Example issue 2", "description": "Why concerning", "severity": "medium"}
  ],
  "keyTerms": {
    "monthlyRent": "Extract the monthly rent amount",
    "securityDeposit": "Extract security deposit amount",
    "leaseTerm": "Extract lease duration",
    "moveInDate": "Extract start date",
    "moveOutDate": "Extract end date", 
    "lateFee": "Extract late fee amount and grace period",
    "lateFeeGracePeriod": "Extract grace period days",
    "petPolicy": "Extract pet policy",
    "petDeposit": "Extract pet deposit if any",
    "utilities": "Extract what utilities tenant pays",
    "parking": "Extract parking info",
    "maintenanceResponsibility": "Extract maintenance responsibilities"
  },
  "importantDates": [
    {"date": "Lease start date", "description": "Lease begins"},
    {"date": "Lease end date", "description": "Lease ends"}
  ],
  "financialSummary": {
    "totalMoveInCost": "First month rent + security deposit + any fees",
    "monthlyTotal": "Monthly rent amount",
    "annualCost": "Monthly rent x 12"
  },
  "tenantRights": [
    "Right to habitable premises",
    "Right to security deposit return within legal timeframe",
    "Right to proper notice before entry"
  ],
  "landlordObligations": [
    "Must maintain habitable conditions",
    "Must return security deposit per PA law",
    "Must provide proper notices"
  ],
  "terminationClauses": [
    "Extract early termination terms",
    "Extract notice requirements",
    "Extract penalties for breaking lease"
  ],
  "recommendations": [
    "Specific advice based on this lease",
    "Things to negotiate or clarify",
    "Items to document before move-in"
  ]
}

IMPORTANT: Fill in EVERY field with actual data from the lease. Use "Not specified" only if truly not in the document.`;

      console.log(`[LeaseService] Calling OpenRouter API...`);
      
      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a lease analysis expert. Always respond with valid JSON containing all requested fields. Extract specific details from the lease text provided.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.2,
      });

      const content = completion.choices[0]?.message?.content;
      console.log(`[LeaseService] AI response received, length: ${content?.length || 0} chars`);
      
      if (!content) {
        throw new Error('No response from AI');
      }

      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const analysis = JSON.parse(jsonStr.trim());
      
      // Log what we got back
      console.log(`[LeaseService] Parsed analysis:`, {
        summary: analysis.summary?.substring(0, 100),
        redFlagsCount: analysis.redFlags?.length || 0,
        keyTermsCount: Object.keys(analysis.keyTerms || {}).filter(k => analysis.keyTerms[k] && analysis.keyTerms[k] !== 'Not specified').length,
        recommendationsCount: analysis.recommendations?.length || 0,
      });
      
      return {
        summary: analysis.summary || 'Unable to generate summary.',
        overallRating: analysis.overallRating || 'neutral',
        redFlags: Array.isArray(analysis.redFlags) ? analysis.redFlags : [],
        keyTerms: analysis.keyTerms || {},
        importantDates: Array.isArray(analysis.importantDates) ? analysis.importantDates : [],
        financialSummary: analysis.financialSummary || {},
        tenantRights: Array.isArray(analysis.tenantRights) ? analysis.tenantRights : [],
        landlordObligations: Array.isArray(analysis.landlordObligations) ? analysis.landlordObligations : [],
        terminationClauses: Array.isArray(analysis.terminationClauses) ? analysis.terminationClauses : [],
        recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      };
    } catch (error) {
      console.error('[LeaseService] Analysis error:', error);
      // Return a more helpful error state
      return {
        summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. The lease text was extracted successfully (${leaseText.length} chars).`,
        overallRating: 'neutral',
        redFlags: [],
        keyTerms: {},
        importantDates: [],
        financialSummary: {},
        tenantRights: [],
        landlordObligations: [],
        terminationClauses: [],
        recommendations: ['Please try again or check your OpenRouter API key configuration.'],
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

      console.log(`[LeaseService] Parsing PDF: ${fileName}, size: ${pdfBuffer.length} bytes`);

      const result = await reducto.parseLeasePDF({
        file: pdfBuffer,
        fileName: fileName || 'lease.pdf',
      });

      if (!result.success || !result.text) {
        console.error('[LeaseService] PDF parse failed:', result.error);
        throw new Error(result.error || 'Failed to parse PDF');
      }

      console.log(`[LeaseService] PDF parsed successfully, extracted ${result.text.length} chars`);
      
      // Log first 500 chars to verify content
      console.log(`[LeaseService] Text preview: ${result.text.substring(0, 500)}...`);

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
