import { Types } from 'mongoose';
import { SavedSearch } from '../models/savedSearch.model';
import { AlertHistory } from '../models/alertHistory.model';

/**
 * Update the lastAlertSentAt timestamp for a saved search
 * 
 * @param savedSearchId - The ID of the saved search
 * @param sentAt - The timestamp when the alert was sent (defaults to now)
 * @returns The updated saved search document
 */
export async function updateAlertTimestamp(
  savedSearchId: Types.ObjectId,
  sentAt: Date = new Date()
) {
  const savedSearch = await SavedSearch.findByIdAndUpdate(
    savedSearchId,
    { lastAlertSentAt: sentAt },
    { new: true }
  );

  if (!savedSearch) {
    throw new Error(`SavedSearch with ID ${savedSearchId} not found`);
  }

  return savedSearch;
}

/**
 * Create an alert history record
 * 
 * @param params - Alert history parameters
 * @returns The created alert history document
 */
export async function createAlertHistory(params: {
  userId: Types.ObjectId;
  savedSearchId: Types.ObjectId;
  sentAt: Date;
  alertMethod: 'email' | 'in-app';
  listingIds: Types.ObjectId[];
  deliveryStatus?: 'sent' | 'failed' | 'bounced';
  errorMessage?: string | null;
}) {
  const alertHistory = await AlertHistory.create({
    userId: params.userId,
    savedSearchId: params.savedSearchId,
    sentAt: params.sentAt,
    alertMethod: params.alertMethod,
    listingIds: params.listingIds,
    listingCount: params.listingIds.length,
    deliveryStatus: params.deliveryStatus || 'sent',
    errorMessage: params.errorMessage || null,
    openedAt: null,
    clickedListingIds: []
  });

  return alertHistory;
}

/**
 * Send an alert for a saved search and record it
 * 
 * @param params - Alert sending parameters
 * @returns Object containing the updated saved search and alert history
 */
export async function sendAlert(params: {
  savedSearchId: Types.ObjectId;
  userId: Types.ObjectId;
  listingIds: Types.ObjectId[];
  alertMethod: 'email' | 'in-app';
}) {
  const sentAt = new Date();

  // Update the saved search timestamp
  const savedSearch = await updateAlertTimestamp(params.savedSearchId, sentAt);

  // Create alert history record
  const alertHistory = await createAlertHistory({
    userId: params.userId,
    savedSearchId: params.savedSearchId,
    sentAt,
    alertMethod: params.alertMethod,
    listingIds: params.listingIds,
    deliveryStatus: 'sent'
  });

  return {
    savedSearch,
    alertHistory
  };
}
