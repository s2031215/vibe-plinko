import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
    exclude: ['tests/screenshots/**/*.spec.ts'] // exclude e2e from vitest
  }
});
