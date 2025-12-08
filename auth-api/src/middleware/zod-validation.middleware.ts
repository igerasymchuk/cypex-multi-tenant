import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../errors';

/**
 * Creates an Express middleware that validates request body against a Zod schema.
 * On success, replaces req.body with the parsed (and transformed) data.
 * On failure, throws a ValidationError with field-level error details.
 */
export function zodValidate<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      throw new ValidationError('Validation failed', errors);
    }

    req.body = result.data;
    next();
  };
}

/**
 * Converts Zod errors into a field-to-messages map for API responses.
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}
