# Chapter 09 — Authentication and Validation

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Explain why authentication exists and how it works over stateless HTTP
- Implement user registration and login with password hashing
- Generate and verify JSON Web Tokens (JWT)
- Protect routes using authentication middleware
- Implement role-based authorization
- Validate incoming request data with proper error messages
- Handle errors in a structured, consistent way

---

## Why This Matters

An API without authentication is a public database. Anyone can read, modify, or delete any record.

An API without validation is an attack surface. Malformed data crashes your server. Missing data corrupts your database.

Both are non-negotiable for any real API.

---

## Core Concepts

### 1. The Authentication Problem Over HTTP

HTTP is stateless. Each request arrives with zero memory of previous requests.

This creates a problem:
```
User logs in:
  POST /login { email, password }
  Server verifies -> User is authenticated

Next request:
  GET /profile
  Server has no idea who this is. HTTP is stateless.
```

There are two main solutions:

**Sessions (server-side state):**
```
Login -> Server creates a session, stores it in DB
      -> Sends sessionId in a cookie

Next request -> Browser sends cookie
             -> Server looks up sessionId in DB
             -> Finds user -> authenticated

Problem: State stored on server. Harder to scale.
         DB lookup on every request.
```

**Tokens (client-side state):**
```
Login -> Server verifies credentials
      -> Creates a signed token containing user info
      -> Returns token to client

Next request -> Client sends token in Authorization header
             -> Server verifies signature (no DB lookup)
             -> Trusts the data inside token -> authenticated

Benefit: Stateless. Works across multiple servers.
         No session storage needed.
```

JWT is the most common token format for REST APIs.

---

### 2. JWT — JSON Web Token

A JWT is a compact, URL-safe token that carries JSON data and is cryptographically signed.

It proves: "I know the secret key, and I assert these claims."

Structure:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJzdWIiOiI2NGE3ZjFiMiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjkwMDAwMDAwLCJleHAiOjE2OTAwMDM2MDB9
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Part 1: HEADER (base64url encoded)
  {"alg": "HS256", "typ": "JWT"}

Part 2: PAYLOAD (base64url encoded)
  {
    "sub": "64a7f1b2...",  <- user ID
    "role": "user",
    "iat": 1690000000,     <- issued at (Unix timestamp)
    "exp": 1690003600      <- expires at (1 hour later)
  }

Part 3: SIGNATURE
  HMAC_SHA256(
    base64url(header) + "." + base64url(payload),
    SECRET_KEY
  )
```

```
TOKEN FLOW:

Login
  |
  v
Server verifies credentials
  |
  v
Server signs JWT with SECRET_KEY
  |
  v
Returns JWT to client

Client stores token (localStorage or memory)
  |
  v
Every subsequent request:
  Authorization: Bearer <JWT>
  |
  v
Server verifies signature (can JWT -> SECRET_KEY produce this signature?)
  |
  v  (yes)
Trust payload. Extract userId, role.
  |
  v  (no)
401 Unauthorized
```

**JWT is NOT encrypted.** The payload is only base64-encoded (anyone can decode it). Never put sensitive data (password, credit card) in a JWT payload.

**JWT is signed.** The signature ensures no one tampered with the payload. If a client modifies `"role": "admin"`, the signature won't match and verification fails.

---

### 3. Setting Up Authentication

Install:
```bash
npm install bcrypt jsonwebtoken
```

**Password Hashing with bcrypt:**

Never store passwords in plain text. Use bcrypt to hash them.

```javascript
const bcrypt = require('bcrypt');

// Hashing (on registration)
const SALT_ROUNDS = 12;  // higher = slower = more secure
const hash = await bcrypt.hash('myplaintextpassword', SALT_ROUNDS);
// hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFf0Oa03"

// Comparing (on login)
const isMatch = await bcrypt.compare('myplaintextpassword', hash);
// isMatch = true

const isMatch = await bcrypt.compare('wrongpassword', hash);
// isMatch = false
```

Mental model: **bcrypt is a one-way function. You can check if a password matches a hash, but you cannot reverse a hash to get the original password.**

---

### 4. Building Registration and Login

**models/User.js** (with password handling):
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,  // exclude from all queries by default
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true, versionKey: false });

// Auto-hash before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to verify password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

**services/auth.service.js:**
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(userId, role) {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register({ name, email, password }) {
  // Check if email already exists
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  // Create user (password hashed by pre-save hook)
  const user = await User.create({ name, email, password });

  // Sign token
  const token = signToken(user._id, user.role);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

async function login({ email, password }) {
  // Find user and explicitly include password (select: false)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  // Verify password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const token = signToken(user._id, user.role);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

module.exports = { register, login };
```

**Note:** Always return the same error for "email not found" and "wrong password". This prevents attackers from learning which emails exist.

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

---

### 5. Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    // 1. Check for Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // 2. Extract token
    const token = authHeader.split(' ')[1];

    // 3. Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // throws JsonWebTokenError if invalid
    // throws TokenExpiredError if expired

    // 4. Optionally fetch full user from DB
    // (Unnecessary if JWT payload has enough info)
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

module.exports = { authenticate };
```

---

### 6. Role-Based Authorization

Authentication = who you are.
Authorization = what you're allowed to do.

```javascript
// middleware/auth.js (add to existing file)
function authorize(...roles) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
```

Usage:
```javascript
const { authenticate, authorize } = require('../middleware/auth');

// Anyone authenticated
router.get('/profile', authenticate, getProfile);

// Only admins
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);

// Admins or moderators
router.patch('/posts/:id/pin', authenticate, authorize('admin', 'moderator'), pinPost);
```

---

### 7. Protecting Routes and Self-Authorization

Sometimes a resource can only be accessed by its owner OR an admin:

```javascript
async function updateUser(req, res, next) {
  try {
    const targetId = req.params.id;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // Allow if: same user OR admin
    if (targetId !== requesterId && requesterRole !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const updated = await userService.update(targetId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
```

---

### 8. Input Validation

Validation prevents:
- Missing required fields causing crashes
- Invalid formats corrupting your database
- Malicious data causing security issues

**Manual validation (for small projects):**
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
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}
```

**Using express-validator (for larger projects):**
```bash
npm install express-validator
```

```javascript
const { body, validationResult } = require('express-validator');

const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain a number'),

  // This runs after the validators above
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }
    next();
  }
];
```

---

### 9. Structured Error Handling

Consistent error handling across your entire API:

```javascript
// utils/AppError.js
class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```

```javascript
// middleware/errorHandler.js
const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(status).json({ error: message, details });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    return res.status(status).json({ error: message });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
    return res.status(status).json({ error: message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
```

---

### 10. The Complete Auth Flow Diagram

```
REGISTRATION:

POST /auth/register
  { name, email, password }
       |
       v
[validateRegister middleware]
  Check: name, email, password valid?
  No? -> 400 with field errors
       |
       v
[auth controller -> auth service]
  Check: email already exists?
  Yes? -> 409 Conflict
       |
       v
[User.create()]
  pre('save') hook auto-hashes password
       |
       v
[signToken(user._id, user.role)]
       |
       v
[201 Created]
  { token: "eyJ...", user: { id, name, email, role } }


LOGIN:

POST /auth/login
  { email, password }
       |
       v
[validateLogin middleware]
       |
       v
[auth service]
  User.findOne({ email }).select('+password')
  Not found? -> 401 "Invalid email or password"
       |
       v
  bcrypt.compare(password, user.password)
  No match? -> 401 "Invalid email or password"
       |
       v
  signToken(user._id, user.role)
       |
       v
[200 OK]
  { token: "eyJ...", user: { id, name, email, role } }


PROTECTED REQUEST:

GET /profile
Authorization: Bearer eyJ...
       |
       v
[authenticate middleware]
  Parse Authorization header
  No header? -> 401
       |
       v
  jwt.verify(token, JWT_SECRET)
  Invalid? -> 401
  Expired? -> 401
       |
       v
  Attach req.user = { id, role }
       |
       v
[route handler]
  Use req.user.id to fetch profile
       |
       v
[200 OK]
  { user: { ... } }
```

---

## Mental Models Summary

| Concept | Mental Model |
|---------|-------------|
| Authentication | Proving your identity (passport check at border) |
| Authorization | What you're allowed to do (visa categories) |
| bcrypt | One-way meat grinder — input goes in, hash comes out, no way back |
| JWT | A signed badge — "I claim to be Alice, and the security office signed this" |
| `select: false` | "Password is in the folder, but don't pull it out unless asked" |
| 401 vs 403 | "Who are you?" vs "I know you, but no entry" |
| Token expiry | Badges expire — you must re-authenticate to get a new one |

---

## Common Mistakes

### Mistake 1: Storing plain text passwords

```javascript
// CATASTROPHIC: plain text storage
const user = await User.create({ email, password });  // stores 'mypassword'

// CORRECT:
const hashed = await bcrypt.hash(password, 12);
const user = await User.create({ email, password: hashed });
// OR use pre('save') hook in Mongoose schema (better)
```

### Mistake 2: Storing secrets in source code

```javascript
// BAD:
const token = jwt.sign(payload, 'my-secret-key');  // hardcoded!

// GOOD:
const token = jwt.sign(payload, process.env.JWT_SECRET);
```

### Mistake 3: Not setting token expiry

```javascript
// BAD: token never expires, valid forever
jwt.sign({ sub: userId }, process.env.JWT_SECRET);

// GOOD: always set expiry
jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
```

### Mistake 4: Different errors for "email not found" vs "wrong password"

```javascript
// BAD: reveals which emails exist in your system
if (!user) return res.status(401).json({ error: 'Email not found' });
if (!match) return res.status(401).json({ error: 'Wrong password' });

// GOOD: same error for both
if (!user || !await user.comparePassword(password)) {
  return res.status(401).json({ error: 'Invalid email or password' });
}
```

### Mistake 5: Validating only on the frontend

```javascript
// Frontend validation is UX only.
// Any request can be made directly with Postman or curl, bypassing it.
// Always validate on the backend. Always.
```

---

## Exercises

### Exercise 1: Implement Full Auth

Build a complete auth system:
1. `POST /auth/register` — create user, return JWT
2. `POST /auth/login` — verify credentials, return JWT
3. `GET /auth/me` — protected, return current user's profile

### Exercise 2: Token Refresh

JWTs expire. When they do, users get 401. Implement:
- Short-lived access token (15 minutes)
- Long-lived refresh token (7 days, stored in HttpOnly cookie)
- `POST /auth/refresh` — uses refresh token to issue new access token

### Exercise 3: Change Password Endpoint

Build `PATCH /auth/password`:
- Requires authentication
- Body: `{ currentPassword, newPassword }`
- Verify current password before allowing change
- Hash new password before saving

### Exercise 4: Admin-Only Route

Add an admin user seeder and protect a `GET /admin/stats` route:
- Returns total user count and task count
- Only accessible to users with `role: 'admin'`
- Returns 403 for non-admin authenticated users

---

## Key Takeaways

- HTTP is stateless — authentication tokens (JWT) are how you add identity to stateless requests
- **JWT** = header + payload + signature; payload is base64 (readable), signature verifies integrity
- Always hash passwords with **bcrypt** — never store plain text passwords
- Never store sensitive data (passwords, card numbers) in JWT payloads
- Always set a **token expiry** with `expiresIn`
- **Authentication middleware** extracts and verifies the JWT, attaches user info to `req.user`
- **Authorization middleware** checks if the authenticated user has permission for the action
- 401 = "not authenticated" (no valid token), 403 = "not authorized" (token valid, permission denied)
- Return the same error message for "user not found" and "wrong password" — don't leak which emails exist
- **Validate every input on the backend** — frontend validation is just UX, never security
- Use a consistent error format and centralized error handler for all responses
