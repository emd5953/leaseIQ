import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * User document interface
 */
export interface IUser extends Document {
  /** Legacy external identity retained for existing accounts and imports. */
  supabaseId?: string;
  email: string;
  passwordHash?: string;
  salt?: string;
  displayName: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt: Date;
  setPassword(password: string): void;
  validatePassword(password: string): boolean;
}

/**
 * User schema definition
 */
const userSchema = new Schema<IUser>({
  supabaseId: {
    type: String,
    trim: true,
    required: [function(this: IUser) { return !this.passwordHash; }, 'Supabase ID is required for an account without password credentials'],
    validate: {
      validator: (value: string) => value == null || value.trim().length > 0,
      message: 'Supabase ID cannot be empty or whitespace'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    index: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  passwordHash: {
    type: String,
    required: [function(this: IUser) { return !this.supabaseId || !!this.salt; }, 'Password is required'],
  },
  salt: {
    type: String,
    required: function(this: IUser) { return !this.supabaseId || !!this.passwordHash; },
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
  timestamps: true
});

// Password/Google accounts have no legacy identity and may coexist. Legacy IDs
// remain unique; keeping them does not introduce a new authentication endpoint.
userSchema.index({ supabaseId: 1 }, { unique: true, sparse: true });

// Hash password
userSchema.methods.setPassword = function(password: string) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, 'sha512')
    .toString('hex');
};

// Validate password
userSchema.methods.validatePassword = function(password: string): boolean {
  if (!this.passwordHash || !this.salt) return false;
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, 'sha512')
    .toString('hex');
  return this.passwordHash === hash;
};

export const User = model<IUser>('User', userSchema);
