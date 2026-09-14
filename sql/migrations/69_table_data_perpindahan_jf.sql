-- ============================================================================
-- TABEL BARU: data_perpindahan_jf
-- ----------------------------------------------------------------------------
-- Menyimpan daftar person yang mengajukan Perpindahan Jabatan Fungsional (JF)
-- ke JF Pengelola Pengadaan Barang/Jasa (PBJ), per jenjang.
--
-- Sumber data: data/data-person-perpindahan-jf.csv (level person, per baris
-- satu pengajuan). Ringkasan per jenjang (data/data-perpindahan-jf.csv) TIDAK
-- disimpan sebagai tabel terpisah karena sepenuhnya bisa diturunkan dari
-- tabel ini lewat GROUP BY jenjang_jf — jadi tidak ada dua sumber yang bisa
-- tidak sinkron.
--
-- Tabel ini di luar mekanisme scripts/update_from_data_update.mjs (data kecil,
-- dikurasi manual) — sama seperti formasi_jf_ukpbj, data_jf_kemnaker,
-- data_renaksi. Update data baru: tambah baris INSERT lewat SQL Editor atau
-- Table Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.data_perpindahan_jf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_urut INTEGER,
  satuan_kerja TEXT,
  jenjang_jf TEXT,
  nama TEXT,
  pangkat_golongan TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.data_perpindahan_jf IS 'Daftar person pengajuan Perpindahan JF ke JF PBJ, per jenjang. Ringkasan per jenjang diturunkan di frontend via GROUP BY jenjang_jf, bukan tabel terpisah.';

ALTER TABLE public.data_perpindahan_jf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
ON public.data_perpindahan_jf
FOR SELECT
USING (true);

-- Seed data awal (19 Agustus 2026, 3 pengajuan — semuanya jenjang Ahli Pertama)
INSERT INTO public.data_perpindahan_jf (no_urut, satuan_kerja, jenjang_jf, nama, pangkat_golongan) VALUES
  (1, 'Setditjen PHI dan Jamsos', 'Ahli Pertama', 'Dwi Laylatur Rosyidah, S.Sos.', 'Penata Muda Tk. I (III/b)'),
  (2, 'BPVP Bandung Barat', 'Ahli Pertama', 'Aria Firnandes, S.E', 'Penata Muda Tk. I (III/b)'),
  (3, 'BPVP Bantaeng', 'Ahli Pertama', 'Ali Masyhar, S.E.', 'Penata Muda (III/a)');
