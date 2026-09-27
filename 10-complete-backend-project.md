# Chapter 10 — Complete Backend Project: Task Management API

---

## Chapter Goal

By the end of this chapter, you will have:

- Built a complete, production-structured Task Management API from scratch
- Applied every concept from all 10 chapters in one cohesive project
- Implemented user registration, login, JWT authentication, and protected routes
- Built full CRUD for tasks with ownership enforcement
- Organized code with proper layered architecture
- Understood how every piece connects

This is not a tutorial you follow blindly. Every decision here traces back to a principle you learned in a previous chapter.

---

## Project Overview

**Task Management API**

Users can register and log in. Authenticated users can create, read, update, and delete their own tasks. Admin users can see all tasks.

**Features:**
- User registration and login
- JWT-based authentication
- Task CRUD (title, description, status, priority)
- Tasks belong to users (ownership)
- Pagination and filtering on task lists
- Input validation
- Structured error handling
- Clean layered architecture

---

## Architecture Overview

```
How a request flows through the system:

HTTP Request
    |
    v
Express Router (routes/)
    |
    v
Middleware (auth, validate)
    |
    v
Controller (controllers/)
    |  reads req, writes res
    v
Service (services/)
    |  business logic
    v
Model (models/)
    |  Mongoose
    v
MongoDB
    |
    v
Response flows back up
```

```
Dependency direction (lower layers don't know about upper layers):

Route  ->  Controller  ->  Service  ->  Model  ->  MongoDB

Controller knows about req/res.
Service knows nothing about req/res.
Model knows only about MongoDB.
```

---

## Folder Structure

```
task-api/
|
|-- index.js                  <- Server startup
|-- app.js                    <- Express app, middleware, routes
|
|-- config/
|   |-- db.js                 <- MongoDB connection
|   `-- index.js              <- Environment config
|
|-- models/
|   |-- User.js               <- User schema and model
|   `-- Task.js               <- Task schema and model
|
|-- routes/
|   |-- auth.js               <- POST /auth/register, /auth/login
|   `-- tasks.js              <- CRUD routes for tasks
|
|-- controllers/
|   |-- auth.controller.js    <- Handle auth requests/responses
|   `-- task.controller.js    <- Handle task requests/responses
|
|-- services/
|   |-- auth.service.js       <- Registration, login, token logic
|   `-- task.service.js       <- Task business logic
|
|-- middleware/
|   |-- auth.js               <- authenticate, authorize
|   |-- validate.js           <- request validation functions
|   `-- errorHandler.js       <- global error handler
|
|-- utils/
|   `-- AppError.js           <- Custom error class
|
|-- .env                      <- environment variables (never commit)
|-- .gitignore
`-- package.json
```

---

## Implementation

### Step 1: Initialize the Project

```bash
mkdir task-api
cd task-api
npm init -y
npm install express mongoose bcrypt jsonwebtoken dotenv
npm install --save-dev nodemon
```

Update `package.json`:
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

Create `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/task-api
JWT_SECRET=your-very-long-random-secret-key-change-this
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

Create `.gitignore`:
```
node_modules/
.env
```

---

### Step 2: Configuration

**config/index.js:**
```javascript
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// Fail fast: crash if required config is missing
if (!config.mongoUri) throw new Error('MONGODB_URI is required');
if (!config.jwtSecret) throw new Error('JWT_SECRET is required');

module.exports = config;
```

**config/db.js:**
```javascript
const mongoose = require('mongoose');
const config = require('./index');

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[DB] MongoDB connected');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
```

---

### Step 3: Utility Classes

**utils/AppError.js:**
```javascript
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```

---

### Step 4: Models

**models/User.js:**
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true, versionKey: false }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

**models/Task.js:**
```javascript
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in-progress', 'done'],
        message: 'Status must be: todo, in-progress, or done',
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be: low, medium, or high',
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to a user'],
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Task', taskSchema);
```

---

### Step 5: Middleware

**middleware/auth.js:**
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

function authorize(...roles) {
  return function (req, res, next) {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
```

**middleware/validate.js:**
```javascript
function validateRegister(req, res, next) {
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

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email) errors.push({ field: 'email', message: 'Email is required' });
  if (!password) errors.push({ field: 'password', message: 'Password is required' });

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateCreateTask(req, res, next) {
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

module.exports = { validateRegister, validateLogin, validateCreateTask };
```

**middleware/errorHandler.js:**
```javascript
const config = require('../config');

function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    status = 400;
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(status).json({ error: 'Validation failed', details });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern)[0];
    return res.status(status).json({ error: `${field} already exists` });
  }

  // Mongoose CastError (bad ObjectId)
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

module.exports = errorHandler;
```

---

### Step 6: Services

**services/auth.service.js:**
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const config = require('../config');

function signToken(userId, role) {
  return jwt.sign(
    { sub: userId.toString(), role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

async function register({ name, email, password }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email already registered', 409);

  const user = await User.create({ name, email, password });
  const token = signToken(user._id, user.role);

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id, user.role);

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

module.exports = { register, login };
```

**services/task.service.js:**
```javascript
const Task = require('../models/Task');
const AppError = require('../utils/AppError');

async function findAll({ userId, role, status, priority, page = 1, limit = 10 }) {
  const filter = {};

  // Regular users only see their own tasks; admins see all
  if (role !== 'admin') {
    filter.owner = userId;
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(filter),
  ]);

  return {
    data: tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function findById(taskId, userId, role) {
  const task = await Task.findById(taskId).populate('owner', 'name email');

  if (!task) throw new AppError('Task not found', 404);

  // Ownership check: only owner or admin can access
  if (role !== 'admin' && task.owner._id.toString() !== userId) {
    throw new AppError('You do not have permission to access this task', 403);
  }

  return task;
}

async function create({ title, description, status, priority, dueDate }, ownerId) {
  const task = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate,
    owner: ownerId,
  });

  return task.populate('owner', 'name email');
}

async function update(taskId, updates, userId, role) {
  const task = await Task.findById(taskId);

  if (!task) throw new AppError('Task not found', 404);

  // Ownership check
  if (role !== 'admin' && task.owner.toString() !== userId) {
    throw new AppError('You do not have permission to update this task', 403);
  }

  // Only allow updating specific fields
  const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
  allowed.forEach(field => {
    if (updates[field] !== undefined) task[field] = updates[field];
  });

  await task.save();
  return task.populate('owner', 'name email');
}

async function remove(taskId, userId, role) {
  const task = await Task.findById(taskId);

  if (!task) throw new AppError('Task not found', 404);

  // Ownership check
  if (role !== 'admin' && task.owner.toString() !== userId) {
    throw new AppError('You do not have permission to delete this task', 403);
  }

  await task.deleteOne();
}

module.exports = { findAll, findById, create, update, remove };
```

---

### Step 7: Controllers

**controllers/auth.controller.js:**
```javascript
const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
```

**controllers/task.controller.js:**
```javascript
const taskService = require('../services/task.service');

async function getAll(req, res, next) {
  try {
    const { status, priority, page, limit } = req.query;
    const result = await taskService.findAll({
      userId: req.user.id,
      role: req.user.role,
      status,
      priority,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const task = await taskService.findById(req.params.id, req.user.id, req.user.role);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const task = await taskService.create(req.body, req.user.id);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const task = await taskService.update(req.params.id, req.body, req.user.id, req.user.role);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await taskService.remove(req.params.id, req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
```

---

### Step 8: Routes

**routes/auth.js:**
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middleware/validate');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

module.exports = router;
```

**routes/tasks.js:**
```javascript
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth');
const { validateCreateTask } = require('../middleware/validate');

// All task routes require authentication
router.use(authenticate);

router.get('/', taskController.getAll);
router.post('/', validateCreateTask, taskController.create);
router.get('/:id', taskController.getById);
router.patch('/:id', taskController.update);
router.delete('/:id', taskController.remove);

module.exports = router;
```

---

### Step 9: App and Server

**app.js:**
```javascript
const express = require('express');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Body parsing
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
```

**index.js:**
```javascript
const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');

async function start() {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
```

---

## Running the Project

```bash
# Start MongoDB (local)
mongod

# Install dependencies
npm install

# Start in development mode (auto-restart on changes)
npm run dev

# Server should output:
# [DB] MongoDB connected
# [Server] Running on http://localhost:3000
```

---

## Testing the API

### Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a7f1b2c3d4e5f6a7b8c9d0",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "user"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}'
```

### Create a Task (with token)

```bash
TOKEN="eyJhbGci..."  # paste your token here

curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Build the Task API",
    "description": "Complete the backend curriculum project",
    "priority": "high",
    "status": "in-progress"
  }'
```

### List Tasks

```bash
curl http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN"

# With filters:
curl "http://localhost:3000/api/v1/tasks?status=in-progress&priority=high&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### Update a Task

```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "done"}'
```

### Delete a Task

```bash
curl -X DELETE http://localhost:3000/api/v1/tasks/TASK_ID \
  -H "Authorization: Bearer $TOKEN"
# Returns 204 No Content
```

### Test Without Token (should get 401)

```bash
curl http://localhost:3000/api/v1/tasks
# Returns: {"error": "Authentication token required"}
```

---

## Complete Request Flow Diagram

```
POST /api/v1/tasks
Authorization: Bearer eyJ...
Content-Type: application/json
{ "title": "Build API", "priority": "high" }

STEP 1: Express receives request
        app.js -> app.use(express.json()) -> body parsed

STEP 2: Request logger middleware
        Logs: POST /api/v1/tasks

STEP 3: Route matched
        app.use('/api/v1/tasks', taskRoutes)

STEP 4: router.use(authenticate) middleware
        Extracts Bearer token
        jwt.verify(token, JWT_SECRET)
        Sets req.user = { id: '64a7...', role: 'user' }

STEP 5: validateCreateTask middleware
        Checks title exists -> OK
        Checks priority valid -> OK

STEP 6: taskController.create
        Calls taskService.create(req.body, req.user.id)

STEP 7: taskService.create
        Task.create({ title, priority, owner: userId })
        Mongoose validates against schema
        Saves to MongoDB

STEP 8: Controller receives task
        res.status(201).json(task)

STEP 9: Response logger fires
        Logs: POST /api/v1/tasks 201 45ms

CLIENT receives:
HTTP/1.1 201 Created
Content-Type: application/json

{
  "_id": "64b1c2...",
  "title": "Build API",
  "description": "",
  "status": "todo",
  "priority": "high",
  "dueDate": null,
  "owner": {
    "_id": "64a7f1...",
    "name": "Alice",
    "email": "alice@example.com"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## How Every Chapter Connects

| Chapter | Concept | Where Used |
|---------|---------|-----------|
| Ch 1: Internet Fundamentals | IP, ports, DNS | Server listens on port 3000; deployed to a real IP |
| Ch 2: OSI, TCP, HTTP | Request lifecycle, TCP | Every HTTP request to the API |
| Ch 3: URLs, Requests, Responses | Status codes, headers, body | Every route uses correct status codes and JSON |
| Ch 4: REST API Design | Resource naming, CRUD, conventions | `/api/v1/tasks`, RESTful endpoints |
| Ch 5: Node.js Foundations | process.env, async/await, modules | Config, DB connection, all async operations |
| Ch 6: Express Fundamentals | Routing, req/res, Router | All routes, controllers, req.params, req.query |
| Ch 7: Middleware + Architecture | Middleware pipeline, layers | auth.js, validate.js, errorHandler.js, controller/service split |
| Ch 8: MongoDB Essentials | Schema, Model, CRUD, populate | User.js, Task.js, all service DB queries |
| Ch 9: Auth + Validation | JWT, bcrypt, protected routes | auth.service.js, authenticate middleware, validate.js |
| Ch 10: This Project | Everything combined | The complete Task API |

---

## What to Build Next

You now have a working backend foundation. Here's where to go next:

**Extend This Project:**
- Add email verification on registration
- Add password reset via email
- Add file upload for task attachments
- Add real-time updates using WebSockets

**Improve Code Quality:**
- Add automated tests (Jest + Supertest)
- Add API documentation (Swagger/OpenAPI)
- Add request rate limiting (express-rate-limit)

**Production Readiness:**
- Add a proper logger (Winston or Pino)
- Deploy to Railway, Render, or Fly.io
- Use MongoDB Atlas for cloud database
- Set up environment-specific configs

---

## Key Takeaways

- A backend API is: routing + middleware + business logic + database
- **Layered architecture** separates concerns: route -> controller -> service -> model
- Controllers handle **HTTP** (req/res); services handle **business logic** (no HTTP knowledge)
- **Middleware** handles cross-cutting concerns: auth, logging, validation, error handling
- Every route that modifies data should be protected with authentication
- **Ownership enforcement** lives in the service layer, not in routes
- Error handling must be centralized, consistent, and never leak stack traces to production
- The `populate()` call turns ObjectId references into full objects (like a JOIN)
- Always return the same error for "wrong email" and "wrong password" — never reveal which one
- `select: false` on password fields prevents accidental exposure
- Start with `npm run dev` (nodemon), deploy with `npm start` (node)

---

## Final Words

You started this curriculum by asking: "What even is a network?"

You end it having built a production-structured Express + MongoDB API from scratch.

You can now:
- Trace a request from DNS resolution to database and back
- Design clean REST endpoints
- Build middleware pipelines
- Structure code in maintainable layers
- Handle authentication and authorization
- Persist and query data with MongoDB

The next step is not reading more. The next step is **building something**.

Take this architecture. Apply it to a real idea. Break it. Fix it. Add features. That is how backend engineers are made.
