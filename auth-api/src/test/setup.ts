import 'reflect-metadata';
import { vi } from 'vitest';

// Mock the logger to prevent console noise during tests
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
