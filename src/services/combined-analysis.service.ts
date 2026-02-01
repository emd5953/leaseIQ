import { LeaseService } from './lease.service';
import { FloorPlanService, FloorPlanAnalysis } from './floorplan.service';
import { EmailService } from './email.service';
import { LeaseAnalysis } from './lease.service';

export interface CombinedAnalysisInput {
  leasePDF?: {
    buffer: Buffer;
    fileName: string;
  };
  floorPlanImage?: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  };
  userEmail?: string;
  sendEmail?: boolean;
}

export interface CombinedAnalysisResult {
  lease?: LeaseAnalysis;
  floorPlan?: FloorPlanAnalysis;
  overallAssessment: {
    summary: string;
    matchScore: number; // 0-100
    recommendations: string[];
    concerns: string[];
  };
  emailSent: boolean;
}

/**
 * Combined Analysis Service
 * Analyzes both lease documents and floor plans together
 */
export class CombinedAnalysisService {
  /**
   * Analyze lease and floor plan together
   */
  static async analyzeCombined(input: CombinedAnalysisInput): Promise<CombinedAnalysisResult> {
    const result: CombinedAnalysisResult = {
      overallAssessment: {
        summary: '',
        matchScore: 0,
        recommendations: [],
        concerns: [],
      },
      emailSent: false,
    };

    try {
      // Analyze lease if provided
      if (input.leasePDF) {
        console.log('Analyzing lease PDF...');
        result.lease = await LeaseService.analyzeLeasePDF(
          input.leasePDF.buffer,
          input.leasePDF.fileName
        );
      }

      // Analyze floor plan if provided
      if (input.floorPlanImage) {
        console.log('Analyzing floor plan...');
        result.floorPlan = await FloorPlanService.analyzeFloorPlan(
          input.floorPlanImage.buffer,
          input.floorPlanImage.mimeType
        );
      }

      // Generate overall assessment
      result.overallAssessment = this.generateOverallAssessment(
        result.lease,
        result.floorPlan
      );

      // Send email if requested
      if (input.sendEmail && input.userEmail) {
        console.log('Sending combined analysis email...');
        const emailResult = await EmailService.sendCombinedAnalysis(
          input.userEmail,
          result
        );
        result.emailSent = emailResult.success;
      }

      return result;
    } catch (error) {
      console.error('Combined analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate overall assessment combining lease and floor plan analysis
   */
  private static generateOverallAssessment(
    lease?: LeaseAnalysis,
    floorPlan?: FloorPlanAnalysis
  ): CombinedAnalysisResult['overallAssessment'] {
    const recommendations: string[] = [];
    const concerns: string[] = [];
    let matchScore = 50; // Base score

    // Analyze lease
    if (lease) {
      // Add lease red flags as concerns (extract titles from red flag objects)
      const redFlagConcerns = lease.redFlags.map(flag => 
        typeof flag === 'string' ? flag : `${flag.title}: ${flag.description}`
      );
      concerns.push(...redFlagConcerns);

      // Adjust score based on red flags
      matchScore -= lease.redFlags.length * 5;
    }

    // Analyze floor plan
    if (floorPlan) {
      // Add floor plan cons as concerns
      concerns.push(...floorPlan.cons);

      // Add floor plan recommendations
      recommendations.push(...floorPlan.recommendations);

      // Adjust score based on space efficiency
      const efficiencyScores = {
        Excellent: 20,
        Good: 10,
        Fair: 0,
        Poor: -10,
      };
      matchScore += efficiencyScores[floorPlan.spaceEfficiency] || 0;
    }

    // Generate combined recommendations
    if (lease && floorPlan) {
      // Cross-reference lease terms with floor plan
      const bedroomCount = floorPlan.layout.bedrooms;
      if (bedroomCount >= 2) {
        recommendations.push('Consider roommate to split costs mentioned in lease');
      }

      if (floorPlan.features.includes('balcony') || floorPlan.features.includes('patio')) {
        recommendations.push('Verify outdoor space maintenance responsibilities in lease');
      }

      if (floorPlan.layout.estimatedSquareFeet) {
        const sqft = floorPlan.layout.estimatedSquareFeet;
        const rent = this.extractRentAmount(lease.keyTerms.monthlyRent);
        if (rent && sqft) {
          const pricePerSqft = rent / sqft;
          if (pricePerSqft > 4) {
            concerns.push(`High price per sq ft: $${pricePerSqft.toFixed(2)}/sqft`);
          } else {
            recommendations.push(`Good value: $${pricePerSqft.toFixed(2)}/sqft`);
          }
        }
      }
    }

    // Ensure score is within bounds
    matchScore = Math.max(0, Math.min(100, matchScore));

    // Generate summary
    const summary = this.generateSummary(lease, floorPlan, matchScore);

    return {
      summary,
      matchScore,
      recommendations: recommendations.slice(0, 5), // Top 5
      concerns: concerns.slice(0, 5), // Top 5
    };
  }

  /**
   * Generate overall summary
   */
  private static generateSummary(
    lease?: LeaseAnalysis,
    floorPlan?: FloorPlanAnalysis,
    matchScore?: number
  ): string {
    const parts: string[] = [];

    if (lease && floorPlan) {
      parts.push(
        `This ${floorPlan.layout.bedrooms}BR/${floorPlan.layout.bathrooms}BA unit with ${floorPlan.spaceEfficiency.toLowerCase()} space efficiency has a match score of ${matchScore}/100.`
      );
      
      if (lease.redFlags.length > 0) {
        parts.push(`The lease has ${lease.redFlags.length} red flag(s) to review.`);
      } else {
        parts.push('The lease terms appear standard with no major concerns.');
      }

      if (floorPlan.pros.length > 0) {
        parts.push(`The floor plan offers ${floorPlan.pros.length} notable advantage(s).`);
      }
    } else if (lease) {
      parts.push(lease.summary);
    } else if (floorPlan) {
      parts.push(floorPlan.summary);
    } else {
      parts.push('No analysis data available.');
    }

    return parts.join(' ');
  }

  /**
   * Extract rent amount from string
   */
  private static extractRentAmount(rentString?: string): number | null {
    if (!rentString) return null;
    const match = rentString.match(/\$?([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''));
    }
    return null;
  }
}
