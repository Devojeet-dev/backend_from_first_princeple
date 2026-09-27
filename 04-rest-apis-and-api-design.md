# Chapter 04 — REST APIs and API Design

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Explain what REST is and what it actually requires
- Think in terms of resources, not actions
- Design clean, predictable REST endpoints
- Know the difference between a good and bad API design
- Understand JSON as the data exchange format of APIs
- Apply consistent naming conventions to your endpoints

---

## Why This Matters

You will spend your career either consuming APIs or building them. Bad API design causes bugs, confusion, and wasted hours. Good API design feels obvious — developers never need to read the docs to guess the next endpoint.

REST is not a standard or a spec. It is an architectural style with constraints. Understanding those constraints helps you design APIs that work the way users expect.

---

## Core Concepts

### 1. What REST Actually Is

REST stands for **Representational State Transfer**.

It was defined in 2000 by Roy Fielding in his PhD dissertation. It is not a protocol. It is not a library. It is an **architectural style** — a set of constraints on how to design networked systems.

The constraints that matter for backend APIs:

```
1. Client-Server separation
   Client and server are independent.
   Client doesn't care how server stores data.
   Server doesn't care what client does with the response.

2. Stateless
   Each request contains all information the server needs.
   Server never stores client session state between requests.
   Identity is sent with every request (via token/cookie).

3. Uniform Interface
   Resources are identified by URLs.
   Resources are manipulated through representations (JSON).
   Messages are self-descriptive (Content-Type, status codes).

4. Layered System
   Client doesn't know if it's talking to the real server,
   a cache, or a load balancer.
```

Most "REST APIs" don't follow all constraints strictly. In practice, "RESTful" means:
- Resources are identified by URLs
- HTTP methods communicate the action
- JSON is the exchange format
- Status codes communicate the outcome

---

### 2. Resource Thinking

The fundamental shift in REST is thinking in **resources**, not **actions**.

A resource is a noun — a thing that exists in your system.

```
Resources:
  Users
  Posts
  Comments
  Orders
  Products
  Tasks
  Sessions
```

Actions are determined by **HTTP methods**, not by URL verbs.

**Wrong approach (action-based, RPC-style):**
```
GET  /getUser?id=42
POST /createUser
POST /updateUser
POST /deleteUser
POST /getUserPosts
```

**Right approach (resource-based, RESTful):**
```
GET    /users        -> list users
GET    /users/42     -> get user 42
POST   /users        -> create user
PUT    /users/42     -> replace user 42
PATCH  /users/42     -> update user 42 partially
DELETE /users/42     -> delete user 42
GET    /users/42/posts -> get posts by user 42
```

The URL identifies **what**. The HTTP method identifies **what action**.

---

### 3. CRUD and REST Mapping

CRUD (Create, Read, Update, Delete) maps cleanly to HTTP methods:

```
CRUD Operation    HTTP Method    Status Code
--------------    -----------    -----------
Create            POST           201 Created
Read (list)       GET            200 OK
Read (single)     GET            200 OK (404 if not found)
Update (full)     PUT            200 OK
Update (partial)  PATCH          200 OK
Delete            DELETE         204 No Content
```

For a `users` resource, the full REST interface:

```
Endpoint              Method    Action
--------------------  ------    ------
/users                GET       List all users
/users                POST      Create a new user
/users/:id            GET       Get one user
/users/:id            PUT       Replace user entirely
/users/:id            PATCH     Update user partially
/users/:id            DELETE    Delete user
```

This pattern is called a **RESTful resource collection**. Once you know it, you can predict any API.

---

### 4. Nested Resources

When a resource belongs to another resource, use nested URLs:

```
/users/42/posts        -> posts belonging to user 42
/users/42/posts/7      -> post 7 belonging to user 42
/posts/7/comments      -> comments on post 7
/orders/ORD-001/items  -> items in order ORD-001
```

Rule: Don't nest more than 2 levels deep. It gets unwieldy.

```
GOOD:
/users/42/posts

ACCEPTABLE:
/users/42/posts/7

BAD (too deep):
/users/42/posts/7/comments/3/replies/8
```

For deeply nested resources, consider flattening:
```
/users/42/posts/7/comments/3/replies
  becomes:
/comments/3/replies
  or:
/replies?commentId=3
```

---

### 5. JSON as the Exchange Format

REST APIs use **JSON** (JavaScript Object Notation) as the standard data format.

JSON is:
- Text-based (human readable)
- Language-independent (works with any language)
- Easy to parse (every language has JSON libraries)

```json
{
  "id": 42,
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin",
  "createdAt": "2024-01-15T10:30:00Z",
  "address": {
    "street": "123 Main St",
    "city": "Austin",
    "country": "US"
  },
  "tags": ["developer", "mentor"]
}
```

JSON rules:
- Keys must be strings in double quotes
- Values can be: string, number, boolean, null, object, array
- Trailing commas are NOT allowed
- No comments allowed

**JSON in API responses — consistency matters:**

Always return consistent shapes. If `/users` returns an array:
```json
[
  {"id": 1, "name": "Alice"},
  {"id": 2, "name": "Bob"}
]
```

Then `/users/1` should return the same shape for a single object:
```json
{"id": 1, "name": "Alice"}
```

---

### 6. API Response Envelopes

Some APIs wrap responses in an envelope object:

```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "Alice"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

Others return the data directly:
```json
{"id": 42, "name": "Alice"}
```

Both are valid. Pick one style and stick to it throughout your API.

For paginated list responses, an envelope is almost always useful:
```json
{
  "data": [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"}
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 245,
    "totalPages": 25
  }
}
```

---

### 7. API Versioning

APIs change over time. Breaking changes break clients.

Versioning strategy - prefix your API with a version:
```
/v1/users
/v2/users    <- breaking changes? bump the version
```

Or via headers:
```
Accept: application/vnd.myapp.v2+json
```

URL versioning is simpler and more explicit. Most teams use it.

```
https://api.myapp.com/v1/users   <- old clients still work
https://api.myapp.com/v2/users   <- new clients use this
```

---

### 8. Good vs Bad API Design

#### Naming Conventions

```
BAD:
GET /getUsers
GET /GetAllUsers
GET /Users
GET /user_list
POST /createUser
POST /CreateNewUser

GOOD:
GET /users          <- plural nouns, lowercase, hyphens for multi-word
GET /blog-posts     <- not blogposts, not blog_posts
GET /order-items    <- kebab-case
```

#### Status Codes

```
BAD:
GET /users/999
-> 200 OK
   {"error": "User not found"}  <- 200 with error body? Never.

GOOD:
GET /users/999
-> 404 Not Found
   {"error": "User not found", "code": "USER_NOT_FOUND"}
```

#### Error Responses

Consistent error format matters:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {"field": "email", "message": "Invalid email format"},
    {"field": "password", "message": "Must be at least 8 characters"}
  ]
}
```

Not:
```json
{"msg": "fail"}  // What failed? How? Why?
```

#### Over-fetching and Under-fetching

```
Over-fetching:
  GET /users returns 40 fields
  Client only needs name and email
  -> Wasted bandwidth, slower responses

Under-fetching:
  GET /users returns only IDs
  Client must call GET /users/1, /users/2, ... for each one
  -> N+1 requests problem

Solution: return what the client needs, no more.
Consider: query params for field selection
  GET /users?fields=name,email
```

---

### 9. Complete Resource Design Example

Let's design a REST API for a blog application:

```
Resources:
  - Users
  - Posts
  - Comments

Endpoints:

USERS:
  GET    /users           -> list users
  POST   /users           -> register
  GET    /users/:id       -> get user profile
  PATCH  /users/:id       -> update profile
  DELETE /users/:id       -> delete account

POSTS:
  GET    /posts           -> list all posts (with ?page=1&limit=10)
  POST   /posts           -> create post (auth required)
  GET    /posts/:id       -> get one post
  PUT    /posts/:id       -> replace post (auth, must be author)
  PATCH  /posts/:id       -> update post (auth, must be author)
  DELETE /posts/:id       -> delete post (auth, must be author)

COMMENTS (nested under posts):
  GET    /posts/:postId/comments     -> list comments on a post
  POST   /posts/:postId/comments     -> add comment (auth required)
  DELETE /posts/:postId/comments/:id -> delete comment

SEARCH / FILTERING:
  GET    /posts?author=42            -> posts by user 42
  GET    /posts?tag=javascript       -> posts tagged "javascript"
  GET    /posts?q=async+await        -> search posts
  GET    /posts?sort=createdAt&order=desc
```

```
RESOURCE DIAGRAM:

/users                /posts              /posts/:id/comments
  |                     |                      |
  +-- GET (list)         +-- GET (list)          +-- GET (list)
  +-- POST (create)      +-- POST (create)       +-- POST (create)
  |                      |
  +-- /:id               +-- /:id
       |                      |
       +-- GET                +-- GET
       +-- PATCH              +-- PUT/PATCH
       +-- DELETE             +-- DELETE
```

---

## Mental Models Summary

| Concept | Mental Model |
|---------|-------------|
| Resource | A noun in your system (User, Post, Order) |
| HTTP method | The verb (GET=read, POST=create, DELETE=remove) |
| REST | The grammar rules for how nouns and verbs combine |
| JSON | The language everything speaks |
| Status codes | The server's emoji — express exactly what happened |
| API versioning | Product releases for your API |

---

## Common Mistakes

### Mistake 1: Using verbs in URLs

```
Bad:   POST /createUser
Good:  POST /users

Bad:   GET /getUserById?id=42
Good:  GET /users/42

Bad:   POST /deletePost/7
Good:  DELETE /posts/7
```

### Mistake 2: Using GET for mutations

```
Bad:  GET /users/42/delete
Good: DELETE /users/42

GET requests are cached by browsers and proxies.
Caching a delete operation is catastrophic.
```

### Mistake 3: Inconsistent naming

```
Bad (mixed styles):
  /Users
  /blog_posts
  /getUserProfile
  /order-items

Good (consistent):
  /users
  /blog-posts
  /users/profile
  /order-items
```

### Mistake 4: Returning all fields always

Returning passwords (even hashed), internal IDs, or sensitive data in every response is a security and performance problem.

```javascript
// Bad: returning password hash
{ "id": 1, "name": "Alice", "passwordHash": "$2b$10$..." }

// Good: explicitly select what to return
const { password, __v, ...safeUser } = user.toObject();
return safeUser;
```

### Mistake 5: Ignoring pagination

```javascript
// Bad: returns all records
app.get('/users', async (req, res) => {
  const users = await User.find();  // could be 10 million records
  res.json(users);
});

// Good: paginated
app.get('/users', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const users = await User.find()
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({ data: users, page, limit });
});
```

---

## Exercises

### Exercise 1: Design Endpoints for an E-Commerce API

Design REST endpoints for:
- Products (with categories)
- Orders (belonging to users)
- Cart (belonging to users)
- Reviews (belonging to products)

For each resource, define: all endpoints, HTTP methods, expected status codes for success and failure.

### Exercise 2: Identify Problems in This API

Find all the problems with these endpoints:
```
GET  /getProductList
GET  /product?id=5
POST /addItemToCart?productId=3&quantity=2
GET  /removeFromCart/3
POST /checkout
GET  /order-status?id=ORD-001&userId=42
```

Rewrite them correctly.

### Exercise 3: Build a JSON API with Raw Node.js

```javascript
const http = require('http');

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/users') {
    res.writeHead(200);
    res.end(JSON.stringify(users));
    return;
  }

  // GET /users/:id
  const match = req.url.match(/^\/users\/(\d+)$/);
  if (req.method === 'GET' && match) {
    const id = parseInt(match[1]);
    const user = users.find(u => u.id === id);
    if (user) {
      res.writeHead(200);
      res.end(JSON.stringify(user));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'User not found' }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000);
```

Test with: `curl http://localhost:3000/users` and `curl http://localhost:3000/users/1`

Observe how painful routing by hand is. This sets up Chapter 6 (Express) perfectly.

---

## Key Takeaways

- REST is an architectural style, not a protocol; it defines constraints on how to design networked APIs
- Think in **resources** (nouns), not actions; HTTP methods express the action
- The same URL (`/users/42`) does different things depending on the HTTP method
- REST endpoint naming: plural nouns, lowercase, hyphens for multi-word (`/blog-posts`)
- CRUD maps to: POST=Create, GET=Read, PUT/PATCH=Update, DELETE=Delete
- Always use correct status codes — 2xx success, 4xx client error, 5xx server error
- JSON is the standard data exchange format for REST APIs
- Nested resources max depth: 2 levels (`/users/42/posts`)
- Always paginate list endpoints; never return unbounded data
- Version your API (`/v1/users`) to avoid breaking existing clients
- Consistent error response format is as important as consistent success format
