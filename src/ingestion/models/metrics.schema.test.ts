import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MetricsModel } from './metrics.schema';
import { ListingSource } from '../types';

describe('Metrics Schema', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should create valid metrics record', async () => {
    const metrics = new MetricsModel({
      jobId: 'job-123',
      timestamp: new Date(),
      totalListingsScraped: 150,
      newListingsAdded: 120,
      duplicatesDetected: 30,
      errorsEncountered: 5,
      duration: 45000,
      sourceBreakdown: [
        {
          source: ListingSource.STREETEASY,
          listingsScraped: 50,
          errors: 2,
          duration: 15000,
        },
        {
          source: ListingSource.ZILLOW,
          listingsScraped: 100,
          errors: 3,
          duration: 30000,
        },
      ],
    });

    const saved = await metrics.save();
    expect(saved._id).toBeDefined();
    expect(saved.jobId).toBe('job-123');
    expect(saved.totalListingsScraped).toBe(150);
    expect(saved.sourceBreakdown.length).toBe(2);
  });

  it('should allow multiple metrics for same jobId', async () => {
    const metrics1 = new MetricsModel({
      jobId: 'job-456',
      timestamp: new Date(),
      totalListingsScraped: 100,
      newListingsAdded: 80,
      duplicatesDetected: 20,
      errorsEncountered: 0,
      duration: 30000,
      sourceBreakdown: [],
    });

    const metrics2 = new MetricsModel({
      jobId: 'job-456',
      timestamp: new Date(),
      totalListingsScraped: 200,
      newListingsAdded: 150,
      duplicatesDetected: 50,
      errorsEncountered: 5,
      duration: 60000,
      sourceBreakdown: [],
    });

    await metrics1.save();
    await metrics2.save();

    const found = await MetricsModel.find({ jobId: 'job-456' });
    expect(found.length).toBe(2);
  });

  it('should require jobId field', async () => {
    const metrics = new MetricsModel({
      // Missing jobId
      timestamp: new Date(),
      totalListingsScraped: 100,
      newListingsAdded: 80,
      duplicatesDetected: 20,
      errorsEncountered: 0,
      duration: 30000,
      sourceBreakdown: [],
    });

    await expect(metrics.save()).rejects.toThrow();
  });
});
