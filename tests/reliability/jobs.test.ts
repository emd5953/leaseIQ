import { describe, it, expect, vi } from 'vitest';
import { ScrapingOrchestrator } from '../../src/ingestion/services/orchestrator';
import { ListingSource } from '../../src/ingestion/types';
import { ScrapingJobModel } from '../../src/ingestion/models';

describe('Import failure accounting', () => {
  function orchestrator(results: unknown[]) {
    const instance = Object.create(ScrapingOrchestrator.prototype) as any;
    instance.rateLimiter = { acquire: vi.fn() };
    instance.scrapers = new Map([[ListingSource.STREETEASY, { scrape: vi.fn().mockResolvedValue(results) }]]);
    instance.errorHandler = { handleError: vi.fn() };
    return instance;
  }
  it('counts returned errors and rejected writes and retains useful job diagnostics', async () => {
    const instance = orchestrator([{}, {}, {}]);
    instance.processListing = vi.fn().mockResolvedValueOnce('new').mockResolvedValueOnce('error').mockRejectedValueOnce(new Error('Storage validation failed'));
    const result = await instance.processSingleSource(ListingSource.STREETEASY);
    expect(result).toMatchObject({ listingsScraped: 3, errors: 2, newAdded: 1 });
    expect(result.issues).toContain('Storage validation failed');
  });
  it('does not report an empty scrape as a successful refresh', async () => {
    const result = await orchestrator([]).processSingleSource(ListingSource.STREETEASY);
    expect(result.errors).toBe(1);
    expect(result.issues[0]).toContain('no usable listings');
  });
  it('marks partial imports failed while preserving successful counts', async () => {
    const create = vi.spyOn(ScrapingJobModel, 'create').mockResolvedValue({} as never);
    const update = vi.spyOn(ScrapingJobModel, 'findOneAndUpdate').mockResolvedValue({} as never);
    const instance = orchestrator([]);
    instance.processSingleSource = vi.fn().mockResolvedValue({ source: ListingSource.STREETEASY, listingsScraped: 3, newAdded: 1, duplicates: 1, errors: 1, duration: 10, issues: ['Invalid price'] });
    instance.metricsTracker = { recordJobResult: vi.fn() };
    try {
      await instance.runPartialScrape([ListingSource.STREETEASY]);
      expect(update.mock.calls[0][1]).toMatchObject({ status: 'failed', newListingsAdded: 1, duplicatesDetected: 1, errorsEncountered: 1 });
    } finally { create.mockRestore(); update.mockRestore(); }
  });
});
