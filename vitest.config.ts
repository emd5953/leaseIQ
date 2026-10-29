import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'frontend/node_modules/**', 'dist/**'],
    environment: 'node',
    // Each integration file starts MongoDB. Bound concurrency rather than
    // exhausting the host or reducing property samples / increasing timeouts.
    maxWorkers: 4,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.config.ts'],
    },
  },
});
