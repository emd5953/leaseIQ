import { Router } from 'express';
import { requireAuth, requireOwnRecipient, AuthRequest } from '../middleware/auth';
import { analysisUpload, analyzeUpload, serviceStatus } from '../middleware/analysis';
import { downloadImage, DownloadError } from '../../utils/safe-image';
const router = Router();
router.use(requireAuth);
router.post(
  '/analyze',
  analysisUpload.single('file'),
  requireOwnRecipient,
  analyzeUpload('floorPlan'),
);
router.post('/analyze-url', requireOwnRecipient, async (req: AuthRequest, res) => {
  if (typeof req.body.imageUrl !== 'string')
    return res.status(400).json({ error: 'An image URL is required' });
  if (!serviceStatus().floorPlanAnalysis)
    return res.status(503).json({ error: 'Floor plan analysis is not configured.' });
  try {
    const image = await downloadImage(req.body.imageUrl);
    req.file = {
      buffer: image.buffer,
      mimetype: image.mimeType,
      originalname: 'floorplan',
    } as Express.Multer.File;
    return analyzeUpload('floorPlan')(req, res);
  } catch (error) {
    res
      .status(error instanceof DownloadError ? error.status : 502)
      .json({ error: error instanceof DownloadError ? error.message : 'Image unavailable' });
  }
});
export default router;
