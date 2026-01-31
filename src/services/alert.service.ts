import { SavedSearch, Listing, User, AlertHistory } from '../models';
import { buildListingQuery } from '../utils/queries';
import { updateAlertTimestamp, createAlertHistory } from '../utils/alerts';
import { EmailService } from './email.service';
import { Types } from 'mongoose';

export class AlertService {
  /**
   * Check all active saved searches and send alerts for new matching listings
   */
  static async processAlerts(): Promise<{ processed: number; sent: number; errors: number }> {
    let processed = 0;
    let sent = 0;
    let errors = 0;

    try {
      // Get all active saved searches
      const savedSearches = await SavedSearch.find({ isActive: true }).lean().exec();

      for (const search of savedSearches) {
        processed++;

        try {
          // Get user email
          const user = await User.findById(search.userId).lean().exec();
          if (!user || !user.email) {
            console.warn(`User not found or no email for search ${search._id}`);
            continue;
          }

          // Find new listings since last alert
          const query = buildListingQuery(search.criteria);
          
          // Only get listings created after last alert
          if (search.lastAlertSentAt) {
            query.createdAt = { $gt: search.lastAlertSentAt };
          }

          const newListings = await Listing.find(query)
            .sort({ createdAt: -1 })
            .limit(50) // Max 50 listings per alert
            .lean()
            .exec();

          // Skip if no new listings
          if (newListings.length === 0) {
            continue;
          }

          // Send email alert
          const emailResult = await EmailService.sendListingAlert(
            user.email,
            newListings,
            search.name
          );

          if (emailResult.success) {
            sent++;

            // Update last alert sent timestamp
            await updateAlertTimestamp(search._id as Types.ObjectId);

            // Create alert history record
            await createAlertHistory({
              userId: search.userId as Types.ObjectId,
              savedSearchId: search._id as Types.ObjectId,
              sentAt: new Date(),
              listingIds: newListings.map((l) => l._id as Types.ObjectId),
              alertMethod: (search.alertMethod === 'both' ? 'email' : search.alertMethod) as 'email' | 'in-app',
              deliveryStatus: 'sent',
            });

            console.log(`Alert sent to ${user.email} for search "${search.name}" (${newListings.length} listings)`);
          } else {
            errors++;
            console.error(`Failed to send alert to ${user.email}:`, emailResult.error);

            // Create failed alert history
            await createAlertHistory({
              userId: search.userId as Types.ObjectId,
              savedSearchId: search._id as Types.ObjectId,
              sentAt: new Date(),
              listingIds: newListings.map((l) => l._id as Types.ObjectId),
              alertMethod: (search.alertMethod === 'both' ? 'email' : search.alertMethod) as 'email' | 'in-app',
              deliveryStatus: 'failed',
            });
          }
        } catch (error) {
          errors++;
          console.error(`Error processing search ${search._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in processAlerts:', error);
    }

    return { processed, sent, errors };
  }

  /**
   * Send immediate alert for a specific saved search
   */
  static async sendImmediateAlert(savedSearchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const search = await SavedSearch.findById(savedSearchId).lean().exec();
      if (!search) {
        return { success: false, error: 'Saved search not found' };
      }

      const user = await User.findById(search.userId).lean().exec();
      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email' };
      }

      // Find matching listings
      const query = buildListingQuery(search.criteria);
      const listings = await Listing.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
        .exec();

      if (listings.length === 0) {
        return { success: false, error: 'No matching listings found' };
      }

      // Send email
      const emailResult = await EmailService.sendListingAlert(user.email, listings, search.name);

      if (emailResult.success) {
        await updateAlertTimestamp(new Types.ObjectId(savedSearchId));
        await createAlertHistory({
          userId: search.userId as Types.ObjectId,
          savedSearchId: new Types.ObjectId(savedSearchId),
          sentAt: new Date(),
          listingIds: listings.map((l) => l._id as Types.ObjectId),
          alertMethod: (search.alertMethod === 'both' ? 'email' : search.alertMethod) as 'email' | 'in-app',
          deliveryStatus: 'sent',
        });
      }

      return emailResult;
    } catch (error) {
      console.error('Error in sendImmediateAlert:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
