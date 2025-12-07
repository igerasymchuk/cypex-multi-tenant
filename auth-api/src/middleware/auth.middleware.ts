import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { JwtService } from '../services';
import { logger } from '../config';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      status: 401,
      message: 'Authorization header required',
      code: 'MISSING_AUTH_HEADER',
    });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    res.status(401).json({
      status: 401,
      message: 'Invalid authorization format. Use: Bearer <token>',
      code: 'INVALID_AUTH_FORMAT',
    });
    return;
  }

  const jwtService = Container.get(JwtService);
  const payload = jwtService.verify(token);

  if (!payload) {
    res.status(401).json({
      status: 401,
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  req.user = payload;

  logger.debug(
    { userId: payload.sub, orgId: payload.org_id, role: payload.role },
    'Request authenticated'
  );

  next();
}

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    next();
    return;
  }

  const jwtService = Container.get(JwtService);
  const payload = jwtService.verify(token);

  if (payload) {
    req.user = payload;
  }

  next();
}
