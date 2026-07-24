# sql/migrations — Urutan Migrasi Bersih (Turnkey)

Folder ini berisi **subset final** dari script SQL, sudah dinomori sesuai urutan jalan
untuk membangun database dari **Supabase kosong**. File lama di `sql/` **tidak diubah**
(tetap sebagai backup/riwayat).

> Jalankan **berurutan menaik** (00 → 61). File dengan nomor sama boleh urut bebas.
> Detail alasan & peta supersesi ada di [`../MIGRASI-RUNBOOK.md`](../MIGRASI-RUNBOOK.md).

## Cara jalan

1. **SQL Editor** Supabase: buka tiap file `.sql` berurutan, jalankan.
2. Di **`25_IMPORT_DATA_CSV.sql`** → berhenti, lakukan **import CSV manual** (Table Editor).
   File ini isinya komentar/checklist, bukan untuk di-run.
3. Lanjutkan file view & index.
4. Verifikasi: `node scripts/diag_unknown_satker.mjs` (harus 0 satker/eselon1 'Tidak Diketahui').

## Peta urutan

| No | File | Objek | Catatan |
|----|------|-------|---------|
| 00 | 00_rbac_schema.sql | profiles + RLS | *opsional* (hanya jika pakai login) |
| 01 | 01_rbac_seed.sql | seed role/user | *opsional*; butuh akun Supabase Auth |
| 10 | 10_table_master_data.sql | master_data | |
| 11 | 11_table_paket_e_purchasing.sql | paket_e_purchasing | |
| 12 | 12_table_non_tender_selesai.sql | non_tender_selesai | |
| 13 | 13_table_api_pencatatan_swakelola.sql | api_pencatatan_swakelola | |
| 14 | 14_tables_anggaran_dan_tender.sql | paket_anggaran_penyedia/swakelola, tender_selesai_nilai | |
| 15 | 15_table_afirmasi_pdn_perencanaan.sql | data_afirmasi_pdn_perencanaan | |
| 16 | 16_table_history_kaji_ulang.sql | history_kaji_ulang | tabel + data |
| 17 | 17_table_satker_kode_alias.sql | satker_kode_alias | tabel + seed alias |
| 18 | 18_table_ai_kurasi_paket.sql | ai_kurasi_paket | **baru** (DDL bersih) |
| 25 | 25_IMPORT_DATA_CSV.sql | — | **CHECKPOINT import CSV** (manual) |
| 30 | 30_view_base_master_data.sql | view_paket_penyedia/swakelola_master_data | LTRIM + kurasi |
| 31 | 31_view_rup_final.sql | view_rup_final (+ epurch lama) | jalan **setelah** 30 |
| 40 | 40_views_realisasi_tender_pl_pnl.sql | tender(final), PL/PnL(antara) | |
| 41 | 41_views_is_from_sirup_gabungan.sql | epurch/swakelola(antara), gabungan(final) | |
| 42 | 42_views_lock_pagu.sql | PnL(final), swakelola(final), PL(antara) | |
| 43 | 43_view_pengadaan_langsung_metode.sql | PL(final) | |
| 44 | 44_view_epurchasing_final.sql | epurchasing(final) | alias + direct-by-kode |
| 50 | 50_view_afirmasi_eselon1.sql | view_dashboard_keterisian_sirup_eselon1 | |
| 60 | 60_index_realisasi_dashboard.sql | index exact-match | |
| 61 | 61_index_ltrim_satker.sql | functional index LTRIM | wajib utk join LTRIM |

## Kenapa view realisasi (40–44) dijalankan berlapis?

Tiap file patch menyentuh beberapa view sekaligus; status *final* tiap view tercapai
**kumulatif** setelah 40→44 dijalankan berurutan. Ini sengaja meniru hasil deploy
saat ini tanpa menulis ulang definisi (mengurangi risiko salah).

## Tidak disertakan (superseded — ada di `sql/` sebagai backup)

`add_ai_curation_columns`, `migrate_kurasi_to_separate_table`, `migrate_and_update_kurasi_final`,
`update_all_views_for_kurasi`, `add_status_kurasi_to_gabungan_view`,
`join_paket_penyedia_master_data`, `join_paket_swakelola_master_data`,
`create_view_dashboard_tender`, `create_view_dashboard_pengadaan_langsung`,
`create_view_dashboard_penunjukan_langsung`, `create_view_dashboard_swakelola_v1`.
