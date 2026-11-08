import { Schema, model } from 'mongoose';

// Persist before external delivery. The same immutable payload and key are reused on retries.
const schema = new Schema(
  {
    key: { type: String, unique: true, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    savedSearchId: { type: Schema.Types.ObjectId, required: true, index: true },
    method: { type: String, enum: ['email', 'in-app'], required: true },
    listingIds: [{ type: Schema.Types.ObjectId }],
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed', 'review'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    firstAttemptAt: Date,
    sentAt: Date,
    readAt: Date,
    providerId: String,
    error: String,
    uncertain: Boolean,
    historyRecorded: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const AlertDelivery = model('AlertDelivery', schema);
