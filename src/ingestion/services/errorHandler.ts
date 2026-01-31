import { ErrorContext } from '../types';

export enum ErrorCategory {
  NETWORK = 'network',
  PARSING = 'parsing',
  VALIDATION = 'validation',
  STORAGE = 'storage',
  RATE_LIMIT = 'rate_limit',
  GEOCODING = 'geocoding',
}

/**
 * Centralized error handler
 */
export class ErrorHandler {
  private maxRetries: number = 3;
  private baseDelay: number = 1000;

  /**
   * Handle an error with context
   */
  async handleError(error: Error, context: ErrorContext): Promise<void> {
    const category = this.categorizeError(error);
    
    console.error(`[${category}] Error in ${context.operation}:`, {
      error: error.message,
      source: context.source,
      listingId: context.listingId,
      metadata: context.metadata,
    });
  }

  /**
   * Determine if error is retryable
   */
  isRetryable(error: Error): boolean {
    const category = this.categorizeError(error);
    return category === ErrorCategory.NETWORK || category === ErrorCategory.RATE_LIMIT;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = this.maxRetries
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryable(lastError)) {
          await this.handleError(lastError, context);
          return null;
        }

        if (attempt < maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this.delay(delay);
        }
      }
    }

    if (lastError) {
      await this.handleError(lastError, context);
    }
    return null;
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('parse') || message.includes('json')) {
      return ErrorCategory.PARSING;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('database') || message.includes('mongo')) {
      return ErrorCategory.STORAGE;
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('geocod')) {
      return ErrorCategory.GEOCODING;
    }

    return ErrorCategory.NETWORK; // Default
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
