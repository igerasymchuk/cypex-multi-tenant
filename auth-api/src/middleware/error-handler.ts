import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'routing-controllers';
import { logger } from '../config';
import { AppError, ValidationError } from '../errors';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  requestId?: string;
}

interface ClassValidatorError {
  httpCode: number;
  errors: Array<{
    property: string;
    constraints?: Record<string, string>;
    children?: ClassValidatorError['errors'];
  }>;
}

function isClassValidatorError(err: unknown): err is ClassValidatorError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'httpCode' in err &&
    'errors' in err &&
    Array.isArray((err as ClassValidatorError).errors)
  );
}

function extractValidationErrors(
  errors: ClassValidatorError['errors']
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    if (error.constraints) {
      result[error.property] = Object.values(error.constraints);
    }
    if (error.children && error.children.length > 0) {
      const nestedErrors = extractValidationErrors(error.children);
      for (const [key, value] of Object.entries(nestedErrors)) {
        result[`${error.property}.${key}`] = value;
      }
    }
  }

  return result;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let status = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let errors: Record<string, string[]> | undefined;

  if (err instanceof AppError) {
    status = err.status;
    message = err.message;
    code = err.code;
    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  } else if (isClassValidatorError(err)) {
    status = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    errors = extractValidationErrors(err.errors);
  } else if (err instanceof HttpError) {
    status = err.httpCode;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Invalid or expired token';
    code = 'INVALID_TOKEN';
  }

  const logContext = {
    err: status >= 500 ? err : { name: err.name, message: err.message },
    status,
    code,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  };

  if (status >= 500) {
    logger.error(logContext, 'Server error');
  } else {
    logger.warn(logContext, 'Client error');
  }

  const response: ApiError = { status, message };
  if (code) response.code = code;
  if (errors) response.errors = errors;
  if (req.requestId) response.requestId = req.requestId;

  res.status(status).json(response);
}
