import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { initializeConnection, closeConnection, isMongoConnected } from './connection';

describe('MongoDB Connection', () => {
  beforeEach(() => {
    // Clear any existing connection
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    // Clear environment variables
    delete process.env.MONGODB_URI;
  });

  afterEach(async () => {
    // Clean up connections after each test
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should throw error when MONGODB_URI is not set', async () => {
    await expect(initializeConnection()).rejects.toThrow(
      'MONGODB_URI environment variable is not set'
    );
  });

  it('should export initializeConnection function', () => {
    expect(typeof initializeConnection).toBe('function');
  });

  it('should export closeConnection function', () => {
    expect(typeof closeConnection).toBe('function');
  });

  it('should export isMongoConnected function', () => {
    expect(typeof isMongoConnected).toBe('function');
  });

  it('should return false for isMongoConnected when not connected', () => {
    expect(isMongoConnected()).toBe(false);
  });
});
