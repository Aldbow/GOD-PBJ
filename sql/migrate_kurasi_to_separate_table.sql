-- 1. Buat Tabel Khusus Kurasi AI
CREATE TABLE IF NOT EXISTS ai_kurasi_paket (
    kd_rup BIGINT PRIMARY KEY,
    status_kurasi TEXT,
    catatan_kurasi TEXT,
    rekomendasi_kurasi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrasi Data yang Sudah Ada (Penyedia)
INSERT INTO ai_kurasi_paket (kd_rup, status_kurasi, catatan_kurasi, rekomendasi_kurasi)
SELECT 
    kd_rup::bigint, 
    status_kurasi, 
    catatan_kurasi, 
    rekomendasi_kurasi
FROM api_paket_penyedia_terumumkan
WHERE status_kurasi IS NOT NULL AND status_kurasi != 'Belum Dikurasi'
ON CONFLICT (kd_rup) DO NOTHING;

-- 3. Migrasi Data yang Sudah Ada (Swakelola)
INSERT INTO ai_kurasi_paket (kd_rup, status_kurasi, catatan_kurasi, rekomendasi_kurasi)
SELECT 
    kd_rup::bigint, 
    status_kurasi, 
    catatan_kurasi, 
    rekomendasi_kurasi
FROM api_paket_swakelola_terumumkan
WHERE status_kurasi IS NOT NULL AND status_kurasi != 'Belum Dikurasi'
ON CONFLICT (kd_rup) DO NOTHING;

-- 4. Hapus Kolom Kurasi dari Tabel Asli (Opsional, tapi disarankan agar bersih)
-- Jika Anda ingin membiarkannya sebentar untuk memastikan semuanya aman, Anda bisa
-- memberikan komentar (--) pada dua baris ALTER TABLE di bawah ini.
ALTER TABLE api_paket_penyedia_terumumkan
  DROP COLUMN IF EXISTS status_kurasi,
  DROP COLUMN IF EXISTS catatan_kurasi,
  DROP COLUMN IF EXISTS rekomendasi_kurasi;

ALTER TABLE api_paket_swakelola_terumumkan
  DROP COLUMN IF EXISTS status_kurasi,
  DROP COLUMN IF EXISTS catatan_kurasi,
  DROP COLUMN IF EXISTS rekomendasi_kurasi;
