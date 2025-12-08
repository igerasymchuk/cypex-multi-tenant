import 'reflect-metadata';
import express, { Express } from 'express';
import { useExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';

import { errorHandler, requestIdMiddleware } from '../middleware';
import { HealthController, AuthController } from '../controllers';

/**
 * Creates an Express app instance for testing.
 * Does not start the server or connect to the database.
 */
export function createTestApp(): Express {
  useContainer(Container);

  const app = express();

  app.use(requestIdMiddleware);
  app.use(express.json());

  useExpressServer(app, {
    controllers: [HealthController, AuthController],
    defaultErrorHandler: false,
    validation: false,
  });

  app.use(errorHandler);

  return app;
}
