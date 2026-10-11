import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.routes';

export function createApp(clientUrl: string = 'http://localhost:5173') {
  const app = express();

  app.use(
    cors({
      origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    })
  );

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Main API Router
  app.use('/api', apiRouter);

  return app;
}
