import mongoose from 'mongoose';

/** Each generated property case (including shrinks) starts with an empty DB. */
export async function resetDatabase(): Promise<void> {
  await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
}
