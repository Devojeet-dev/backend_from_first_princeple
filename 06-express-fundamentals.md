# Chapter 06 — Express Fundamentals

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Set up an Express application from scratch
- Define routes with all HTTP methods
- Read path parameters, query parameters, and request body
- Send responses with proper status codes and JSON
- Organize routes using Express Router
- Build your first functional REST API with Express

---

## Why This Matters

In Chapter 5, you built an HTTP server by hand. You saw how painful routing, body parsing, and response formatting are with raw Node.js.

Express solves all of that. It is the most widely used Node.js web framework. Understanding Express deeply means you can build any backend API, and you understand what every line is doing.

Express is not magic. It's a thin wrapper over Node.js's `http` module. After Chapter 5, nothing in Express should be mysterious.

---

## Core Concepts

### 1. What is Express?

Express is a **minimal and flexible Node.js web application framework**.

It provides:
- **Routing** — match incoming requests to handler functions
- **Middleware system** — composable request/response processing
- **Request/Response abstraction** — cleaner API than raw `http`
- **Error handling** — structured way to handle errors

What Express does NOT provide (by design):
- Database layer
- Authentication
- Templating engine (though it supports them)
- Input validation

Express is intentionally minimal. You add what you need.

```
RAW NODE.JS HTTP SERVER:

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/users') {
    // parse headers manually
    // read body manually (streams)
    // write response headers manually
    // format JSON manually
  }
});

EXPRESS:

const app = express();
app.get('/users', (req, res) => {
  // req and res are enhanced Node.js objects
  // body already parsed (with middleware)
  // easy response methods: res.json(), res.status()
});
```

---

### 2. Setting Up Express

```bash
mkdir my-api
cd my-api
npm init -y
npm install express
```

Create `index.js`:

```javascript
const express = require('express');

const app = express();

// Middleware: parse incoming JSON bodies
app.use(express.json());

// A basic route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Start listening
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Run: `node index.js`
Test: `curl http://localhost:3000/`

That's it. An Express server in ~15 lines.

---

### 3. The Application Object

`express()` returns an application object. This object is central to everything:

```javascript
const express = require('express');
const app = express();

// app is both:
// 1. A route registry (where you define routes)
// 2. A request handler (you pass it to http.createServer internally)

// Under the hood, app is a function:
// function(req, res, next) { ... }
// express() wraps it with router, middleware stack, etc.
```

```
app.use()     -> attach middleware
app.get()     -> handle GET requests
app.post()    -> handle POST requests
app.put()     -> handle PUT requests
app.patch()   -> handle PATCH requests
app.delete()  -> handle DELETE requests
app.listen()  -> start the HTTP server
```

---

### 4. Routing

Routing is matching incoming requests (method + path) to handler functions.

**Basic route syntax:**
```javascript
app.METHOD(PATH, HANDLER)

// METHOD = get, post, put, patch, delete
// PATH   = string or regex
// HANDLER = function(req, res) { ... }
```

**Examples:**

```javascript
// GET /
app.get('/', (req, res) => {
  res.json({ message: 'Welcome' });
});

// GET /users
app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

// POST /users
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  // save to DB...
  res.status(201).json({ id: 42, name, email });
});

// PUT /users/:id
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  // update in DB...
  res.json({ id, name, email });
});

// DELETE /users/:id
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  // delete from DB...
  res.status(204).send();  // 204 No Content, no body
});
```

```
ROUTE MATCHING FLOW:

Incoming: GET /users/42

Express tries routes in order:

app.get('/')          -> /users/42 matches '/'? No.
app.get('/users')     -> /users/42 matches '/users'? No.
app.get('/users/:id') -> /users/42 matches '/users/:id'? YES!
                         req.params.id = '42'
                         handler is called
```

---

### 5. The Request Object (req)

The `req` object contains everything about the incoming request:

```javascript
app.get('/users/:id', (req, res) => {

  // PATH PARAMETERS (:id in the route definition)
  req.params.id         // '42' (always a string)
  req.params            // { id: '42' }

  // QUERY PARAMETERS (?page=2&limit=10)
  req.query.page        // '2' (always a string)
  req.query.limit       // '10'
  req.query             // { page: '2', limit: '10' }

  // REQUEST BODY (requires express.json() middleware)
  req.body.name         // 'Alice'
  req.body              // { name: 'Alice', email: 'alice@example.com' }

  // HEADERS
  req.headers['authorization']  // 'Bearer eyJhbGci...'
  req.headers['content-type']   // 'application/json'
  req.get('Authorization')      // same, helper method

  // METHOD AND URL
  req.method            // 'GET'
  req.url               // '/users/42?include=posts'
  req.path              // '/users/42' (without query string)

  // IP address of the caller
  req.ip                // '::1' (localhost) or real IP
});
```

---

### 6. The Response Object (res)

The `res` object is how you send responses:

```javascript
app.get('/examples', (req, res) => {

  // SEND JSON (automatically sets Content-Type: application/json)
  res.json({ data: 'something' });

  // SEND WITH STATUS CODE
  res.status(201).json({ created: true });

  // SEND PLAIN TEXT
  res.send('Hello world');

  // SEND EMPTY RESPONSE (for 204)
  res.status(204).send();

  // SET A HEADER
  res.set('X-Request-Id', 'abc123');
  res.setHeader('Cache-Control', 'no-store');

  // REDIRECT
  res.redirect(301, 'https://new-url.com');

  // CHAIN: status + header + json
  res.status(400)
     .set('X-Error-Code', 'VALIDATION_FAILED')
     .json({ error: 'Invalid input' });
});
```

**Important**: You can only call one response method per request. Once you call `res.json()` or `res.send()`, the response is done. Calling it again causes an error.

```javascript
// BAD: double response
app.get('/bad', (req, res) => {
  res.json({ a: 1 });
  res.json({ b: 2 });  // Error: Cannot set headers after sent
});

// GOOD: return after responding
app.get('/good', (req, res) => {
  if (someCondition) {
    return res.status(400).json({ error: 'Bad' });
  }
  res.json({ data: 'Good' });
});
```

---

### 7. Path Parameters Deep Dive

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ userId: id });
});
// GET /users/42  -> { userId: '42' }

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.json({ userId, postId });
});
// GET /users/42/posts/7  -> { userId: '42', postId: '7' }

// Optional parameter with regex
app.get('/files/:filename(.*)', (req, res) => {
  res.json({ file: req.params.filename });
});
// GET /files/images/avatar.jpg -> { file: 'images/avatar.jpg' }
```

Note: `req.params` values are always **strings**. If you need a number:
```javascript
const id = parseInt(req.params.id, 10);
if (isNaN(id)) {
  return res.status(400).json({ error: 'ID must be a number' });
}
```

---

### 8. Query Parameters Deep Dive

```javascript
app.get('/users', (req, res) => {
  const {
    page = '1',      // default value
    limit = '10',
    role,
    search,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  // Convert to numbers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  res.json({
    page: pageNum,
    limit: limitNum,
    role,
    search,
    sort,
    order
  });
});

// GET /users?page=2&limit=5&role=admin&search=alice
// Returns: { page: 2, limit: 5, role: 'admin', search: 'alice', sort: 'createdAt', order: 'desc' }
```

---

### 9. Building a Complete Users API

Let's build a full in-memory CRUD API:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// In-memory "database"
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
];
let nextId = 3;

// GET /users - list all users (with optional role filter)
app.get('/users', (req, res) => {
  const { role } = req.query;
  const result = role
    ? users.filter(u => u.role === role)
    : users;
  res.json(result);
});

// GET /users/:id - get one user
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /users - create a user
app.post('/users', (req, res) => {
  const { name, email, role = 'user' } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const newUser = { id: nextId++, name, email, role };
  users.push(newUser);
  res.status(201).json(newUser);
});

// PATCH /users/:id - update a user
app.patch('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Merge existing user with provided fields
  users[userIndex] = { ...users[userIndex], ...req.body, id };
  res.json(users[userIndex]);
});

// DELETE /users/:id - delete a user
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users.splice(userIndex, 1);
  res.status(204).send();
});

app.listen(3000, () => {
  console.log('Users API running on http://localhost:3000');
});
```

Test this with curl or Postman:
```bash
# List all users
curl http://localhost:3000/users

# Get user 1
curl http://localhost:3000/users/1

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}'

# Update user
curl -X PATCH http://localhost:3000/users/3 \
  -H "Content-Type: application/json" \
  -d '{"name":"Charles"}'

# Delete user
curl -X DELETE http://localhost:3000/users/3
```

---

### 10. Express Router

When you have many routes, keeping them all in `index.js` is a mess. Express Router lets you organize routes into separate files.

```
project/
  index.js
  routes/
    users.js
    posts.js
```

**routes/users.js:**
```javascript
const express = require('express');
const router = express.Router();

// All routes here are relative to the prefix set in index.js
// If mounted at /users, then:
// router.get('/') handles GET /users
// router.get('/:id') handles GET /users/:id

router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
});

router.post('/', (req, res) => {
  res.status(201).json({ created: req.body });
});

module.exports = router;
```

**routes/posts.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, title: 'Hello World' }]);
});

module.exports = router;
```

**index.js:**
```javascript
const express = require('express');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');

const app = express();
app.use(express.json());

// Mount routers at prefixes
app.use('/users', usersRouter);
app.use('/posts', postsRouter);

app.listen(3000);
```

```
ROUTING FLOW:

GET /users/42
  |
  v
app.use('/users', usersRouter)
  |
  v
usersRouter.get('/:id', handler)
  |
  v
req.params.id = '42'
  |
  v
handler executes
```

---

## Mental Models Summary

| Concept | Mental Model |
|---------|-------------|
| Express app | A request router + middleware stack |
| `app.get(path, handler)` | "When GET request hits this path, run this function" |
| req object | The incoming request, fully parsed and accessible |
| res object | Your toolbox for building and sending the response |
| Router | A mini-app for organizing a group of related routes |
| `app.use()` | "Apply this to every request that passes through" |

---

## Common Mistakes

### Mistake 1: Forgetting express.json() middleware

```javascript
// BAD: No body parsing middleware
const app = express();
app.post('/users', (req, res) => {
  console.log(req.body);  // undefined!
  res.json(req.body);
});

// GOOD:
const app = express();
app.use(express.json());  // Must come BEFORE routes
app.post('/users', (req, res) => {
  console.log(req.body);  // { name: 'Alice' }
  res.json(req.body);
});
```

### Mistake 2: Not returning after sending a response

```javascript
// BAD: code continues executing after res.json()
app.get('/users/:id', (req, res) => {
  if (req.params.id === '0') {
    res.status(400).json({ error: 'Invalid ID' });
    // execution continues! error: "Cannot set headers after they are sent"
  }
  res.json({ id: req.params.id });
});

// GOOD: return after responding
app.get('/users/:id', (req, res) => {
  if (req.params.id === '0') {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  res.json({ id: req.params.id });
});
```

### Mistake 3: Not handling the 404 case

```javascript
// If no route matches, Express sends a default HTML 404 page.
// For APIs, you want JSON 404s.

// Add this AFTER all your routes:
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
```

### Mistake 4: Treating req.params values as numbers

```javascript
// BAD:
const id = req.params.id;  // '42' (string)
const user = await User.findById(id + 1);  // '421' (string concatenation!)

// GOOD:
const id = parseInt(req.params.id, 10);  // 42 (number)
const user = await User.findById(id + 1);  // 43 (math)
```

---

## Exercises

### Exercise 1: Build a Books API

Create a complete CRUD API for books:
- `GET /books` — list all books, support `?genre=` and `?author=` filters
- `GET /books/:id` — get one book (404 if not found)
- `POST /books` — create a book (`title`, `author`, `genre` required)
- `PATCH /books/:id` — update any field of a book
- `DELETE /books/:id` — delete a book

Use an in-memory array. Test with curl or Postman.

### Exercise 2: Add Request Logging

Before any routes, add a middleware that logs:
- Method (GET, POST, etc.)
- URL
- Timestamp
- Response time (hint: record time before route, log after)

```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});
```

### Exercise 3: Extract Routes into a Router

Take the books API from Exercise 1 and move the routes into `routes/books.js`. Mount them in `index.js` at `/books`.

### Exercise 4: Handle Not Found and Validation

Add:
1. A catch-all 404 handler (returns JSON, not HTML)
2. Validation for POST /books: return 400 with specific field errors if `title` or `author` are missing

---

## Key Takeaways

- Express is a thin wrapper over Node.js's `http` module that adds routing and middleware
- `express()` creates an application; `app.listen()` starts the HTTP server
- Routes are matched by `app.METHOD(path, handler)` in registration order
- `req.params` = path parameters (`:id`), `req.query` = query string params, `req.body` = request body
- `req.params` values are **always strings** — convert to numbers when needed
- `res.json()` automatically sets `Content-Type: application/json`
- Always `return` after sending a response to prevent double-response errors
- Use `express.json()` middleware to parse JSON request bodies — place it before routes
- **Express Router** organizes routes into modules; mount them with `app.use('/prefix', router)`
- Add a catch-all 404 handler after all routes to return JSON errors for unmatched routes
