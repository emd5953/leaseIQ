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
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/alerts', alertsRoutes);
  app.use('/api/research', researchRoutes);
  app.use('/api/lease', leaseRoutes);
  app.use('/api/floorplan', floorplanRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/image-proxy', imageProxyRoutes);
  app.use('/api/property', propertyAnalysisRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
