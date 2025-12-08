"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi } from "@/lib/api";
import type { UserInfo, ApiError } from "@/types";

// Constants
const TOKEN_KEY = "cypex_token";
const USER_KEY = "cypex_user";

// State types
interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Action types
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: { token: string; user: UserInfo } }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_RESTORE"; payload: { token: string; user: UserInfo } }
  | { type: "CLEAR_ERROR" };

// Context type
interface AuthContextValue extends AuthState {
  login: (email: string, orgSlug: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        token: action.payload.token,
        user: action.payload.user,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: null,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: null,
        error: null,
      };
    case "AUTH_RESTORE":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        token: action.payload.token,
        user: action.payload.user,
        error: null,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextValue | null>(null);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userJson = localStorage.getItem(USER_KEY);

        if (!token || !userJson) {
          dispatch({ type: "AUTH_LOGOUT" });
          return;
        }

        // Verify token is still valid
        const verifyResult = await authApi.verify(token);

        if (verifyResult.valid && verifyResult.user) {
          const user = JSON.parse(userJson) as UserInfo;
          dispatch({
            type: "AUTH_RESTORE",
            payload: { token, user },
          });
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          dispatch({ type: "AUTH_LOGOUT" });
        }
      } catch {
        // Error verifying token, clear storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        dispatch({ type: "AUTH_LOGOUT" });
      }
    };

    restoreSession();
  }, []);

  // Login
  const login = useCallback(async (email: string, orgSlug: string) => {
    dispatch({ type: "AUTH_START" });

    try {
      const response = await authApi.login({ email, orgSlug });

      // Save to localStorage
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          token: response.token,
          user: response.user,
        },
      });
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({
        type: "AUTH_FAILURE",
        payload: apiError.message || "Login failed",
      });
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    dispatch({ type: "AUTH_LOGOUT" });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
