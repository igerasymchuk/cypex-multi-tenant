import jwt, { type SignOptions } from 'jsonwebtoken';
import { Service } from 'typedi';
import { env, logger } from '../config';
import { JwtClaims, JwtPayload } from '../types';

@Service()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    this.secret = env.JWT_SECRET;
    this.expiresIn = env.JWT_EXPIRES_IN;
    this.issuer = env.JWT_ISSUER;
    this.audience = env.JWT_AUDIENCE;
  }

  sign(claims: JwtClaims): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: claims.sub,
      org_id: claims.org_id,
      role: claims.role,
      scopes: claims.scopes,
      iss: this.issuer,
      aud: this.audience,
    };

    const options: SignOptions = {
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    };

    const token = jwt.sign(payload, this.secret, options);

    logger.debug({ sub: claims.sub, org_id: claims.org_id }, 'JWT token generated');

    return token;
  }

  verify(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as JwtPayload;

      return payload;
    } catch (err) {
      logger.warn({ err }, 'JWT verification failed');
      return null;
    }
  }

  decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}
