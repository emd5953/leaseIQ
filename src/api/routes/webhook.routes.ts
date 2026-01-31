import { Router, Request, Response } from 'express';
import { Webhook } from 'standardwebhooks';

const router = Router();

// Webhook secret - should be set in .env
const WEBHOOK_SECRET = process.env.FIRECRAWL_WEBHOOK_SECRET || '';

/**
 * Firecrawl webhook endpoint
 * Receives notifications when scraping jobs complete
 */
router.post('/firecrawl', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const wh = new Webhook(WEBHOOK_SECRET);
      const signature = req.headers['webhook-signature'] as string;
      
      if (!signature) {
        console.error('Missing webhook signature');
        return res.status(401).json({ error: 'Missing signature' });
      }

      try {
        wh.verify(JSON.stringify(req.body), signature);
      } catch (err) {
        console.error('Invalid webhook signature:', err);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { type, data } = req.body;

    console.log('Received Firecrawl webhook:', {
      type,
      jobId: data?.id,
      status: data?.status,
      timestamp: new Date().toISOString(),
    });

    // Handle different webhook types
    switch (type) {
      case 'batch_scrape.completed':
        console.log('Batch scrape completed:', {
          jobId: data.id,
          total: data.total,
          completed: data.completed,
          failed: data.failed,
        });
        // TODO: Process completed scraping results
        // You can fetch the results and store them in your database
        break;

      case 'batch_scrape.failed':
        console.error('Batch scrape failed:', {
          jobId: data.id,
          error: data.error,
        });
        // TODO: Handle failed scraping job
        break;

      case 'batch_scrape.partial':
        console.log('Batch scrape partial update:', {
          jobId: data.id,
          completed: data.completed,
          total: data.total,
        });
        // TODO: Handle partial completion updates
        break;

      default:
        console.log('Unknown webhook type:', type);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent retries for processing errors
    res.status(200).json({ received: true, error: 'Processing failed' });
  }
});

export default router;
