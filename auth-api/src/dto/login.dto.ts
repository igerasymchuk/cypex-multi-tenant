import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class LoginResponseDto {
  token!: string;
  user!: {
    id: string;
    email: string;
    role: string;
    org_id: string;
  };
}
