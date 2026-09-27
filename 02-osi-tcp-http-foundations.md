# Chapter 02 — OSI, TCP, and HTTP Foundations

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Understand what the OSI model is and which layers matter to backend developers
- Explain what TCP is and why it exists
- Understand what makes TCP reliable
- Explain what HTTP is and how it sits on top of TCP
- Trace the lifecycle of a complete HTTP request

---

## Why This Matters

When your Express server receives a request, you see a clean object with headers, body, and URL. That clean object did not magically appear. It was assembled by layers of protocols working together.

Understanding these layers helps you:
- Debug connection issues (is it a TCP problem or HTTP problem?)
- Understand why HTTPS is different from HTTP
- Know what "connection refused" actually means
- Understand why large file uploads work at all

You don't need to become a networking engineer. You need to understand these layers well enough to reason about your backend.

---

## Core Concepts

### 1. The Problem: How Do Two Computers Talk?

When two computers exchange data, several problems must be solved simultaneously:

```
Problem 1: Physical connection
  How do bits travel? Cables, Wi-Fi, fiber?

Problem 2: Addressing
  Which device is which?

Problem 3: Routing
  How do packets find their way across the world?

Problem 4: Reliable delivery
  What if a packet gets lost?

Problem 5: Application meaning
  What does the data actually mean? Is it HTTP? Email? SSH?
```

The OSI model is an answer to these questions.

---

### 2. The OSI Model (Simplified)

The OSI (Open Systems Interconnection) model describes networking in 7 layers. Each layer has a job. Each layer talks to the layer directly above and below it.

You do NOT need to memorize all 7 layers. You need to understand the ones that affect your backend code.

```
Layer 7 - Application   (HTTP, WebSocket, SMTP)
Layer 6 - Presentation  (encryption, encoding) -- skip for now
Layer 5 - Session       (connection management) -- skip for now
Layer 4 - Transport     (TCP, UDP)
Layer 3 - Network       (IP, routing)
Layer 2 - Data Link     (Ethernet, Wi-Fi frames) -- skip for now
Layer 1 - Physical      (cables, signals)        -- skip for now
```

**The layers that matter to you as a backend developer:**

```
+----------------------------+
|  Layer 7: Application      |  <- HTTP lives here. Your Express code too.
+----------------------------+
|  Layer 4: Transport        |  <- TCP lives here. Reliability lives here.
+----------------------------+
|  Layer 3: Network          |  <- IP lives here. Addressing lives here.
+----------------------------+
|  Layers 1-2: Physical      |  <- Cables, Wi-Fi. You never touch this.
+----------------------------+
```

When you write `res.send('Hello')` in Express:
- Your code runs at Layer 7
- TCP at Layer 4 breaks it into segments and ensures delivery
- IP at Layer 3 routes those segments to the right machine
- Physical layers actually move the bits

You write at Layer 7. Everything below is handled by the OS and hardware.

---

### 3. IP (Layer 3) - Just Addressing and Routing

You met IP in Chapter 1. Here is its role in the stack:

IP handles:
- Addressing (which device is source, which is destination)
- Routing (finding the path across routers)
- Packet delivery (best-effort, no guarantees)

IP does **not** guarantee:
- That packets arrive in order
- That packets arrive at all
- That packets arrive exactly once

This is why TCP exists.

```
IP alone:
Sender --> [packet 1] --> [packet 3] --> [packet 2] --> Receiver
                                 (arrived out of order, packet 4 lost)
```

---

### 4. TCP (Layer 4) - Reliability on Top of IP

TCP stands for **Transmission Control Protocol**.

TCP's job is to take the unreliable, unordered delivery that IP provides, and turn it into a **reliable, ordered byte stream**.

Mental model: **IP is a postal service that sometimes loses or scrambles letters. TCP is the system you put on top to track every letter, confirm delivery, and re-request any that go missing.**

What TCP guarantees:
1. **Ordered delivery** — data arrives in the order it was sent
2. **Error checking** — corrupted data is detected and retransmitted
3. **Reliable delivery** — lost packets are re-sent automatically
4. **Flow control** — sender doesn't overwhelm the receiver

```
TCP Flow:

Sender                          Receiver
  |                               |
  |  --> [Segment 1] ---------->  |
  |  --> [Segment 2] ---------->  |
  |  --> [Segment 3] ---------->  |  (lost in transit)
  |                               |
  |  <-- ACK 1 ----------------  |
  |  <-- ACK 2 ----------------  |
  |  (no ACK 3 received)         |
  |                               |
  |  --> [Segment 3 resent] --->  |  (automatic retransmit)
  |                               |
  |  <-- ACK 3 ----------------  |
```

### The TCP Three-Way Handshake

Before any data can be exchanged, TCP establishes a connection. This is the "three-way handshake":

```
Client                          Server
  |                               |
  |  -------- SYN ------------>  |   "I want to connect"
  |                               |
  |  <------- SYN-ACK ----------  |   "OK, I acknowledge. Ready?"
  |                               |
  |  -------- ACK ------------>  |   "Yes, ready."
  |                               |
  |  ===  Connection open  ====  |
  |                               |
  |  Now HTTP data can flow       |
```

SYN = synchronize. ACK = acknowledge.

This handshake adds latency before the first byte of data can be sent. This is why HTTPS feels slower on first connection (it also adds a TLS handshake on top).

### TCP Connection Teardown

When communication is done, TCP closes the connection cleanly:

```
Client                          Server
  |                               |
  |  -------- FIN ------------>  |   "I'm done"
  |  <------- ACK -------------|  |   "Got it"
  |  <------- FIN -------------|  |   "Me too"
  |  -------- ACK ------------>  |   "Ok, done"
  |                               |
  |  ===  Connection closed  ==  |
```

---

### 5. HTTP (Layer 7) - The Language of the Web

HTTP stands for **HyperText Transfer Protocol**.

HTTP is the protocol that web browsers and web servers use to communicate. It runs **on top of TCP** — TCP handles reliable delivery, HTTP defines the format and meaning of the messages.

Mental model: **TCP is the telephone line. HTTP is the language you speak over it.**

HTTP is a **request-response protocol**:
1. Client sends a request
2. Server sends a response
3. That's it. One round-trip per request-response cycle.

HTTP is also **stateless**: each request is completely independent. The server does not remember previous requests. (This is why sessions and tokens exist — to add state on top of stateless HTTP. More on this in Chapter 9.)

```
CLIENT                              SERVER
  |                                   |
  |  ======= TCP connected =======   |
  |                                   |
  |  --- HTTP Request -------------> |
  |  GET /users HTTP/1.1             |
  |  Host: api.myapp.com             |
  |  Accept: application/json        |
  |                                   |
  |  <-- HTTP Response ------------- |
  |  HTTP/1.1 200 OK                 |
  |  Content-Type: application/json  |
  |  [{"id":1,"name":"Alice"}]       |
  |                                   |
```

### HTTP Versions

| Version | Year | Key Feature |
|---------|------|-------------|
| HTTP/1.0 | 1996 | One request per TCP connection |
| HTTP/1.1 | 1997 | Persistent connections, pipelining |
| HTTP/2   | 2015 | Multiplexing, binary protocol, header compression |
| HTTP/3   | 2020 | Runs over QUIC (UDP-based), faster connection setup |

For backend API development, you'll primarily work within HTTP/1.1 semantics. Express handles HTTP/1.1 by default.

---

### 6. HTTPS = HTTP + TLS

HTTPS is HTTP with encryption added via **TLS** (Transport Layer Security).

```
HTTP  (plain text, anyone on the network can read it)
  |
HTTPS = HTTP + TLS encryption

TLS sits between TCP and HTTP:

+-------------------------+
|  Layer 7: HTTP          |
+-------------------------+
|  TLS Encryption         |  <- added by HTTPS
+-------------------------+
|  Layer 4: TCP           |
+-------------------------+
|  Layer 3: IP            |
+-------------------------+
```

TLS does two things:
1. **Encrypts** data so intermediaries can't read it
2. **Authenticates** the server via certificates (proves you're talking to the real server)

As a backend developer, you typically don't set up TLS yourself on localhost. Cloud platforms (Heroku, Railway, Vercel) handle it automatically. For production, a reverse proxy like Nginx or a load balancer terminates TLS and forwards plain HTTP to your Node.js server.

---

### 7. The Complete HTTP Request Lifecycle

Let's trace every step of a request from browser to database and back:

```
User types: https://api.myapp.com/users

STEP 1: DNS Resolution (Chapter 1)
  Browser -> DNS: "What is the IP for api.myapp.com?"
  DNS -> Browser: "165.22.45.100"

STEP 2: TCP Handshake
  Browser <--> Server: SYN / SYN-ACK / ACK
  Connection established on port 443

STEP 3: TLS Handshake
  Browser <--> Server: exchange certificates and session keys
  Encrypted channel established

STEP 4: HTTP Request sent (encrypted over TLS)
  GET /users HTTP/1.1
  Host: api.myapp.com
  Accept: application/json
  Authorization: Bearer eyJhbGci...

STEP 5: Server receives request
  Node.js + Express parses it
  Runs middleware (auth check, logging, etc.)
  Calls route handler

STEP 6: Database query
  Express handler queries MongoDB
  MongoDB returns results

STEP 7: HTTP Response sent
  HTTP/1.1 200 OK
  Content-Type: application/json
  Content-Length: 248
  [{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]

STEP 8: Browser receives response
  Decrypts (TLS)
  Parses JSON
  Renders or uses data
```

```
TIMELINE:

DNS     [===]
TCP          [=]
TLS             [==]
Request            [=>]
Server               [====]
DB                       [==]
Response                     [=>]
              |
              total: ~100-300ms typical
```

---

## Mental Models Summary

| Concept | Mental Model |
|---------|-------------|
| OSI Model | Layers of responsibility, each with one job |
| IP (Layer 3) | Postal service - delivers packets, no guarantees |
| TCP (Layer 4) | FedEx tracking - guarantees delivery and order |
| HTTP (Layer 7) | The language spoken once a connection is open |
| HTTPS | HTTP with an encrypted envelope |
| TCP Handshake | Introducing yourself before having a conversation |
| Stateless HTTP | Every phone call starts with no memory of the last one |

---

## Common Mistakes

### Mistake 1: Thinking HTTP and TCP are the same thing

They are not. TCP is the transport. HTTP is the application-level protocol that runs on top of TCP.

```
Wrong: "HTTP sends my data to the server"

Correct: "HTTP defines the format of my message.
          TCP is what actually delivers the bytes."
```

### Mistake 2: Thinking HTTPS is a different protocol from HTTP

HTTPS is HTTP with TLS encryption added. The request structure is identical. Only the transport is encrypted.

### Mistake 3: Thinking "connection refused" means the server is down

"Connection refused" specifically means nothing is listening on that port. The server machine may be running fine -- just not your application.

```
Connection refused on port 3000?
  -> Your Node.js app is not running
  -> Your app crashed at startup
  -> App is listening on a different port

Connection timeout?
  -> Firewall is blocking the port
  -> Server IP is wrong
  -> Server is actually down
```

### Mistake 4: Forgetting HTTP is stateless

Each HTTP request arrives at your server with zero memory of previous requests. If user A logs in, request 1 has no connection to request 2. You must manually pass identity (cookies, tokens) with every request.

---

## Exercises

### Exercise 1: Observe TCP Connections

Run this command while a Node.js server is running:
```bash
netstat -an | grep 3000
```
You'll see established TCP connections and their states (LISTEN, ESTABLISHED, etc.).

### Exercise 2: See HTTP in Action

In Chrome DevTools -> Network tab:
1. Click any request
2. Go to "Headers" tab
3. Observe: Request Method, Status Code, Request Headers, Response Headers
4. Go to "Timing" tab
5. Observe the breakdown: DNS, TCP connection, TLS, Request, Response

You'll visually see each layer taking time.

### Exercise 3: HTTP vs HTTPS

Use curl to see raw HTTP:
```bash
# HTTP (plain)
curl -v http://httpbin.org/get

# HTTPS (encrypted, but curl shows the negotiation)
curl -v https://httpbin.org/get
```

In the verbose output, look for:
- `* Connected to...` - TCP connection
- `* SSL connection using...` - TLS handshake
- `> GET /get HTTP/1.1` - HTTP request
- `< HTTP/1.1 200 OK` - HTTP response

### Exercise 4: Simulate a Server Not Running

1. Run `curl http://localhost:3000/` with NO server running
2. Observe: "Connection refused"
3. Now start your server from Chapter 1
4. Run the same command
5. Observe: Actual response

The error messages map directly to what's happening at the TCP layer.

---

## Key Takeaways

- The **OSI model** organizes networking into layers; each layer has one job
- Backend developers mostly care about **Layer 3 (IP)**, **Layer 4 (TCP)**, and **Layer 7 (HTTP)**
- **IP** routes packets between machines but provides no reliability guarantees
- **TCP** sits on top of IP and adds reliability: ordered delivery, error checking, retransmission
- The **TCP three-way handshake** (SYN, SYN-ACK, ACK) establishes a connection before data flows
- **HTTP** is the application-level protocol for web communication; it runs on top of TCP
- HTTP is **stateless** — each request is independent; no built-in memory of previous requests
- **HTTPS** = HTTP + TLS encryption; the structure is the same, transport is encrypted
- A complete web request involves DNS resolution, TCP connection, TLS handshake, HTTP exchange, server logic, and response
