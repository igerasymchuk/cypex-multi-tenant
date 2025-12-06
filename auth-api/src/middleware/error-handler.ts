import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'routing-controllers';
import { logger } from '../config';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let status = 500;
  let message = 'Internal server error';
  let code: string | undefined;

  if (err instanceof HttpError) {
    status = err.httpCode;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Invalid or expired token';
    code = 'INVALID_TOKEN';
  }

  if (status >= 500) {
    logger.error({ err, status }, 'Server error');
  } else {
    logger.warn({ err, status }, 'Client error');
  }

  const response: ApiError = { status, message };
  if (code) response.code = code;

  res.status(status).json(response);
}
