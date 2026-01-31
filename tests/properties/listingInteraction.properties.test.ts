import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { ListingInteraction, IListingInteraction } from '../../src/models/listingInteraction.model';
import { User } from '../../src/models/user.model';
import { Listing } from '../../src/models/listing.model';

describe('ListingInteraction Model Property Tests', () => {
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

  // Feature: database-schema-models, Property 5: Listing Interaction Schema Completeness
  // **Validates: Requirements 7.1, 7.2**
  it('Property 5: Listing Interaction Schema Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          interactionType: fc.constantFrom('viewed', 'saved', 'hidden'),
          viewDurationSeconds: fc.option(fc.nat(), { nil: null }),
          notes: fc.option(fc.string(), { nil: null })
        }),
        async (interactionData) => {
          // Create a user and listing for referential integrity
          const user = await User.create({
            supabaseId: fc.sample(fc.uuid(), 1)[0],
            email: fc.sample(fc.emailAddress(), 1)[0]
          });

          const listing = await Listing.create({
            address: {
              street: '123 Test St',
              unit: null,
              city: 'Test City',
              state: 'TS',
              zipCode: '12345',
              coordinates: {
                type: 'Point',
                coordinates: [-73.935242, 40.730610]
              }
            },
            price: 2000,
            bedrooms: 2,
            bathrooms: 1,
            squareFootage: 800,
            description: 'Test listing',
            images: [],
            amenities: [],
            petPolicy: {
              dogsAllowed: false,
              catsAllowed: false,
              petDeposit: null
            },
            brokerFee: {
              required: false,
              amount: null
            },
            sources: [{
              sourceName: 'TestSource',
              sourceId: 'test-123',
              sourceUrl: 'https://test.com/listing',
              scrapedAt: new Date()
            }],
            isActive: true
          });

          // Create listing interaction document
          const interaction = await ListingInteraction.create({
            userId: user._id,
            listingId: listing._id,
            interactionType: interactionData.interactionType,
            metadata: {
              viewDurationSeconds: interactionData.viewDurationSeconds,
              notes: interactionData.notes
            }
          });

          // Verify all required fields are present with correct types
          expect(interaction.userId).toBeDefined();
          expect(interaction.userId).toBeInstanceOf(mongoose.Types.ObjectId);

          expect(interaction.listingId).toBeDefined();
          expect(interaction.listingId).toBeInstanceOf(mongoose.Types.ObjectId);

          expect(interaction.interactionType).toBeDefined();
          expect(typeof interaction.interactionType).toBe('string');
          expect(['viewed', 'saved', 'hidden']).toContain(interaction.interactionType);

          expect(interaction.timestamp).toBeDefined();
          expect(interaction.timestamp).toBeInstanceOf(Date);

          // Verify optional metadata fields
          expect(interaction.metadata).toBeDefined();
          expect(typeof interaction.metadata).toBe('object');
          
          if (interaction.metadata.viewDurationSeconds !== null) {
            expect(typeof interaction.metadata.viewDurationSeconds).toBe('number');
          }
          
          if (interaction.metadata.notes !== null) {
            expect(typeof interaction.metadata.notes).toBe('string');
          }

          // Verify retrieved document has same completeness
          const retrievedInteraction = await ListingInteraction.findById(interaction._id);
          expect(retrievedInteraction).not.toBeNull();
          
          if (retrievedInteraction) {
            expect(retrievedInteraction.userId.toString()).toBe(interaction.userId.toString());
            expect(retrievedInteraction.listingId.toString()).toBe(interaction.listingId.toString());
            expect(retrievedInteraction.interactionType).toBe(interaction.interactionType);
            expect(retrievedInteraction.timestamp).toEqual(interaction.timestamp);
            expect(retrievedInteraction.metadata.viewDurationSeconds).toBe(interaction.metadata.viewDurationSeconds);
            expect(retrievedInteraction.metadata.notes).toBe(interaction.metadata.notes);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 16: Listing Interaction Recording
  // **Validates: Requirements 7.3, 7.4, 7.5**
  it('Property 16: Listing Interaction Recording', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('viewed', 'saved', 'hidden'),
        async (actionType) => {
          // Create a user and listing
          const user = await User.create({
            supabaseId: fc.sample(fc.uuid(), 1)[0],
            email: fc.sample(fc.emailAddress(), 1)[0]
          });

          const listing = await Listing.create({
            address: {
              street: '456 Action St',
              unit: null,
              city: 'Action City',
              state: 'AC',
              zipCode: '54321',
              coordinates: {
                type: 'Point',
                coordinates: [-74.006, 40.7128]
              }
            },
            price: 2500,
            bedrooms: 1,
            bathrooms: 1,
            squareFootage: 600,
            description: 'Test listing for interaction',
            images: [],
            amenities: [],
            petPolicy: {
              dogsAllowed: true,
              catsAllowed: false,
              petDeposit: 500
            },
            brokerFee: {
              required: false,
              amount: null
            },
            sources: [{
              sourceName: 'TestSource',
              sourceId: 'test-456',
              sourceUrl: 'https://test.com/listing2',
              scrapedAt: new Date()
            }],
            isActive: true
          });

          const beforeAction = new Date();

          // Simulate user action on listing
          let interaction: IListingInteraction;
          
          if (actionType === 'viewed') {
            // When a user views a listing
            interaction = await ListingInteraction.create({
              userId: user._id,
              listingId: listing._id,
              interactionType: 'viewed',
              metadata: {
                viewDurationSeconds: 30,
                notes: null
              }
            });
          } else if (actionType === 'saved') {
            // When a user saves a listing
            interaction = await ListingInteraction.create({
              userId: user._id,
              listingId: listing._id,
              interactionType: 'saved',
              metadata: {
                viewDurationSeconds: null,
                notes: 'Interesting apartment'
              }
            });
          } else {
            // When a user hides a listing
            interaction = await ListingInteraction.create({
              userId: user._id,
              listingId: listing._id,
              interactionType: 'hidden',
              metadata: {
                viewDurationSeconds: null,
                notes: null
              }
            });
          }

          const afterAction = new Date();

          // Verify interaction was created with correct userId
          expect(interaction.userId.toString()).toBe(user._id.toString());

          // Verify interaction was created with correct listingId
          expect(interaction.listingId.toString()).toBe(listing._id.toString());

          // Verify interaction type matches the action
          expect(interaction.interactionType).toBe(actionType);

          // Verify timestamp is current
          expect(interaction.timestamp).toBeInstanceOf(Date);
          expect(interaction.timestamp.getTime()).toBeGreaterThanOrEqual(beforeAction.getTime());
          expect(interaction.timestamp.getTime()).toBeLessThanOrEqual(afterAction.getTime());

          // Verify the interaction can be retrieved from database
          const retrievedInteraction = await ListingInteraction.findOne({
            userId: user._id,
            listingId: listing._id,
            interactionType: actionType
          });

          expect(retrievedInteraction).not.toBeNull();
          if (retrievedInteraction) {
            expect(retrievedInteraction.userId.toString()).toBe(user._id.toString());
            expect(retrievedInteraction.listingId.toString()).toBe(listing._id.toString());
            expect(retrievedInteraction.interactionType).toBe(actionType);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 17: Interaction Type Querying
  // **Validates: Requirements 7.6**
  it('Property 17: Interaction Type Querying', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('viewed', 'saved', 'hidden'),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (targetInteractionType, numTargetInteractions, numOtherInteractions) => {
          // Create a user
          const user = await User.create({
            supabaseId: fc.sample(fc.uuid(), 1)[0],
            email: fc.sample(fc.emailAddress(), 1)[0]
          });

          const targetListingIds: string[] = [];
          const otherListingIds: string[] = [];

          // Create listings with target interaction type
          for (let i = 0; i < numTargetInteractions; i++) {
            const listing = await Listing.create({
              address: {
                street: `${100 + i} Target St`,
                unit: null,
                city: 'Query City',
                state: 'QC',
                zipCode: '11111',
                coordinates: {
                  type: 'Point',
                  coordinates: [-73.9 - i * 0.01, 40.7 + i * 0.01]
                }
              },
              price: 2000 + i * 100,
              bedrooms: 1,
              bathrooms: 1,
              squareFootage: 700,
              description: `Target listing ${i}`,
              images: [],
              amenities: [],
              petPolicy: {
                dogsAllowed: false,
                catsAllowed: false,
                petDeposit: null
              },
              brokerFee: {
                required: false,
                amount: null
              },
              sources: [{
                sourceName: 'TestSource',
                sourceId: `target-${i}`,
                sourceUrl: `https://test.com/target-${i}`,
                scrapedAt: new Date()
              }],
              isActive: true
            });

            await ListingInteraction.create({
              userId: user._id,
              listingId: listing._id,
              interactionType: targetInteractionType,
              metadata: {
                viewDurationSeconds: null,
                notes: null
              }
            });

            targetListingIds.push(listing._id.toString());
          }

          // Create listings with other interaction types
          const otherTypes = ['viewed', 'saved', 'hidden'].filter(t => t !== targetInteractionType);
          for (let i = 0; i < numOtherInteractions; i++) {
            const listing = await Listing.create({
              address: {
                street: `${200 + i} Other St`,
                unit: null,
                city: 'Query City',
                state: 'QC',
                zipCode: '22222',
                coordinates: {
                  type: 'Point',
                  coordinates: [-74.0 - i * 0.01, 40.8 + i * 0.01]
                }
              },
              price: 3000 + i * 100,
              bedrooms: 2,
              bathrooms: 1,
              squareFootage: 900,
              description: `Other listing ${i}`,
              images: [],
              amenities: [],
              petPolicy: {
                dogsAllowed: true,
                catsAllowed: false,
                petDeposit: null
              },
              brokerFee: {
                required: false,
                amount: null
              },
              sources: [{
                sourceName: 'TestSource',
                sourceId: `other-${i}`,
                sourceUrl: `https://test.com/other-${i}`,
                scrapedAt: new Date()
              }],
              isActive: true
            });

            await ListingInteraction.create({
              userId: user._id,
              listingId: listing._id,
              interactionType: otherTypes[i % otherTypes.length],
              metadata: {
                viewDurationSeconds: null,
                notes: null
              }
            });

            otherListingIds.push(listing._id.toString());
          }

          // Query for listings with target interaction type
          const interactions = await ListingInteraction.find({
            userId: user._id,
            interactionType: targetInteractionType
          });

          // Verify we get all and only the listings with target interaction type
          expect(interactions).toHaveLength(numTargetInteractions);

          const retrievedListingIds = interactions.map(i => i.listingId.toString());
          
          // All target listings should be in results
          for (const targetId of targetListingIds) {
            expect(retrievedListingIds).toContain(targetId);
          }

          // No other listings should be in results
          for (const otherId of otherListingIds) {
            expect(retrievedListingIds).not.toContain(otherId);
          }

          // Verify all returned interactions have the correct type
          for (const interaction of interactions) {
            expect(interaction.interactionType).toBe(targetInteractionType);
            expect(interaction.userId.toString()).toBe(user._id.toString());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
