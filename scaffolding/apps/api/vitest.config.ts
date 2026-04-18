import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@fvos/api',
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
    // Integration tests run against the real Fastify server (in-memory)
    // with mocked DB and queue dependencies
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
      },
    },
  },
});
