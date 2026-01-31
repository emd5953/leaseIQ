import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { User, IUser } from '../../src/models/user.model';

describe('User Model Property Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // Feature: database-schema-models, Property 1: User Document Schema Completeness
  it('Property 1: User Document Schema Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          supabaseId: fc.uuid(),
          email: fc.emailAddress(),
          displayName: fc.option(fc.string(), { nil: null }),
        }),
        async (userData) => {
          // Create user document
          const user = await User.create(userData);

          // Verify all required fields are present
          expect(user.supabaseId).toBeDefined();
          expect(typeof user.supabaseId).toBe('string');
          expect(user.supabaseId.length).toBeGreaterThan(0);

          expect(user.email).toBeDefined();
          expect(typeof user.email).toBe('string');
          expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

          expect(user.displayName !== undefined).toBe(true);
          if (user.displayName !== null) {
            expect(typeof user.displayName).toBe('string');
          }

          expect(user.createdAt).toBeDefined();
          expect(user.createdAt).toBeInstanceOf(Date);

          expect(user.lastLoginAt).toBeDefined();
          expect(user.lastLoginAt).toBeInstanceOf(Date);

          expect(user.updatedAt).toBeDefined();
          expect(user.updatedAt).toBeInstanceOf(Date);

          // Verify retrieved document has same completeness
          const retrievedUser = await User.findById(user._id);
          expect(retrievedUser).not.toBeNull();
          
          if (retrievedUser) {
            expect(retrievedUser.supabaseId).toBe(user.supabaseId);
            expect(retrievedUser.email).toBe(user.email);
            expect(retrievedUser.displayName).toBe(user.displayName);
            expect(retrievedUser.createdAt).toEqual(user.createdAt);
            expect(retrievedUser.lastLoginAt).toEqual(user.lastLoginAt);
            expect(retrievedUser.updatedAt).toEqual(user.updatedAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 7: Automatic Timestamp Creation
  // **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
  it('Property 7: Automatic Timestamp Creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          supabaseId: fc.uuid(),
          email: fc.emailAddress(),
          displayName: fc.option(fc.string(), { nil: null }),
        }),
        async (userData) => {
          const beforeCreation = new Date();
          
          // Create user document
          const user = await User.create(userData);
          
          const afterCreation = new Date();

          // Verify createdAt is automatically set
          expect(user.createdAt).toBeDefined();
          expect(user.createdAt).toBeInstanceOf(Date);
          
          // Verify createdAt is in ISO 8601 format (Date object can be converted to ISO string)
          expect(user.createdAt.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          
          // Verify createdAt is set to current UTC time (within reasonable bounds)
          expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
          expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());

          // Wait a small amount of time and update the document
          await new Promise(resolve => setTimeout(resolve, 10));
          
          user.displayName = 'Updated Name';
          await user.save();

          // Verify createdAt does NOT change on update
          const updatedUser = await User.findById(user._id);
          expect(updatedUser).not.toBeNull();
          
          if (updatedUser) {
            expect(updatedUser.createdAt.getTime()).toBe(user.createdAt.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 8: Automatic Timestamp Updates
  // **Validates: Requirements 10.2, 10.3, 10.5**
  it('Property 8: Automatic Timestamp Updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          supabaseId: fc.uuid(),
          email: fc.emailAddress(),
          displayName: fc.option(fc.string(), { nil: null }),
        }),
        fc.string().filter(s => s.length > 0),
        async (userData, newDisplayName) => {
          // Create user document
          const user = await User.create(userData);
          
          const originalCreatedAt = user.createdAt;
          const originalUpdatedAt = user.updatedAt;

          // Wait to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));

          const beforeUpdate = new Date();
          
          // Update the document
          user.displayName = newDisplayName;
          await user.save();
          
          const afterUpdate = new Date();

          // Verify updatedAt is automatically updated
          expect(user.updatedAt).toBeDefined();
          expect(user.updatedAt).toBeInstanceOf(Date);
          
          // Verify updatedAt is in ISO 8601 format
          expect(user.updatedAt.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          
          // Verify updatedAt is set to current UTC time (within reasonable bounds)
          expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
          expect(user.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
          
          // Verify updatedAt is different from original
          expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

          // Verify createdAt is preserved (not modified)
          expect(user.createdAt.getTime()).toBe(originalCreatedAt.getTime());

          // Verify the same behavior when retrieving from database
          const retrievedUser = await User.findById(user._id);
          expect(retrievedUser).not.toBeNull();
          
          if (retrievedUser) {
            expect(retrievedUser.updatedAt.getTime()).toBe(user.updatedAt.getTime());
            expect(retrievedUser.createdAt.getTime()).toBe(originalCreatedAt.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 9: User-Supabase ID Uniqueness
  // **Validates: Requirements 1.1, 1.4**
  it('Property 9: User-Supabase ID Uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        fc.emailAddress(),
        fc.option(fc.string(), { nil: null }),
        fc.option(fc.string(), { nil: null }),
        async (supabaseId, email1, email2, displayName1, displayName2) => {
          // Create first user with the supabaseId
          const user1 = await User.create({
            supabaseId,
            email: email1,
            displayName: displayName1,
          });

          // Verify first user was created successfully
          expect(user1).toBeDefined();
          expect(user1.supabaseId).toBe(supabaseId);

          // Attempt to create second user with the same supabaseId
          let duplicateError: Error | null = null;
          try {
            await User.create({
              supabaseId, // Same supabaseId
              email: email2, // Different email
              displayName: displayName2,
            });
          } catch (error) {
            duplicateError = error as Error;
          }

          // Verify that duplicate supabaseId was rejected
          expect(duplicateError).not.toBeNull();
          
          if (duplicateError) {
            // Check for MongoDB duplicate key error (E11000)
            expect(duplicateError.message).toMatch(/duplicate key|E11000/i);
          }

          // Verify only one user exists with this supabaseId
          const usersWithSameSupabaseId = await User.find({ supabaseId });
          expect(usersWithSameSupabaseId).toHaveLength(1);
          expect(usersWithSameSupabaseId[0]._id.toString()).toBe(user1._id.toString());

          // Verify referential integrity: querying by supabaseId returns the correct user
          const queriedUser = await User.findOne({ supabaseId });
          expect(queriedUser).not.toBeNull();
          
          if (queriedUser) {
            expect(queriedUser._id.toString()).toBe(user1._id.toString());
            expect(queriedUser.email).toBe(email1);
            expect(queriedUser.displayName).toBe(displayName1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
