import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  isDevelopment: process.env.NODE_ENV === 'development',
};

if (!config.mongoUri) throw new Error('MONGODB_URI is required in .env');
if (!config.jwtSecret) throw new Error('JWT_SECRET is required in .env');

export default config;
