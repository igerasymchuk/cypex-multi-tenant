import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { Container } from 'typedi';
import { createTestApp } from '../test/app';
import { AuthService } from '../services/auth.service';
import { JwtService } from '../services/jwt.service';
import { UserService } from '../services/user.service';
import { DatabasePool } from '../config/database';
import { AuthController } from './auth.controller';
import { HealthController } from './health.controller';
import { JwtPayload } from '../types';
import { USERS, ORGS } from '../test/fixtures';
import type { Express } from 'express';

describe('AuthController', () => {
  let app: Express;
  let mockAuthService: AuthService;
  let mockJwtService: JwtService;
  let mockUserService: UserService;
  let mockDatabasePool: DatabasePool;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_ISSUER = 'cypex-auth';
    process.env.JWT_AUDIENCE = 'postgrest';
  });

  beforeEach(() => {
    Container.reset();

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
      verify: vi.fn(),
      decode: vi.fn(),
    } as unknown as JwtService;

    mockUserService = {
      findByEmailAndOrgSlug: vi.fn(),
      findById: vi.fn(),
    } as unknown as UserService;

    mockAuthService = {
      login: vi.fn(),
    } as unknown as AuthService;

    mockDatabasePool = {
      healthCheck: vi.fn().mockResolvedValue(true),
      getPool: vi.fn(),
      close: vi.fn(),
    } as unknown as DatabasePool;

    Container.set({ id: DatabasePool, value: mockDatabasePool });
    Container.set({ id: JwtService, value: mockJwtService });
    Container.set({ id: UserService, value: mockUserService });
    Container.set({ id: AuthService, value: mockAuthService });

    const authController = new AuthController(mockAuthService);
    const healthController = new HealthController(mockDatabasePool as DatabasePool);

    Container.set({ id: AuthController, value: authController });
    Container.set({ id: HealthController, value: healthController });

    app = createTestApp();
  });

  describe('POST /auth/login', () => {
    it('should return 200 with token on successful login for Cybertec admin', async () => {
      const loginResult = {
        token: 'jwt-token',
        user: {
          id: USERS.ARMIN.id,
          email: USERS.ARMIN.email,
          role: USERS.ARMIN.role,
          org_id: USERS.ARMIN.orgId,
        },
      };

      vi.mocked(mockAuthService.login).mockResolvedValue(loginResult);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: USERS.ARMIN.email, orgSlug: ORGS.CYBERTEC.slug })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(loginResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(USERS.ARMIN.email, ORGS.CYBERTEC.slug);
    });

    it('should return 200 with token on successful login for Ivan Corp editor', async () => {
      const loginResult = {
        token: 'jwt-token',
        user: {
          id: USERS.BOB_IVAN_CORP.id,
          email: USERS.BOB_IVAN_CORP.email,
          role: USERS.BOB_IVAN_CORP.role,
          org_id: USERS.BOB_IVAN_CORP.orgId,
        },
      };

      vi.mocked(mockAuthService.login).mockResolvedValue(loginResult);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: USERS.BOB_IVAN_CORP.email, orgSlug: ORGS.IVAN_CORP.slug })
        .expect(200);

      expect(response.body.user.role).toBe('editor');
    });

    it('should return 401 when user not found', async () => {
      vi.mocked(mockAuthService.login).mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'unknown@example.com', orgSlug: ORGS.CYBERTEC.slug })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 when user exists but wrong org', async () => {
      vi.mocked(mockAuthService.login).mockResolvedValue(null);

      // Armin is in Cybertec, not Ivan Corp
      const response = await request(app)
        .post('/auth/login')
        .send({ email: USERS.ARMIN.email, orgSlug: ORGS.IVAN_CORP.slug })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ orgSlug: ORGS.CYBERTEC.slug })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 when orgSlug is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: USERS.ARMIN.email })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'not-an-email', orgSlug: ORGS.CYBERTEC.slug })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /auth/verify', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app).get('/auth/verify').expect(401);
    });

    it('should return 401 when token is invalid', async () => {
      vi.mocked(mockJwtService.verify!).mockReturnValue(null);

      await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return user info when token is valid (Svitlana - editor)', async () => {
      const mockPayload: JwtPayload = {
        sub: USERS.SVITLANA.id,
        org_id: USERS.SVITLANA.orgId,
        role: USERS.SVITLANA.role,
        scopes: ['notes:read', 'notes:write'],
        iss: 'cypex-auth',
        aud: 'postgrest',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      vi.mocked(mockJwtService.verify!).mockReturnValue(mockPayload);

      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user).toEqual({
        id: USERS.SVITLANA.id,
        role: USERS.SVITLANA.role,
        org_id: USERS.SVITLANA.orgId,
      });
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app).get('/auth/me').expect(401);
    });

    it('should return user info for Ivan (admin)', async () => {
      const mockPayload: JwtPayload = {
        sub: USERS.IVAN.id,
        org_id: USERS.IVAN.orgId,
        role: USERS.IVAN.role,
        scopes: ['notes:read', 'notes:write'],
        iss: 'cypex-auth',
        aud: 'postgrest',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      vi.mocked(mockJwtService.verify!).mockReturnValue(mockPayload);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        id: USERS.IVAN.id,
        role: USERS.IVAN.role,
        org_id: USERS.IVAN.orgId,
      });
    });
  });
});
