import { Schema, model, Document } from 'mongoose';

/**
 * Source information for a listing
 */
export interface IListingSource {
  sourceName: string;             // e.g., "StreetEasy", "Zillow"
  sourceId: string;               // External listing ID
  sourceUrl: string;              // Direct link to listing
  scrapedAt: Date;                // When this source was last scraped
}

/**
 * Listing document interface
 * Represents a rental apartment listing from any supported source
 */
export interface IListing extends Document {
  // Core listing information
  address: {
    street: string;
    unit: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    coordinates: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude] in GeoJSON format
    };
  };
  
  // Pricing and availability
  price: number;                    // Monthly rent in USD
  availableDate: Date | null;       // Move-in date
  
  // Property details
  bedrooms: number;
  bathrooms: number;
  squareFootage: number | null;
  
  // Listing content
  description: string;
  images: string[];                 // Array of image URLs
  amenities: string[];              // Standardized amenity names
  
  // Pet policy
  petPolicy: {
    dogsAllowed: boolean;
    catsAllowed: boolean;
    petDeposit: number | null;
  };
  
  // Fee information
  brokerFee: {
    required: boolean;
    amount: number | null;          // Fee amount if known
  };
  
  // Source tracking
  sources: IListingSource[];
  
  // Metadata
  createdAt: Date;                  // First ingestion timestamp
  updatedAt: Date;                  // Last update timestamp
  isActive: boolean;                // Whether listing is still available
}

/**
 * Listing schema definition
 * Stores normalized apartment listing data from multiple sources with support for deduplication
 */
const listingSchema = new Schema<IListing>({
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      validate: {
        validator: function(v: string) {
          return v && v.trim().length > 0;
        },
        message: 'Street address cannot be empty or whitespace'
      }
    },
    unit: {
      type: String,
      default: null
    },
    city: {
      type: String,
      default: null
    },
    state: {
      type: String,
      default: null
    },
    zipCode: {
      type: String,
      default: null
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function(v: number[]) {
            // coordinates array must be [longitude, latitude]
            // longitude: -180 to 180, latitude: -90 to 90
            return Array.isArray(v) && 
                   v.length === 2 && 
                   v[0] >= -180 && v[0] <= 180 &&
                   v[1] >= -90 && v[1] <= 90;
          },
          message: 'Coordinates must be [longitude, latitude] where longitude is between -180 and 180, and latitude is between -90 and 90'
        }
      }
    }
  },
  
  price: {
    type: Number,
    required: [true, 'Price is required'],
    validate: {
      validator: function(v: number) {
        return v > 0;
      },
      message: 'Price must be a positive number'
    }
  },
  
  availableDate: {
    type: Date,
    default: null
  },
  
  bedrooms: {
    type: Number,
    required: [true, 'Number of bedrooms is required'],
    validate: {
      validator: function(v: number) {
        return Number.isInteger(v) && v >= 0;
      },
      message: 'Bedrooms must be a non-negative integer'
    }
  },
  
  bathrooms: {
    type: Number,
    required: [true, 'Number of bathrooms is required'],
    validate: {
      validator: function(v: number) {
        return v > 0;
      },
      message: 'Bathrooms must be a positive number'
    }
  },
  
  squareFootage: {
    type: Number,
    default: null
  },
  
  description: {
    type: String,
    default: ''
  },
  
  images: {
    type: [String],
    default: []
  },
  
  amenities: {
    type: [String],
    default: []
  },
  
  petPolicy: {
    dogsAllowed: {
      type: Boolean,
      required: true,
      default: false
    },
    catsAllowed: {
      type: Boolean,
      required: true,
      default: false
    },
    petDeposit: {
      type: Number,
      default: null
    }
  },
  
  brokerFee: {
    required: {
      type: Boolean,
      required: true,
      default: false
    },
    amount: {
      type: Number,
      default: null
    }
  },
  
  sources: {
    type: [{
      sourceName: {
        type: String,
        required: [true, 'Source name is required']
      },
      sourceId: {
        type: String,
        required: [true, 'Source ID is required']
      },
      sourceUrl: {
        type: String,
        required: [true, 'Source URL is required']
      },
      scrapedAt: {
        type: Date,
        required: [true, 'Scraped at timestamp is required'],
        default: Date.now
      }
    }],
    required: [true, 'At least one source is required'],
    validate: {
      validator: function(v: IListingSource[]) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Sources array cannot be empty'
    }
  },
  
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true  // Automatically manages createdAt and updatedAt
});

// Indexes for geospatial queries
listingSchema.index({ 'address.coordinates': '2dsphere' });

// Compound index for deduplication
listingSchema.index({ 'address.street': 1, 'address.unit': 1 });

// Compound index for common queries
listingSchema.index({ price: 1, bedrooms: 1, createdAt: -1 });

// Compound index for source lookups
listingSchema.index({ 'sources.sourceId': 1, 'sources.sourceName': 1 });

// Compound index for active listing queries
listingSchema.index({ isActive: 1, updatedAt: -1 });

/**
 * Listing model
 * Export Mongoose model for Listing collection
 */
export const Listing = model<IListing>('Listing', listingSchema);
