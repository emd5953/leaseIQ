import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../src/models/user.model';

describe('User Model Validation', () => {
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
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('should reject empty supabaseId', async () => {
    const user = new User({
      supabaseId: '',
      email: 'test@example.com'
    });

    await expect(user.save()).rejects.toThrow(/supabaseId/);
  });

  it('should reject whitespace-only supabaseId', async () => {
    const user = new User({
      supabaseId: '   ',
      email: 'test@example.com'
    });

    await expect(user.save()).rejects.toThrow(/supabaseId/);
  });

  it('should reject invalid email format', async () => {
    const user = new User({
      supabaseId: 'user123',
      email: 'not-an-email'
    });

    await expect(user.save()).rejects.toThrow(/email/);
  });

  it('should provide descriptive error message for empty supabaseId', async () => {
    const user = new User({
      supabaseId: '',
      email: 'test@example.com'
    });

    try {
      await user.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.supabaseId).toBeDefined();
      expect(error.errors.supabaseId.message).toContain('Supabase ID');
    }
  });

  it('should provide descriptive error message for invalid email', async () => {
    const user = new User({
      supabaseId: 'user123',
      email: 'invalid-email'
    });

    try {
      await user.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.email).toBeDefined();
      expect(error.errors.email.message).toBe('Invalid email format');
    }
  });

  it('should provide descriptive error message for missing required fields', async () => {
    const user = new User({
      displayName: 'Test User'
    });

    try {
      await user.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.supabaseId).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.supabaseId.message).toContain('required');
      expect(error.errors.email.message).toContain('required');
    }
  });

  it('should accept valid user data', async () => {
    const user = new User({
      supabaseId: 'valid-supabase-id',
      email: 'valid@example.com',
      displayName: 'Test User'
    });

    const savedUser = await user.save();
    expect(savedUser.supabaseId).toBe('valid-supabase-id');
    expect(savedUser.email).toBe('valid@example.com');
    expect(savedUser.displayName).toBe('Test User');
    expect(savedUser.createdAt).toBeInstanceOf(Date);
    expect(savedUser.updatedAt).toBeInstanceOf(Date);
    expect(savedUser.lastLoginAt).toBeInstanceOf(Date);
  });

  it('should enforce unique supabaseId', async () => {
    await User.create({
      supabaseId: 'duplicate-id',
      email: 'first@example.com'
    });

    const duplicateUser = new User({
      supabaseId: 'duplicate-id',
      email: 'second@example.com'
    });

    await expect(duplicateUser.save()).rejects.toThrow();
  });

  it('should automatically set timestamps', async () => {
    const user = await User.create({
      supabaseId: 'timestamp-test',
      email: 'timestamp@example.com'
    });

    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.lastLoginAt).toBeInstanceOf(Date);
  });

  it('should update updatedAt on save but preserve createdAt', async () => {
    const user = await User.create({
      supabaseId: 'update-test',
      email: 'update@example.com'
    });

    const originalCreatedAt = user.createdAt;
    const originalUpdatedAt = user.updatedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    user.displayName = 'Updated Name';
    await user.save();

    expect(user.createdAt).toEqual(originalCreatedAt);
    expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
