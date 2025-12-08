import { ApiClient, getAuthApiUrl } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  AuthMeResponse,
  AuthVerifyResponse,
} from "@/types";

class AuthApi {
  private client: ApiClient;

  constructor() {
    this.client = new ApiClient(getAuthApiUrl());
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse>("/auth/login", data);
  }

  async me(token: string): Promise<AuthMeResponse> {
    return this.client.get<AuthMeResponse>("/auth/me", token);
  }

  async verify(token: string): Promise<AuthVerifyResponse> {
    return this.client.get<AuthVerifyResponse>("/auth/verify", token);
  }
}

export const authApi = new AuthApi();
