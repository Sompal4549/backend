import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: ['src/controllers/**', 'src/services/**', 'src/repositories/**'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'json', 'html'],
    },
  },
});
