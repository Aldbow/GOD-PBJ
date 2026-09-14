-- ============================================================================
-- MATERIALIZED VIEW: mv_risiko_ringkasan — rekap ringan untuk 2 grafik risiko
-- di halaman Ringkasan (RisikoInsightPanel)
-- ----------------------------------------------------------------------------
-- MASALAH
--   RisikoInsightPanel (tertanam di halaman Ringkasan, BUKAN halaman Risiko
--   Pengadaan penuh) menarik SELURUH ~7.700+ baris risiko_pengadaan setiap
--   kali halaman Ringkasan dibuka, termasuk kolom JSONB components_json yang
--   berat (~2KB/baris — code, label, applicable, rawValue, normalizedValue,
--   score, maxScore, reason, sourceTable per komponen penilaian). Ini
--   penyumbang beban TUNGGAL TERBESAR di halaman Ringkasan: ~15MB dari total
--   ~19,7MB (lihat docs/LAPORAN-ANALISIS-PERFORMA.md bagian 5.5 Langkah 5) —
--   padahal hasil akhirnya cuma 2 grafik kecil (distRiskDriverStacked,
--   satkerTinggiRanking) + beberapa angka cetak (printData), yang setelah
--   diperiksa (src/features/ringkasan/components/RisikoInsightPanel.tsx)
--   HANYA PERNAH membaca field label, score, dan applicable dari tiap
--   komponen -- tidak pernah rawValue/normalizedValue/reason/sourceTable/
--   code/maxScore.
--
-- SOLUSI
--   Materialized view row-level yang meniru risiko_pengadaan (kolom sama
--   persis dengan SELECT yang dipakai RisikoInsightPanel), TAPI
--   components_json diperkecil ke cuma {label, score, applicable} per
--   elemen. TIDAK ADA agregasi/GROUP BY di sini -- filtering satker/PPK
--   tetap dilakukan lewat .eq() di TypeScript seperti sekarang, dan logika
--   distRiskDriverStacked/satkerTinggiRanking/printData/countRup TIDAK
--   diubah sama sekali. Ini SENGAJA menghindari memindahkan logika bisnis
--   ke SQL -- lihat CATATAN di bawah.
--
-- CATATAN
--   - Kenapa row-level, bukan GROUP BY agregat penuh (mis. per satker+label+
--     skor)? Karena grafik ini difilter SERVER-SIDE per satker DAN per PPK
--     (bukan cuma tampilan), dan logika penghitungannya punya kuirk nyata
--     (label "sisa_waktu" beda utk Penyedia vs Swakelola; placeholder
--     applicable:false milik Swakelola tetap terhitung bucket 'NULL' karena
--     TS tidak mengecek applicable) -- mereplikasi ini di SQL berisiko
--     salah tanpa test unit setara src/lib/risiko/aggregate.ts. Row-level +
--     filter tetap di TS = nol risiko perubahan perilaku.
--   - risiko_pengadaan adalah TABEL BIASA (bukan view berlapis CTE seperti
--     view_dashboard_gabungan_satker), jadi TIDAK ADA biaya komputasi yang
--     dihemat di sisi query -- yang dihemat murni UKURAN PAYLOAD dengan
--     membuang field JSONB yang tidak pernah dibaca.
--   - Halaman Risiko Pengadaan PENUH (RisikoPengadaanView.tsx) TETAP query
--     risiko_pengadaan ASLI langsung -- dia butuh JSONB lengkap untuk
--     drill-down & filter kolom yang lebih kaya. TIDAK diarahkan ke mv ini.
--   - Direfresh dari DUA titik: (1) tombol "Hitung Ulang" manual di halaman
--     Risiko Pengadaan (RisikoPengadaanView.tsx), (2) otomatis dari
--     scripts/update_from_data_update.mjs setelah proses hitung ulang
--     risiko berjalan (lihat blok baru di script itu). Keduanya menulis ke
--     risiko_pengadaan, jadi keduanya perlu memicu refresh mv ini.
--   - Materialized view dibuat WITH NO DATA -- KOSONG sampai di-REFRESH
--     manual pertama kali (lihat blok VERIFIKASI di bawah).
--   - Jalankan di Supabase SQL Editor setelah 64_table_risiko_pengadaan.sql
--     dan setelah 75_materialized_view_gabungan_satker.sql (urutan penomoran).
-- ============================================================================

-- 1. MATERIALIZED VIEW --------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_risiko_ringkasan AS
SELECT
    kd_rup,
    nama_paket,
    satker,
    nama_ppk,
    pagu,
    total_score,
    max_score,
    kategori,
    main_risk_driver,
    execution_status,
    -- Postgres: "->>' pada JSON null menghasilkan SQL NULL (bukan string
    -- "null"), jadi (c->>'score')::numeric sudah otomatis NULL kalau skornya
    -- memang null di sumber -- tidak perlu CASE WHEN tambahan.
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'label', c->>'label',
          'score', (c->>'score')::numeric,
          'applicable', (c->>'applicable')::boolean
        )
      )
      FROM jsonb_array_elements(components_json) AS c
    ) AS components_json
FROM risiko_pengadaan
WITH NO DATA;

-- 2. INDEX ---------------------------------------------------------------------
-- kd_rup sudah PRIMARY KEY di risiko_pengadaan -> tidak mungkin duplikat,
-- aman jadi unique index (wajib untuk REFRESH ... CONCURRENTLY).
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_risiko_ringkasan_kd_rup
    ON mv_risiko_ringkasan (kd_rup);

-- Index pendukung .eq('satker', ...) / .eq('nama_ppk', ...) yang dipakai
-- RisikoInsightPanel.
CREATE INDEX IF NOT EXISTS idx_mv_risiko_ringkasan_satker
    ON mv_risiko_ringkasan (satker);
CREATE INDEX IF NOT EXISTS idx_mv_risiko_ringkasan_ppk
    ON mv_risiko_ringkasan (nama_ppk);

-- 3. FUNGSI RPC REFRESH (SECURITY DEFINER) ------------------------------------
CREATE OR REPLACE FUNCTION refresh_risiko_ringkasan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- CONCURRENTLY butuh unique index di atas DAN mv sudah terisi minimal
    -- sekali (lihat CATATAN "WITH NO DATA" di atas) -- refresh PERTAMA harus
    -- manual tanpa CONCURRENTLY (lihat blok VERIFIKASI di bawah).
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_risiko_ringkasan;
END;
$$;

-- Dipanggil dari scripts/update_from_data_update.mjs (anon/service-role key)
-- dan dari RisikoPengadaanView.tsx (anon key, klien browser) -- keduanya
-- perlu izin EXECUTE eksplisit.
GRANT EXECUTE ON FUNCTION refresh_risiko_ringkasan() TO anon, authenticated;

-- ============================================================================
-- VERIFIKASI (jalankan berurutan setelah migration ini, SEBELUM mengubah kode
-- aplikasi mana pun)
-- ----------------------------------------------------------------------------
--   -- 1) Refresh pertama, WAJIB tanpa CONCURRENTLY (mv masih kosong):
--   REFRESH MATERIALIZED VIEW mv_risiko_ringkasan;
--
--   -- 2) Jumlah baris harus sama persis dengan tabel asli:
--   SELECT
--     (SELECT COUNT(*) FROM mv_risiko_ringkasan) AS mv_count,
--     (SELECT COUNT(*) FROM risiko_pengadaan) AS tabel_count;
--
--   -- 3) UKURAN NYATA -- ini yang membuktikan penghematannya, bukan estimasi:
--   SELECT
--     pg_size_pretty(pg_total_relation_size('risiko_pengadaan')) AS ukuran_asli,
--     pg_size_pretty(pg_total_relation_size('mv_risiko_ringkasan')) AS ukuran_mv;
--
--   -- 4) Kecocokan isi per komponen -- ambil beberapa kd_rup sampel (ganti
--   --    nilainya dengan kd_rup nyata dari masing-masing jenis_paket), lalu
--   --    bandingkan MANUAL bahwa tiap {label,score,applicable} di mv persis
--   --    sama dengan versi lengkap di risiko_pengadaan:
--   SELECT kd_rup, components_json FROM mv_risiko_ringkasan WHERE kd_rup IN ('GANTI_CONTOH_PENYEDIA', 'GANTI_CONTOH_SWAKELOLA');
--   SELECT kd_rup, components_json FROM risiko_pengadaan WHERE kd_rup IN ('GANTI_CONTOH_PENYEDIA', 'GANTI_CONTOH_SWAKELOLA');
--
--   -- 5) Sekarang mv sudah terisi, uji fungsi refresh (CONCURRENTLY valid):
--   SELECT refresh_risiko_ringkasan();
--
--   -- 6) Cek status kapan saja (kolom ispopulated harus true):
--   SELECT matviewname, ispopulated FROM pg_matviews
--   WHERE matviewname = 'mv_risiko_ringkasan';
-- ============================================================================
