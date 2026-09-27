export function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }

  if (!password || password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email) errors.push({ field: 'email', message: 'Email is required' });
  if (!password) errors.push({ field: 'password', message: 'Password is required' });

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

export function validateCreateTask(req, res, next) {
  const { title, status, priority } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  const validStatuses = ['todo', 'in-progress', 'done'];
  if (status && !validStatuses.includes(status)) {
    errors.push({ field: 'status', message: 'Status must be: todo, in-progress, or done' });
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority && !validPriorities.includes(priority)) {
    errors.push({ field: 'priority', message: 'Priority must be: low, medium, or high' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}
