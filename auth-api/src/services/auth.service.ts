import { Service } from 'typedi';
import { logger } from '../config';
import { JwtService } from './jwt.service';
import { UserService } from './user.service';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    org_id: string;
  };
}

@Service()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  async login(email: string): Promise<LoginResult | null> {
    // Find user by email
    const user = await this.userService.findByEmail(email);

    if (!user) {
      logger.warn({ email }, 'Login attempt for non-existent user');
      return null;
    }

    // Generate JWT token with claims for PostgREST
    const token = this.jwtService.sign({
      sub: user.id,
      org_id: user.org_id,
      role: user.role,
      email: user.email,
    });

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
      },
    };
  }
}
