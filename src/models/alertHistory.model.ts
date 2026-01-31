import { Schema, model, Document, Types } from 'mongoose';

/**
 * Alert History document interface
 * Maintains a historical record of alerts sent to users for debugging and analytics
 */
export interface IAlertHistory extends Document {
  userId: Types.ObjectId;                 // Reference to User document
  savedSearchId: Types.ObjectId;          // Reference to SavedSearch document
  sentAt: Date;                           // When alert was sent
  alertMethod: 'email' | 'in-app';        // How alert was delivered
  
  // Alert content
  listingIds: Types.ObjectId[];           // Listings included in alert
  listingCount: number;                   // Number of listings in alert
  
  // Delivery status
  deliveryStatus: 'sent' | 'failed' | 'bounced';
  errorMessage: string | null;            // If delivery failed
  
  // User engagement
  openedAt: Date | null;                  // When user opened alert (email tracking)
  clickedListingIds: Types.ObjectId[];    // Listings user clicked from alert
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert History schema definition
 * Stores historical record of alerts sent to users
 */
const alertHistorySchema = new Schema<IAlertHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  savedSearchId: {
    type: Schema.Types.ObjectId,
    ref: 'SavedSearch',
    required: [true, 'Saved Search ID is required'],
    index: true
  },
  
  sentAt: {
    type: Date,
    required: [true, 'Sent at timestamp is required'],
    index: true
  },
  
  alertMethod: {
    type: String,
    required: [true, 'Alert method is required'],
    enum: {
      values: ['email', 'in-app'],
      message: 'Alert method must be one of: email, in-app'
    }
  },
  
  listingIds: {
    type: [Schema.Types.ObjectId],
    ref: 'Listing',
    default: []
  },
  
  listingCount: {
    type: Number,
    required: [true, 'Listing count is required'],
    validate: {
      validator: function(v: number) {
        return Number.isInteger(v) && v >= 0;
      },
      message: 'Listing count must be a non-negative integer'
    }
  },
  
  deliveryStatus: {
    type: String,
    required: [true, 'Delivery status is required'],
    enum: {
      values: ['sent', 'failed', 'bounced'],
      message: 'Delivery status must be one of: sent, failed, bounced'
    }
  },
  
  errorMessage: {
    type: String,
    default: null
  },
  
  openedAt: {
    type: Date,
    default: null
  },
  
  clickedListingIds: {
    type: [Schema.Types.ObjectId],
    ref: 'Listing',
    default: []
  }
}, {
  timestamps: true  // Automatically manages createdAt and updatedAt
});

// Compound indexes for user history, search history, and time-based queries
alertHistorySchema.index({ userId: 1, sentAt: -1 });
alertHistorySchema.index({ savedSearchId: 1, sentAt: -1 });

/**
 * AlertHistory model
 * Export Mongoose model for AlertHistory collection
 */
export const AlertHistory = model<IAlertHistory>('AlertHistory', alertHistorySchema);
