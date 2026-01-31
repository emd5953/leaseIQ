import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ScrapingJobModel } from './scrapingJob.schema';
import { ListingSource } from '../types';

describe('ScrapingJob Schema', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should create a valid scraping job', async () => {
    const job = new ScrapingJobModel({
      jobId: 'job-123',
      status: 'pending',
      sources: [ListingSource.STREETEASY, ListingSource.ZILLOW],
    });

    const saved = await job.save();
    expect(saved._id).toBeDefined();
    expect(saved.jobId).toBe('job-123');
    expect(saved.status).toBe('pending');
    expect(saved.totalListingsScraped).toBe(0);
    expect(saved.createdAt).toBeDefined();
  });

  it('should update job status and metrics', async () => {
    const job = new ScrapingJobModel({
      jobId: 'job-456',
      status: 'running',
      sources: [ListingSource.CRAIGSLIST],
      startTime: new Date(),
    });

    await job.save();

    job.status = 'completed';
    job.endTime = new Date();
    job.totalListingsScraped = 100;
    job.newListingsAdded = 80;
    job.duplicatesDetected = 20;
    job.errorsEncountered = 5;
    job.sourceResults = [{
      source: ListingSource.CRAIGSLIST,
      listingsScraped: 100,
      errors: 5,
      duration: 30000,
    }];

    const updated = await job.save();
    expect(updated.status).toBe('completed');
    expect(updated.totalListingsScraped).toBe(100);
    expect(updated.sourceResults.length).toBe(1);
  });

  it('should enforce unique jobId', async () => {
    const job1 = new ScrapingJobModel({
      jobId: 'duplicate-job',
      status: 'pending',
      sources: [ListingSource.FACEBOOK],
    });

    await job1.save();

    const job2 = new ScrapingJobModel({
      jobId: 'duplicate-job',
      status: 'pending',
      sources: [ListingSource.ZILLOW],
    });

    await expect(job2.save()).rejects.toThrow();
  });

  it('should validate source enum values', async () => {
    const job = new ScrapingJobModel({
      jobId: 'job-789',
      status: 'pending',
      sources: ['invalid_source'],
    });

    await expect(job.save()).rejects.toThrow();
  });
});
