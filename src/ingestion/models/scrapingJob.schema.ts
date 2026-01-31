import { Schema, model, Document } from 'mongoose';
import { ListingSource, JobStatus, SourceResult, IScrapingJob } from '../types';

export interface IScrapingJobDocument extends Document, IScrapingJob {}

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

const ScrapingJobSchema = new Schema<IScrapingJobDocument>({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
    required: true,
  },
  sources: {
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => {
        return v.every(source => Object.values(ListingSource).includes(source as ListingSource));
      },
      message: 'Invalid source in sources array',
    },
  },
  startTime: {
    type: Date,
    default: undefined,
  },
  endTime: {
    type: Date,
    default: undefined,
  },
  totalListingsScraped: {
    type: Number,
    default: 0,
  },
  newListingsAdded: {
    type: Number,
    default: 0,
  },
  duplicatesDetected: {
    type: Number,
    default: 0,
  },
  errorsEncountered: {
    type: Number,
    default: 0,
  },
  sourceResults: {
    type: [SourceResultSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes for efficient queries
ScrapingJobSchema.index({ status: 1, createdAt: -1 });
ScrapingJobSchema.index({ createdAt: -1 });

export const ScrapingJobModel = model<IScrapingJobDocument>('ScrapingJob', ScrapingJobSchema);
