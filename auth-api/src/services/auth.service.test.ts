import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { UserService, AppUser } from './user.service';
import { USERS, ORGS } from '../test/fixtures';

describe('AuthService', () => {
  let authService: AuthService;
  let mockJwtService: JwtService;
  let mockUserService: UserService;

  // Use Armin from Cybertec as test user (admin)
  const mockUser: AppUser = {
    id: USERS.ARMIN.id,
    email: USERS.ARMIN.email,
    role: USERS.ARMIN.role,
    orgId: USERS.ARMIN.orgId,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
      verify: vi.fn(),
      decode: vi.fn(),
    } as unknown as JwtService;

    mockUserService = {
      findByEmailAndOrgSlug: vi.fn(),
      findById: vi.fn(),
    } as unknown as UserService;

    authService = new AuthService(mockJwtService, mockUserService);
  });

  describe('login', () => {
    it('should return token and user data on successful login', async () => {
      vi.mocked(mockUserService.findByEmailAndOrgSlug).mockResolvedValue(mockUser);

      const result = await authService.login(USERS.ARMIN.email, ORGS.CYBERTEC.slug);

      expect(result).not.toBeNull();
      expect(result!.token).toBe('mock-jwt-token');
      expect(result!.user).toEqual({
        id: USERS.ARMIN.id,
        email: USERS.ARMIN.email,
        role: USERS.ARMIN.role,
        org_id: USERS.ARMIN.orgId,
      });
    });

    it('should call userService with correct parameters', async () => {
      vi.mocked(mockUserService.findByEmailAndOrgSlug).mockResolvedValue(mockUser);

      await authService.login(USERS.ARMIN.email, ORGS.CYBERTEC.slug);

      expect(mockUserService.findByEmailAndOrgSlug).toHaveBeenCalledWith(
        USERS.ARMIN.email,
        ORGS.CYBERTEC.slug
      );
    });

    it('should call jwtService.sign with correct claims', async () => {
      vi.mocked(mockUserService.findByEmailAndOrgSlug).mockResolvedValue(mockUser);

      await authService.login(USERS.ARMIN.email, ORGS.CYBERTEC.slug);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: USERS.ARMIN.id,
        org_id: USERS.ARMIN.orgId,
        role: USERS.ARMIN.role,
        scopes: ['notes:read', 'notes:write'],
      });
    });

    it('should return null when user is not found', async () => {
      vi.mocked(mockUserService.findByEmailAndOrgSlug).mockResolvedValue(null);

      const result = await authService.login('unknown@example.com', ORGS.CYBERTEC.slug);

      expect(result).toBeNull();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should return null when user exists but in wrong org', async () => {
      vi.mocked(mockUserService.findByEmailAndOrgSlug).mockResolvedValue(null);

      // Armin exists in Cybertec, not Ivan Corp
      const result = await authService.login(USERS.ARMIN.email, ORGS.IVAN_CORP.slug);

      expect(result).toBeNull();
    });
  });
});
