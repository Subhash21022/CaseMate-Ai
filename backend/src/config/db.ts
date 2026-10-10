import mongoose from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './env.js';

let mongod: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // First try the configured URI
  try {
    console.log(`Connecting to MongoDB at: ${config.MONGODB_URI}...`);
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('MongoDB connected successfully via URI.');
    return;
  } catch (err) {
    console.warn('Could not connect to external MongoDB URI. Starting in-memory MongoDB server...');
  }

  // Fallback to in-memory MongoDB server for zero-configuration local dev & testing
  try {
    const { MongoMemoryServer: MemoryServer } = await import('mongodb-memory-server');
    mongod = await MemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`Connected to in-memory MongoDB at: ${uri}`);
  } catch (memoryErr) {
    console.error('Failed to initialize MongoDB connection:', memoryErr);
    throw memoryErr;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};
