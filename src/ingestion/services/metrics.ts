import { MetricsModel } from '../models';
import { ScrapingJobResult, Metrics } from '../types';

/**
 * Metrics tracker for scraping jobs
 */
export class MetricsTracker {
  /**
   * Record a scraping job result
   */
  async recordJobResult(result: ScrapingJobResult): Promise<void> {
    const duration = result.endTime.getTime() - result.startTime.getTime();

    await MetricsModel.create({
      jobId: result.jobId,
      timestamp: result.endTime,
      totalListingsScraped: result.totalListingsScraped,
      newListingsAdded: result.newListingsAdded,
      duplicatesDetected: result.duplicatesDetected,
      errorsEncountered: result.errorsEncountered,
      duration,
      sourceBreakdown: result.sourceResults,
    });
  }

  /**
   * Get metrics for a time period
   */
  async getMetrics(startDate: Date, endDate: Date): Promise<Metrics> {
    const metrics = await MetricsModel.find({
      timestamp: { $gte: startDate, $lte: endDate },
    });

    if (metrics.length === 0) {
      return {
        totalJobs: 0,
        totalListingsScraped: 0,
        totalNewListings: 0,
        totalDuplicates: 0,
        totalErrors: 0,
        averageJobDuration: 0,
        sourceBreakdown: [],
      };
    }

    const totalJobs = metrics.length;
    const totalListingsScraped = metrics.reduce((sum, m) => sum + m.totalListingsScraped, 0);
    const totalNewListings = metrics.reduce((sum, m) => sum + m.newListingsAdded, 0);
    const totalDuplicates = metrics.reduce((sum, m) => sum + m.duplicatesDetected, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorsEncountered, 0);
    const averageJobDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / totalJobs;

    // Aggregate source breakdown
    const sourceMap = new Map();
    for (const metric of metrics) {
      for (const source of metric.sourceBreakdown) {
        if (!sourceMap.has(source.source)) {
          sourceMap.set(source.source, {
            source: source.source,
            listingsScraped: 0,
            totalDuration: 0,
            successCount: 0,
            errorCount: 0,
          });
        }
        const data = sourceMap.get(source.source);
        data.listingsScraped += source.listingsScraped;
        data.totalDuration += source.duration;
        data.errorCount += source.errors;
        if (source.errors === 0) data.successCount++;
      }
    }

    const sourceBreakdown = Array.from(sourceMap.values()).map(data => ({
      source: data.source,
      listingsScraped: data.listingsScraped,
      successRate: data.successCount / totalJobs,
      averageDuration: data.totalDuration / totalJobs,
    }));

    return {
      totalJobs,
      totalListingsScraped,
      totalNewListings,
      totalDuplicates,
      totalErrors,
      averageJobDuration,
      sourceBreakdown,
    };
  }
}
