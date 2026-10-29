import multer from 'multer';
import { Response } from 'express';
import { AuthRequest } from './auth';
import { imageMime } from '../../utils/safe-image';
import { LeaseService } from '../../services/lease.service';
import { FloorPlanService } from '../../services/floorplan.service';
import { EmailService } from '../../services/email.service';
import { config } from '../../config';
import { analysisReceipt, analysisDigest } from '../../services/analysis-receipt';

export const analysisUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 2, fields: 4, fieldSize: 1000 },
});
export const serviceStatus = () => ({
  leaseAnalysis: !!(config.reducto.apiKey && config.openrouter.apiKey),
  floorPlanAnalysis: !!config.openrouter.apiKey,
  emailDelivery: EmailService.isConfigured(),
});

/** One response contract for all upload combinations; legacy routes use the same implementation. */
export function analyzeUpload(single?: 'lease' | 'floorPlan') {
  return async (req: AuthRequest, res: Response) => {
    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const lease = single === 'lease' ? req.file : files.lease?.[0];
    const floor = single === 'floorPlan' ? req.file : files.floorplan?.[0];
    if (!lease && !floor)
      return res.status(400).json({ error: 'Choose a lease PDF or floor plan image.' });
    if (
      lease &&
      (lease.mimetype !== 'application/pdf' ||
        lease.buffer.toString('ascii', 0, 5) !== '%PDF-' ||
        !lease.buffer.includes(Buffer.from('%%EOF')))
    ) {
      return res
        .status(415)
        .json({ error: 'The lease must be a valid PDF. Export other documents as PDF first.' });
    }
    if (floor && imageMime(floor.buffer) !== floor.mimetype.replace('image/jpg', 'image/jpeg')) {
      return res
        .status(415)
        .json({
          error: 'Floor plans must contain a PNG, JPEG, WebP or GIF image matching the file type.',
        });
    }
    const analysis: { lease?: unknown; floorPlan?: unknown } = {};
    const errors: Record<string, string> = {};
    const features = serviceStatus();
    await Promise.all([
      lease &&
        (async () => {
          if (!features.leaseAnalysis) {
            errors.lease =
              'Lease analysis is unavailable: configure REDUCTO_API_KEY and OPENROUTER_API_KEY.';
            return;
          }
          try {
            analysis.lease = await LeaseService.analyzeLeasePDF(lease.buffer, lease.originalname);
          } catch {
            errors.lease =
              'Lease analysis failed or timed out. Your file is retained in this form so you can retry.';
          }
        })(),
      floor &&
        (async () => {
          if (!features.floorPlanAnalysis) {
            errors.floorPlan = 'Floor plan analysis is unavailable: configure OPENROUTER_API_KEY.';
            return;
          }
          try {
            analysis.floorPlan = await FloorPlanService.analyzeFloorPlan(
              floor.buffer,
              floor.mimetype,
            );
          } catch {
            errors.floorPlan = 'Floor plan analysis failed or timed out. Retry this file.';
          }
        })(),
    ]);
    if (!analysis.lease && !analysis.floorPlan)
      return res
        .status(
          (lease && !features.leaseAnalysis) || (floor && !features.floorPlanAnalysis) ? 503 : 502,
        )
        .json({ error: Object.values(errors).join(' '), errors });
    let emailSent = false;
    let emailError: string | undefined;
    const requested =
      req.body.sendEmail === true ||
      req.body.sendEmail === 'true' ||
      (req.body.sendEmail === undefined && !!req.body.email);
    if (requested) {
      if (Object.keys(errors).length)
        emailError =
          'Email was not sent because part of the analysis failed. Retry the failed file.';
      else {
        const result = await EmailService.sendCombinedAnalysis(
          req.userEmail!,
          analysis,
          `analysis/${req.userId}/${analysisDigest(analysis)}`,
        );
        emailSent = result.success;
        emailError = result.error;
      }
    }
    res
      .set('Cache-Control', 'no-store')
      .json({
        success: true,
        analysis,
        errors,
        partial: !!Object.keys(errors).length,
        generatedAt: new Date().toISOString(),
        emailSent,
        emailError,
        receipt: analysisReceipt(analysis, req.userId!),
      });
  };
}
