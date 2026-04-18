import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@fvos/cost-engine',
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
      },
    },
  },
});
