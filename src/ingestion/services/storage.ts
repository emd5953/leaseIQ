import mongoose from 'mongoose';
import { ListingModel } from '../models';
import { NormalizedListing, Coordinates, ListingSource } from '../types';

/**
 * Listing storage service for MongoDB operations
 */
export class ListingStorage {
  /**
   * Insert a new listing
   */
  async insertListing(listing: NormalizedListing, coordinates: Coordinates | null): Promise<string> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const doc = new ListingModel({
        sources: [{
          source: listing.source,
          sourceUrl: listing.sourceUrl,
          sourceId: listing.sourceId,
          firstSeenAt: listing.scrapedAt,
          lastSeenAt: listing.scrapedAt,
        }],
        address: listing.address,
        coordinates: coordinates ? {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude],
        } : undefined,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        squareFeet: listing.squareFeet,
        description: listing.description,
        images: listing.images,
        amenities: listing.amenities,
        petPolicy: listing.petPolicy,
        brokerFee: listing.brokerFee,
        isActive: true,
      });

      const saved = await doc.save({ session });
      await session.commitTransaction();
      return saved._id.toString();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update an existing listing
   */
  async updateListing(id: string, listing: NormalizedListing, coordinates: Coordinates | null): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const update: any = {
        address: listing.address,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        squareFeet: listing.squareFeet,
        description: listing.description,
        images: listing.images,
        amenities: listing.amenities,
        petPolicy: listing.petPolicy,
        brokerFee: listing.brokerFee,
        isActive: true,
        updatedAt: new Date(),
      };

      if (coordinates) {
        update.coordinates = {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude],
        };
      }

      await ListingModel.findByIdAndUpdate(id, update, { session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Find listing by source and sourceId
   */
  async findBySourceId(source: ListingSource, sourceId: string): Promise<any | null> {
    return await ListingModel.findOne({
      'sources.source': source,
      'sources.sourceId': sourceId,
    });
  }

  /**
   * Find listings by address
   */
  async findByAddress(address: string): Promise<any[]> {
    return await ListingModel.find({
      'address.fullAddress': address,
    });
  }

  /**
   * Mark listing as inactive
   */
  async markInactive(id: string): Promise<void> {
    await ListingModel.findByIdAndUpdate(id, {
      isActive: false,
      updatedAt: new Date(),
    });
  }

  /**
   * Mark stale listings as inactive
   */
  async markStaleListingsInactive(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await ListingModel.updateMany(
      {
        isActive: true,
        updatedAt: { $lt: cutoffDate },
      },
      {
        isActive: false,
        updatedAt: new Date(),
      }
    );

    return result.modifiedCount;
  }
}
