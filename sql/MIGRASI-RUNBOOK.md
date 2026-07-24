# Runbook Migrasi Database — GOD-PBJ

Panduan menjalankan seluruh script SQL dari **database Supabase kosong** hingga siap dipakai aplikasi. Disusun berdasarkan dependensi objek (tabel → data → view → index), bukan urutan historis.

> **Prinsip:** jalankan hanya **definisi final** tiap objek. Sebagian file lama sudah *superseded* (ditimpa patch berikutnya) → **jangan** dijalankan di setup baru (lihat §Daftar SKIP).

---

## Strategi

Objek dibangun berlapis dengan dependensi jelas:

```
Ekstensi/Auth ─► Tabel (DDL) ─► Import Data (CSV) ─► View fondasi (rup_final)
   ─► View base master-data ─► View dashboard realisasi ─► View gabungan/afirmasi ─► Index
```

Beberapa view (tender, PL, PnL, swakelola, epurchasing, gabungan) didefinisikan ulang di beberapa file. Yang dipakai hanya versi **final** (commit terakhir). Patch final tetap perlu dijalankan **berurutan** karena satu file bisa menyentuh beberapa view sekaligus.

---

## ⚠️ Prasyarat & Celah yang harus dilengkapi

Tiga hal **belum** tercakup DDL dan wajib disiapkan:

| Objek | Status | Tindakan |
|---|---|---|
| `api_paket_penyedia_terumumkan` | **Tak ada DDL** | Dibuat via **import CSV** `260630_paket-penyedia-terumumkan.csv` (Supabase Table Editor → Import) |
| `api_paket_swakelola_terumumkan` | **Tak ada DDL** | Import CSV `paket-swakelola-terumumkan_2026.csv` |
| `ai_kurasi_paket` (tabel) | DDL ada, tapi tercampur INSERT migrasi lama | Butuh file **DDL tabel-saja** (belum dibuat — lihat rekomendasi di akhir) |

Untuk RBAC: `rbac/002_seed.sql` mengaitkan ke `auth.users` Supabase — buat akun login lewat Supabase Auth dulu, atau sesuaikan seed.

---

## URUTAN RUN

### Fase 0 — Ekstensi & Auth/RBAC *(opsional, hanya jika pakai login)*
```
1. sql/rbac/001_schema.sql      -- tabel profiles + RLS
2. sql/rbac/002_seed.sql        -- seed role/user (perlu auth.users)
```

### Fase 1 — Struktur tabel (DDL)
```
3.  sql/create_master_data.sql                 -- master_data
4.  sql/create_paket_e_purchasing.sql          -- paket_e_purchasing
5.  sql/create_table_non_tender_selesai.sql    -- non_tender_selesai
6.  sql/create_table_pencatatan_swakelola.sql  -- api_pencatatan_swakelola
7.  sql/create_tables_anggaran_dan_tender.sql  -- paket_anggaran_penyedia, paket_anggaran_swakelola, tender_selesai_nilai
8.  sql/create_table_afirmasi_pdn_perencanaan.sql -- data_afirmasi_pdn_perencanaan
9.  sql/import_history_kaji_ulang.sql          -- history_kaji_ulang (tabel + data)
10. sql/create_satker_kode_alias.sql           -- satker_kode_alias (tabel + seed alias)
11. [BARU] create_ai_kurasi_paket.sql          -- ai_kurasi_paket (tabel saja) — PERLU DIBUAT
```

### Fase 2 — Import data (CSV via Supabase Table Editor)
Import tiap CSV ke tabelnya. Dua tabel `api_paket_*_terumumkan` **dibuat oleh import ini**:

| Tabel | File CSV |
|---|---|
| `master_data` | `MASTER_DATA.csv` |
| `api_paket_penyedia_terumumkan` ⭐ | `260630_paket-penyedia-terumumkan.csv` |
| `api_paket_swakelola_terumumkan` ⭐ | `paket-swakelola-terumumkan_2026.csv` |
| `paket_e_purchasing` | `260630_paket-e-purchasing.csv` |
| `non_tender_selesai` | `non-tender-selesai_2026.csv` |
| `api_pencatatan_swakelola` | `pencatatan-swakelola_2024.csv` |
| `paket_anggaran_penyedia` | `paket-anggaran-penyedia_2026.csv` |
| `paket_anggaran_swakelola` | `paket-anggaran-swakelola_2026.csv` |
| `tender_selesai_nilai` | `tender-selesai-nilai_2025.csv` |
| `data_afirmasi_pdn_perencanaan` | `data_afirmasi_pdn_perencanaan_20260717_082506.csv` |
| `ai_kurasi_paket` | *(dihasilkan fitur AI Kurasi; boleh mulai kosong)* |

⭐ = tabel yang lahir dari import (belum ada DDL). Import ini **wajib sebelum Fase 3+**.

### Fase 3 — View fondasi
```
12. sql/setup_rup_history_and_dashboard.sql    -- view_rup_final (butuh history_kaji_ulang + paket_e_purchasing)
```
> File ini juga membuat versi lama view epurchasing — abaikan, akan ditimpa di Fase 5.

### Fase 4 — View base master-data (final: LTRIM + kolom kurasi)
```
13. sql/fix_join_ltrim_satker.sql              -- view_paket_penyedia_master_data, view_paket_swakelola_master_data
```
> Butuh: `master_data`, `api_paket_*_terumumkan`, `ai_kurasi_paket`.

### Fase 5 — View dashboard realisasi (jalankan berurutan; final tercapai kumulatif)
```
14. sql/fix_kaji_ulang_realisasi_views.sql     -- tender(FINAL), PL & PnL(antara)
15. sql/add_is_from_sirup_flags.sql            -- epurch & swakelola(antara), gabungan(FINAL)
16. sql/lock_pagu_to_masterdata.sql            -- PnL(FINAL), swakelola(FINAL), PL(antara)
17. sql/fix_metode_pengadaan_from_realisasi.sql-- PL(FINAL)
18. sql/create_view_dashboard_epurchasing_v6.sql -- epurchasing(FINAL: alias + direct-by-kode)
```

### Fase 6 — View afirmasi
```
19. sql/create_view_afirmasi_eselon1.sql       -- view_dashboard_keterisian_sirup_eselon1
```

### Fase 7 — Index performa
```
20. sql/add_index_realisasi_dashboard.sql      -- index exact-match kd_rup/kd_satker
21. sql/add_index_ltrim_satker.sql             -- functional index LTRIM (wajib utk join LTRIM)
```

### Verifikasi akhir
```
node scripts/diag_unknown_satker.mjs           -- satker & eselon1 'Tidak Diketahui' harus 0
```

---

## Daftar SKIP (superseded / historis — JANGAN dijalankan di setup baru)

| File | Ditimpa oleh |
|---|---|
| `add_ai_curation_columns.sql` | pendekatan kolom-kurasi lama → tabel terpisah |
| `migrate_kurasi_to_separate_table.sql` | migrasi dari kolom lama (INSERT-nya gagal di DB kosong) |
| `migrate_and_update_kurasi_final.sql` | base view → `fix_join_ltrim_satker`; dashboard → patch Fase 5 |
| `update_all_views_for_kurasi.sql` | `migrate_and_update_kurasi_final` lalu patch Fase 5 |
| `add_status_kurasi_to_gabungan_view.sql` | `add_is_from_sirup_flags` (gabungan) |
| `join_paket_penyedia_master_data.sql` | `fix_join_ltrim_satker` |
| `join_paket_swakelola_master_data.sql` | `fix_join_ltrim_satker` |
| `create_view_dashboard_tender.sql` | `fix_kaji_ulang_realisasi_views` |
| `create_view_dashboard_pengadaan_langsung.sql` | `fix_metode_pengadaan_from_realisasi` |
| `create_view_dashboard_penunjukan_langsung.sql` | `lock_pagu_to_masterdata` |
| `create_view_dashboard_swakelola_v1.sql` | `lock_pagu_to_masterdata` |

---

## Peta objek → file final (referensi cepat)

| Objek | File final |
|---|---|
| view_rup_final | setup_rup_history_and_dashboard.sql |
| view_paket_penyedia_master_data | fix_join_ltrim_satker.sql |
| view_paket_swakelola_master_data | fix_join_ltrim_satker.sql |
| view_dashboard_tender | fix_kaji_ulang_realisasi_views.sql |
| view_dashboard_penunjukan_langsung | lock_pagu_to_masterdata.sql |
| view_dashboard_pengadaan_langsung | fix_metode_pengadaan_from_realisasi.sql |
| view_dashboard_swakelola_v1 | lock_pagu_to_masterdata.sql |
| view_dashboard_epurchasing_v6 | create_view_dashboard_epurchasing_v6.sql |
| view_dashboard_gabungan_satker | add_is_from_sirup_flags.sql |
| view_dashboard_keterisian_sirup_eselon1 | create_view_afirmasi_eselon1.sql |

---

## Rekomendasi lanjutan (opsional, agar 100% turnkey)

1. **Buat `create_ai_kurasi_paket.sql`** (DDL tabel saja) supaya tidak bergantung file migrasi lama.
2. **Buat DDL** untuk `api_paket_penyedia_terumumkan` & `api_paket_swakelola_terumumkan` (agar struktur tak bergantung inferensi tipe saat import CSV).
3. **Renumber** file KEEP ke folder `sql/migrations/` berprefiks urut (`01_`, `02_`, …) agar bisa dijalankan berurutan tanpa merujuk runbook ini.
```
