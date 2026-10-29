import mongoose from 'mongoose';
import multer from 'multer';
import express, { Express, ErrorRequestHandler } from 'express';
import cors from 'cors';
import searchRoutes from './routes/search.routes';
import alertsRoutes from './routes/alerts.routes';
import researchRoutes from './routes/research.routes';
import researchLibraryRoutes from './routes/research-library.routes';
import leaseRoutes from './routes/lease.routes';
import floorplanRoutes from './routes/floorplan.routes';
import webhookRoutes from './routes/webhook.routes';
import imageProxyRoutes from './routes/image-proxy';
import propertyAnalysisRoutes from './routes/property-analysis.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import jobsRoutes from './routes/jobs.routes';
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
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? [
          'https://lease-iq.vercel.app',
          'https://lease-iq.vercel.app/',
          process.env.FRONTEND_URL,
        ].filter(Boolean)
      : true; // Allow all in development

  const corsOptions =
    process.env.NODE_ENV === 'production'
      ? {
          origin: (
            origin: string | undefined,
            callback: (err: Error | null, allow?: boolean) => void,
          ) => {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true);

            // Remove trailing slash from origin for comparison
            const normalizedOrigin = origin.replace(/\/$/, '');
            const normalizedAllowed = (allowedOrigins as string[]).map((o) =>
              o?.replace(/\/$/, ''),
            );

            if (normalizedAllowed.includes(normalizedOrigin)) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          },
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
        }
      : undefined; // Allow all in development

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeBody); // Sanitize all request bodies

  // Health check (no rate limiting)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable',
      research: 'public-records',
      timestamp: new Date().toISOString(),
    });
  });

  // Auth routes (standard limiting)
  app.use('/api/auth', standardLimiter, authRoutes);
  app.use('/api/user', standardLimiter, userRoutes);
  app.use('/api/jobs', standardLimiter, jobsRoutes);

  // Routes with rate limiting
  app.use(
    '/api/search',
    searchLimiter,
    (_req, res, next) => {
      if (mongoose.connection.readyState !== 1)
        return res
          .status(503)
          .json({
            error:
              'Listing search is temporarily unavailable. You can still research a NYC street address.',
          });
      next();
    },
    searchRoutes,
  );
  app.use('/api/alerts', standardLimiter, alertsRoutes);
  app.use('/api/research', strictLimiter, researchRoutes);
  app.use('/api/research-library', standardLimiter, researchLibraryRoutes);
  app.use('/api/lease', strictLimiter, leaseRoutes);
  app.use('/api/floorplan', strictLimiter, floorplanRoutes);
  app.use('/api/webhook', webhookLimiter, webhookRoutes);
  app.use('/api/image-proxy', searchLimiter, imageProxyRoutes);
  app.use('/api/property', strictLimiter, propertyAnalysisRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof multer.MulterError)
      return res
        .status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
        .json({
          error:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Each file must be at most 10 MB.'
              : 'Invalid upload. Choose one lease PDF and/or one floor plan image.',
        });
    if (
      error instanceof mongoose.Error.ValidationError ||
      error instanceof mongoose.Error.CastError
    )
      return res.status(400).json({ error: 'Invalid request data.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Request is too large.' });
    res.status(500).json({ error: 'Request failed. Please retry.' });
  };
  app.use(errors);

  return app;
}
