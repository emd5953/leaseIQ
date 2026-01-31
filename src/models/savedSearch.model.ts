import { Schema, model, Document, Types } from 'mongoose';

/**
 * Saved Search document interface
 * Represents a named search configuration with alert settings for users to track multiple search criteria
 */
export interface ISavedSearch extends Document {
  userId: Types.ObjectId;           // Reference to User document
  name: string;                     // User-provided search name
  
  // Search criteria (mirrors UserPreferences structure)
  criteria: {
    minPrice: number | null;
    maxPrice: number | null;
    minBedrooms: number | null;
    maxBedrooms: number | null;
    minBathrooms: number | null;
    maxBathrooms: number | null;
    minSquareFootage: number | null;
    maxSquareFootage: number | null;
    neighborhoods: string[];
    earliestMoveIn: Date | null;
    latestMoveIn: Date | null;
    commuteDestination: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    } | null;
    maxCommuteMinutes: number | null;
    requiredAmenities: string[];
    requiresDogsAllowed: boolean;
    requiresCatsAllowed: boolean;
    noFeeOnly: boolean;
    maxListingAgeDays: number | null;
  };
  
  // Alert configuration
  alertsEnabled: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
  alertMethod: 'email' | 'in-app' | 'both';
  lastAlertSentAt: Date | null;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Saved Search schema definition
 * Stores named search configurations with alert settings
 */
const savedSearchSchema = new Schema<ISavedSearch>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  name: {
    type: String,
    required: [true, 'Search name is required'],
    maxlength: [100, 'Search name cannot exceed 100 characters'],
    validate: {
      validator: function(v: string) {
        return !!(v && v.trim().length > 0);
      },
      message: 'Search name cannot be empty or whitespace'
    }
  },
  
  criteria: {
    type: {
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
    },
    required: true
  },
  
  alertsEnabled: {
    type: Boolean,
    required: true,
    default: false
  },
  
  alertFrequency: {
    type: String,
    required: [true, 'Alert frequency is required'],
    enum: {
      values: ['immediate', 'daily', 'weekly'],
      message: 'Alert frequency must be one of: immediate, daily, weekly'
    }
  },
  
  alertMethod: {
    type: String,
    required: [true, 'Alert method is required'],
    enum: {
      values: ['email', 'in-app', 'both'],
      message: 'Alert method must be one of: email, in-app, both'
    }
  },
  
  lastAlertSentAt: {
    type: Date,
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true  // Automatically manages createdAt and updatedAt
});

// Compound indexes for user queries and alert scheduling
savedSearchSchema.index({ userId: 1, isActive: 1 });
savedSearchSchema.index({ alertsEnabled: 1, lastAlertSentAt: 1 });

// Pre-save hook to initialize lastAlertSentAt when alertsEnabled is true
savedSearchSchema.pre('save', function(next) {
  // Initialize lastAlertSentAt to current time when alerts are enabled on creation
  if (this.isNew && this.alertsEnabled && !this.lastAlertSentAt) {
    this.lastAlertSentAt = new Date();
  }
  
  next();
});

/**
 * SavedSearch model
 * Export Mongoose model for SavedSearch collection
 */
export const SavedSearch = model<ISavedSearch>('SavedSearch', savedSearchSchema);
