import mongoose from 'mongoose';
import { createApp } from './api';
import { config } from './config';

async function startServer() {
  // Address research uses public records and can run independently of listings.
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(config.mongodb.uri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });
      console.log('MongoDB connected');
    } catch { console.error('MongoDB unavailable; listing endpoints will report unavailable. Address research remains available.'); }
  }
  const app = createApp();
  app.listen(config.server.port, () => console.log(`LeaseIQ API listening on http://localhost:${config.server.port}`));
}
process.on('SIGINT', async () => { await mongoose.connection.close(); process.exit(0); });
startServer().catch(error => { console.error(error); process.exit(1); });
