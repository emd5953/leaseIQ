import { Router } from 'express';
import { downloadImage, DownloadError } from '../../utils/safe-image';
const router = Router();
router.get('/', async (req, res) => {
  if (typeof req.query.url !== 'string' || req.query.url.length > 4096)
    return res.status(400).json({ error: 'A valid image URL is required' });
  try {
    const image = await downloadImage(req.query.url);
    res
      .set({
        'Content-Type': image.mimeType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600',
      })
      .send(image.buffer);
  } catch (error) {
    res
      .status(error instanceof DownloadError ? error.status : 502)
      .json({ error: error instanceof DownloadError ? error.message : 'Image unavailable' });
  }
});
export default router;
