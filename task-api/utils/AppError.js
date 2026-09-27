export default class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}
