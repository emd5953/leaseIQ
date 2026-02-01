import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * User document interface
 */
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  salt: string;
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
    required: [true, 'Password is required'],
  },
  salt: {
    type: String,
    required: true,
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

// Hash password
userSchema.methods.setPassword = function(password: string) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, 'sha512')
    .toString('hex');
};

// Validate password
userSchema.methods.validatePassword = function(password: string): boolean {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, 'sha512')
    .toString('hex');
  return this.passwordHash === hash;
};

export const User = model<IUser>('User', userSchema);
