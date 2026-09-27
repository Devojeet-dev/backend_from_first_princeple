import config from '../config/index.js';

export default function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ error: 'Validation failed', details });
  }

  // MongoDB duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ error: `${field} already exists` });
  }

  // Mongoose CastError — bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  if (config.isDevelopment) {
    console.error('[ERROR]', err.stack);
  }

  res.status(status).json({
    error: message,
    ...(config.isDevelopment && { stack: err.stack }),
  });
}
