import { Router } from 'express';
import { requireAuth, requireOwnRecipient, AuthRequest } from '../middleware/auth';
import { analysisDigest, verifyAnalysis } from '../../services/analysis-receipt';
import { EmailService } from '../../services/email.service';
import { analysisUpload, analyzeUpload, serviceStatus } from '../middleware/analysis';
const router = Router();
router.use(requireAuth);
router.get('/status', (_req, res) => res.json({ features: serviceStatus() }));
router.post('/email', requireOwnRecipient, async (req: AuthRequest, res) => {
  let key: string;
  let analysis: any = {};
  try {
    const parts = req.body.parts ?? [{ analysis: req.body.analysis, receipt: req.body.receipt }];
    if (!Array.isArray(parts) || !parts.length || parts.length > 2)
      throw new Error('Invalid parts');
    for (const part of parts) {
      if (!part.analysis || typeof part.receipt !== 'string') throw new Error('Missing analysis');
      verifyAnalysis(part.analysis, part.receipt, req.userId!);
      analysis = { ...analysis, ...part.analysis };
    }
    // Canonical field order keeps the key stable when a partial retry adds the lease second.
    analysis = {
      ...(analysis.lease ? { lease: analysis.lease } : {}),
      ...(analysis.floorPlan ? { floorPlan: analysis.floorPlan } : {}),
    };
    key = `analysis/${req.userId}/${analysisDigest(analysis)}`;
  } catch {
    return res
      .status(400)
      .json({ error: 'This analysis could not be verified or its email retry window expired.' });
  }
  const result = await EmailService.sendCombinedAnalysis(req.userEmail!, analysis, key);
  res
    .set('Cache-Control', 'no-store')
    .json({ emailSent: result.success, emailError: result.error });
});
router.post(
  '/analyze',
  analysisUpload.fields([
    { name: 'lease', maxCount: 1 },
    { name: 'floorplan', maxCount: 1 },
  ]),
  requireOwnRecipient,
  analyzeUpload(),
);
router.post(
  '/analyze-lease-only',
  analysisUpload.single('lease'),
  requireOwnRecipient,
  analyzeUpload('lease'),
);
router.post(
  '/analyze-floorplan-only',
  analysisUpload.single('floorplan'),
  requireOwnRecipient,
  analyzeUpload('floorPlan'),
);
export default router;
