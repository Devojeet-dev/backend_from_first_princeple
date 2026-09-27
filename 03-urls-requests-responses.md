# Chapter 03 — URLs, Requests, and Responses

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Dissect any URL into its components and explain each part
- Understand query parameters and path parameters and when to use each
- Read and write HTTP request and response headers
- Understand the request body and when it is used
- Know HTTP status codes and what they communicate
- Understand the full structure of an HTTP request and response

---

## Why This Matters

Every API you build speaks HTTP. HTTP is not magic — it is a text-based protocol with a well-defined format.

When you understand URLs, headers, bodies, and status codes at a deep level:
- You write better APIs
- You debug faster
- You understand what Postman and curl are actually sending
- You stop guessing why a request is failing

This chapter is the anatomy lesson before the surgery.

---

## Core Concepts

### 1. URL Anatomy

URL stands for **Uniform Resource Locator**. It is the address of a specific resource on the internet.

Let's dissect a complete URL:

```
https://api.myapp.com:443/users/42/posts?page=2&limit=10#comments

|_____|  |____________| |_| |__________|  |____________|  |______|
scheme     host          port   path       query string   fragment
```

Breaking it down:

```
scheme    : https
            The protocol to use. Could be: http, https, ftp, ws, wss

host      : api.myapp.com
            Domain name (or IP address) of the server

port      : 443
            Optional. Defaults to 80 for http, 443 for https

path      : /users/42/posts
            The specific resource on the server
            Hierarchical, like a file system path

query     : ?page=2&limit=10
            Key-value pairs for filtering/pagination/options
            Starts with ?, pairs separated by &, key=value

fragment  : #comments
            Client-side only. Never sent to the server.
            Used by browsers to scroll to a section of the page.
```

In backend APIs, you work mostly with **scheme**, **host**, **path**, and **query string**. Fragments are ignored by your server -- they never reach it.

---

### 2. Path Parameters vs Query Parameters

This is one of the most important design decisions in API development.

#### Path Parameters

Path parameters are **part of the path itself**. They identify a specific resource.

```
/users/42         -> user with ID 42
/posts/hello-world -> post with slug "hello-world"
/orders/ORD-001   -> order ORD-001
```

Rule of thumb: **Use path parameters when identifying a specific resource.**

In Express:
```javascript
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;  // "42"
  res.json({ userId });
});
```

#### Query Parameters

Query parameters come after the `?`. They are **optional modifiers** of a request.

```
/users?role=admin               -> filter users by role
/posts?page=2&limit=10          -> paginate results
/products?sort=price&order=asc  -> sort products
/users?search=alice             -> search by name
```

Rule of thumb: **Use query parameters for filtering, sorting, pagination, and search.**

In Express:
```javascript
app.get('/users', (req, res) => {
  const { role, page, limit } = req.query;
  // role = "admin", page = "2", limit = "10"
  res.json({ role, page, limit });
});
```

#### Decision Table

| Use Case | Type | Example |
|----------|------|---------|
| Get specific user | Path param | `GET /users/42` |
| Filter users | Query param | `GET /users?role=admin` |
| Get user's posts | Path param | `GET /users/42/posts` |
| Paginate posts | Query param | `GET /posts?page=2&limit=10` |
| Search | Query param | `GET /users?q=alice` |
| Sort | Query param | `GET /products?sort=price` |

---

### 3. HTTP Request Structure

An HTTP request has a specific, defined structure:

```
[METHOD] [PATH] HTTP/[VERSION]
[Header-Name]: [Header-Value]
[Header-Name]: [Header-Value]
...
[blank line]
[optional body]
```

A real example:

```
POST /users HTTP/1.1
Host: api.myapp.com
Content-Type: application/json
Authorization: Bearer eyJhbGci...
Accept: application/json
Content-Length: 48

{"name": "Alice", "email": "alice@example.com"}
```

Breaking it down:

```
Request Line:
  POST /users HTTP/1.1
  |     |      |
  |     |      +-- HTTP version
  |     +--------- Path (resource being requested)
  +--------------- Method (what action to take)

Headers:
  Host: api.myapp.com         <- Required. Which server to reach.
  Content-Type: application/json  <- What format is the body in?
  Authorization: Bearer ...   <- Authentication token
  Accept: application/json    <- What format does client want back?
  Content-Length: 48          <- How many bytes is the body?

Blank Line:
  (separates headers from body)

Body:
  {"name": "Alice", "email": "alice@example.com"}
  (only present in POST, PUT, PATCH requests)
```

---

### 4. HTTP Methods

HTTP methods define the **intent** of a request. They are not enforced by the protocol -- just conventions. But breaking them breaks your API.

| Method | Intent | Has Body? | Safe? | Idempotent? |
|--------|--------|-----------|-------|-------------|
| GET | Read/retrieve data | No | Yes | Yes |
| POST | Create a new resource | Yes | No | No |
| PUT | Replace a resource entirely | Yes | No | Yes |
| PATCH | Partially update a resource | Yes | No | Sometimes |
| DELETE | Delete a resource | No | No | Yes |

**Safe**: Does not modify data. GET should never change anything.

**Idempotent**: Calling it multiple times gives the same result. DELETE /users/1 called 10 times should have the same effect as calling it once. POST /users called 10 times creates 10 users.

```
GET    /users         -> list all users
GET    /users/42      -> get user 42
POST   /users         -> create a new user
PUT    /users/42      -> replace user 42 entirely
PATCH  /users/42      -> update some fields of user 42
DELETE /users/42      -> delete user 42
```

---

### 5. HTTP Request Headers

Headers are key-value pairs that carry metadata about the request.

**Common request headers:**

| Header | Purpose | Example |
|--------|---------|---------|
| `Host` | Which server to reach | `api.myapp.com` |
| `Content-Type` | Format of the request body | `application/json` |
| `Accept` | What format client wants | `application/json` |
| `Authorization` | Authentication credentials | `Bearer eyJhbGci...` |
| `User-Agent` | Identifies the client software | `PostmanRuntime/7.32` |
| `Accept-Language` | Preferred language | `en-US,en;q=0.9` |
| `Origin` | Where the request comes from | `https://myapp.com` |
| `Cookie` | Session cookies | `sessionId=abc123` |

As a backend developer, you'll frequently read:
- `Authorization` (to authenticate users)
- `Content-Type` (to parse the body correctly)
- `Accept` (to respond in the right format)
- `Origin` (for CORS handling)

---

### 6. HTTP Response Structure

An HTTP response also has a defined format:

```
HTTP/[VERSION] [STATUS CODE] [STATUS TEXT]
[Header-Name]: [Header-Value]
...
[blank line]
[body]
```

A real example:

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 67
Date: Sun, 27 Sep 2026 02:20:00 GMT
X-Request-Id: 7f3a9b2c

{"id": 42, "name": "Alice", "email": "alice@example.com"}
```

Breaking it down:

```
Status Line:
  HTTP/1.1 200 OK
  |         |   |
  |         |   +-- Human-readable status text
  |         +------ Status code (the important part)
  +---------------- HTTP version

Headers:
  Content-Type: application/json  <- What format is the body?
  Content-Length: 67              <- How many bytes?
  Date: ...                       <- When was the response generated?
  X-Request-Id: ...               <- Custom header (X- prefix = custom)

Body:
  {"id": 42, "name": "Alice", "email": "alice@example.com"}
```

---

### 7. HTTP Response Headers

**Common response headers:**

| Header | Purpose | Example |
|--------|---------|---------|
| `Content-Type` | Format of the response body | `application/json` |
| `Content-Length` | Size of body in bytes | `248` |
| `Set-Cookie` | Sets a cookie on the client | `sessionId=abc; HttpOnly` |
| `Location` | Used with 3xx redirects | `https://example.com/new` |
| `Cache-Control` | Caching instructions | `no-cache, no-store` |
| `Access-Control-Allow-Origin` | CORS header | `https://myapp.com` |
| `WWW-Authenticate` | Auth challenge (with 401) | `Bearer realm="api"` |

---

### 8. HTTP Status Codes

Status codes are 3-digit numbers that tell the client what happened.

They are grouped by first digit:

```
1xx - Informational  (100-199)  -> "Still working..."
2xx - Success        (200-299)  -> "It worked"
3xx - Redirection    (300-399)  -> "Go somewhere else"
4xx - Client Error   (400-499)  -> "You did something wrong"
5xx - Server Error   (500-599)  -> "I did something wrong"
```

**The ones you'll use constantly:**

| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST that created a resource |
| 204 | No Content | Successful DELETE (no body to return) |
| 400 | Bad Request | Client sent invalid data |
| 401 | Unauthorized | Client is not authenticated |
| 403 | Forbidden | Client is authenticated but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limiting |
| 500 | Internal Server Error | Something crashed on your server |

**401 vs 403 — a critical distinction:**

```
401 Unauthorized
  -> "I don't know who you are"
  -> No token provided, or token is invalid
  -> Fix: send valid credentials

403 Forbidden
  -> "I know who you are, but you can't do this"
  -> Authenticated user doesn't have permission
  -> Fix: get the right permissions
```

---

### 9. Request Body

The request body carries data from client to server. It's only used with:
- POST
- PUT
- PATCH

GET and DELETE requests do NOT have a body (technically allowed but strongly discouraged and generally unsupported).

The body can be formatted in different ways, indicated by `Content-Type`:

```
Content-Type: application/json
Body: {"name": "Alice", "email": "alice@example.com"}

Content-Type: application/x-www-form-urlencoded
Body: name=Alice&email=alice%40example.com

Content-Type: multipart/form-data
Body: (binary, used for file uploads)
```

In Express with `express.json()` middleware:
```javascript
// Client sends:
// POST /users
// Content-Type: application/json
// {"name": "Alice", "email": "alice@example.com"}

app.post('/users', (req, res) => {
  const { name, email } = req.body;  // already parsed as JS object
  res.status(201).json({ name, email });
});
```

---

### 10. Putting It All Together

```
COMPLETE REQUEST/RESPONSE CYCLE:

Client                                   Server
  |                                        |
  |  POST /users HTTP/1.1                  |
  |  Host: api.myapp.com                   |
  |  Content-Type: application/json        |
  |  Authorization: Bearer TOKEN           |
  |                                        |
  |  {"name":"Alice","email":"a@b.com"}    |
  |  =====================================>|
  |                                        |
  |                              [server processes]
  |                              [validates body]
  |                              [saves to DB]
  |                                        |
  |  HTTP/1.1 201 Created                  |
  |  Content-Type: application/json        |
  |  Location: /users/42                   |
  |                                        |
  |  {"id":42,"name":"Alice"}              |
  |  <=====================================|
  |                                        |
```

---

## Mental Models Summary

| Concept | Mental Model |
|---------|-------------|
| URL | Home address with apartment number and directions |
| Path parameter | Identifying which specific item you want |
| Query parameter | Optional filters or options for a list |
| Request headers | Metadata on the envelope, not the letter |
| Status codes | HTTP's way of saying "here's what happened" |
| Request body | The letter inside the envelope |
| 401 vs 403 | "Who are you?" vs "I know you, but no." |

---

## Common Mistakes

### Mistake 1: Using query params to identify resources

```
Wrong:  GET /users?id=42
Correct: GET /users/42

Query params are for filters, not identities.
```

### Mistake 2: Using GET to delete or create

```
Wrong:  GET /users/delete?id=42
Correct: DELETE /users/42

Use the right HTTP method. Browsers and caches treat GET differently.
GET requests can be cached, bookmarked, and replayed.
```

### Mistake 3: Always returning 200

```javascript
// Wrong: everything returns 200
app.post('/users', (req, res) => {
  // ...
  res.status(200).json({ user });  // Should be 201 for creation
});

// Wrong: errors also return 200
app.get('/users/:id', (req, res) => {
  const user = findUser(req.params.id);
  res.status(200).json({ error: 'User not found' });  // Should be 404!
});
```

### Mistake 4: Confusing 401 and 403

```
User not logged in -> 401
User logged in but accessing another user's data -> 403
```

### Mistake 5: Forgetting Content-Type header

```javascript
// If you don't set Content-Type, clients won't know how to parse the body
res.setHeader('Content-Type', 'application/json');

// Express's res.json() does this automatically -- use it
res.json({ data: user });  // sets Content-Type: application/json automatically
```

---

## Exercises

### Exercise 1: Dissect URLs

Break these URLs into components:
```
https://api.github.com/users/torvalds/repos?page=2&per_page=10
https://shop.example.com:8080/products/electronics?sort=price&order=asc#filters
https://api.myapp.com/v2/users/42/orders/ORD-001?include=items
```

For each: scheme, host, port, path, path params, query params, fragment.

### Exercise 2: Use Postman or curl to Inspect Requests

Send these requests and inspect what comes back:
```bash
# GET with query params
curl -v "https://httpbin.org/get?name=alice&page=1"

# POST with body
curl -v -X POST https://httpbin.org/post \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'

# See status codes
curl -o /dev/null -w "%{http_code}" https://httpbin.org/status/404
curl -o /dev/null -w "%{http_code}" https://httpbin.org/status/201
```

### Exercise 3: Build a Status Code Mirror

Create a server that helps you explore status codes:
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // Parse the URL: /status/404, /status/200, etc.
  const parts = req.url.split('/');
  const code = parseInt(parts[2]) || 200;

  const messages = {
    200: 'OK - everything worked',
    201: 'Created - resource was created',
    400: 'Bad Request - you sent invalid data',
    401: 'Unauthorized - who are you?',
    403: 'Forbidden - you cannot do this',
    404: 'Not Found - resource does not exist',
    500: 'Internal Server Error - I broke something',
  };

  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    code,
    meaning: messages[code] || 'Unknown status code'
  }));
});

server.listen(3000, () => {
  console.log('Status explorer running on http://localhost:3000');
});
```

Test: `http://localhost:3000/status/404`, `/status/201`, `/status/500`

### Exercise 4: Read Raw HTTP Headers

```bash
curl -I https://api.github.com/users/octocat
```
`-I` returns only headers. Read through them. Identify:
- Content-Type
- Status code
- Any caching headers
- Any custom headers (often prefixed with X-)

---

## Key Takeaways

- A URL has components: scheme, host, port, path, query string, fragment
- **Path parameters** identify specific resources: `/users/42`
- **Query parameters** filter, sort, or paginate: `/users?role=admin`
- An HTTP request has: method, path, version, headers, and optionally a body
- An HTTP response has: status code, headers, and optionally a body
- HTTP methods communicate intent: GET=read, POST=create, PUT=replace, PATCH=update, DELETE=delete
- **Status codes** are how your server communicates what happened
- 2xx = success, 4xx = client error, 5xx = server error
- 401 = not authenticated, 403 = not authorized (know the difference)
- The fragment (`#...`) in a URL is never sent to the server
- Always set the correct Content-Type header; `res.json()` in Express does this for you
