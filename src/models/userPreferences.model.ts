import { Schema, model, Document, Types } from 'mongoose';

/**
 * User Preferences document interface
 * Represents user search criteria for listing matching and alert generation
 */
export interface IUserPreferences extends Document {
  userId: Types.ObjectId;           // Reference to User document
  
  // Price range
  minPrice: number | null;
  maxPrice: number | null;
  
  // Bedroom range
  minBedrooms: number | null;
  maxBedrooms: number | null;
  
  // Bathroom range
  minBathrooms: number | null;
  maxBathrooms: number | null;
  
  // Square footage range
  minSquareFootage: number | null;
  maxSquareFootage: number | null;
  
  // Location preferences
  neighborhoods: string[];          // Array of neighborhood names
  
  // Move-in date range
  earliestMoveIn: Date | null;
  latestMoveIn: Date | null;
  
  // Commute preferences
  commuteDestination: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  } | null;
  maxCommuteMinutes: number | null;
  
  // Amenities
  requiredAmenities: string[];      // Must have all of these
  
  // Pet requirements
  requiresDogsAllowed: boolean;
  requiresCatsAllowed: boolean;
  
  // Fee preferences
  noFeeOnly: boolean;
  
  // Listing freshness
  maxListingAgeDays: number | null; // Only show listings from last N days
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Preferences schema definition
 * Stores user search criteria for listing matching and alert generation
 */
const userPreferencesSchema = new Schema<IUserPreferences>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true,
    index: true
  },
  
  minPrice: {
    type: Number,
    default: null
  },
  
  maxPrice: {
    type: Number,
    default: null
  },
  
  minBedrooms: {
    type: Number,
    default: null
  },
  
  maxBedrooms: {
    type: Number,
    default: null
  },
  
  minBathrooms: {
    type: Number,
    default: null
  },
  
  maxBathrooms: {
    type: Number,
    default: null
  },
  
  minSquareFootage: {
    type: Number,
    default: null
  },
  
  maxSquareFootage: {
    type: Number,
    default: null
  },
  
  neighborhoods: {
    type: [String],
    default: []
  },
  
  earliestMoveIn: {
    type: Date,
    default: null
  },
  
  latestMoveIn: {
    type: Date,
    default: null
  },
  
  commuteDestination: {
    type: {
      address: {
        type: String,
        required: true
      },
      coordinates: {
        latitude: {
          type: Number,
          required: true,
          validate: {
            validator: function(v: number) {
              return v >= -90 && v <= 90;
            },
            message: 'Latitude must be between -90 and 90'
          }
        },
        longitude: {
          type: Number,
          required: true,
          validate: {
            validator: function(v: number) {
              return v >= -180 && v <= 180;
            },
            message: 'Longitude must be between -180 and 180'
          }
        }
      }
    },
    default: null
  },
  
  maxCommuteMinutes: {
    type: Number,
    default: null,
    validate: {
      validator: function(v: number | null) {
        return v === null || v > 0;
      },
      message: 'Max commute minutes must be a positive number'
    }
  },
  
  requiredAmenities: {
    type: [String],
    default: []
  },
  
  requiresDogsAllowed: {
    type: Boolean,
    default: false
  },
  
  requiresCatsAllowed: {
    type: Boolean,
    default: false
  },
  
  noFeeOnly: {
    type: Boolean,
    default: false
  },
  
  maxListingAgeDays: {
    type: Number,
    default: null,
    validate: {
      validator: function(v: number | null) {
        return v === null || (Number.isInteger(v) && v > 0);
      },
      message: 'Max listing age days must be a positive integer'
    }
  }
}, {
  timestamps: true  // Automatically manages createdAt and updatedAt
});

// Custom validation for range fields (max >= min)
userPreferencesSchema.pre('save', function(next) {
  // Price range validation
  if (this.minPrice !== null && this.maxPrice !== null && this.maxPrice < this.minPrice) {
    return next(new Error('Maximum price must be greater than or equal to minimum price'));
  }
  
  // Bedroom range validation
  if (this.minBedrooms !== null && this.maxBedrooms !== null && this.maxBedrooms < this.minBedrooms) {
    return next(new Error('Maximum bedrooms must be greater than or equal to minimum bedrooms'));
  }
  
  // Bathroom range validation
  if (this.minBathrooms !== null && this.maxBathrooms !== null && this.maxBathrooms < this.minBathrooms) {
    return next(new Error('Maximum bathrooms must be greater than or equal to minimum bathrooms'));
  }
  
  // Square footage range validation
  if (this.minSquareFootage !== null && this.maxSquareFootage !== null && this.maxSquareFootage < this.minSquareFootage) {
    return next(new Error('Maximum square footage must be greater than or equal to minimum square footage'));
  }
  
  // Move-in date range validation
  if (this.earliestMoveIn !== null && this.latestMoveIn !== null && this.latestMoveIn < this.earliestMoveIn) {
    return next(new Error('Latest move-in date must be greater than or equal to earliest move-in date'));
  }
  
  next();
});

/**
 * UserPreferences model
 * Export Mongoose model for UserPreferences collection
 */
export const UserPreferences = model<IUserPreferences>('UserPreferences', userPreferencesSchema);
