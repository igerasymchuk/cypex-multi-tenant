import pino, { type LoggerOptions } from 'pino';
import { env } from './env';

function getTransport(): LoggerOptions['transport'] {
  if (env.NODE_ENV !== 'development') {
    return undefined;
  }

  // Only attempt to load pino-pretty in development
  try {
    require.resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  } catch {
    // pino-pretty not installed, use default transport
    return undefined;
  }
}

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: getTransport(),
  base: {
    service: 'auth-api',
  },
  redact: ['req.headers.authorization', 'password', 'token'],
});

export type Logger = typeof logger;
