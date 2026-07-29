import { defineConfig } from 'vitest/config';
import path from 'path';

// Vitest hanya dipakai untuk modul kalkulasi murni src/lib/risiko/** (business rule berbasis
// ambang batas — pagu, waktu, revisi — yang butuh assertion deterministik). Repo ini tidak
// punya test framework lain; jangan perluas cakupan ke folder lain tanpa keputusan eksplisit.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/risiko/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
