# Chapter 05 — Node.js Foundations

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Explain what Node.js is and why it exists
- Understand what a JavaScript runtime is
- Understand what it means for Node.js to be event-driven and non-blocking
- Know Node.js's module system (CommonJS and ES Modules)
- Create a basic HTTP server using Node.js built-ins
- Know when Node.js excels and when it doesn't

---

## Why This Matters

You've been writing JavaScript in a browser. Node.js is JavaScript outside the browser.

To write backend code, you must understand:
- What Node.js is adding on top of JavaScript
- What the event-driven model means in practice
- Why Node.js handles many concurrent requests without creating a thread per request
- What built-in modules you have available (http, fs, path, crypto)

Express is built on top of Node.js's http module. Understanding Node.js first means Express is never magic -- you understand what it wraps.

---

## Core Concepts

### 1. What is Node.js?

Node.js is a **JavaScript runtime built on Chrome's V8 engine**.

Let's unpack that:

- **JavaScript** -- the programming language you already know
- **Runtime** -- the environment that can execute JavaScript code
- **V8** -- Google's high-performance JavaScript engine (same one that runs in Chrome)

Before Node.js, JavaScript could only run in browsers. Node.js took V8 and made it run on servers.

```
BEFORE NODE.JS:

Browser (V8 engine)
  |
  +-- JavaScript can run here only
  +-- Has: DOM, window, document
  +-- Cannot: access filesystem, network sockets, databases

AFTER NODE.JS:

Browser (V8)              Node.js (V8 + extras)
  |                         |
  +-- Has DOM               +-- NO DOM (no browser)
  +-- window object         +-- NO window
  +-- document              +-- NO document
                            +-- HAS: fs (filesystem)
                            +-- HAS: http (raw HTTP server)
                            +-- HAS: path (file paths)
                            +-- HAS: crypto (encryption)
                            +-- HAS: process (OS access)
                            +-- HAS: net (raw TCP sockets)
```

Node.js gives JavaScript the ability to:
- Read and write files
- Create HTTP servers
- Connect to databases
- Access environment variables
- Spawn child processes
- Use the operating system

---

### 2. The Node.js Architecture

Node.js has a unique architecture that makes it well-suited for backend APIs:

```
+----------------------------------------------+
|              Your Application Code           |
+----------------------------------------------+
|           Node.js Standard Library            |
|  (http, fs, path, crypto, events, stream...) |
+----------------------------------------------+
|              Node.js Bindings (C++)           |
+----------------------------------------------+
|     V8 Engine       |     libuv               |
|  (JS execution)     |  (event loop, async I/O)|
+----------------------------------------------+
|              Operating System                 |
+----------------------------------------------+
```

The key component is **libuv** -- a C library that provides:
- The **event loop**
- Non-blocking I/O operations
- Thread pool for operations that must be blocking (file I/O, DNS)

---

### 3. Event-Driven, Non-Blocking I/O

This is Node.js's core distinction. To understand it, contrast with the traditional model:

**Traditional (blocking) server model (e.g., Apache with PHP):**

```
Request 1 arrives
  Thread 1 handles it
  Thread 1 waits for DB query (100ms)  <-- doing nothing, blocked
  Thread 1 sends response

Request 2 arrives simultaneously
  Thread 2 handles it
  Thread 2 waits for DB query (100ms)  <-- also blocked
  Thread 2 sends response

1000 concurrent requests = 1000 threads
  (threads are expensive: ~1MB memory each)
```

**Node.js (non-blocking, event-driven) model:**

```
Request 1 arrives
  Event loop handles it
  Sends DB query, registers a callback, moves on immediately

Request 2 arrives
  Event loop handles it
  Sends DB query, registers a callback, moves on immediately

Request 3 arrives
  ... same

[DB response for Request 1 arrives]
  Event loop picks it up, calls callback, sends response

[DB response for Request 2 arrives]
  Event loop picks it up, calls callback, sends response

1000 concurrent requests = still one thread
  (memory efficient, fast for I/O-heavy work)
```

Mental model: **Node.js is like one very fast waiter in a restaurant. Instead of standing at one table waiting for food, the waiter takes orders from everyone, submits them all to the kitchen, and picks up dishes as they come out. One waiter, many tables.**

```
BLOCKING MODEL:                NON-BLOCKING MODEL (Node.js):

Waiter 1: Table 1              Waiter: takes order from Table 1
  (waits at Table 1)                   submits to kitchen
                                        takes order from Table 2
Waiter 2: Table 2                       submits to kitchen
  (waits at Table 2)                    takes order from Table 3
                                        submits to kitchen
Waiter 3: Table 3              Kitchen: Table 1 ready!
  (waits at Table 3)           Waiter: delivers Table 1
                               Kitchen: Table 3 ready!
                               Waiter: delivers Table 3
                               Kitchen: Table 2 ready!
                               Waiter: delivers Table 2
```

**When is Node.js NOT ideal?**

```
GOOD USE CASES:
  - REST APIs (I/O bound)
  - Real-time apps (chat, notifications)
  - Streaming data
  - API gateways

BAD USE CASES:
  - CPU-intensive computation (image processing, ML, video encoding)
  - Heavy math or cryptography in the hot path
  (These block the event loop and prevent all other requests from being handled)
```

---

### 4. The Node.js Module System

Node.js organizes code into modules. There are two systems:

**CommonJS (older, default in Node.js):**
```javascript
// Exporting
// math.js
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }

module.exports = { add, subtract };

// Importing
// app.js
const { add, subtract } = require('./math');
console.log(add(2, 3));  // 5
```

**ES Modules (modern, requires .mjs or "type": "module" in package.json):**
```javascript
// Exporting
// math.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

// Importing
// app.js
import { add, subtract } from './math.js';
```

Most Express/Node.js tutorials still use CommonJS (`require`). This curriculum uses CommonJS for consistency.

**Built-in modules (no install needed):**
```javascript
const http = require('http');      // HTTP server
const fs = require('fs');          // File system
const path = require('path');      // File paths
const crypto = require('crypto');  // Encryption
const os = require('os');          // Operating system info
const events = require('events');  // EventEmitter
```

**Third-party modules (installed via npm):**
```javascript
// After: npm install express mongoose bcrypt
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
```

---

### 5. npm and package.json

npm is Node.js's package manager. It installs third-party libraries.

```bash
# Initialize a new project (creates package.json)
npm init -y

# Install a package (adds to node_modules, updates package.json)
npm install express

# Install a dev-only dependency
npm install --save-dev nodemon

# Run a script defined in package.json
npm run dev
```

**package.json** is the manifest of your project:
```json
{
  "name": "my-api",
  "version": "1.0.0",
  "description": "A Node.js REST API",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

`node_modules/` is where installed packages live. It can be huge. **Never commit it to git.**

```
.gitignore:
  node_modules/
  .env
```

---

### 6. The `process` Object

`process` is a global object in Node.js that gives you access to the running process:

```javascript
// Environment variables (extremely important)
const port = process.env.PORT || 3000;
const dbUrl = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

// Exit the process
process.exit(0);   // exit with success code
process.exit(1);   // exit with failure code

// Current directory
console.log(process.cwd());

// Command line arguments
console.log(process.argv);
// ['node', 'server.js', 'arg1', 'arg2']
```

Environment variables are how you configure your app differently in development vs production without changing code.

---

### 7. Creating an HTTP Server

Node.js has a built-in `http` module. This is what Express wraps:

```javascript
const http = require('http');

// http.createServer takes a callback
// callback receives: req (request), res (response)
const server = http.createServer((req, res) => {

  // req contains:
  // req.method   -> 'GET', 'POST', etc.
  // req.url      -> '/users', '/posts/1', etc.
  // req.headers  -> { 'content-type': 'application/json', ... }

  console.log(`${req.method} ${req.url}`);

  // Route handling by hand
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Welcome to the API' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Fallback: 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Bind to port and start listening
server.listen(3000, () => {
  console.log('Server is listening on http://localhost:3000');
});
```

```
ANATOMY OF THE SERVER:

http.createServer(callback)
          |
          v
      Creates a server object that:
      - Listens on a TCP port
      - Calls callback on every incoming HTTP request
      - Passes req (IncomingMessage) and res (ServerResponse) to callback

server.listen(port, callback)
          |
          v
      Binds the server to a TCP port
      - Now accepting connections
      - Calls callback once when server is ready
```

### Reading the Request Body

The request body doesn't arrive all at once. It streams in:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/users') {

    let body = '';

    // Data comes in chunks
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    // All data received
    req.on('end', () => {
      const data = JSON.parse(body);
      console.log('Received:', data);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ created: data }));
    });

    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000);
```

This is painful. This is exactly why Express exists -- it handles body parsing, routing, and much more. But understanding this raw layer means you know what Express is doing under the hood.

---

### 8. Event Emitters

Node.js is built on events. The core pattern is the `EventEmitter`:

```javascript
const EventEmitter = require('events');

const emitter = new EventEmitter();

// Register a listener
emitter.on('data-received', (data) => {
  console.log('Got data:', data);
});

// Emit an event
emitter.emit('data-received', { user: 'Alice' });
// output: Got data: { user: 'Alice' }
```

The HTTP server is itself an EventEmitter:
```javascript
// This:
server.listen(3000, () => { console.log('ready'); });

// Is equivalent to:
server.listen(3000);
server.on('listening', () => { console.log('ready'); });
```

You don't need to deeply understand EventEmitter for Express APIs. But knowing it exists helps you understand error handling and stream APIs.

---

## Mental Models Summary

| Concept | Mental Model |
|---------|-------------|
| Node.js | JavaScript + superpowers (filesystem, network, OS) |
| V8 Engine | JavaScript interpreter, runs your code |
| libuv | The async operations manager, runs I/O off the main thread |
| Event loop | The single waiter who serves many tables |
| Non-blocking I/O | "Start the task, I'll come back when it's done" |
| CommonJS require | Borrowing tools from another file |
| npm | App store for Node.js packages |
| process.env | Secret configuration that lives outside code |

---

## Common Mistakes

### Mistake 1: Blocking the event loop

```javascript
// BAD: synchronous file read blocks everything
app.get('/data', (req, res) => {
  const data = fs.readFileSync('large-file.json');  // blocks!
  res.json(JSON.parse(data));
});

// GOOD: async, non-blocking
app.get('/data', async (req, res) => {
  const data = await fs.promises.readFile('large-file.json', 'utf8');
  res.json(JSON.parse(data));
});
```

While `readFileSync` runs, every other incoming request waits. Use async APIs.

### Mistake 2: Forgetting that process.env values are strings

```javascript
const port = process.env.PORT;
server.listen(port);     // Works (listen accepts strings)

const limit = process.env.RATE_LIMIT;
if (limit > 100) { ... }  // BAD: comparing string to number

const limit = Number(process.env.RATE_LIMIT) || 100;  // GOOD
```

### Mistake 3: Putting secrets in code

```javascript
// BAD: secret in source code
const jwtSecret = 'my-super-secret-key-123';

// GOOD: secret in environment variable
const jwtSecret = process.env.JWT_SECRET;
```

Secrets in code get committed to git, pushed to GitHub, and leaked.

### Mistake 4: Not handling errors on the server

```javascript
// If this throws, Node.js crashes the entire process
server.on('request', (req, res) => {
  JSON.parse(req.body);  // if body is invalid JSON, CRASH
});

// Always wrap in try/catch or handle error events
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);  // exit cleanly, let process manager restart
});
```

---

## Exercises

### Exercise 1: Explore Node.js Globals

Create `explore.js`:
```javascript
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Current directory:', process.cwd());
console.log('Env vars:', Object.keys(process.env));
console.log('Memory usage:', process.memoryUsage());
```
Run: `node explore.js`

### Exercise 2: Build a File Server

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  // Map URL to a file in current directory
  const filePath = path.join(process.cwd(), req.url === '/' ? '/index.html' : req.url);

  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
});

server.listen(3000, () => {
  console.log('File server running on http://localhost:3000');
});
```

Create an `index.html` in the same folder and visit `http://localhost:3000`.

### Exercise 3: Environment Variable Configuration

Create `.env` file:
```
PORT=4000
APP_NAME=MyAPI
NODE_ENV=development
```

Install dotenv: `npm install dotenv`

Create `config.js`:
```javascript
require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  appName: process.env.APP_NAME || 'API',
  isDevelopment: process.env.NODE_ENV === 'development',
};

console.log('Config:', config);
```

Run: `node config.js`

### Exercise 4: See the Event Loop in Action

```javascript
console.log('1 - sync');

setTimeout(() => {
  console.log('3 - setTimeout (async, queued)');
}, 0);

Promise.resolve().then(() => {
  console.log('2 - Promise (microtask, runs before setTimeout)');
});

console.log('4 - sync again');
```

Output:
```
1 - sync
4 - sync again
2 - Promise (microtask, runs before setTimeout)
3 - setTimeout (async, queued)
```

This demonstrates the event loop order: synchronous code -> microtasks (Promises) -> macrotasks (setTimeout, I/O).

---

## Key Takeaways

- Node.js is a **JavaScript runtime** that lets JavaScript run outside the browser (on servers)
- Node.js is built on **V8** (JS engine) + **libuv** (async I/O and event loop)
- Node.js is **single-threaded** and **event-driven** — one thread handles all requests via callbacks
- **Non-blocking I/O** means: start the I/O, don't wait, handle the result when it's done
- Node.js excels at **I/O-bound** work (APIs, databases, file serving); avoid **CPU-bound** work
- Use **CommonJS** (`require`/`module.exports`) or **ES Modules** (`import`/`export`)
- **npm** manages third-party packages; **package.json** declares them
- Use **process.env** for all configuration and secrets — never hardcode them
- The raw `http` module is powerful but verbose; Express wraps it with DX improvements
- Always use **async** file and network operations — sync operations block the event loop
