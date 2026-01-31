/**
 * Example Lease Analysis API Routes
 * 
 * Demonstrates how to integrate Reducto + Resend workflows into Express routes
 * Copy and adapt these routes to your actual API implementation
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { LeaseService } from '../../services/lease.service';
import { EmailService } from '../../services/email.service';
import { ReductoService } from '../../services/reducto.service';

const router = Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * POST /api/lease/analyze
 * 
 * Upload and analyze a lease PDF
 * Returns analysis results and optionally sends email
 */
router.post('/analyze', upload.single('lease'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded',
      });
    }

    const { email, sendEmail } = req.body;
    const pdfBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    // Parse and analyze lease
    const analysis = await LeaseService.analyzeLeasePDF(pdfBuffer, fileName);

    // Optionally send email
    if (sendEmail && email) {
      await EmailService.sendLeaseAnalysis(email, analysis);
    }

    res.json({
      success: true,
      analysis: {
        summary: analysis.summary,
        redFlags: analysis.redFlags,
        keyTerms: analysis.keyTerms,
      },
      emailSent: sendEmail && email ? true : false,
    });
  } catch (error) {
    console.error('Lease analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze lease',
    });
  }
});

/**
 * POST /api/lease/analyze-url
 * 
 * Analyze a lease PDF from a URL
 */
router.post('/analyze-url', async (req: Request, res: Response) => {
  try {
    const { url, email, sendEmail } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'PDF URL is required',
      });
    }

    // Parse and analyze lease from URL
    const analysis = await LeaseService.analyzeLeasePDFFromURL(url);

    // Optionally send email
    if (sendEmail && email) {
      await EmailService.sendLeaseAnalysis(email, analysis);
    }

    res.json({
      success: true,
      analysis: {
        summary: analysis.summary,
        redFlags: analysis.redFlags,
        keyTerms: analysis.keyTerms,
      },
      emailSent: sendEmail && email ? true : false,
    });
  } catch (error) {
    console.error('Lease analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze lease',
    });
  }
});

/**
 * POST /api/lease/parse
 * 
 * Parse a lease PDF without AI analysis (just extract text)
 */
router.post('/parse', upload.single('lease'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded',
      });
    }

    const pdfBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    // Parse PDF to text
    const leaseText = await LeaseService.parseLeasePDF(pdfBuffer, fileName);

    res.json({
      success: true,
      text: leaseText,
      length: leaseText.length,
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse PDF',
    });
  }
});

/**
 * POST /api/lease/analyze-text
 * 
 * Analyze lease text directly (no PDF parsing)
 * Useful if user pastes lease text or you already have parsed text
 */
router.post('/analyze-text', async (req: Request, res: Response) => {
  try {
    const { text, email, sendEmail } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Lease text is required',
      });
    }

    // Analyze lease text
    const analysis = await LeaseService.analyzeLease(text);

    // Optionally send email
    if (sendEmail && email) {
      await EmailService.sendLeaseAnalysis(email, analysis);
    }

    res.json({
      success: true,
      analysis: {
        summary: analysis.summary,
        redFlags: analysis.redFlags,
        keyTerms: analysis.keyTerms,
      },
      emailSent: sendEmail && email ? true : false,
    });
  } catch (error) {
    console.error('Lease analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze lease',
    });
  }
});

/**
 * POST /api/lease/email-analysis
 * 
 * Send a previously generated analysis via email
 */
router.post('/email-analysis', async (req: Request, res: Response) => {
  try {
    const { email, analysis } = req.body;

    if (!email || !analysis) {
      return res.status(400).json({
        success: false,
        error: 'Email and analysis are required',
      });
    }

    // Send email
    const result = await EmailService.sendLeaseAnalysis(email, analysis);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    });
  }
});

/**
 * GET /api/lease/status
 * 
 * Check if Reducto and email services are configured
 */
router.get('/status', async (req: Request, res: Response) => {
  const reducto = new ReductoService();
  
  res.json({
    reducto: {
      configured: reducto.isConfigured(),
    },
    email: {
      configured: !!process.env.RESEND_API_KEY,
    },
    ai: {
      configured: !!process.env.OPENROUTER_API_KEY,
    },
  });
});

export default router;

/**
 * USAGE EXAMPLES
 * 
 * 1. Analyze uploaded PDF:
 * 
 *    const formData = new FormData();
 *    formData.append('lease', pdfFile);
 *    formData.append('email', 'user@example.com');
 *    formData.append('sendEmail', 'true');
 *    
 *    const response = await fetch('/api/lease/analyze', {
 *      method: 'POST',
 *      body: formData,
 *    });
 * 
 * 2. Analyze PDF from URL:
 * 
 *    const response = await fetch('/api/lease/analyze-url', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({
 *        url: 'https://example.com/lease.pdf',
 *        email: 'user@example.com',
 *        sendEmail: true,
 *      }),
 *    });
 * 
 * 3. Analyze text directly:
 * 
 *    const response = await fetch('/api/lease/analyze-text', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({
 *        text: leaseText,
 *        email: 'user@example.com',
 *        sendEmail: true,
 *      }),
 *    });
 * 
 * 4. Check service status:
 * 
 *    const response = await fetch('/api/lease/status');
 *    const status = await response.json();
 *    // { reducto: { configured: true }, email: { configured: true }, ... }
 */
