import { ownReportEmail, uploadError } from '../middleware/uploads';
/**
 * Property Analysis API Routes
 * 
 * Handles combined lease + floor plan analysis
 * Supports uploading both PDFs and images
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { CombinedAnalysisService } from '../../services/combined-analysis.service';
import { LeaseService } from '../../services/lease.service';
import { FloorPlanService } from '../../services/floorplan.service';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Require authentication for all property analysis endpoints
router.use(requireAuth);

// Configure multer for multiple file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 2, // Max 2 files (lease + floor plan)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];
    
    const isLease = file.fieldname === 'lease';
    if (allowedTypes.includes(file.mimetype) && (isLease ? ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype) : file.mimetype.startsWith('image/'))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Use PDF or DOCX for a lease, and PNG, JPEG, WebP or GIF for a floor plan.'));
    }
  },
});

/**
 * POST /api/property/analyze
 * 
 * Upload and analyze lease PDF and/or floor plan image
 * Supports multiple files in a single request
 */
router.post('/analyze', upload.fields([
  { name: 'lease', maxCount: 1 },
  { name: 'floorplan', maxCount: 1 },
]), ownReportEmail, async (req: AuthRequest, res: Response) => {
  try {
    const files = (req.files || {}) as { [fieldname: string]: Express.Multer.File[] };
    const { email, sendEmail } = req.body || {};

    if (!files.lease && !files.floorplan) {
      return res.status(400).json({
        success: false,
        error: 'At least one file (lease or floor plan) is required',
      });
    }

    // Prepare input
    const input: any = {
      userEmail: email,
      sendEmail: sendEmail === 'true' || sendEmail === true,
    };

    // Add lease if provided
    if (files.lease && files.lease[0]) {
      const leaseFile = files.lease[0];
      input.leasePDF = {
        buffer: leaseFile.buffer,
        fileName: leaseFile.originalname,
      };
    }

    // Add floor plan if provided
    if (files.floorplan && files.floorplan[0]) {
      const floorPlanFile = files.floorplan[0];
      input.floorPlanImage = {
        buffer: floorPlanFile.buffer,
        mimeType: floorPlanFile.mimetype,
        fileName: floorPlanFile.originalname,
      };
    }

    // Analyze
    const analysis = await CombinedAnalysisService.analyzeCombined(input);

    res.json({
      success: true,
      analysis: {
        lease: analysis.lease,
        floorPlan: analysis.floorPlan,
      },
      emailSent: analysis.emailSent,
    });
  } catch (error) {
    console.error('Property analysis error:', error);
    res.status(502).json({
      success: false,
      error: 'Document analysis is temporarily unavailable. Please retry.',
    });
  }
});

/**
 * POST /api/property/analyze-lease-only
 * 
 * Analyze only the lease PDF
 */
router.post('/analyze-lease-only', upload.single('lease'), ownReportEmail, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Lease PDF is required',
      });
    }

    const { email, sendEmail } = req.body || {};
    const analysis = await LeaseService.analyzeLeasePDF(req.file.buffer, req.file.originalname);

    let emailSent = false;
    if ((sendEmail === 'true' || sendEmail === true) && email) {
      emailSent = (await LeaseService.sendLeaseAnalysis(email, analysis)).success;
    }

    res.json({
      success: true,
      analysis,
      emailSent,
    });
  } catch (error) {
    console.error('Lease analysis error:', error);
    res.status(502).json({
      success: false,
      error: 'Document analysis is temporarily unavailable. Please retry.',
    });
  }
});

/**
 * POST /api/property/analyze-floorplan-only
 * 
 * Analyze only the floor plan image
 */
router.post('/analyze-floorplan-only', upload.single('floorplan'), ownReportEmail, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Floor plan image is required',
      });
    }

    if (!FloorPlanService.isValidImageType(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image type. Supported: PNG, JPEG, WebP, GIF',
      });
    }

    const { email, sendEmail } = req.body || {};

    const analysis = await FloorPlanService.analyzeFloorPlan(
      req.file.buffer,
      req.file.mimetype
    );

    // Send email if requested
    let emailSent = false;
    if (email && sendEmail === 'true') {
      const { EmailService } = await import('../../services/email.service');
      const emailResult = await EmailService.sendFloorPlanAnalysis(email, analysis);
      emailSent = emailResult.success;
      if (!emailResult.success) {
        console.log('Floor plan email failed:', emailResult.error);
      }
    }

    res.json({
      success: true,
      analysis,
      emailSent,
    });
  } catch (error) {
    console.error('Floor plan analysis error:', error);
    res.status(502).json({
      success: false,
      error: 'Document analysis is temporarily unavailable. Please retry.',
    });
  }
});

/**
 * GET /api/property/status
 * 
 * Check service status
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  res.json({
    services: {
      reducto: !!process.env.REDUCTO_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      resend: !!process.env.RESEND_API_KEY,
    },
    features: {
      leaseAnalysis: true,
      floorPlanAnalysis: true,
      combinedAnalysis: true,
      emailDelivery: true,
    },
  });
});

router.use(uploadError);
export default router;

/**
 * USAGE EXAMPLES
 * 
 * 1. Analyze both lease and floor plan:
 * 
 *    const formData = new FormData();
 *    formData.append('lease', leasePdfFile);
 *    formData.append('floorplan', floorPlanImage);
 *    formData.append('email', 'user@example.com');
 *    formData.append('sendEmail', 'true');
 *    
 *    const response = await fetch('/api/property/analyze', {
 *      method: 'POST',
 *      body: formData,
 *    });
 * 
 * 2. Analyze only lease:
 * 
 *    const formData = new FormData();
 *    formData.append('lease', leasePdfFile);
 *    formData.append('email', 'user@example.com');
 *    formData.append('sendEmail', 'true');
 *    
 *    const response = await fetch('/api/property/analyze-lease-only', {
 *      method: 'POST',
 *      body: formData,
 *    });
 * 
 * 3. Analyze only floor plan:
 * 
 *    const formData = new FormData();
 *    formData.append('floorplan', floorPlanImage);
 *    
 *    const response = await fetch('/api/property/analyze-floorplan-only', {
 *      method: 'POST',
 *      body: formData,
 *    });
 * 
 * 4. Check service status:
 * 
 *    const response = await fetch('/api/property/status');
 *    const status = await response.json();
 */
