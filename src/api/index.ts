import express, { Express } from 'express';
import cors from 'cors';
import searchRoutes from './routes/search.routes';
import alertsRoutes from './routes/alerts.routes';
import researchRoutes from './routes/research.routes';
import leaseRoutes from './routes/lease.routes';
import webhookRoutes from './routes/webhook.routes';
import imageProxyRoutes from './routes/image-proxy';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/search', searchRoutes);
  app.use('/api/alerts', alertsRoutes);
  app.use('/api/research', researchRoutes);
  app.use('/api/lease', leaseRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/image-proxy', imageProxyRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
