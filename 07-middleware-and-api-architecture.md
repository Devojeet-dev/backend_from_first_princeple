# Chapter 07 — Middleware and API Architecture

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Explain what middleware is and how the request pipeline works
- Write custom middleware for logging, authentication, and error handling
- Understand the purpose of controllers and services
- Structure an Express project with proper separation of concerns
- Know why architecture decisions matter and how to reason about them

---

## Why This Matters

A 100-line Express file works for prototypes. A production backend handles:
- Authentication on 20 different routes
- Logging for every request
- Error handling that doesn't expose internals
- Business logic that can be tested independently
- Database logic that can be swapped out

Without architecture, you end up with route handlers that do everything: validate input, check authentication, query the database, send emails, format responses. This becomes untestable, unmaintainable, and fragile.

This chapter teaches you to design backends that scale — not in load, but in complexity.

---

## Core Concepts

### 1. What is Middleware?

Middleware is a function that sits in the request-response pipeline and has access to:
- `req` — the request object
- `res` — the response object
- `next` — a function to call to pass control to the next middleware

```
Incoming Request
      |
      v
  Middleware 1  (logging)
      |
      v
  Middleware 2  (JSON body parsing)
      |
      v
  Middleware 3  (authentication check)
      |
      v
  Route Handler (the actual logic)
      |
      v
  Outgoing Response
```

Mental model: **Middleware is an airport security checkpoint. Each checkpoint has the power to: let you through (call next), stop you (send a response), or modify you (add data to req) before passing you on.**

---

### 2. Middleware Signature

```javascript
function myMiddleware(req, res, next) {
  // Do something with req or res
  // Then either:

  next();           // pass to next middleware/route

  // OR:
  res.json({ error: 'Unauthorized' });  // terminate the pipeline

  // Never call both. Once you send a response, the pipeline ends.
}
```

You can also define middleware with 4 parameters — that's an **error-handling middleware**:
```javascript
function errorHandler(err, req, res, next) {
  // err = the error that was thrown
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

---

### 3. Types of Middleware

**Application-level middleware** — runs on every request:
```javascript
app.use(express.json());        // built-in: parse JSON bodies
app.use(express.urlencoded());  // built-in: parse form data
app.use(cors());               // third-party: handle CORS headers
app.use(myLogger);             // your own
```

**Route-level middleware** — runs only on specific routes:
```javascript
// Only runs on /admin routes
app.use('/admin', adminAuthMiddleware);

// Only runs on this specific route
app.get('/profile', authMiddleware, profileHandler);

// Multiple middleware on one route
app.post('/posts', authMiddleware, validatePost, createPost);
```

**Error-handling middleware** — must have 4 parameters, placed LAST:
```javascript
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});
```

---

### 4. Writing Custom Middleware

#### Request Logger

```javascript
function requestLogger(req, res, next) {
  const start = Date.now();

  // Listen for response to finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ` +
      `${res.statusCode} ${duration}ms`
    );
  });

  next();  // always call next unless you're stopping the request
}

app.use(requestLogger);
```

Output:
```
[2024-01-15T10:30:00.000Z] GET /users 200 23ms
[2024-01-15T10:30:01.000Z] POST /users 201 45ms
[2024-01-15T10:30:02.000Z] GET /users/999 404 12ms
```

#### Authentication Middleware

```javascript
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  // 1. Get token from Authorization header
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];  // "Bearer <token>" -> "<token>"

  // 2. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // attach user info to request
    next();             // proceed to route handler
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Usage: protect specific routes
app.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });  // req.user set by middleware
});

// Protect all routes under /api/v1
app.use('/api/v1', authenticate);
```

#### Request Validation Middleware

```javascript
function validateCreateUser(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!password || password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

app.post('/users', validateCreateUser, createUser);
```

---

### 5. The Middleware Pipeline in Detail

```
app.use(A)           <- registered first
app.use(B)           <- registered second
app.get('/users', C) <- route handler C

Incoming: GET /users

Pipeline:
A -> B -> C

If A calls next():  A -> B -> C
If A responds:      A [done] (B and C never run)
If A does nothing:  Request hangs forever
```

```
FULL PIPELINE EXAMPLE:

POST /users
  |
  v
[1] express.json()
  |  (parses body, adds req.body)
  v
[2] requestLogger
  |  (logs the request)
  v
[3] authenticate
  |  (verifies JWT, adds req.user)
  |  <- if no token: 401, stop here
  v
[4] validateCreateUser
  |  (validates req.body)
  |  <- if invalid: 400, stop here
  v
[5] createUser handler
  |  (creates user in DB)
  v
[6] res.json(newUser)  <- response sent
  |
  v
[7] requestLogger "finish" event fires
  |  (logs status code and duration)
```

---

### 6. Error Handling Middleware

Express has a special error-handling convention. If you call `next(err)` with an argument, Express skips all regular middleware and jumps to the next error handler.

```javascript
// In any route or middleware:
function someRoute(req, res, next) {
  try {
    const data = riskyOperation();
    res.json(data);
  } catch (err) {
    next(err);  // passes error to error-handling middleware
  }
}

// Or with async/await (you need a wrapper or use express-async-errors):
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Error handling middleware (MUST be last, MUST have 4 params)
app.use((err, req, res, next) => {
  console.error(err.stack);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});
```

A custom error class makes this cleaner:

```javascript
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

// Usage in routes:
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Error handler:
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});
```

---

### 7. Separation of Concerns

This is the central architecture principle. Each part of your code has ONE job.

**The problem with mixing everything in one function:**

```javascript
// BAD: Router handler doing EVERYTHING
app.post('/users', async (req, res) => {
  // Validation
  if (!req.body.email) return res.status(400).json({ error: 'Email required' });

  // Business logic
  const existingUser = await db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
  if (existingUser) return res.status(409).json({ error: 'Email in use' });

  // Hashing
  const hash = await bcrypt.hash(req.body.password, 10);

  // DB operation
  const user = await db.query('INSERT INTO users ...', [...]);

  // Email notification
  await emailService.sendWelcomeEmail(user.email);

  // Response
  res.status(201).json(user);
});
```

This is untestable, unreadable, and reusable in zero places.

---

### 8. Controllers, Services, and the Layered Architecture

Organize your code into layers:

```
Request
  |
  v
Route (just the URL mapping)
  |
  v
Middleware (auth, validation, logging)
  |
  v
Controller (handles req/res, calls service)
  |
  v
Service (business logic, pure JS functions)
  |
  v
Model/Repository (database interaction)
  |
  v
Database
```

**Layer responsibilities:**

| Layer | Responsibility | Knows about |
|-------|---------------|-------------|
| Route | Maps URL + method to controller | Express, HTTP |
| Middleware | Cross-cutting concerns | req, res, next |
| Controller | Handles req/res, delegates to service | HTTP request/response |
| Service | Business logic | Business rules, not HTTP |
| Model | Database schema and queries | Database |

---

### 9. Practical Architecture Example

Let's restructure the users API properly:

```
project/
  index.js              <- app setup, server start
  app.js                <- express app, middleware, routes
  routes/
    users.js            <- route definitions only
  controllers/
    user.controller.js  <- request/response handling
  services/
    user.service.js     <- business logic
  models/
    User.js             <- database schema (future chapter)
  middleware/
    auth.js             <- authentication middleware
    validate.js         <- validation middleware
    errorHandler.js     <- error handling middleware
  config/
    index.js            <- configuration
```

**routes/users.js** — just maps routes to controllers:
```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { validateCreateUser } = require('../middleware/validate');

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', validateCreateUser, userController.create);
router.patch('/:id', authenticate, userController.update);
router.delete('/:id', authenticate, userController.remove);

module.exports = router;
```

**controllers/user.controller.js** — handles req/res:
```javascript
const userService = require('../services/user.service');

async function getAll(req, res, next) {
  try {
    const { role, page, limit } = req.query;
    const users = await userService.findAll({ role, page, limit });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await userService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
```

**services/user.service.js** — pure business logic, no HTTP:
```javascript
// This file knows nothing about req, res, or Express.
// It only knows about users and business rules.

const users = [];  // In-memory. Chapter 8 replaces this with MongoDB.
let nextId = 1;

async function findAll({ role, page = 1, limit = 10 }) {
  let result = [...users];
  if (role) result = result.filter(u => u.role === role);
  const start = (page - 1) * limit;
  return result.slice(start, start + limit);
}

async function findById(id) {
  return users.find(u => u.id === parseInt(id)) || null;
}

async function create(data) {
  const { name, email, role = 'user' } = data;

  // Business rule: no duplicate emails
  const existing = users.find(u => u.email === email);
  if (existing) {
    const error = new Error('Email already in use');
    error.status = 409;
    throw error;
  }

  const user = { id: nextId++, name, email, role };
  users.push(user);
  return user;
}

async function update(id, data) {
  const index = users.findIndex(u => u.id === parseInt(id));
  if (index === -1) return null;
  users[index] = { ...users[index], ...data, id: parseInt(id) };
  return users[index];
}

async function remove(id) {
  const index = users.findIndex(u => u.id === parseInt(id));
  if (index !== -1) users.splice(index, 1);
}

module.exports = { findAll, findById, create, update, remove };
```

**Notice what changed:**
- Service functions know nothing about HTTP
- Controllers know nothing about business logic
- Routes know nothing about either
- Everything can be tested independently

---

### 10. app.js and index.js

Split app creation from server startup:

**app.js** — Express app configuration:
```javascript
const express = require('express');
const usersRouter = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);  // your custom logger

// Routes
app.use('/api/v1/users', usersRouter);

// 404 handler (after all routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
```

**index.js** — server startup only:
```javascript
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Separating these means you can import `app` in tests without starting the server.

---

## Mental Models Summary

| Concept | Mental Model |
|---------|-------------|
| Middleware | Airport security checkpoints — can let through, stop, or tag a passenger |
| Controller | The waiter — takes order (req), delegates to kitchen (service), delivers response |
| Service | The kitchen — does the real work, doesn't care who ordered |
| Route | The menu — maps what you can order to who prepares it |
| Error handler | The last security checkpoint that catches everything the others missed |
| next() | "Pass this request to the next function in line" |
| next(err) | "Something went wrong, skip to the error handler" |

---

## Common Mistakes

### Mistake 1: Business logic in controllers

```javascript
// BAD: controller doing business logic
async function create(req, res) {
  const hashed = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({ ...req.body, password: hashed });
  await sendWelcomeEmail(user.email);
  res.status(201).json(user);
}

// GOOD: controller delegates, service does the work
async function create(req, res, next) {
  try {
    const user = await userService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}
```

### Mistake 2: Forgetting to call next() in middleware

```javascript
// BAD: if condition is false, nothing happens — request hangs forever
function authenticate(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  // forgot next()! valid tokens hang forever
}

// GOOD:
function authenticate(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  req.user = verifyToken(token);
  next();  // proceed
}
```

### Mistake 3: Placing error handler in wrong position

```javascript
// BAD: error handler before routes
app.use(errorHandler);  // never catches route errors

app.get('/users', handler);

// GOOD: error handler after ALL routes and middleware
app.get('/users', handler);
app.use(errorHandler);  // last
```

### Mistake 4: Not catching async errors

```javascript
// BAD: async errors are not caught by Express by default
app.get('/users', async (req, res) => {
  const users = await User.find();  // if this throws, Express 4 doesn't catch it
  res.json(users);
});

// GOOD: wrap in try/catch and call next(err)
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ALTERNATIVE: use express-async-errors package (wraps all routes automatically)
require('express-async-errors');
app.get('/users', async (req, res) => {
  const users = await User.find();  // throws are caught automatically
  res.json(users);
});
```

---

## Exercises

### Exercise 1: Write a Request ID Middleware

Generate a unique ID for every request and attach it to `req.requestId`. Log it in every response header as `X-Request-Id`.

```javascript
const { randomUUID } = require('crypto');

function requestId(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
```

### Exercise 2: Role-Based Authorization

Write an `authorize(role)` middleware factory that checks `req.user.role` (set by authentication middleware) and returns 403 if the user doesn't have the required role:

```javascript
function authorize(requiredRole) {
  return function(req, res, next) {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage:
app.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
```

### Exercise 3: Refactor a Monolithic Route

Take this route and split it into route, controller, and service:

```javascript
app.post('/products', async (req, res) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({ error: 'name and price required' });
  }
  if (req.body.price <= 0) {
    return res.status(400).json({ error: 'price must be positive' });
  }
  const product = { id: Date.now(), ...req.body, createdAt: new Date() };
  products.push(product);
  res.status(201).json(product);
});
```

### Exercise 4: Global Error Handler

Create a proper error handler that:
1. Logs the error to console
2. Returns different messages in development vs production (`NODE_ENV`)
3. Handles 404 (AppError with status 404) differently from 500

---

## Key Takeaways

- **Middleware** is a function with `(req, res, next)` that sits in the request pipeline
- Call `next()` to proceed, `next(err)` to jump to error handler, or send a response to terminate
- Middleware ordering matters — registered first runs first
- **Controllers** handle HTTP: read from `req`, write to `res`, call services, call `next(err)` on failure
- **Services** contain business logic — they are pure JS functions that know nothing about HTTP
- **Routes** just map URLs and methods to controllers — nothing else
- **Error-handling middleware** has 4 parameters `(err, req, res, next)` and must be registered last
- Async route handlers must wrap in `try/catch` and call `next(err)` — Express 4 doesn't auto-catch async errors
- Separate `app.js` (Express setup) from `index.js` (server startup) for testability
- Separation of concerns makes code testable, readable, and maintainable
