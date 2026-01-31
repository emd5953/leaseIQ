import { Schema, model, Document } from 'mongoose';
import { ListingSource, SourceReference, Address, Price, PetPolicy, BrokerFee, Coordinates } from '../types';

export interface IListingDocument extends Document {
  sources: SourceReference[];
  address: Address;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  price: Price;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  description?: string;
  images: string[];
  amenities: string[];
  petPolicy?: PetPolicy;
  brokerFee?: BrokerFee;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SourceReferenceSchema = new Schema<SourceReference>({
  source: {
    type: String,
    enum: Object.values(ListingSource),
    required: true,
  },
  sourceUrl: {
    type: String,
    required: true,
  },
  sourceId: {
    type: String,
    required: true,
  },
  firstSeenAt: {
    type: Date,
    required: true,
  },
  lastSeenAt: {
    type: Date,
    required: true,
  },
}, { _id: false });

const AddressSchema = new Schema<Address>({
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    default: null,
  },
  state: {
    type: String,
    default: null,
  },
  zipCode: {
    type: String,
    default: null,
  },
  fullAddress: {
    type: String,
    required: true,
  },
}, { _id: false });

const PriceSchema = new Schema<Price>({
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'daily'],
    default: 'monthly',
  },
}, { _id: false });

const PetPolicySchema = new Schema<PetPolicy>({
  allowed: {
    type: Boolean,
    required: true,
  },
  restrictions: {
    type: String,
    default: null,
  },
  deposit: {
    type: Number,
    default: null,
  },
}, { _id: false });

const BrokerFeeSchema = new Schema<BrokerFee>({
  required: {
    type: Boolean,
    required: true,
  },
  amount: {
    type: Number,
    default: null,
  },
  percentage: {
    type: Number,
    default: null,
  },
}, { _id: false });

const ListingSchema = new Schema<IListingDocument>({
  sources: {
    type: [SourceReferenceSchema],
    required: true,
    validate: {
      validator: (v: SourceReference[]) => v.length > 0,
      message: 'At least one source reference is required',
    },
  },
  address: {
    type: AddressSchema,
    required: true,
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: [Number],
  },
  price: {
    type: PriceSchema,
    required: true,
  },
  bedrooms: {
    type: Number,
    default: null,
  },
  bathrooms: {
    type: Number,
    default: null,
  },
  squareFeet: {
    type: Number,
    default: null,
  },
  description: {
    type: String,
    default: null,
  },
  images: {
    type: [String],
    default: [],
  },
  amenities: {
    type: [String],
    default: [],
  },
  petPolicy: {
    type: PetPolicySchema,
    default: null,
  },
  brokerFee: {
    type: BrokerFeeSchema,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
ListingSchema.index({ 'sources.source': 1, 'sources.sourceId': 1 });
ListingSchema.index({ 'address.fullAddress': 1 });
ListingSchema.index({ coordinates: '2dsphere' });
ListingSchema.index({ isActive: 1, updatedAt: -1 });
ListingSchema.index({ 'price.amount': 1 });
ListingSchema.index({ bedrooms: 1, bathrooms: 1 });

export const ListingModel = model<IListingDocument>('Listing', ListingSchema);
