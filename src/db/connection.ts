import mongoose from 'mongoose';

/**
 * MongoDB connection configuration options
 */
const CONNECTION_OPTIONS = {
  maxPoolSize: 10,              // Maximum connection pool size
  minPoolSize: 2,               // Minimum connection pool size
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Maximum number of connection retry attempts
 */
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Initial retry delay in milliseconds
 */
const INITIAL_RETRY_DELAY = 1000;

/**
 * Connection state tracking
 */
let isConnected = false;

/**
 * Calculate exponential backoff delay
 * @param attempt - Current retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, attempt);
}

/**
 * Sanitize MongoDB URI for logging (remove credentials)
 * @param uri - MongoDB connection URI
 * @returns Sanitized URI string
 */
function sanitizeUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.username || url.password) {
      return uri.replace(/\/\/[^@]+@/, '//***:***@');
    }
    return uri;
  } catch {
    return '[invalid URI]';
  }
}

/**
 * Attempt to connect to MongoDB with retry logic
 * @param uri - MongoDB connection URI
 * @param attempt - Current attempt number (0-indexed)
 * @returns Promise that resolves when connected
 * @throws Error if all retry attempts fail
 */
async function connectWithRetry(uri: string, attempt: number = 0): Promise<void> {
  try {
    await mongoose.connect(uri, CONNECTION_OPTIONS);
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`MongoDB connection attempt ${attempt + 1} failed: ${errorMessage}`);
    console.error(`Connection URI: ${sanitizeUri(uri)}`);

    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      const delay = calculateBackoffDelay(attempt);
      console.log(`Retrying connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(uri, attempt + 1);
    } else {
      console.error(`Failed to connect to MongoDB after ${MAX_RETRY_ATTEMPTS} attempts`);
      throw new Error(`MongoDB connection failed after ${MAX_RETRY_ATTEMPTS} attempts: ${errorMessage}`);
    }
  }
}

/**
 * Initialize MongoDB connection
 * Reads MONGODB_URI from environment variables and establishes connection
 * with automatic retry logic using exponential backoff
 * 
 * @returns Promise that resolves when connection is established
 * @throws Error if MONGODB_URI is not set or connection fails after all retries
 */
export async function initializeConnection(): Promise<void> {
  // Check if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return;
  }

  // Get MongoDB URI from environment variable
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Set up connection event handlers
  mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
    isConnected = false;
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Mongoose connection closed due to application termination');
    process.exit(0);
  });

  // Attempt connection with retry logic
  await connectWithRetry(mongoUri);
}

/**
 * Close MongoDB connection
 * @returns Promise that resolves when connection is closed
 */
export async function closeConnection(): Promise<void> {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('MongoDB connection closed');
  }
}

/**
 * Get current connection status
 * @returns Boolean indicating if connected
 */
export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
