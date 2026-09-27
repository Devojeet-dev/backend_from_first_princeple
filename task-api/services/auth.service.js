import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import config from '../config/index.js';

function signToken(userId, role) {
  return jwt.sign(
    { sub: userId.toString(), role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export async function register({ name, email, password }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 409);

  const user = await User.create({ name, email, password });
  const token = signToken(user._id, user.role);

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

export async function login({ email, password }) {
  // Explicitly select password because it has select: false in schema
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Same error for "not found" and "wrong password" — prevents email enumeration
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id, user.role);

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}
