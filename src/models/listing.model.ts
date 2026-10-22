import { Schema, model, Document } from 'mongoose';

/**
 * Source information for a listing
 */
export interface IListingSource {
  source: string;                 // e.g., "streeteasy", "zillow"
  sourceId: string;               // External listing ID
  sourceUrl: string;              // Direct link to listing
  firstSeenAt: Date;
  lastSeenAt: Date;
}

/**
 * Listing document interface
 * Represents a rental apartment listing from any supported source
 */
export interface IListing extends Document {
  // Core listing information
  address: {
    street: string;
    fullAddress?: string;
    neighborhood?: string;
    unit: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    coordinates?: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude] in GeoJSON format
    };
  };
  
  // Pricing and availability
  price: {
    amount: number | null;
    status?: 'known' | 'unknown' | 'building';
    currency: string;
    period: 'monthly' | 'weekly' | 'daily';
  };
  availableDate: Date | null;       // Move-in date
  
  // Property details
  bedrooms: number | null;
  bathrooms: number | null;
  dataVersion?: number;
  fieldObservedAt?: Map<string, Date>;
  squareFootage: number | null;
  squareFeet?: number | null; // legacy ingestion records
  sourceKeys?: string[];
  sourceConflicts?: { sourceKey: string; source: IListingSource; quarantinedAt: Date; reason: string }[];
  rentReview?: { originalAmount: number; reason: string; reviewedAt: Date };
  listingScope?: 'building' | 'unit';
  buildingRent?: { status: 'range' | 'contact'; minimum: number | null; maximum: number | null; sourceUrl: string; observedAt: Date };
  sourceVerification?: any;
  sourceResolutions?: any[];
  retiredSources?: any[];
  retiredSourceKeys?: string[];
  duplicateOf?: string;
  addressKey?: string;
  coordinates?: { type: string; coordinates: [number, number] };
  
  // Listing content
  description: string;
  images: string[];                 // Array of image URLs
  floorPlanImages: string[];        // Array of floor plan image URLs
  amenities: string[];              // Standardized amenity names
  
  // Pet policy
  petPolicy: {
    allowed?: boolean | null;
    restrictions?: string | null;
    dogsAllowed: boolean | null;
    catsAllowed: boolean | null;
    petDeposit: number | null;
  };
  
  // Fee information
  brokerFee: {
    required: boolean | null;
    percentage?: number | null;
    amount: number | null;          // Fee amount if known
  };
  
  // Building & unit details
  buildingType: string | null;      // Apartment, Condo, Townhouse, etc.
  yearBuilt: number | null;
  totalUnits: number | null;
  parking: string | null;
  laundry: string | null;           // In-unit, In-building, None
  heating: string | null;
  cooling: string | null;
  
  // Lease terms
  leaseLength: string | null;       // e.g., "12 months"
  securityDeposit: number | null;
  applicationFee: number | null;
  
  // Utilities included in rent
  utilities: {
    electric: boolean | null;
    gas: boolean | null;
    water: boolean | null;
    internet: boolean | null;
    trash: boolean | null;
  };
  
  // Contact info
  contactPhone: string | null;
  contactEmail: string | null;
  
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
  dataVersion: { type: Number },
  fieldObservedAt: { type: Map, of: Date, default: undefined },
  sourceKeys: { type: [String], default: undefined },
  sourceConflicts: { type: [Schema.Types.Mixed], default: undefined },
  rentReview: { type: Schema.Types.Mixed, default: undefined },
  listingScope: { type: String, enum: ['building', 'unit'] },
  buildingRent: { type: Schema.Types.Mixed, default: undefined },
  sourceVerification: { type: Schema.Types.Mixed, default: undefined },
  sourceResolutions: { type: [Schema.Types.Mixed], default: undefined },
  retiredSources: { type: [Schema.Types.Mixed], default: undefined },
  retiredSourceKeys: { type: [String], default: undefined },
  duplicateOf: { type: String },
  addressKey: { type: String },
  squareFeet: { type: Number, default: undefined },
  coordinates: { type: new Schema({ type: { type: String, enum: ['Point'] }, coordinates: [Number] }, { _id: false }), default: undefined },
  address: {
    fullAddress: { type: String },
    neighborhood: { type: String },
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
      type: new Schema({
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true, validate: {
          validator: (v: number[]) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
          message: 'Coordinates must be valid [longitude, latitude]'
        } }
      }, { _id: false }),
      default: undefined
    }
  },
  
  price: {
    status: { type: String, enum: ['known', 'unknown', 'building'], default: undefined },
    amount: {
      type: Number,
      required: [function(this: IListing) { return !['unknown', 'building'].includes(this.price?.status || ''); }, 'Price amount is required'],
      validate: {
        validator: function(v: number) {
          return v == null || (Number.isFinite(v) && v > 0);
        },
        message: 'Price must be a positive number'
      }
    },
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['monthly', 'weekly', 'daily'],
      default: 'monthly'
    }
  },
  
  availableDate: {
    type: Date,
    default: null
  },
  
  bedrooms: {
    type: Number,
    default: null,
    validate: {
      validator: function(v: number) {
        return v == null || (Number.isInteger(v) && v >= 0);
      },
      message: 'Bedrooms must be a non-negative integer'
    }
  },
  
  bathrooms: {
    type: Number,
    default: null,
    validate: {
      validator: function(v: number) {
        return v == null || (Number.isFinite(v) && v > 0);
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
  
  floorPlanImages: {
    type: [String],
    default: []
  },
  
  amenities: {
    type: [String],
    default: []
  },
  
  petPolicy: {
    allowed: { type: Boolean, default: null },
    restrictions: { type: String, default: null },
    dogsAllowed: {
      type: Boolean,
      default: null
    },
    catsAllowed: {
      type: Boolean,
      default: null
    },
    petDeposit: {
      type: Number,
      default: null
    }
  },
  
  brokerFee: {
    percentage: { type: Number, default: null },
    required: {
      type: Boolean,
      default: null
    },
    amount: {
      type: Number,
      default: null
    }
  },
  
  // Building & unit details
  buildingType: {
    type: String,
    default: null
  },
  
  yearBuilt: {
    type: Number,
    default: null
  },
  
  totalUnits: {
    type: Number,
    default: null
  },
  
  parking: {
    type: String,
    default: null
  },
  
  laundry: {
    type: String,
    default: null
  },
  
  heating: {
    type: String,
    default: null
  },
  
  cooling: {
    type: String,
    default: null
  },
  
  // Lease terms
  leaseLength: {
    type: String,
    default: null
  },
  
  securityDeposit: {
    type: Number,
    default: null
  },
  
  applicationFee: {
    type: Number,
    default: null
  },
  
  // Utilities
  utilities: {
    electric: {
      type: Boolean,
      default: null
    },
    gas: {
      type: Boolean,
      default: null
    },
    water: {
      type: Boolean,
      default: null
    },
    internet: {
      type: Boolean,
      default: null
    },
    trash: {
      type: Boolean,
      default: null
    }
  },
  
  // Contact info
  contactPhone: {
    type: String,
    default: null
  },
  
  contactEmail: {
    type: String,
    default: null
  },
  
  sources: {
    type: [{
      source: {
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
      firstSeenAt: {
        type: Date,
        required: [true, 'First seen timestamp is required'],
        default: Date.now
      },
      lastSeenAt: {
        type: Date,
        required: [true, 'Last seen timestamp is required'],
        default: Date.now
      }
    }],
    required: [true, 'At least one source is required'],
    validate: {
      validator: function(this: IListing, v: any[]) {
        if (!Array.isArray(v)) return false;
        if (v.length) return true;
        // A repaired historical record keeps its provenance even when an unsafe
        // association is removed. Ordinary new listings still require a source.
        const dated = (value: any) => Number.isFinite(+new Date(value || ''));
        const provenance = (s: any) => !!s?.source && !!s.sourceId && /^https:\/\//.test(s.sourceUrl || '') && dated(s.firstSeenAt) && dated(s.lastSeenAt);
        const alias = this.isActive === false && !!this.duplicateOf && this.sourceResolutions?.some(r => r.canonicalListingId === this.duplicateOf && /^https:\/\//.test(r.evidenceUrl || '') && dated(r.checkedAt) && r.originalSources?.length && r.originalSources.every(provenance));
        const mismatch = this.sourceVerification?.status === 'source_mismatch' && this.price?.status === 'unknown' && this.price.amount == null && this.retiredSources?.some(r => provenance(r.source) && dated(r.checkedAt) && r.reason);
        return !!(alias || mismatch);
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
  timestamps: true,
  optimisticConcurrency: true
});

// Indexes for geospatial queries
listingSchema.index({ 'address.coordinates': '2dsphere' });

// Compound index for deduplication
listingSchema.index({ 'address.street': 1, 'address.unit': 1 });

// OPTIMIZED: Primary search index - covers most common queries
listingSchema.index({ 
  isActive: 1, 
  'address.state': 1, 
  'address.city': 1,
  'price.amount': 1,
  bedrooms: 1,
  createdAt: -1 
});

// Index for pet policy searches
listingSchema.index({ 'petPolicy.dogsAllowed': 1, 'petPolicy.catsAllowed': 1 });

// Index for broker fee searches
listingSchema.index({ 'brokerFee.required': 1 });

// Compound index for source lookups
listingSchema.index({ 'sources.source': 1, 'sources.sourceId': 1 });
listingSchema.index({ sourceKeys: 1 }, { unique: true, sparse: true });
listingSchema.index({ addressKey: 1 });
listingSchema.index({ 'sources.lastSeenAt': -1 });

// Index for recent active listings (fast default view)
listingSchema.index({ isActive: 1, createdAt: -1 });

/**
 * Listing model
 * Export Mongoose model for Listing collection
 */
listingSchema.pre('validate', function(next) {
  if (this.price?.status === 'building') {
    const r = this.buildingRent;
    const validRange = r?.status === 'range' && Number.isFinite(r.minimum) && Number.isFinite(r.maximum) && (r.minimum || 0) > 0 && (r.maximum || 0) >= (r.minimum || 0);
    const contact = r?.status === 'contact' && r.minimum == null && r.maximum == null;
    if (this.listingScope !== 'building' || this.price.amount != null || !(validRange || contact) || !/^https:\/\//.test(r?.sourceUrl || '') || !Number.isFinite(+new Date(r?.observedAt || ''))) {
      this.invalidate('buildingRent', 'Building pricing requires dated source evidence and a valid range or explicit contact-for-price status.');
    }
  }
  next();
});
export const Listing = model<IListing>('Listing', listingSchema);
