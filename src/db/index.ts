/**
 * Database initialization
 * Central export point for database connection and models
 */

import { initializeConnection } from './connection';

// Import all models to ensure they're registered with Mongoose
import '../models/user.model';
import '../models/listing.model';
import '../models/userPreferences.model';
import '../models/savedSearch.model';
import '../models/listingInteraction.model';
import '../models/alertHistory.model';

/**
 * Initialize database connection and register all models
 * 
 * @returns Promise that resolves when database is connected
 */
export async function initializeDatabase(): Promise<void> {
  await initializeConnection();
}

// Re-export connection utilities
export { initializeConnection, closeConnection, isMongoConnected } from './connection';

// Re-export all models
export * from '../models';
