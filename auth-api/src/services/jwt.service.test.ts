import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from 'typedi';
import { JwtService } from './jwt.service';
import { JwtClaims } from '../types';
import jwt from 'jsonwebtoken';

describe('JwtService', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    // Ensure env vars are set for tests
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_ISSUER = 'cypex-auth';
    process.env.JWT_AUDIENCE = 'postgrest';

    jwtService = Container.get(JwtService);
  });

  describe('sign', () => {
    it('should generate a valid JWT token', () => {
      const claims: JwtClaims = {
        sub: 'user-123',
        org_id: 'org-456',
        role: 'admin',
        scopes: ['notes:read', 'notes:write'],
      };

      const token = jwtService.sign(claims);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include correct claims in the token', () => {
      const claims: JwtClaims = {
        sub: 'user-123',
        org_id: 'org-456',
        role: 'admin',
        scopes: ['notes:read'],
      };

      const token = jwtService.sign(claims);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.sub).toBe(claims.sub);
      expect(decoded.org_id).toBe(claims.org_id);
      expect(decoded.role).toBe(claims.role);
      expect(decoded.scopes).toEqual(claims.scopes);
    });
  });

  describe('verify', () => {
    it('should return payload for valid token', () => {
      const claims: JwtClaims = {
        sub: 'user-123',
        org_id: 'org-456',
        role: 'editor',
        scopes: ['notes:read'],
      };

      const token = jwtService.sign(claims);
      const payload = jwtService.verify(token);

      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe(claims.sub);
      expect(payload!.org_id).toBe(claims.org_id);
    });

    it('should return null for invalid token', () => {
      const payload = jwtService.verify('invalid-token');

      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a token that expired 1 hour ago
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          org_id: 'org-456',
          role: 'member',
          iss: 'cypex-auth',
          aud: 'postgrest',
        },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      const payload = jwtService.verify(expiredToken);

      expect(payload).toBeNull();
    });
  });

  describe('decode', () => {
    it('should decode token without verification', () => {
      const claims: JwtClaims = {
        sub: 'user-123',
        org_id: 'org-456',
        role: 'admin',
        scopes: ['notes:read'],
      };

      const token = jwtService.sign(claims);
      const decoded = jwtService.decode(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.sub).toBe(claims.sub);
    });

    it('should return null for malformed token', () => {
      const decoded = jwtService.decode('not-a-jwt');

      expect(decoded).toBeNull();
    });
  });
});
