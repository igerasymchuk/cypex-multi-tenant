import { JsonController, Post, Body, HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthService } from '../services';
import { LoginRequestDto, LoginResponseDto } from '../dto';

@Service()
@JsonController('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
    const result = await this.authService.login(body.email);

    if (!result) {
      throw new HttpError(401, 'Invalid credentials');
    }

    return result;
  }
}
