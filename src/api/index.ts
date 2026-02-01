import express, { Express } from 'express';
import cors from 'cors';
import searchRoutes from './routes/search.routes';
import alertsRoutes from './routes/alerts.routes';
import researchRoutes from './routes/research.routes';
import leaseRoutes from './routes/lease.routes';
import floorplanRoutes from './routes/floorplan.routes';
import webhookRoutes from './routes/webhook.routes';
import imageProxyRoutes from './routes/image-proxy';
import propertyAnalysisRoutes from './routes/property-analysis.routes';
import {
  standardLimiter,
  strictLimiter,
  searchLimiter,
  webhookLimiter,
} from './middleware/rateLimiter';
import { sanitizeBody } from './middleware/validation';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeBody); // Sanitize all request bodies

  // Health check (no rate limiting)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes with rate limiting
  app.use('/api/search', searchLimiter, searchRoutes);
  app.use('/api/alerts', standardLimiter, alertsRoutes);
  app.use('/api/research', strictLimiter, researchRoutes);
  app.use('/api/lease', strictLimiter, leaseRoutes);
  app.use('/api/floorplan', strictLimiter, floorplanRoutes);
  app.use('/api/webhook', webhookLimiter, webhookRoutes);
  app.use('/api/image-proxy', searchLimiter, imageProxyRoutes);
  app.use('/api/property', strictLimiter, propertyAnalysisRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
