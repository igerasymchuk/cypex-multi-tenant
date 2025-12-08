import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { useExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env, logger, DatabasePool, openApiSpec } from './config';
import { errorHandler, requestIdMiddleware } from './middleware';
import { HealthController, AuthController } from './controllers';

useContainer(Container);

async function bootstrap(): Promise<void> {
  const app = express();

  // CORS configuration - allow frontend origins
  app.use(
    cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        requestId: req.requestId,
      }),
    })
  );
  app.use(express.json());

  // API Documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/openapi.json', (_req, res) => res.json(openApiSpec));

  useExpressServer(app, {
    controllers: [HealthController, AuthController],
    defaultErrorHandler: false,
    validation: false, // Using Zod for validation instead of class-validator
  });

  app.use(errorHandler);

  // Verify database connection on startup
  const db = Container.get(DatabasePool);
  const dbHealthy = await db.healthCheck();
  if (!dbHealthy) {
    logger.error('Failed to connect to database');
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Auth API started');
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    await db.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start application');
  process.exit(1);
});
