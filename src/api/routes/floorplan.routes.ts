import { Router, Request, Response } from 'express';
import multer from 'multer';
import { FloorPlanService } from '../../services/floorplan.service';
import { EmailService } from '../../services/email.service';
import { validateEmail, validateUrl } from '../middleware/validation';

const router = Router();

// Configure multer for image uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (FloorPlanService.isValidImageType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP, GIF) are allowed'));
    }
  },
});

/**
 * POST /api/floorplan/analyze
 * Upload and analyze a floor plan image
 */
router.post('/analyze', upload.single('file'), validateEmail, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { email } = req.body;
    
    console.log(`[FloorPlan] Analyzing: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const analysis = await FloorPlanService.analyzeFloorPlan(
      req.file.buffer,
      req.file.mimetype
    );

    console.log(`[FloorPlan] Analysis complete: ${analysis.layout.bedrooms}BR/${analysis.layout.bathrooms}BA, ${analysis.spaceEfficiency}`);

    // Send email if requested
    if (email) {
      const emailResult = await EmailService.sendFloorPlanAnalysis(email, analysis);
      if (!emailResult.success) {
        return res.json({ analysis, emailSent: false, emailError: emailResult.error });
      }
    }

    res.json({ analysis, emailSent: !!email });
  } catch (error) {
    console.error('Floor plan analysis error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze floor plan' 
    });
  }
});

/**
 * POST /api/floorplan/analyze-url
 * Analyze a floor plan from URL
 */
router.post('/analyze-url', validateUrl('imageUrl'), validateEmail, async (req: Request, res: Response) => {
  try {
    const { imageUrl, email } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }

    console.log(`[FloorPlan] Analyzing URL: ${imageUrl}`);

    const analysis = await FloorPlanService.analyzeFloorPlanFromURL(imageUrl);

    // Send email if requested
    if (email) {
      const emailResult = await EmailService.sendFloorPlanAnalysis(email, analysis);
      if (!emailResult.success) {
        return res.json({ analysis, emailSent: false, emailError: emailResult.error });
      }
    }

    res.json({ analysis, emailSent: !!email });
  } catch (error) {
    console.error('Floor plan URL analysis error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze floor plan' 
    });
  }
});

export default router;
