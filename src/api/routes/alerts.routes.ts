import { Router, Request, Response } from 'express';
import { AlertService } from '../../services/alert.service';

const router = Router();

/**
 * POST /api/alerts/process
 * Process all alerts (typically called by cron job)
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const result = await AlertService.processAlerts();
    res.json(result);
  } catch (error) {
    console.error('Process alerts error:', error);
    res.status(500).json({ error: 'Failed to process alerts' });
  }
});

/**
 * POST /api/alerts/send/:savedSearchId
 * Send immediate alert for a specific saved search
 */
router.post('/send/:savedSearchId', async (req: Request, res: Response) => {
  try {
    const savedSearchId = Array.isArray(req.params.savedSearchId) 
      ? req.params.savedSearchId[0] 
      : req.params.savedSearchId;
    const result = await AlertService.sendImmediateAlert(savedSearchId);
    if (result.success) {
      res.json({ message: 'Alert sent successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Send alert error:', error);
    res.status(500).json({ error: 'Failed to send alert' });
  }
});

export default router;
