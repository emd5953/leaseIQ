import Bottleneck from 'bottleneck';
import { RateLimitConfig } from '../types';

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private limiters: Map<string, Bottleneck>;

  constructor() {
    this.limiters = new Map();
  }

  /**
   * Acquire permission to make a request
   */
  async acquire(resource: string): Promise<void> {
    const limiter = this.limiters.get(resource);
    if (!limiter) {
      throw new Error(`Rate limiter not configured for resource: ${resource}`);
    }

    await limiter.schedule(() => Promise.resolve());
  }

  /**
   * Configure rate limit for a resource
   */
  configure(resource: string, config: RateLimitConfig): void {
    const limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: config.windowMs / config.maxRequests,
      reservoir: config.maxRequests,
      reservoirRefreshAmount: config.maxRequests,
      reservoirRefreshInterval: config.windowMs,
    });

    this.limiters.set(resource, limiter);
  }

  /**
   * Remove rate limiter for a resource
   */
  remove(resource: string): void {
    const limiter = this.limiters.get(resource);
    if (limiter) {
      limiter.stop();
      this.limiters.delete(resource);
    }
  }

  /**
   * Stop all rate limiters
   */
  stopAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.stop();
    }
    this.limiters.clear();
  }
}
