import { Router } from 'express';
const router = Router();
// Ingestion polls its own jobs. Acknowledging an unimplemented consumer would
// falsely claim that incoming results had been saved.
router.post('/firecrawl', (_req, res) => {
  res
    .status(503)
    .json({
      error:
        'Webhook ingestion is unavailable. Use the configured scraping job and inspect /api/jobs/health.',
    });
});
export default router;
