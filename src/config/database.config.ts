import mongoose from 'mongoose';
import { config } from './app.config.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
