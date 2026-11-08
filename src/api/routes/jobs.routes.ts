import { Router } from 'express';
import mongoose from 'mongoose';
import { ScrapingJobModel } from '../../ingestion/models/scrapingJob.schema';
import { SavedSearch } from '../../models';
import { AlertDelivery } from '../../models/alertDelivery.model';
const router = Router();
router.get('/health', async (_req, res) => {
  const checkedAt = new Date();
  if (mongoose.connection.readyState !== 1)
    return res.status(503).json({
      checkedAt,
      status: 'unavailable',
      error: 'Job history and listing freshness require configured, reachable MongoDB.',
    });
  const [latest, success, lastAlert, failed, review] = await Promise.all([
    ScrapingJobModel.findOne()
      .sort({ createdAt: -1 })
      .select('status startTime endTime errorsEncountered totalListingsScraped sourceResults')
      .lean(),
    ScrapingJobModel.findOne({ status: 'completed' })
      .sort({ endTime: -1 })
      .select('endTime')
      .lean(),
    SavedSearch.findOne({ lastAlertCheckedAt: { $exists: true } })
      .sort({ lastAlertCheckedAt: -1 })
      .select('lastAlertCheckedAt')
      .lean(),
    AlertDelivery.countDocuments({ status: 'failed' }),
    AlertDelivery.countDocuments({ status: 'review' }),
  ]);
  const lastSuccess = success?.endTime || null;
  res.set('Cache-Control', 'no-store').json({
    checkedAt,
    refresh: {
      status: !latest
        ? 'never_run'
        : latest.status === 'failed'
          ? 'failed'
          : !lastSuccess || +checkedAt - +lastSuccess > 3600000
            ? 'overdue'
            : latest.errorsEncountered > 0 || (latest.sourceResults || []).some((s) => s.errors > 0)
              ? 'degraded'
              : 'healthy',
      lastSuccess,
      lastRun: latest
        ? {
            status: latest.status,
            startedAt: latest.startTime,
            finishedAt: latest.endTime,
            errors: latest.errorsEncountered,
            listingsObserved: latest.totalListingsScraped,
            sources: (latest.sourceResults || []).map((s) => ({
              source: s.source,
              observed: s.listingsScraped,
              errors: s.errors,
            })),
          }
        : null,
      expectedIntervalMinutes: 15,
      overdueAfterMinutes: 60,
    },
    alerts: {
      lastCheckedAt: lastAlert?.lastAlertCheckedAt || null,
      failedDeliveries: failed,
      requiresReview: review,
    },
    note: 'Job completion is not proof that every listing was refreshed. Check each listing’s source observation date; observations older than 72 hours are stale.',
  });
});
export default router;
