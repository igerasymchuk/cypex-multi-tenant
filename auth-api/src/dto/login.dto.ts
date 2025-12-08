import { z } from 'zod';

// Zod Schemas
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  orgSlug: z.string().min(1, 'Organization slug is required'),
});

export const UserInfoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  org_id: z.string().uuid(),
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserInfoSchema,
});

export const TokenVerifyResponseSchema = z.object({
  valid: z.boolean(),
  user: UserInfoSchema.optional(),
  expires_at: z.string().optional(),
});

// Inferred TypeScript types
export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;
export type UserInfoDto = z.infer<typeof UserInfoSchema>;
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;
export type TokenVerifyResponseDto = z.infer<typeof TokenVerifyResponseSchema>;
