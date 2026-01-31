import { Schema, model, Document, Types } from 'mongoose';

/**
 * Listing interaction document interface
 * Represents a user action on a listing (viewed, saved, hidden)
 */
export interface IListingInteraction extends Document {
  userId: Types.ObjectId;                 // Reference to User document
  listingId: Types.ObjectId;              // Reference to Listing document
  interactionType: 'viewed' | 'saved' | 'hidden';
  timestamp: Date;                        // When interaction occurred
  
  // Optional metadata
  metadata: {
    viewDurationSeconds: number | null;   // For 'viewed' interactions
    notes: string | null;                 // For 'saved' interactions
  };
}

/**
 * Listing interaction schema definition
 * Tracks user actions on listings to personalize experience and avoid showing duplicate content
 */
const listingInteractionSchema = new Schema<IListingInteraction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  listingId: {
    type: Schema.Types.ObjectId,
    ref: 'Listing',
    required: [true, 'Listing ID is required'],
    index: true
  },
  interactionType: {
    type: String,
    required: [true, 'Interaction type is required'],
    enum: {
      values: ['viewed', 'saved', 'hidden'],
      message: 'Interaction type must be one of: viewed, saved, hidden'
    }
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
    default: Date.now
  },
  metadata: {
    viewDurationSeconds: {
      type: Number,
      default: null
    },
    notes: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true  // Automatically manages createdAt and updatedAt
});

// Compound unique index to prevent duplicate interactions of the same type
listingInteractionSchema.index(
  { userId: 1, listingId: 1, interactionType: 1 },
  { unique: true }
);

// Compound index for user history queries
listingInteractionSchema.index({ userId: 1, interactionType: 1, timestamp: -1 });

// Compound index for listing analytics
listingInteractionSchema.index({ listingId: 1, interactionType: 1 });

/**
 * ListingInteraction model
 * Export Mongoose model for ListingInteraction collection
 */
export const ListingInteraction = model<IListingInteraction>('ListingInteraction', listingInteractionSchema);
