// Auth API types
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
  role: "admin" | "editor";
  org_id: string;
}

export interface AuthMeResponse {
  id: string;
  role: "admin" | "editor";
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
  role: "admin" | "editor";
  scopes: ("notes:read" | "notes:write")[];
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
