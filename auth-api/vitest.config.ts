import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/test/**',
        'src/queries/**', // Generated files
        'src/index.ts',
      ],
    },
    // Required for TypeDI decorators
    deps: {
      interopDefault: true,
    },
    // Increase timeout for integration tests
    testTimeout: 10000,
  },
});
