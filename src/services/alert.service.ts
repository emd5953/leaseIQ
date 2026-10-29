import { createHash, randomUUID } from 'node:crypto';
import { SavedSearch, Listing, User, AlertHistory } from '../models';
import { AlertDelivery } from '../models/alertDelivery.model';
import { buildListingQuery } from '../utils/queries';
import { NYC_CITIES } from '../utils/nyc';
import { EmailService } from './email.service';

export function alertDue(search: any, now = new Date()): boolean {
  if (!search.isActive || !search.alertsEnabled) return false;
  const interval = { immediate: 0, daily: 86400000, weekly: 7 * 86400000 }[
    search.alertFrequency as string
  ];
  if (interval === undefined) return false;
  return now.getTime() >= new Date(search.lastDeliveryAt || search.createdAt).getTime() + interval;
}

export class AlertService {
  private static async recordHistory(delivery: any) {
    await AlertHistory.findOneAndUpdate(
      { deliveryId: delivery._id },
      {
        $set: {
          userId: delivery.userId,
          savedSearchId: delivery.savedSearchId,
          sentAt: delivery.sentAt || delivery.updatedAt || new Date(),
          listingIds: delivery.listingIds,
          listingCount: delivery.listingIds.length,
          alertMethod: delivery.method,
          deliveryStatus: delivery.status === 'sent' ? 'sent' : 'failed',
          errorMessage: delivery.error || null,
        },
      },
      { upsert: true, runValidators: true },
    );
    await AlertDelivery.updateOne(
      { _id: delivery._id, status: delivery.status },
      { historyRecorded: true },
    );
  }
  static async processAlerts(): Promise<{ processed: number; sent: number; errors: number }> {
    // Fair across runs (including failures and searches without matches). Locks arbitrate overlapping jobs.
    const searches = await SavedSearch.find({ isActive: true, alertsEnabled: true })
      .sort({ lastAlertCheckedAt: 1, _id: 1 })
      .limit(100)
      .select('_id userId')
      .lean();
    const result = { processed: 0, sent: 0, errors: 0 };
    for (const search of searches) {
      result.processed++;
      try {
        const outcome = await this.sendImmediateAlert(String(search._id), String(search.userId));
        if (outcome.sent) result.sent++;
        if (!outcome.success) result.errors++;
      } catch {
        result.errors++;
      }
    }
    return result;
  }

  static async sendImmediateAlert(
    savedSearchId: string,
    userId: string,
  ): Promise<{ success: boolean; sent?: boolean; error?: string; message?: string }> {
    const token = randomUUID();
    const now = new Date();
    const search = await SavedSearch.findOneAndUpdate(
      {
        _id: savedSearchId,
        userId,
        $or: [
          { alertLockUntil: { $exists: false } },
          { alertLockUntil: null },
          { alertLockUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          alertLockUntil: new Date(+now + 5 * 60000),
          alertLockToken: token,
          lastAlertCheckedAt: now,
        },
      },
      { new: true },
    ).lean();
    if (!search)
      return {
        success: true,
        sent: false,
        message: 'Search is already being checked or is unavailable.',
      };
    try {
      // Recover a crash between confirming delivery and recording its history, without sending again.
      const unreconciled = await AlertDelivery.find({
        savedSearchId,
        historyRecorded: { $ne: true },
        status: { $in: ['sent', 'failed'] },
      });
      for (const delivered of unreconciled) await this.recordHistory(delivered);
      const methods = search.alertMethod === 'both' ? ['email', 'in-app'] : [search.alertMethod];
      // Also recover a crash after history was recorded but before the schedule
      // checkpoint. Otherwise a daily search could send new listings again now.
      const [lastByMethod, unfinished] = await Promise.all([
        Promise.all(
          methods.map((method) =>
            AlertDelivery.findOne({ savedSearchId, method, status: 'sent' })
              .sort({ sentAt: -1 })
              .lean(),
          ),
        ),
        AlertDelivery.countDocuments({
          savedSearchId,
          method: { $in: methods },
          status: { $ne: 'sent' },
        }),
      ]);
      if (!unfinished && lastByMethod.every((delivery) => delivery?.sentAt)) {
        const lastDelivered = new Date(
          Math.max(...lastByMethod.map((delivery) => +delivery!.sentAt!)),
        );
        if (!search.lastDeliveryAt || lastDelivered > search.lastDeliveryAt) {
          await SavedSearch.updateOne(
            { _id: search._id, alertLockToken: token },
            { $set: { lastDeliveryAt: lastDelivered, lastAlertSentAt: lastDelivered } },
          );
          search.lastDeliveryAt = lastDelivered;
        }
      }
      if (!alertDue(search, now))
        return {
          success: true,
          sent: false,
          message: 'Alerts are disabled, inactive, or not due yet.',
        };
      const user = await User.findById(userId).lean();
      if (!user) return { success: false, error: 'Account unavailable' };
      let sent = false;
      const errors: string[] = [];
      for (const method of methods) {
        let delivery = await AlertDelivery.findOne({
          savedSearchId,
          method,
          status: { $ne: 'sent' },
        }).sort({ createdAt: 1 });
        if (!delivery) {
          const delivered = await AlertHistory.distinct('listingIds', {
            savedSearchId,
            alertMethod: method,
            deliveryStatus: 'sent',
          });
          const outboxDelivered = await AlertDelivery.distinct('listingIds', {
            savedSearchId,
            method,
            status: 'sent',
          });
          const criteria = buildListingQuery(search.criteria);
          const listings = await Listing.find({
            $and: [
              criteria,
              {
                _id: { $nin: [...delivered, ...outboxDelivered] },
                createdAt: { $gte: search.createdAt },
                'address.city': { $in: NYC_CITIES },
                isActive: { $ne: false },
                duplicateOf: { $in: [null, ''] },
                'sourceVerification.status': { $ne: 'source_mismatch' },
                'sources.lastSeenAt': { $gte: new Date(+now - 72 * 3600000) },
              },
            ],
          })
            .sort({ createdAt: 1, _id: 1 })
            .limit(50)
            .lean();
          if (!listings.length) continue;
          const listingIds = listings.map((l) => l._id);
          const key = createHash('sha256')
            .update([savedSearchId, method, ...listingIds.map(String)].join(':'))
            .digest('hex');
          delivery = await AlertDelivery.findOneAndUpdate(
            { key },
            {
              $setOnInsert: {
                key,
                userId,
                savedSearchId,
                method,
                listingIds,
                payload:
                  method === 'email'
                    ? EmailService.listingAlertPayload(user.email, listings, search.name)
                    : { name: search.name },
              },
            },
            { upsert: true, new: true },
          );
        }
        if (!delivery || delivery.status === 'sent') continue;
        // A crashed/ambiguous attempt must not be resent after the provider forgets its key.
        if (
          delivery.method === 'email' &&
          delivery.firstAttemptAt &&
          +now - +delivery.firstAttemptAt > 23 * 3600000 &&
          (delivery.status === 'sending' || delivery.uncertain !== false)
        ) {
          delivery.status = 'review';
          delivery.error = 'Delivery needs review: provider idempotency window expired.';
          await delivery.save();
          errors.push(delivery.error);
          continue;
        }
        if (method === 'email' && !EmailService.isConfigured()) {
          delivery.status = 'failed';
          delivery.error = 'Email delivery is not configured.';
          delivery.historyRecorded = false;
          await delivery.save();
          await this.recordHistory(delivery);
          errors.push(delivery.error);
          continue;
        }
        // Recheck preferences immediately before the side effect.
        const enabled = await SavedSearch.findOneAndUpdate(
          {
            _id: search._id,
            userId,
            alertsEnabled: true,
            isActive: true,
            alertLockToken: token,
            alertLockUntil: { $gt: new Date() },
            alertMethod: { $in: [method, 'both'] },
            alertFrequency: search.alertFrequency,
          },
          { alertLockUntil: new Date(Date.now() + 5 * 60000) },
        );
        if (!enabled) return { success: true, sent, message: 'Alert preferences changed.' };
        // No provider request occurred while configuration was unavailable.
        // Capture the now-configured sender before the first attempt, then keep
        // it immutable with the payload for every idempotent retry.
        if (method === 'email' && delivery.attempts === 0) {
          delivery.payload = { ...delivery.payload, from: EmailService.senderAddress() };
        }
        delivery.status = 'sending';
        delivery.historyRecorded = false;
        delivery.attempts += 1;
        delivery.firstAttemptAt ||= now;
        await delivery.save();
        const outcome =
          method === 'in-app'
            ? { success: true, messageId: undefined, error: undefined, uncertain: false }
            : await EmailService.send({ ...delivery.payload, idempotencyKey: delivery.key });
        delivery.status = outcome.success ? 'sent' : 'failed';
        delivery.error = outcome.error;
        delivery.uncertain = outcome.uncertain ?? !outcome.success;
        // A definite rejection made no side effect and remains retryable beyond 24 hours.
        if (!outcome.success && outcome.uncertain === false) delivery.firstAttemptAt = undefined;
        if (outcome.success) {
          delivery.sentAt = new Date();
          delivery.providerId = outcome.messageId;
          sent = true;
        }
        await delivery.save();
        await this.recordHistory(delivery);
        if (!outcome.success) errors.push(outcome.error || 'Delivery failed');
      }
      if (sent)
        await SavedSearch.updateOne(
          { _id: search._id, alertLockToken: token },
          {
            $set: {
              lastAlertSentAt: new Date(),
              ...(errors.length ? {} : { lastDeliveryAt: new Date() }),
            },
          },
        );
      return {
        success: errors.length === 0,
        sent,
        error: errors.join(' ') || undefined,
        message: sent ? 'Selected delivery methods processed.' : 'No new eligible listings.',
      };
    } finally {
      await SavedSearch.updateOne(
        { _id: search._id, alertLockToken: token },
        { $unset: { alertLockUntil: 1, alertLockToken: 1 } },
      );
    }
  }
}
