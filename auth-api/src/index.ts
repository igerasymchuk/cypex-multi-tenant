import 'reflect-metadata';
import express from 'express';
import { useExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import pinoHttp from 'pino-http';

import { env, logger, DatabasePool } from './config';
import { errorHandler } from './middleware';
import { HealthController, AuthController } from './controllers';

useContainer(Container);

async function bootstrap(): Promise<void> {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json());

  useExpressServer(app, {
    controllers: [HealthController, AuthController],
    defaultErrorHandler: false,
    validation: {
      whitelist: true,
      forbidNonWhitelisted: true,
    },
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
