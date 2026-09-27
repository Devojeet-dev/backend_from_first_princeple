# Chapter 01 — Internet Fundamentals

---

## Chapter Goal

By the end of this chapter, you will be able to:

- Explain what a network is and how devices communicate
- Understand the difference between a client and a server
- Explain what an IP address is and why it exists
- Understand what DNS does and why it matters
- Know what ports are and why they are necessary
- Trace the full journey of a request from your browser to a server

---

## Why This Matters

Every API you build will receive requests over a network. If you don't understand how that network works, you'll spend your career guessing why things break.

- Why does your API return a connection timeout?
- Why does CORS fail?
- Why does your server need a port number?
- What even happens when someone visits `https://api.yourapp.com`?

None of these questions make sense without understanding what's underneath. This chapter is that foundation.

---

## Core Concepts

### 1. What is a Network?

A network is two or more devices that can communicate with each other.

Your home Wi-Fi is a network. Your office LAN is a network. The internet is the largest network ever built — a network of networks.

```
Device A <----------------> Device B
         (can exchange data)
```

When two devices are on a network, they can send messages to each other. Those messages are called **packets** — small chunks of data.

Think of it like the postal system:

```
You (sender)
   |
   v
Write a letter (data)
   |
   v
Break it into pages if too long (packets)
   |
   v
Put an address on the envelope (IP address)
   |
   v
Post office routes it (routers)
   |
   v
Recipient reassembles and reads it
```

---

### 2. Client and Server

These are roles, not device types.

**Client**: The device or program that sends a request and wants something.
**Server**: The device or program that receives a request and responds.

```
CLIENT                          SERVER
  |                               |
  |  --- "Give me the homepage" ->|
  |                               |
  |  <- HTML returned ----------- |
  |                               |
Browser                       Node.js app
```

One device can be both. Your laptop can run a Node.js server and also act as a client to another server.

The important thing: **server is always listening. Client always initiates.**

---

### 3. IP Address

Every device on a network has a unique identifier called an **IP address**.

IP stands for **Internet Protocol**.

Mental model: **IP address = building address in a city.**

Just like:
- 42 Oak Street, Austin, TX identifies one specific building
- `192.168.1.10` identifies one specific device on a network

There are two versions:

**IPv4** (most common today):
```
192.168.0.1
```
Four numbers, each 0-255, separated by dots.

**IPv6** (newer, more addresses):
```
2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

Two important IP addresses to know:

```
127.0.0.1  -->  "localhost" -- your own machine
0.0.0.0    -->  "all available network interfaces" (used when binding a server)
```

When you run `node server.js` and it says "Listening on 127.0.0.1:3000", it means:
your server is running **on your own machine**, on port 3000.

**Public vs Private IPs:**

```
Your home network:
  Router <-----------> Internet (gets one PUBLIC IP from ISP)
    |
    +-- Laptop    (192.168.1.2  -- PRIVATE)
    +-- Phone     (192.168.1.3  -- PRIVATE)
    +-- Tablet    (192.168.1.4  -- PRIVATE)
```

Private IPs are only reachable inside your local network.
Public IPs are reachable from anywhere on the internet.

---

### 4. Domain Names

Humans are bad at remembering numbers. We're good at remembering names.

`google.com` is easier than `142.250.80.46`.

A **domain name** is a human-readable alias for an IP address.

```
google.com      ----------> 142.250.80.46
github.com      ----------> 140.82.113.3
api.myapp.com   ----------> 165.22.45.100
```

Domain structure (read right to left):

```
api.myapp.com

       com         <- Top-level domain (TLD)
      myapp        <- Second-level domain (your brand)
     api           <- Subdomain (you define this)
```

You can have multiple subdomains:
```
www.myapp.com       --> main website
api.myapp.com       --> backend API
admin.myapp.com     --> admin panel
```

---

### 5. DNS - Domain Name System

DNS is the system that translates domain names into IP addresses.

Mental model: **DNS = The phonebook of the internet.**

Before DNS, people had to memorize IP addresses. DNS replaced that with a distributed, global lookup system.

```
You type: google.com
              |
              v
Browser checks local cache
              |
              v  (not found)
OS checks hosts file (/etc/hosts)
              |
              v  (not found)
DNS Resolver (usually your ISP or 8.8.8.8)
              |
              v
Root DNS Server --> "try .com servers"
              |
              v
.com TLD Server --> "try google's nameserver"
              |
              v
Google's Nameserver --> "142.250.80.46"
              |
              v
Browser now connects to 142.250.80.46
```

This entire process typically happens in **under 50 milliseconds**.

DNS record types you'll encounter as a backend developer:

| Record | Purpose | Example |
|--------|---------|---------|
| A      | Domain to IPv4 address | `api.myapp.com -> 1.2.3.4` |
| AAAA   | Domain to IPv6 address | `api.myapp.com -> 2001:db8::1` |
| CNAME  | Domain to another domain | `www.myapp.com -> myapp.com` |
| MX     | Mail server | `myapp.com -> mail.myapp.com` |

As a backend developer, you mostly work with **A records** when deploying.

---

### 6. Ports

IP address tells you which machine to reach.
Port tells you which **program** on that machine to talk to.

Mental model: **IP = building address. Port = apartment number.**

```
Server at 192.168.1.10
  |
  +-- Port 80    --> Web server (HTTP)
  +-- Port 443   --> Web server (HTTPS)
  +-- Port 3000  --> Your Node.js app
  +-- Port 5432  --> PostgreSQL
  +-- Port 27017 --> MongoDB
```

Ports range from 0 to 65535.

**Well-known ports (0-1023)** - reserved for standard protocols:

| Port  | Protocol          |
|-------|-------------------|
| 21    | FTP               |
| 22    | SSH               |
| 25    | SMTP (email)      |
| 53    | DNS               |
| 80    | HTTP              |
| 443   | HTTPS             |
| 3306  | MySQL             |
| 5432  | PostgreSQL        |
| 27017 | MongoDB           |

When you see a URL like `http://localhost:3000`, the `:3000` is the port.

When you see just `https://google.com` (no port), the browser uses the default:
- HTTP  -> port 80
- HTTPS -> port 443

These are implied and hidden.

---

### 7. The Full Request Journey

Let's trace a complete request from browser to server:

```
You type: https://api.myapp.com/users

Step 1: DNS Resolution
Browser -> "What IP is api.myapp.com?"
DNS     -> "It's 165.22.45.100"

Step 2: TCP Connection
Browser opens connection to 165.22.45.100:443

Step 3: HTTP Request sent
GET /users HTTP/1.1
Host: api.myapp.com

Step 4: Server receives it
Node.js app on port 443 processes it

Step 5: Server sends back response
HTTP/1.1 200 OK
Content-Type: application/json
[{"id": 1, "name": "Alice"}, ...]

Step 6: Browser receives response
Renders or processes the data
```

```
BROWSER
  |
  v
DNS Resolver
  | (resolves api.myapp.com --> 165.22.45.100)
  v
Network / Internet
  | (packets travel across routers)
  v
Server: 165.22.45.100:443
  |
  v
Node.js App (your code)
  |
  v
Database (if needed)
  |
  v
Response travels back
  |
  v
BROWSER renders data
```

---

## Mental Models Summary

| Concept     | Mental Model                              |
|-------------|-------------------------------------------|
| Network     | Postal system for computers               |
| IP Address  | Building address                          |
| Port        | Apartment number in the building          |
| Domain Name | Nickname for a building address           |
| DNS         | City phonebook (name to address)          |
| Client      | Person making a phone call                |
| Server      | Person who picks up and answers           |
| Packet      | One envelope in a multi-envelope letter   |

---

## Common Mistakes

### Mistake 1: Confusing IP address with domain name

Beginners think they are the same thing. They are not.

- Domain name: human-readable, requires DNS to resolve
- IP address: actual address, what machines use to connect

```
Wrong thinking:
"google.com is their IP address"

Correct thinking:
"google.com is their domain. Their IP is 142.250.80.46.
DNS maps one to the other."
```

### Mistake 2: Thinking localhost means "the internet"

`localhost` (127.0.0.1) only refers to your own machine.
Nothing outside your machine can reach `localhost:3000` unless
you configure port-forwarding or deploy.

```
Wrong:
"My API is on localhost:3000, my friend can test it"

Correct:
"My API is only visible on my own machine.
To share it, I need to deploy or use ngrok."
```

### Mistake 3: Forgetting ports matter

If your server is running on port 3000, you must hit port 3000.
Hitting port 80 will fail.

```javascript
// Server listening on 3000
app.listen(3000)

// You must use:
http://localhost:3000/users  // CORRECT

// NOT:
http://localhost/users       // WRONG - this hits port 80
```

### Mistake 4: Thinking DNS is instant and always fresh

DNS responses are cached. If you change your domain's IP,
old cached responses persist for minutes to hours based on TTL (Time to Live).

---

## Exercises

### Exercise 1: Inspect DNS Resolution

Open your terminal and run:
```bash
nslookup google.com
nslookup github.com
nslookup api.github.com
```
Observe the IP addresses returned. Notice subdomains may resolve to different IPs.

### Exercise 2: Trace a Request in Chrome DevTools

1. Open Chrome
2. Go to any website (e.g., `https://github.com`)
3. Open DevTools -> Network tab
4. Refresh the page
5. Click the first request
6. Observe: Headers, Remote Address (IP + Port), Status Code

What IP address did your browser connect to?

### Exercise 3: Check What's Running on Your Ports

**On Mac/Linux:**
```bash
lsof -i -P -n | grep LISTEN
```
**On Windows:**
```bash
netstat -ano | findstr LISTEN
```

You'll see which processes are bound to which ports on your machine.

### Exercise 4: Test Localhost

1. Create a file `server.js`:
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.end('Hello from your own machine!');
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```
2. Run it: `node server.js`
3. Open `http://localhost:3000` in your browser
4. Now try `http://127.0.0.1:3000` -- same thing. Why?

---

## Key Takeaways

- A **network** is any group of devices that can exchange data
- **Clients** initiate requests; **servers** listen and respond
- An **IP address** uniquely identifies a device on a network (like a building address)
- A **domain name** is a human-readable alias for an IP address
- **DNS** translates domain names to IP addresses -- it's the internet's phonebook
- **Ports** identify which program on a server should handle the connection (like apartment numbers)
- Every web request follows a predictable path: DNS -> TCP connection -> HTTP request -> server logic -> response
- `localhost` (127.0.0.1) only refers to your own machine
- Port 80 = HTTP default, Port 443 = HTTPS default, Port 3000 = common Node.js dev default
