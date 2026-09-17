import { defineConfig } from 'vitest/config';
import path from 'path';

// Vitest dipakai untuk modul kalkulasi murni yang butuh assertion deterministik. Repo ini tidak
// punya test framework lain; jangan perluas cakupan ke folder lain tanpa keputusan eksplisit.
//
// Cakupan yang sudah diputuskan:
//  - src/lib/risiko/**        business rule berbasis ambang batas (pagu, waktu, revisi).
//  - src/features/ringkasan/lib/pdf/**  penyusun & penata letak PDF Cetak Laporan. Isinya
//    dipilih fungsi murni (buildLaporan) dan invarian tata letak (measure == draw) justru
//    supaya bisa diuji tanpa browser, lihat renderLaporan.ts.
//  - src/features/ringkasan/lib/__tests__/**  aggregate() dan pelingkupan pagu per tahun
//    anggaran. Ditambahkan 17 September 2026 setelah pagu tender sempat terhitung ganda
//    (lihat sql/migrations/78_pagu_per_tahun_anggaran.sql): fungsi murni, uangnya nyata.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/lib/risiko/**/*.test.ts',
      'src/features/ringkasan/lib/pdf/**/*.test.ts',
      'src/features/ringkasan/lib/__tests__/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
