import express from 'express';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// ── Body parsing ────────────────────────────────────────────
app.use(express.json());

// ── Request logger ──────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`
    );
  });
  next();
});

// ── Health check (no auth required) ────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);

// ── 404 catch-all ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler (must be last) ─────────────────────
app.use(errorHandler);

export default app;
