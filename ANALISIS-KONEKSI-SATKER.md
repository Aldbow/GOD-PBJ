# Analisis Koneksi Nama Satuan Kerja ↔ `KODE SATKER_str` ↔ `master_data`

**Tanggal:** 24 Juli 2026
**Pertanyaan:** Apakah nama satuan kerja yang tertampil saat ini dikoneksikan lewat `kd_satker_str` yang dicocokkan ke tabel `master_data`?

## Jawaban Singkat

**Sebagian YA, sebagian TIDAK.** Sistem memakai **dua strategi pencocokan yang berbeda dan tidak konsisten**:

1. **Data transaksional SIRUP** (Penyedia, Swakelola, E-Purchasing, Tender, PL, PnL) → dicocokkan lewat **`kd_satker_str` (kode)**. ✅ ⚠️
2. **Data Afirmasi/ITKP** (`data_afirmasi_pdn_perencanaan`) dan **fallback eselon1** → dicocokkan lewat **NAMA satker (teks)**, bukan kode. ❌ (tidak ada kolom kode di sumbernya)

Karena itu, jawaban atas pertanyaan: nama satker yang tampil **memang berbasis join `kd_satker_str` → `KODE SATKER_str`**, **tetapi ada tiga celah** yang membuat sebagian nama TIDAK berasal dari `master_data` (jatuh ke nama mentah SIRUP atau bucket "Tidak Diketahui").

---

## 1. Bagaimana Nama Satker Terhubung Saat Ini

### 1.1 Kunci join utama (berbasis KODE) — benar tapi *exact match*

Di [join_paket_penyedia_master_data.sql](sql/join_paket_penyedia_master_data.sql) dan [join_paket_swakelola_master_data.sql](sql/join_paket_swakelola_master_data.sql):

```sql
LEFT JOIN master_data m
  ON p.kd_satker_str::text = m."KODE SATKER_str"
```

- Ini **exact string match** pada kode — **tanpa `LTRIM`**.
- Menghasilkan kolom `"SATUAN KERJA"`, `"UNIT KERJA"` (eselon1), `KPA`, `WILAYAH` yang dipakai dashboard.

### 1.2 Nama yang ditampilkan = COALESCE bertingkat

Semua view dashboard menampilkan satker dengan pola:

```sql
COALESCE(m."SATUAN KERJA", nama_satker_SIRUP, 'Satker/Tidak Diketahui') AS satker
```

Jadi nama master hanya menang bila join berhasil; jika gagal → **fallback ke nama SIRUP mentah** (yang sering ter-*masking*/disensor).

---

## 2. Tiga Celah yang Ditemukan

### ⚠️ Celah 1 — Nama `"SATUAN KERJA"` master dikunci oleh kecocokan PPK, bukan hanya kode satker

Perhatikan di kedua file join, kolom `"SATUAN KERJA"` **dibungkus `CASE`**:

```sql
CASE WHEN p.nama_ppk = m."KODE PPK" THEN m."SATUAN KERJA" END AS "SATUAN KERJA"
```

**Konsekuensi:** meskipun `kd_satker_str` **cocok**, kalau `nama_ppk` (SIRUP) ≠ `KODE PPK` (master), maka `"SATUAN KERJA"` menjadi **NULL** → dashboard fallback ke **`nama_satker` SIRUP** (ter-masking).
→ Artinya nama satker yang tampil **belum tentu** nama resmi dari master, walaupun kodenya cocok. Ini keputusan desain sengaja (level-PPK vs level-satker), tapi berdampak pada tampilan nama.

> **Catatan:** `UNIT KERJA` / eselon1 dan `KPA` **tidak** dibungkus CASE ini (level-satker), jadi eselon1 tetap benar selama kode cocok.

### ⚠️ Celah 2 — Inkonsistensi *leading zero* antara join utama dan fallback eselon1

- Join utama (§1.1): `p.kd_satker_str = m."KODE SATKER_str"` — **exact, tanpa LTRIM**.
- Fallback eselon1 di [create_view_dashboard_tender.sql](sql/create_view_dashboard_tender.sql), [lock_pagu_to_masterdata.sql](sql/lock_pagu_to_masterdata.sql):
  ```sql
  WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(CAST(pl.kd_satker_str AS text), '0')
  ```
  → **memakai LTRIM** (perbaikan bug "Bandung Barat dsb", commit `582bf1c`/`6026e76`).

**Konsekuensi:** untuk satker yang kodenya beda hanya di angka nol depan (mis. `05099` vs `5099`):
- eselon1 **berhasil** (karena LTRIM di fallback),
- tetapi **`"SATUAN KERJA"`, `KPA`, `WILAYAH` gagal** (join utama tidak LTRIM) → nama tampil dari SIRUP mentah.

→ **Perbaikan leading-zero belum diterapkan ke join utama** — baru sebagian.

### ❌ Celah 3 — Data Afirmasi/ITKP tidak punya kode, dicocokkan by NAMA

`data_afirmasi_pdn_perencanaan` (sumber Indikator A ITKP & keterisian SIRUP eselon1) **tidak memiliki `kd_satker_str`**. Pencocokan dilakukan **murni by nama** di:

- [create_view_afirmasi_eselon1.sql](sql/create_view_afirmasi_eselon1.sql):
  ```sql
  WHERE UPPER(TRIM(m."SATUAN KERJA")) = UPPER(TRIM(d.nama_satuan_kerja))
     OR UPPER(TRIM(m."SATKER"))       = UPPER(TRIM(d.nama_satuan_kerja))
     OR UPPER(TRIM(m."KPA"))          = UPPER(TRIM(d.nama_satuan_kerja))
  ```
- [src/lib/itkp/crosswalk.ts](src/lib/itkp/crosswalk.ts) `resolveEselon1()` — meniru logika di atas di sisi JavaScript.
- Fallback eselon1 di E-Purchasing & Swakelola juga **by nama**: `UPPER(v."SATUAN KERJA") = UPPER(e.nama_satker)`.

**Konsekuensi:** rawan mismatch teks (ejaan/format beda). Yang tidak cocok masuk bucket **`'Anomali / Eselon I Tidak Diketahui'`** atau **`unidentifiedValue`** ([src/lib/itkp/fetchA.ts:136-149](src/lib/itkp/fetchA.ts#L136-L149)). Di ITKP bahkan ada *bridging* tambahan lewat `master_data.KPA` (`resolveAfirmasiUnit`) karena granularitas berbeda (~83 unit realisasi vs ~44 unit afirmasi).

Sudah tersedia skrip audit: [scripts/check_unmatched_satker_eselon1.js](scripts/check_unmatched_satker_eselon1.js) yang menghitung berapa satker afirmasi gagal cocok ke master.

---

## 3. Ringkasan per Modul

| Modul | Dasar pencocokan nama satker | Via `master_data`? | Catatan |
|-------|------------------------------|:---:|---------|
| Penyedia (base view) | `kd_satker_str` = `KODE SATKER_str` (exact) | ✅ | Nama master hanya jika PPK juga match (Celah 1) |
| Swakelola (base view) | `kd_satker_str` = `KODE SATKER_str` (exact) | ✅ | idem Celah 1 |
| Tender | via base view penyedia + fallback eselon1 LTRIM | ✅ | Celah 2 (leading zero) |
| Pengadaan/Penunjukan Langsung | via base view + fallback eselon1 LTRIM | ✅ | Celah 2 |
| E-Purchasing | base view + fallback eselon1 **by nama** | ⚠️ | Celah 2 & 3 |
| ITKP / Afirmasi | **by nama** (tak ada kode di sumber) | ❌ (nama) | Celah 3, ada bridging via KPA |

---

## 4. Rekomendasi

1. **Samakan join utama dengan fallback** — terapkan `LTRIM(..., '0')` (atau normalisasi kode ke panjang tetap) pada join di `join_paket_penyedia_master_data.sql` & `join_paket_swakelola_master_data.sql`, agar nama/KPA/WILAYAH tidak tertinggal saat eselon1 sudah benar (menutup **Celah 2**).
2. **Verifikasi dampak Celah 1** — konfirmasi apakah menampilkan nama SIRUP mentah saat PPK tak cocok memang diinginkan; bila tidak, pisahkan nama satker (level-satker) dari gating PPK sehingga `"SATUAN KERJA"` ikut terisi selama kode satker cocok.
3. **Tambah kolom kode ke sumber afirmasi** — bila memungkinkan, sertakan `kd_satker_str` di `data_afirmasi_pdn_perencanaan` agar ITKP bisa join by kode (menghilangkan ketergantungan pencocokan teks — **Celah 3**).
4. **Jalankan skrip audit secara berkala** — `node scripts/check_unmatched_satker_eselon1.js` untuk memantau jumlah satker anomali, dan tambahkan panel "Tidak Teridentifikasi" yang sudah dihitung di `fetchA.ts` ke UI sebagai indikator kualitas data.

---

## 5. Verifikasi yang Disarankan (SQL)

```sql
-- (a) Paket yang GAGAL dapat nama master walau punya kd_satker_str
SELECT COUNT(*) FROM view_paket_penyedia_master_data
WHERE kd_satker_str IS NOT NULL AND "SATUAN KERJA" IS NULL;

-- (b) Cek kandidat leading-zero (cocok via LTRIM tapi gagal exact)
SELECT DISTINCT p.kd_satker_str, m."KODE SATKER_str"
FROM api_paket_penyedia_terumumkan p
JOIN master_data m
  ON LTRIM(p.kd_satker_str::text,'0') = LTRIM(m."KODE SATKER_str",'0')
 AND p.kd_satker_str::text <> m."KODE SATKER_str";

-- (c) Satker afirmasi yang tidak ketemu di master (Celah 3)
SELECT d.nama_satuan_kerja
FROM data_afirmasi_pdn_perencanaan d
LEFT JOIN master_data m
  ON UPPER(TRIM(m."SATUAN KERJA")) = UPPER(TRIM(d.nama_satuan_kerja))
  OR UPPER(TRIM(m."SATKER"))       = UPPER(TRIM(d.nama_satuan_kerja))
  OR UPPER(TRIM(m."KPA"))          = UPPER(TRIM(d.nama_satuan_kerja))
WHERE m."NO" IS NULL;
```
