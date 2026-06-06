import mongoose from 'mongoose';
import { config } from './app.config';

export const connectDatabase = async (): Promise<void> => {
  try {
    const maskedUri = config.mongoUri.replace(/:([^@]+)@/, ':****@');
    console.log(`Connecting to MongoDB at: ${maskedUri}`);
    
    await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 15000, // Increased for Atlas resolution
    });
    console.log(`MongoDB connected successfully to database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
