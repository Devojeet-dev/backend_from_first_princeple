import mongoose from 'mongoose';
import config from './index.js';

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[DB] MongoDB connected successfully');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

export default connectDB;
