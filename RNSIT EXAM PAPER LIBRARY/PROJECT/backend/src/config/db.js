import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam-library';

  if (!uri) {
    throw new Error('Missing MongoDB connection string');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Mongo connection error:', error.message);
    process.exit(1);
  }
};

