# Runbook — Update Data Supabase dari `data/data_update/`

**Dibuat:** 18 Agustus 2026
**Untuk:** asisten AI (Claude) atau developer yang bekerja di komputer lain setelah `git clone` repo ini
**Script:** [`scripts/update_from_data_update.mjs`](../scripts/update_from_data_update.mjs)

> Dokumen pendamping:
>
> - [docs/BASELINE-ARSITEKTUR.md](BASELINE-ARSITEKTUR.md) — arsitektur aplikasi secara umum
> - [sql/migrations/README.md](../sql/migrations/README.md) — urutan build database & definisi view
> - [AGENTS.md](../AGENTS.md) — Next.js di repo ini **bukan** Next.js versi umum, baca dokumen lokalnya

---

## 1. Apa yang dilakukan mekanisme ini

Data mentah pengadaan (SIRUP / INAPROC / e-Katalog) ditarik berkala jadi file, lalu **isi tabel Supabase diganti** dengan file itu. Aplikasi hanya membaca; seluruh angka di dashboard adalah turunan tabel-tabel ini lewat `view_dashboard_*`.

Alur singkat:

```
tarik API  ->  data/data_update/<nama_tabel>/<file>.json
                        |
                        v
       node scripts/update_from_data_update.mjs --all
                        |
                        v
              tabel Supabase ter-update
                        |
                        v
        view_dashboard_* ikut segar (view, bukan materialized)
```

View **tidak perlu di-refresh manual** — semuanya view biasa, bukan materialized view.

---

## 2. Prasyarat di komputer baru

| Langkah                    | Perintah / tindakan                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Dependency              | `npm install`                                                                                                                                                                  |
| 2.**`.env.local`** | **WAJIB dibuat manual — file ini di-gitignore, tidak ikut ter-clone.** Salin `.env.example` jadi `.env.local`, isi dari Supabase Dashboard → Project Settings → API |
| 3. Node                    | Node 20+ (dites di Node 22). Tidak ada dependency tambahan di luar`package.json`                                                                                               |

Isi minimal `.env.local` untuk script ini:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Script memakai `SUPABASE_SERVICE_ROLE_KEY` **kalau ada**, kalau tidak ada jatuh ke anon key. Per 18 Agustus 2026, seluruh 10 tabel target masih bisa ditulis dengan anon key (RLS tidak aktif / permisif). Kalau suatu saat RLS diperketat, gejalanya error `42501` saat menulis → isi `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` (jangan pernah di-commit).

Project ref saat ini: `bsskoapfeejutazpsyvd`. Untuk menyegarkan tipe TypeScript:

```powershell
npx supabase gen types typescript --project-id bsskoapfeejutazpsyvd --schema public > database.types.ts
```

---

## 3. Struktur folder sumber

Satu folder per tabel, **nama folder = nama tabel di Supabase**:

```
data/data_update/
  api_paket_penyedia_terumumkan/
    paket-penyedia-terumumkan_2026.json       <- dipakai
    paket-penyedia-terumumkan_2026.csv        <- diabaikan kalau ada JSON
    paket-penyedia-terumumkan_2026.xlsx       <- selalu diabaikan
    paket-penyedia-terumumkan_2026.meta.json  <- diabaikan (metadata tarikan)
  non_tender_selesai/
    ...
```

**Selalu utamakan JSON.** Alasan konkret: di `history_kaji_ulang` ada `kd_satker_str` bernilai `"021212"` — lewat CSV/Excel nol depannya hilang jadi `21212`. JSON juga membedakan `null` dan string kosong. Script memilih file `*.json` (bukan `*.meta.json`) lebih dulu, dan hanya jatuh ke `*.csv` kalau tidak ada JSON.

Kalau file JSON tidak tersedia dari sumber, CSV tetap didukung — pemisah `,` maupun `;` dideteksi otomatis (ekspor non-tender pakai `;`).

---

## 4. Tabel yang terdaftar

Ada di konstanta `TABLES` di dalam script. Per 18 Agustus 2026:

| Tabel                               | Mode    | Kunci alami (`keyCol`)        | PK DB (`idCol`) |
| ----------------------------------- | ------- | ------------------------------- | ----------------- |
| `api_paket_penyedia_terumumkan`   | upsert  | `kd_rup`                      | `kd_rup`        |
| `api_paket_swakelola_terumumkan`  | upsert  | `kd_rup`                      | `kd_rup`        |
| `paket_anggaran_penyedia`         | upsert  | `id_paket_anggaran_penyedia`  | sama              |
| `paket_anggaran_swakelola`        | upsert  | `id_paket_anggaran_swakelola` | sama              |
| `paket_e_purchasing`              | upsert  | `order_id`                    | `order_id`      |
| `tender_selesai_nilai`            | upsert  | `kd_tender`                   | `kd_tender`     |
| `history_kaji_ulang`              | replace | —                              | `id` (serial)   |
| `pencatatan_non_tender_realisasi` | replace | —                              | `id` (uuid)     |
| `non_tender_selesai`              | replace | —                              | `id` (uuid)     |
| `data_afirmasi_pdn_perencanaan`   | replace | —                              | `id` (serial)   |

### Dua mode

**`upsert`** — file punya kunci alami. Alur: UPSERT semua baris baru → hapus baris DB yang kunci-nya tidak ada di file. Tabel **tidak pernah kosong**; kalau gagal di tengah, data lama masih utuh. Ini mode yang diutamakan.

**`replace`** — file tidak punya kunci alami (`id`-nya digenerate DB, jadi tidak bisa dicocokkan). Alur: backup → hapus semua → insert. Ada jeda beberapa detik tabel kosong; kalau insert gagal, isi lama dipulihkan otomatis dari backup (kolom `id` akan bernilai baru).

Hasil akhir kedua mode identik: isi tabel = isi file, tidak lebih tidak kurang.

### Tabel yang TIDAK dicakup mekanisme ini

`master_data`, `satker_kode_alias`, `master_data_pn`, `master_data_ro`, `data_jf_kemnaker`, `data_renaksi`, `formasi_jf_ukpbj`, `api_pencatatan_swakelola`, `pencatatan_swakelola_realisasi`, `profiles`, `ai_kurasi_paket`, `risiko_pengadaan`.

Beberapa punya script sendiri (mis. [`scripts/import_master_data_pn_ro.mjs`](../scripts/import_master_data_pn_ro.mjs)); `ai_kurasi_paket` diisi fitur AI Kurasi; `risiko_pengadaan` diisi endpoint recalculate. **`ai_kurasi_paket` tidak pernah ikut terhapus** oleh update ini — hasil kurasi aman.

---

## 5. Prosedur update rutin

```powershell
# 1. WAJIB: periksa dulu, tidak menulis apa pun
node scripts/update_from_data_update.mjs --dry-run --all

# 2. Kalau semua lolos, jalankan (akan minta ketik "ya")
node scripts/update_from_data_update.mjs --all

# satu tabel saja
node scripts/update_from_data_update.mjs --table paket_e_purchasing
```

Flag:

| Flag               | Arti                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| `--all`          | proses semua tabel di`TABLES`                                       |
| `--table <nama>` | proses satu tabel (boleh diulang)                                     |
| `--dry-run`      | validasi + laporan saja,**tidak menulis**                       |
| `--yes`          | lewati konfirmasi interaktif (untuk non-TTY)                          |
| `--force`        | lewati gerbang "baris turun drastis"                                  |
| `--no-backup`    | lewati backup (hanya berlaku mode upsert; mode replace selalu backup) |

Kalau **satu tabel saja** gagal periksa, script berhenti dan **tidak menulis apa pun ke tabel mana pun**. Ini disengaja.

### Yang dilakukan script per tabel

1. Pilih file sumber (JSON > CSV).
2. Ambil daftar kolom tabel dari [`database.types.ts`](../database.types.ts). Key file yang bukan kolom akan diprobe langsung ke DB (menangani kolom yang baru ditambah lewat migration tapi tipe belum di-regenerate); kalau memang tidak ada → **berhenti**, bukan diam-diam dibuang.
3. Normalisasi baris: setiap baris diisi persis daftar kolom yang sama, key yang hilang jadi `null`. **Ini wajib** — PostgREST menolak bulk insert dengan galat `PGRST102` kalau objek dalam satu array punya set key berbeda, dan API sumber memang kadang menghilangkan field bernilai null.
4. Cek duplikat `keyCol` di dalam file (duplikat menggagalkan upsert).
5. **Gerbang pengaman**: kalau baris file < 80% baris DB sekarang → berhenti, minta `--force`. Mencegah "file kepotong → tabel jadi kosong".
6. Backup isi tabel ke `data/backup/<tabel>_<timestamp>.json` (folder ini di-gitignore).
7. Tulis (upsert / delete-all+insert), lalu hapus baris usang untuk mode upsert.
8. Verifikasi jumlah baris akhir = jumlah baris file. Kalau tidak sama → dilaporkan `[BEDA]` dan exit code 1.

Nilai **tidak pernah diubah/dinormalisasi**. Yang dikirim persis isi file; konversi tipe diserahkan ke Postgres (mis. boolean JSON masuk ke kolom TEXT jadi `"true"`, angka masuk kolom TEXT jadi digit polos).

---

## 6. Menambah tabel baru ke mekanisme ini

1. Buat folder `data/data_update/<nama_tabel>/` dan taruh file JSON-nya.
2. Tambahkan satu baris ke `TABLES` di script:

   ```js
   { table: 'nama_tabel', mode: 'upsert', keyCol: 'kunci_alami', idCol: 'pk_db' },
   ```

   Pakai `mode: 'replace'` + `keyCol: null` kalau PK-nya digenerate DB (serial/uuid) dan tidak ada di file.
3. `--dry-run` dulu. Kalau muncul keluhan kolom tidak ada, buat migration di `sql/migrations/` (nomor berikutnya), jalankan di Supabase SQL Editor, lalu regenerate `database.types.ts`.

---

## 7. Pesan error dan artinya

| Pesan                                                                     | Arti & tindakan                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Field berikut ada di file tapi tidak ada kolomnya di tabel X: <kolom>` | Sumber menambah field baru. Buat migration`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, jalankan di SQL Editor, ulangi. Contoh nyata: [`67_alter_pencatatan_non_tender_kode_penyedia.sql`](../sql/migrations/67_alter_pencatatan_non_tender_kode_penyedia.sql) |
| `baris baru (N) < 80% baris sekarang (M)`                               | File sumber diduga tidak lengkap. Periksa`*.meta.json` (`rowCount`). Kalau memang benar turun, ulangi dengan `--force`                                                                                                                                    |
| `Kunci <k> duplikat di file`                                            | File sumber punya PK ganda — mustahil di-upsert. Bersihkan file sumber dulu                                                                                                                                                                                    |
| `Tabel X tidak ditemukan di database.types.ts`                          | Regenerate tipe (lihat bagian 2)                                                                                                                                                                                                                                |
| Error`42501` saat menulis                                               | RLS memblokir anon key. Isi`SUPABASE_SERVICE_ROLE_KEY` di `.env.local`                                                                                                                                                                                      |
| Error`PGRST102`                                                         | Seharusnya tidak terjadi (script menormalisasi key). Kalau muncul, ada baris file yang bukan objek datar                                                                                                                                                        |
| `[BEDA]` di ringkasan                                                   | Jumlah baris akhir ≠ jumlah file. Periksa manual, jangan diulang membabi buta                                                                                                                                                                                  |

---

## 8. Peta sumber realisasi → tampilan dashboard

Sangat sering ditanyakan: **"kenapa paket X di website masih BELUM REALISASI?"**. Statusnya bukan kolom, tapi **hasil hitung view**:

```sql
CASE WHEN (total_pencatatan + total_transaksional) > 0
     THEN 'COMPLETED' ELSE 'BELUM REALISASI' END
```

Jadi status hanya berubah kalau ada baris realisasi di tabel sumbernya:

| Dashboard / view                       | Sumber realisasi                                             | Filter kunci                                               |
| -------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| `view_dashboard_pengadaan_langsung`  | `pencatatan_non_tender_realisasi` + `non_tender_selesai` | `mtd_pemilihan IN ('Pengadaan Langsung','Dikecualikan')` |
| `view_dashboard_penunjukan_langsung` | `pencatatan_non_tender_realisasi` + `non_tender_selesai` | `mtd_pemilihan = 'Penunjukan Langsung'`                  |
| `view_dashboard_tender`              | `tender_selesai_nilai`                                     | metode Tender/Seleksi/Tender Cepat/Kontrak Tahun Jamak     |
| `view_dashboard_epurchasing_v6`      | `paket_e_purchasing`                                       | join lewat`rup_code` + `satker_kode_alias`             |
| `view_dashboard_swakelola_v1`        | `api_pencatatan_swakelola` (`total_realisasi`)           | status bukan`%cancel%`                                   |
| `view_dashboard_gabungan_satker`     | UNION kelima view di atas                                    | —                                                         |

Definisi final tiap view = file bernomor **terbesar** di `sql/migrations/` yang menyentuh view itu (mis. PL final ada di `45_view_jenis_pengadaan.sql`, bukan `43_`).

### Cara mendiagnosis satu `kd_rup`

Urutannya: cek tabel sumber realisasi dulu, baru view. Kalau tabel sumbernya kosong, view pasti bilang BELUM REALISASI dan itu **benar** — masalahnya di data yang belum masuk, bukan di view.

```js
// jalankan dari root project (butuh node_modules), anon key sudah cukup
const RUP = '64619620';
await sb.from('non_tender_selesai').select('*').eq('kd_rup', RUP);
await sb.from('pencatatan_non_tender_realisasi').select('*').eq('kd_rup_paket', RUP);
await sb.from('paket_e_purchasing').select('*').eq('rup_code', RUP);
await sb.from('tender_selesai_nilai').select('*').eq('kd_rup_paket', RUP);
await sb.from('view_dashboard_pengadaan_langsung').select('*').eq('kd_rup', RUP);
```

**Kejadian nyata 18 Agustus 2026:** paket `64619620` tampil BELUM REALISASI. Ternyata tabel `non_tender_selesai` **kosong 0 baris** — datanya tidak pernah masuk. Setelah 49 baris diimpor: paket itu jadi `COMPLETED` (Rp79.646.692,04, CV.Limas Jaya), dan dashboard PL melonjak dari 22 → 67 paket sudah realisasi (Rp768 juta → Rp6,18 miliar). Pelajarannya: satu tabel sumber yang kosong bisa menyembunyikan ratusan realisasi tanpa error apa pun.

Catatan lain: `nilai_kontrak` sering kosong di data non-tender; view sudah jatuh ke `nilai_negosiasi` lewat `NULLIF`. Jangan "memperbaiki" file sumber untuk ini.

---

## 9. Jebakan yang mudah bikin salah

- **`database.types.ts` ber-line-ending CRLF.** Parser apa pun yang membacanya harus strip `\r` dulu. Kalau di-regenerate lewat redirect shell, seluruh file akan tampak berubah di git padahal isinya sama — itu normal.
- **Angka desimal koma.** Ekspor CSV lama pakai `79646692,04`; JSON baru pakai `79646692.04`. View sudah `REPLACE(x, ',', '.')`, jadi keduanya aman. Jangan mengubah nilainya di file.
- **Kolom TEXT berisi angka.** Banyak tabel dibuat dengan semua kolom TEXT (lihat `sql/migrations/11–14`). Jangan "merapikan" jadi numeric tanpa memeriksa seluruh view yang meng-cast-nya.
- **Jangan pakai Table Editor Supabase untuk file besar.** Importer-nya jalan di browser dan sering berhenti separuh jalan pada file belasan MB (`paket-penyedia-terumumkan` ±16 MB), tanpa backup dan tanpa verifikasi.
- **`data/backup/` di-gitignore.** Isinya data produksi — jangan pernah di-commit.
- **Migration bersifat historis.** File `sql/migrations/*.sql` mencatat niat saat itu, bukan kondisi live. Contoh: `12_table_non_tender_selesai.sql` menyalakan RLS SELECT-only, padahal di database sekarang anon tetap bisa menulis. **Selalu verifikasi ke DB**, jangan menyimpulkan dari file SQL.

---

## 10. Status terakhir (19 Agustus 2026)

- Migration 67 **sudah dijalankan** di Supabase SQL Editor.
- `--dry-run --all` pagi ini lolos 10/10 dengan selisih 0 — tapi begitu file sumber ditarik ulang (mis. `data_afirmasi_pdn_perencanaan` dapat CSV baru jam 01:56), selisihnya muncul lagi. `--all` **sudah dijalankan** dan sukses 10/10 `[OK]`: `api_paket_penyedia_terumumkan` 7.691→7.690, `history_kaji_ulang` 6.374→6.393, `paket_anggaran_penyedia` 7.704→7.703, `non_tender_selesai` 49→50, sisanya tidak berubah. Semua ter-backup ke `data/backup/` sebelum ditulis.
- Pelajaran: jangan asumsikan "tadi pagi 0 selisih" masih berlaku kalau ada jeda waktu — sumbernya bisa ditarik ulang otomatis kapan saja. Selalu `--dry-run --all` dulu tepat sebelum `--all`, jangan mengandalkan dry-run lama.

Kalau ada tarikan data baru: taruh file JSON/CSV terbaru di folder tabel terkait di `data/data_update/`, lalu ulangi prosedur bagian 5:

```powershell
node scripts/update_from_data_update.mjs --dry-run --all
node scripts/update_from_data_update.mjs --all
```

Status sebelumnya (18 Agustus 2026, untuk riwayat): `non_tender_selesai` baru diimpor 0 → 49 baris; 9 tabel lain saat itu belum dijalankan karena `pencatatan_non_tender_realisasi` menunggu migration 67.
