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
}
