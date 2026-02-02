import { Router, Response } from 'express';
import multer from 'multer';
import { LeaseService } from '../../services/lease.service';
import { validateEmail } from '../middleware/validation';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Require authentication for all lease endpoints
router.use(requireAuth);

// Configure multer for file uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  },
});

/**
 * POST /api/lease/debug-extract
 * Debug endpoint - just extract text from PDF without analysis
 */
router.post('/debug-extract', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[LeaseRoute] Debug extract: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const text = await LeaseService.parseLeasePDF(req.file.buffer, req.file.originalname);
    
    res.json({ 
      success: true,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      extractedTextLength: text.length,
      extractedTextPreview: text.substring(0, 2000),
      fullText: text,
    });
  } catch (error) {
    console.error('Debug extract error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to extract text' 
    });
  }
});

/**
 * POST /api/lease/upload
 * Upload and analyze a lease PDF/DOCX
 */
router.post('/upload', upload.single('file'), validateEmail, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { email } = req.body;
    
    console.log(`[LeaseRoute] Received file: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);

    // Parse PDF and analyze
    const analysis = await LeaseService.analyzeLeasePDF(
      req.file.buffer,
      req.file.originalname
    );

    // Log what we're returning
    console.log(`[LeaseRoute] Analysis complete:`, {
      summaryLength: analysis.summary?.length || 0,
      redFlagsCount: analysis.redFlags?.length || 0,
      keyTermsCount: Object.keys(analysis.keyTerms || {}).filter(k => analysis.keyTerms[k as keyof typeof analysis.keyTerms]).length,
      tenantRightsCount: analysis.tenantRights?.length || 0,
      recommendationsCount: analysis.recommendations?.length || 0,
      extractedTextLength: analysis.fullText?.length || 0,
    });

    // Send email if requested
    if (email) {
      const emailResult = await LeaseService.sendLeaseAnalysis(email, analysis);
      if (!emailResult.success) {
        return res.json({ analysis, emailSent: false, emailError: 'Email delivery failed' });
      }
    }

    res.json({ analysis, emailSent: !!email });
  } catch (error) {
    console.error('Lease upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process uploaded file' 
    });
  }
});

export default router;
