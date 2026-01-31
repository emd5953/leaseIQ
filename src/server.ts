import mongoose from 'mongoose';
import { createApp } from './api';
import { config } from './config';

async function startServer() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✓ MongoDB connected');

    // Create Express app
    const app = createApp();

    // Start server
    const port = config.server.port;
    app.listen(port, () => {
      console.log(`✓ Server running on http://localhost:${port}`);
      console.log(`✓ Health check: http://localhost:${port}/health`);
      console.log(`✓ Search API: http://localhost:${port}/api/search`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
