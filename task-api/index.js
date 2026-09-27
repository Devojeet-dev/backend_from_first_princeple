import app from './app.js';
import connectDB from './config/db.js';
import config from './config/index.js';

async function start() {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
