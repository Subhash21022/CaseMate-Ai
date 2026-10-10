import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { config } from './config/env.js';

const startServer = async () => {
  try {
    console.log('--- Initializing CaseMate AI Backend ---');
    await connectDB();

    const app = createApp();
    const server = app.listen(config.PORT, () => {
      console.log(`CaseMate AI Backend running on: http://localhost:${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(`Orchestrator Target: ${config.N8N_BASE_URL}`);
    });

    const shutdown = async () => {
      console.log('Shutting down CaseMate AI Backend...');
      server.close(async () => {
        await disconnectDB();
        console.log('Server and database gracefully closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
};

startServer();
