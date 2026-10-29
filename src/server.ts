import mongoose from 'mongoose';
import { createApp } from './api';
import { config } from './config';
import type { Server } from 'node:http';
let server: Server | undefined;

async function startServer() {
  // Address research uses public records and can run independently of listings.
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(config.mongodb.uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB connected');
    } catch {
      console.error(
        'MongoDB unavailable; listing endpoints will report unavailable. Address research remains available.',
      );
    }
  }
  const app = createApp();
  server = app.listen(
    config.server.port,
    process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
    () => console.log(`LeaseIQ API listening on http://localhost:${config.server.port}`),
  );
  server.on('error', (error) => {
    console.error(`API startup failed: ${error.message}`);
    void shutdown(1);
  });
}
async function shutdown(code = 0) {
  server?.closeAllConnections();
  if (server?.listening) await new Promise<void>((resolve) => server!.close(() => resolve()));
  await mongoose.connection.close();
  process.exit(code);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
process.on('message', (message) => {
  if ((message as any)?.type === 'shutdown') void shutdown();
});
process.on('disconnect', () => void shutdown());
startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
