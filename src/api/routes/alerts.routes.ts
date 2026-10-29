import { Router } from 'express';
import { AlertService } from '../../services/alert.service';
import { requireAuth, requireInternalJob, AuthRequest } from '../middleware/auth';
import { validateObjectId } from '../middleware/validation';
import { SavedSearch } from '../../models';
import { AlertDelivery } from '../../models/alertDelivery.model';
import mongoose from 'mongoose';
const router = Router();
router.post('/process', requireInternalJob, async (_req, res) => {
  if (mongoose.connection.readyState !== 1)
    return res.status(503).json({ error: 'Alert storage unavailable' });
  const result = await AlertService.processAlerts();
  res.status(result.errors ? 502 : 200).json(result);
});
router.use(requireAuth);
router.use((_req, res, next) => {
  if (mongoose.connection.readyState !== 1)
    return res.status(503).json({ error: 'Alert storage unavailable' });
  next();
});
router.post(
  '/send/:savedSearchId',
  validateObjectId('savedSearchId'),
  async (req: AuthRequest, res) => {
    const id = String(req.params.savedSearchId);
    if (!(await SavedSearch.exists({ _id: id, userId: req.userId })))
      return res.status(404).json({ error: 'Saved search not found' });
    const result = await AlertService.sendImmediateAlert(id, req.userId!);
    res.status(result.success ? 200 : 502).json(result);
  },
);
router.get('/notifications', async (req: AuthRequest, res) => {
  const items = await AlertDelivery.find({ userId: req.userId, method: 'in-app', status: 'sent' })
    .sort({ sentAt: -1 })
    .limit(100)
    .select('_id listingIds payload.name sentAt readAt')
    .lean();
  res.set('Cache-Control', 'no-store').json(items);
});
router.patch('/notifications/:id/read', validateObjectId(), async (req: AuthRequest, res) => {
  const item = await AlertDelivery.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, method: 'in-app', status: 'sent' },
    { readAt: new Date() },
    { new: true },
  );
  if (!item) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true });
});
export default router;
