export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, message, code);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(403, message, code);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND') {
    super(404, message, code);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    public readonly errors?: Record<string, string[]>
  ) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(409, message, code);
    this.name = 'ConflictError';
  }
}
