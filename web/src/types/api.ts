// Auth API types
export type Role = "admin" | "editor";
export type Scope = "notes:read" | "notes:write";

export interface LoginRequest {
  email: string;
  orgSlug: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  role: Role;
  org_id: string;
}

export interface AuthMeResponse {
  id: string;
  role: Role;
  org_id: string;
}

export interface AuthVerifyResponse {
  valid: boolean;
  user?: Omit<UserInfo, "email">;
  expires_at?: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  requestId?: string;
}

// Decoded JWT for client-side usage
export interface DecodedJwt {
  sub: string;
  org_id: string;
  role: Role;
  scopes: Scope[];
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
