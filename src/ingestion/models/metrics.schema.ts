import { Schema, model, Document } from 'mongoose';
import { ListingSource, SourceResult, IMetrics } from '../types';

export interface IMetricsDocument extends Document, IMetrics {}

const SourceResultSchema = new Schema<SourceResult>({
  source: {
    type: String,
    enum: Object.values(ListingSource),
    required: true,
  },
  listingsScraped: {
    type: Number,
    required: true,
    default: 0,
  },
  errors: {
    type: Number,
    required: true,
    default: 0,
  },
  duration: {
    type: Number,
    required: true,
    default: 0,
  },
}, { _id: false, suppressReservedKeysWarning: true });

const MetricsSchema = new Schema<IMetricsDocument>({
  jobId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  totalListingsScraped: {
    type: Number,
    required: true,
    default: 0,
  },
  newListingsAdded: {
    type: Number,
    required: true,
    default: 0,
  },
  duplicatesDetected: {
    type: Number,
    required: true,
    default: 0,
  },
  errorsEncountered: {
    type: Number,
    required: true,
    default: 0,
  },
  duration: {
    type: Number,
    required: true,
    default: 0,
  },
  sourceBreakdown: {
    type: [SourceResultSchema],
    required: true,
    default: [],
  },
}, {
  timestamps: false,
});

// Indexes for efficient queries
MetricsSchema.index({ timestamp: -1 });
MetricsSchema.index({ jobId: 1 });
MetricsSchema.index({ timestamp: 1, 'sourceBreakdown.source': 1 });

export const MetricsModel = model<IMetricsDocument>('Metrics', MetricsSchema);
