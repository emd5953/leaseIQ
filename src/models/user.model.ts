import { Schema, model, Document } from 'mongoose';

/**
 * User document interface
 * Represents a user profile synchronized with Supabase authentication
 */
export interface IUser extends Document {
  supabaseId: string;           // Unique identifier from Supabase (indexed, unique)
  email: string;                // User email address (indexed)
  displayName: string | null;   // Optional display name
  createdAt: Date;              // Account creation timestamp
  lastLoginAt: Date;            // Most recent login timestamp
  updatedAt: Date;              // Last profile update timestamp
}

/**
 * User schema definition
 * Stores user profile data and maintains synchronization with Supabase authentication
 */
const userSchema = new Schema<IUser>({
  supabaseId: {
    type: String,
    required: [true, 'Supabase ID is required'],
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return !!(v && v.trim().length > 0);
      },
      message: 'Supabase ID cannot be empty or whitespace'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    index: true,
    validate: {
      validator: function(v: string) {
        // Basic email validation regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  displayName: {
    type: String,
    default: null
  },
  lastLoginAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true  // Automatically manages createdAt and updatedAt
});

/**
 * User model
 * Export Mongoose model for User collection
 */
export const User = model<IUser>('User', userSchema);
