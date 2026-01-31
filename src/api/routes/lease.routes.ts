import { Router, Request, Response } from 'express';
import { LeaseService } from '../../services/lease.service';

const router = Router();

/**
 * POST /api/lease/analyze
 * Analyze lease text
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { leaseText, email } = req.body;

    if (!leaseText) {
      return res.status(400).json({ error: 'leaseText is required' });
    }

    // Analyze lease
    const analysis = await LeaseService.analyzeLease(leaseText);

    // Send email if requested
    if (email) {
      const emailResult = await LeaseService.sendLeaseAnalysis(email, analysis);
      if (!emailResult.success) {
        return res.status(500).json({ error: 'Analysis completed but email failed', analysis });
      }
    }

    res.json({ analysis, emailSent: !!email });
  } catch (error) {
    console.error('Lease analysis error:', error);
    res.status(500).json({ error: 'Lease analysis failed' });
  }
});

export default router;
