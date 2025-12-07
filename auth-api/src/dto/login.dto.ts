import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  orgSlug!: string;
}

export class UserInfoDto {
  id!: string;
  email!: string;
  role!: string;
  org_id!: string;
}

export class LoginResponseDto {
  token!: string;
  user!: UserInfoDto;
}

export class TokenVerifyResponseDto {
  valid!: boolean;
  user?: UserInfoDto;
  expires_at?: string;
}
