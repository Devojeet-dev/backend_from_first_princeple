# Backend From First Principles

A structured learning repository for understanding backend development from the ground up. This project combines theory and practice: it starts with networking and HTTP fundamentals, then moves into Node.js, Express, MongoDB, JWT authentication, validation, and a complete task API implementation.

## Repository Structure

```bash
backend_from_first_princeple/
├── 01-internet-fundamentals.md
├── 02-osi-tcp-http-foundations.md
├── 03-urls-requests-responses.md
├── 04-rest-apis-and-api-design.md
├── 05-nodejs-foundations.md
├── 06-express-fundamentals.md
├── 07-middleware-and-api-architecture.md
├── 08-mongodb-essentials.md
├── 09-authentication-and-validation.md
├── 10-complete-backend-project.md
├── task-api/
│   ├── app.js
│   ├── index.js
│   ├── package.json
│   ├── .env
│   ├── seed-demo.js
│   ├── README.md
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
└── README.md
```

## What You Will Learn

This repository is designed to teach backend development in a practical and concept-first way:

- Internet fundamentals and how data moves across networks
- OSI model and TCP/IP basics
- URLs, requests, and HTTP responses
- REST API principles and API design patterns
- Node.js foundations and server-side JavaScript
- Express routing, middleware, and API architecture
- MongoDB fundamentals and data modeling
- Authentication, JWT, and validation
- Building a complete task management backend

## Learning Path

The notes are organized in order from beginner to project implementation:

1. Internet fundamentals
2. OSI, TCP, and HTTP foundations
3. URLs, requests, and responses
4. REST APIs and API design
5. Node.js foundations
6. Express essentials
7. Middleware and architecture
8. MongoDB essentials
9. Authentication and validation
10. Complete backend project

## Project: Task API

The `task-api` folder contains a working backend project built as part of the learning journey. It includes:

- User registration and login
- JWT-based authentication
- Protected task routes
- CRUD operations for tasks
- MongoDB integration with Mongoose
- Input validation and central error handling
- Seed data for demo usage

## Quick Start

### 1. Navigate to the app

```bash
cd task-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside `task-api`:

```env
PORT=3000
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
```

### 4. Start the server

```bash
npm run dev
```

## API Example

### Register

```http
POST /api/v1/auth/register
```

### Login

```http
POST /api/v1/auth/login
```

### Create a task

```http
POST /api/v1/tasks
Authorization: Bearer <token>
```

## Demo Notes

The task API includes a demo seeding script for populating sample users and tasks. This makes it easy to showcase API behavior in Postman or during a live demo.

## Purpose

This repository is intended for:

- self-learning backend development
- building a strong conceptual foundation
- understanding how backend systems work together in real applications
- practicing API design and implementation from first principles

## Recommended Learning Flow

For best results, read the markdown lessons in order and then implement the code in `task-api` alongside them. This creates a natural bridge between theory and practical backend engineering.

## License

This project is intended for learning and educational use.
