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
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import {
  standardLimiter,
  strictLimiter,
  searchLimiter,
  webhookLimiter,
} from './middleware/rateLimiter';
import { sanitizeBody } from './middleware/validation';

export function createApp(): Express {
  const app = express();

  // Trust proxy for Render.com
  app.set('trust proxy', 1);

  // CORS - environment aware
  const corsOptions = process.env.NODE_ENV === 'production'
    ? {
        origin: process.env.FRONTEND_URL || 'https://leaseiq.com',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }
    : undefined; // Allow all in development

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeBody); // Sanitize all request bodies

  // Health check (no rate limiting)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes (standard limiting)
  app.use('/api/auth', standardLimiter, authRoutes);
  app.use('/api/user', standardLimiter, userRoutes);

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
