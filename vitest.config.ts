import { defineConfig } from 'vitest/config';
import path from 'path';

// Vitest dipakai untuk modul kalkulasi murni yang butuh assertion deterministik. Repo ini tidak
// punya test framework lain; jangan perluas cakupan ke folder lain tanpa keputusan eksplisit.
//
// Cakupan yang sudah diputuskan:
//  - src/lib/risiko/**        business rule berbasis ambang batas (pagu, waktu, revisi).
//  - src/features/ringkasan/lib/pdf/**  penyusun & penata letak PDF Cetak Laporan. Isinya
//    dipilih fungsi murni (buildLaporan) dan invarian tata letak (measure == draw) justru
//    supaya bisa diuji tanpa browser — lihat renderLaporan.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/risiko/**/*.test.ts', 'src/features/ringkasan/lib/pdf/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
