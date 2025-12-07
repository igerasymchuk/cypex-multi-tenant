import {
  JsonController,
  Post,
  Get,
  Body,
  HttpError,
  Req,
  UseBefore,
} from 'routing-controllers';
import { Request } from 'express';
import { Service } from 'typedi';
import { AuthService } from '../services';
import {
  LoginRequestDto,
  LoginResponseDto,
  TokenVerifyResponseDto,
  UserInfoDto,
} from '../dto';
import { authMiddleware } from '../middleware';

@Service()
@JsonController('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
    const result = await this.authService.login(body.email, body.orgSlug);

    if (!result) {
      throw new HttpError(401, 'Invalid credentials');
    }

    return result;
  }

  @Get('/verify')
  @UseBefore(authMiddleware)
  verify(@Req() req: Request): TokenVerifyResponseDto {
    const user = req.user!;

    const userInfo: UserInfoDto = {
      id: user.sub,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
    };

    return {
      valid: true,
      user: userInfo,
      expires_at: new Date(user.exp * 1000).toISOString(),
    };
  }

  @Get('/me')
  @UseBefore(authMiddleware)
  me(@Req() req: Request): UserInfoDto {
    const user = req.user!;

    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
    };
  }
}
