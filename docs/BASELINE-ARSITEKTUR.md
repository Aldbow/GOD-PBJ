# GOD-PBJ (DEWA-PBJ) — Baseline Arsitektur & Pemahaman Project

**Disusun:** 26 Juli 2026
**Branch acuan:** `rework-pengadaan-v1.2` (commit `413d8a5`)
**Tujuan dokumen:** basis rujukan tunggal untuk pengembangan ke depan — apa yang ada, bagaimana cara kerjanya, konvensi yang harus diikuti, dan di mana lubangnya.

> Dokumen pendamping:
> - [LAPORAN-PERKEMBANGAN.md](../LAPORAN-PERKEMBANGAN.md) — riwayat aktivitas 17–24 Juli 2026
> - [ANALISIS-KONEKSI-SATKER.md](../ANALISIS-KONEKSI-SATKER.md) — audit join satker ↔ master_data
> - [sql/MIGRASI-RUNBOOK.md](../sql/MIGRASI-RUNBOOK.md) + [sql/migrations/README.md](../sql/migrations/README.md) — urutan build database
> - [docs/laporan-ai-kurasi.md](laporan-ai-kurasi.md) — analisis fitur AI Kurasi & perbandingan model

---

## 1. Apa Ini

Dashboard monitoring **Pengadaan Barang/Jasa (PBJ)** untuk **UKPBJ Kementerian Ketenagakerjaan**. Branding produk: **DEWA-PBJ — "Early warning pengadaan"**.

Fungsinya membaca data mentah ekosistem pengadaan pemerintah (SIRUP, SPSE/INAPROC, e-Katalog) yang sudah di-ETL ke Supabase, lalu menyajikan:

1. **Ringkasan eksekutif** — pagu vs realisasi seluruh kementerian, komposisi metode, anomali.
2. **Perencanaan** — keterisian RUP per Eselon I / satker, tampilan per PPK.
3. **Realisasi per metode** — 5 modul: E-Purchasing, Tender, Pengadaan Langsung, Penunjukan Langsung, Swakelola.
4. **Penilaian ITKP** — Indeks Tata Kelola Pengadaan (Komponen A–D) per satker & agregat kementerian.
5. **AI Kurasi** — validasi otomatis kesesuaian metode pemilihan terhadap pagu & jenis pengadaan.
6. **Deteksi anomali** — realisasi tanpa RUP terumumkan, realisasi melampaui pagu.

Sifatnya **read-heavy / analitik**: aplikasi hampir tidak menulis data transaksional. Satu-satunya tulisan adalah hasil AI Kurasi ke tabel `ai_kurasi_paket`.

---

## 2. Stack & Versi

| Lapis | Teknologi | Catatan penting |
|---|---|---|
| Framework | **Next.js 16.2.9** (App Router) | ⚠️ Bukan Next.js yang umum diketahui — API & konvensi berbeda. Baca `node_modules/next/dist/docs/` sebelum menulis kode (lihat [AGENTS.md](../AGENTS.md)) |
| UI | **React 19.2.4** | Server Components + `"use client"` per komponen interaktif |
| Bahasa | TypeScript 5, `strict: true` | Build Vercel pernah gagal karena strict — jaga tipe |
| Styling | **Tailwind 4** (`@tailwindcss/postcss`) + **CSS Modules** | Praktik dominan: CSS Modules + design token CSS variables. Tailwind praktis hanya di-`@import` |
| Data | **Supabase** (`@supabase/supabase-js` 2.108, `@supabase/ssr` 0.12) | PostgREST + Auth + RPC |
| Chart | **Chart.js 4** + `react-chartjs-2` | |
| Animasi | **framer-motion 12** | |
| Ikon | **lucide-react** | |
| AI | **@google/genai 2.13** (Gemini) | Model dari env `GEMINI_MODEL`, default `gemini-3.5-flash` |
| Export | `exceljs`, `jspdf` + `jspdf-autotable`, `file-saver` | XLSX / PDF / CSV |
| Validasi | **zod 4** | Login form + schema respons AI |
| State | `zustand` 5 terpasang tapi **belum dipakai** | State lokal `useState` + URL query params |

Env yang dibutuhkan (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=          # opsional, default gemini-3.5-flash
```

Perintah: `npm run dev` · `npm run build` · `npm start` · `npm run lint`.

---

## 3. Struktur Direktori & Konvensi

```
src/
  app/
    (app)/            ← rute terproteksi (butuh sesi). layout memanggil getProfile()
      page.tsx                    → Ringkasan
      ppk/ rencana-pengadaan/
      epurchasing/ tender/ pengadaan-langsung/ penunjukan-langsung/ swakelola/
      itkp/ itkp/pemanfaatan-sistem/
    (auth)/login/     ← rute publik
    api/              ← Route Handlers: /api/paket, /api/ppk, /api/kurasi
    layout.tsx        ← root: font Inter + IBM Plex Mono, data-theme="light"
    globals.css       ← SELURUH design token
  components/
    layout/           Shell · Sidebar · Topbar · CommandPalette · ThemeToggle · PageTransition
    paket/            komponen bersama modul realisasi (PaketTable, OrgFilterBar, AnomaliPanel, …)
    ui/               primitif (Badge, Button, Card, Modal, StatCard, ExportDataModal, …)
    auth/             AuthInput, SessionProvider
  features/<modul>/
    components/       view utama modul
    lib/              logika khusus modul (baru dipakai oleh `ringkasan`)
  hooks/              useOrgFilters
  lib/
    auth/             access.ts (peta RBAC) · actions.ts (server action) · dal.ts (guard server)
    itkp/             calcA · calcBCD · crosswalk · dummyBCD · fetchA · itkpModel
    paket/            rupHistory.ts
    supabase/         client.ts (browser) · server.ts (cookies)
    supabase.ts       re-export `supabase` browser client (dipakai feature views)
    anomali.ts · format.ts · nav.ts · utils/exportUtils.ts
  proxy.ts            ← Next 16 Proxy (pengganti middleware)
  types/index.ts
sql/                  script historis + MIGRASI-RUNBOOK.md
sql/migrations/       subset FINAL, dinomori 00→61 (jalur turnkey)
sql/rbac/             001_schema.sql · 002_seed.sql
scripts/              ±40 skrip diagnostik Node (ad-hoc, tidak dipakai runtime)
data/csv · data/xlsx · data/origin   sumber data mentah untuk import
```

### Konvensi yang berlaku

1. **Page = shell tipis.** `page.tsx` hanya set `metadata`, membungkus `<PageTransition>` + `<Suspense>`, lalu merender satu komponen dari `features/`. Tidak ada logika di page.
2. **`<Suspense>` wajib** membungkus view yang memakai `useSearchParams()` (yaitu semua modul yang pakai `useOrgFilters`) — tanpa ini build Vercel gagal saat prerender.
3. **Satu view = satu `*.module.css`**, kecuali 5 modul realisasi yang berbagi `components/paket/paketView.module.css`.
4. **Warna & spasi selalu lewat CSS variable** dari `globals.css`, jangan hardcode hex di komponen.
5. **Komentar kode berbahasa Indonesia** dan menjelaskan *kenapa* (sering menyebut nomor kasus/kd_rup nyata). Pertahankan gaya ini.
6. **Format angka hanya lewat `lib/format.ts`** (`fmtRupiah`, `fmtRupiahDetail`, `fmtDec`, `fmtPct`, `fmtInt`, `countRup`) — jangan tulis formatter lokal.
7. **Navigasi punya satu sumber kebenaran**: `lib/nav.ts` (`NAV_GROUPS`) dipakai Sidebar, breadcrumb Topbar, dan CommandPalette sekaligus.

---

## 4. Autentikasi & RBAC

### Tiga role

| Role | Label | Akses route (`ROUTE_ACCESS`) | Landing |
|---|---|---|---|
| `admin` | Administrator (UKPBJ) | `*` — semua | `/` |
| `sekjend` | Sekretariat Jenderal | `/`, `/rencana-pengadaan`, `/itkp` | `/` |
| `ppk` | PPK | `/ppk`, 5 modul realisasi, `/rencana-pengadaan` | `/ppk` |

Peta ini **satu sumber kebenaran** di [src/lib/auth/access.ts](../src/lib/auth/access.ts) dan dipakai oleh keempat lapis di bawah.

### Empat lapis penegakan

1. **`src/proxy.ts`** — Next 16 Proxy (pengganti middleware, jalan di Node runtime). Refresh cookie sesi Supabase (pola resmi `@supabase/ssr`), lalu gate optimistik: belum login → `/login`; sudah login buka `/login` → landing; role tak berhak → landing. Matcher mengecualikan `api`, aset statis, gambar.
2. **`(app)/layout.tsx`** — `await getProfile()`. Kalau tak ada sesi valid / akun nonaktif → `redirect('/login')`. Profil disebar ke client lewat `SessionProvider`.
3. **`src/lib/auth/dal.ts`** — DAL server-only, memoized `cache()`: `verifySession`, `getProfile`, `requireAccess(path)`, `requireRole(...)`, dan `getApiProfile()` (versi non-redirect untuk Route Handlers).
4. **Route Handlers** — `/api/paket` & `/api/ppk` memanggil `getApiProfile()`, balas 401 jika null, lalu **scoping data**: role `ppk` dipaksa `.eq('nama_ppk', profile.ppk_name)`; pada `/api/ppk?id=`, `id` yang diminta **diabaikan** dan diganti `ppk_name` sendiri (cegah mengintip PPK lain).

Di sisi UI: `Sidebar` memfilter `NAV_GROUPS` dengan `canAccess(role, href)`; `useOrgFilters` mengunci filter Eselon/Satker/PPK untuk role `ppk`.

### Database

[sql/rbac/001_schema.sql](../sql/rbac/001_schema.sql) membuat enum `app_role`, tabel `public.profiles` (1:1 `auth.users`), trigger auto-provision `handle_new_user()` dari `raw_user_meta_data`, helper `is_admin()` (SECURITY DEFINER, anti-rekursi RLS), dan RLS: user baca profilnya sendiri, admin baca semua, hanya admin yang menulis.

`profiles.ppk_name` = **foreign key logis berbasis string** ke kolom `nama_ppk` di `view_dashboard_gabungan_satker`. Constraint `ppk_needs_scope` memastikan role `ppk` selalu punya `ppk_name`.

> ⚠️ **Batas keamanan saat ini:** data pengadaan dibaca **langsung dari browser dengan anon key** ke view Supabase; scoping PPK ditegakkan **di layer aplikasi**, bukan RLS. Artinya siapa pun yang punya anon key bisa membaca seluruh view lewat PostgREST. Rencana pengerasan (security_invoker, cabut grant anon, RLS data-level) sudah ditulis sebagai komentar di akhir `001_schema.sql` — **belum dijalankan**.

---

## 5. Model Data (Supabase)

### 5.1 Aliran data

```
CSV/XLSX mentah (SIRUP, INAPROC, e-Katalog, master internal)
        ↓ import manual (Supabase Table Editor)
Tabel sumber
        ↓ view_rup_final (rantai kaji ulang RUP: rup lama → rup final)
View base master-data  (view_paket_penyedia_master_data / _swakelola_)
        ↓ join per metode + agregasi realisasi
5 view dashboard realisasi  +  view afirmasi eselon1
        ↓ UNION ALL
view_dashboard_gabungan_satker   ← dipakai Ringkasan, /api/paket, /api/ppk
```

### 5.2 Tabel sumber

| Tabel | Isi | DDL |
|---|---|---|
| `master_data` | master satker/PPK internal: `KODE SATKER_str`, `SATUAN KERJA`, `SATKER`, `KPA`, `UNIT KERJA` (eselon1), `WILAYAH`, `KODE PPK`, `NAMA PPK` | `10_table_master_data.sql` |
| `api_paket_penyedia_terumumkan` | RUP penyedia dari SIRUP | ⚠️ lahir dari import CSV, tak ada DDL |
| `api_paket_swakelola_terumumkan` | RUP swakelola dari SIRUP | ⚠️ idem |
| `paket_e_purchasing` | transaksi e-Katalog (granular per `order_id`) | `11_…` |
| `non_tender_selesai` | realisasi non-tender transaksional (PL, PnL, Dikecualikan) | `12_…` |
| `api_pencatatan_swakelola` | pencatatan realisasi swakelola | `13_…` |
| `paket_anggaran_penyedia` / `paket_anggaran_swakelola` / `tender_selesai_nilai` | pagu multi-tahun & nilai tender selesai | `14_…` |
| `data_afirmasi_pdn_perencanaan` | sumber **Indikator A ITKP** (belanja PBJ, total RUP, rencana per metode) per unit | `15_…` |
| `history_kaji_ulang` | pemetaan `kd_rup_lama → kd_rup_baru` | `16_…` |
| `satker_kode_alias` | crosswalk kode satker berbeda (mis. 450922→450938) | `17_…` |
| `ai_kurasi_paket` | hasil AI Kurasi (`kd_rup` PK, status/catatan/rekomendasi) | `18_…` |
| `pencatatan_non_tender_realisasi` | realisasi non-tender non-transaksional | ❌ **TIDAK ADA DDL & tidak masuk checklist import** — lihat §11 |
| `profiles` | RBAC | `00_rbac_schema.sql` |

### 5.3 View & fungsi

| Objek | Peran | File final |
|---|---|---|
| `view_rup_final` + fungsi `get_rup_history(target_rup)` | resolusi rantai kaji ulang RUP; RPC riwayat untuk timeline modal | `31_view_rup_final.sql` |
| `view_paket_penyedia_master_data` | RUP penyedia + kolom master + kolom kurasi. `DISTINCT ON (kd_rup)` | `30_view_base_master_data.sql` |
| `view_paket_swakelola_master_data` | idem untuk swakelola | `30_…` |
| `view_dashboard_tender` | Tender/Seleksi/Tender Cepat/Kontrak Tahun Jamak | `40_…` |
| `view_dashboard_pengadaan_langsung` | PL + Dikecualikan; memisah `total_pencatatan` vs `total_transaksional` | `43_…` |
| `view_dashboard_penunjukan_langsung` | PnL; idem | `42_…` |
| `view_dashboard_swakelola_v1` | swakelola | `42_…` |
| `view_dashboard_epurchasing_v6` | e-Purchasing, FULL OUTER JOIN master × transaksi ter-agregasi per RUP | `44_…` |
| `view_dashboard_gabungan_satker` | UNION ALL 5 view di atas, kolom seragam | `41_…` |
| `view_dashboard_keterisian_sirup_eselon1` | agregat afirmasi per Eselon I | `50_…` |

Kolom kanonik view dashboard: `kd_rup, rup_name, pagu, total, status, nama_ppk, status_aktif_rup, satker, eselon1, metode_pengadaan, status_kurasi, catatan_kurasi, rekomendasi_kurasi, is_from_sirup` (+ `is_multiple_rup`, `kode_penyedia`, `order_id`, `total_pencatatan/total_transaksional` di sebagian view).

### 5.4 Keputusan desain penting (jangan dibalik tanpa sadar)

1. **Join satker pakai `LTRIM(kode, '0')` di kedua sisi.** SIRUP menyimpan sebagian `kd_satker_str` dengan nol depan (`021212`), master tidak (`21212`). Wajib ada functional index `61_index_ltrim_satker.sql`, kalau tidak akan full-scan.
2. **Pagu dikunci ke masterdata** (`lock_pagu_to_masterdata.sql`). Paket tanpa RUP terumumkan berpagu **0** — pagu tidak pernah diambil dari tabel realisasi. Ini yang membuat anomali "realisasi tanpa RUP" bisa dibedakan dari "realisasi > pagu".
3. **`is_from_sirup`** = `true` bila baris punya pasangan RUP terumumkan di master. Basis seluruh deteksi anomali.
4. **`metode_pengadaan` PL fallback ke realisasi** (`COALESCE(pl.metode_pengadaan, t.mtd_pemilihan, 'Tidak Diketahui')`) — hanya aktif untuk paket anomali, karena CTE transaksional sudah difilter ke PL/Dikecualikan.
5. **Paket yang kd_rup-nya sudah di-kaji-ulang dikeluarkan** (`WHERE kd_rup NOT IN (SELECT kd_rup_lama FROM history_kaji_ulang WHERE lama <> baru)`) agar tidak dobel.
6. **Semua patch view memakai `CREATE OR REPLACE` dengan kolom output identik** supaya view dependen (`view_dashboard_gabungan_satker`) tetap valid. Menambah kolom **wajib di akhir**.
7. **`kd_rup` bisa gabungan** `"62660189;62660191"` untuk satu realisasi multi-RUP → makanya ada `countRup()` dan `is_multiple_rup`.
8. **`"SATUAN KERJA"` di view base di-*gate* oleh kecocokan PPK** (`CASE WHEN p.nama_ppk = m."KODE PPK"`), sedangkan `UNIT KERJA`/`KPA`/`WILAYAH` tidak. Ini sengaja (level-PPK vs level-satker) tapi jadi sumber Celah 1 di [ANALISIS-KONEKSI-SATKER.md](../ANALISIS-KONEKSI-SATKER.md).

---

## 6. Pola Pengambilan Data di Aplikasi

Ada **dua jalur**, dan keduanya hidup berdampingan:

**A. Langsung dari browser ke Supabase** (mayoritas — 5 modul realisasi, Ringkasan, RUP, ITKP):

```ts
// Pola paginasi WAJIB: PostgREST membatasi 1000 baris/response,
// sedangkan view granular per-paket jauh lebih besar dari itu.
let all: T[] = []; let offset = 0; const limit = 1000;
while (true) {
  const { data, error } = await supabase.from(view).select('*').range(offset, offset + limit - 1);
  if (error) throw error;
  if (!data || data.length === 0) break;
  all = all.concat(data);
  if (data.length < limit) break;
  offset += limit;
}
```

Implementasi pola ini ada minimal di 8 tempat (tiap view modul, `fetchGabunganRows`, `fetchAll` di `itkp/fetchA.ts`, loop roster di `/api/ppk`). **Konsekuensi:** seluruh dataset ditarik ke memori browser, semua filter/sort/agregasi dilakukan client-side dengan `useMemo`.

**B. Lewat Route Handler** (`/api/paket`, `/api/ppk`) — dipakai halaman `ppk` dan `PaketDetail`. Jalur ini yang punya auth + scoping server-side.

---

## 7. Peta Modul

### 7.1 Ringkasan (`/`) — `features/ringkasan`

Satu-satunya modul dengan **pemisahan logika bersih**: seluruh perhitungan ada di [ringkasanData.ts](../src/features/ringkasan/lib/ringkasanData.ts) sebagai fungsi murni (`fetchGabunganRows`, `filterRows`, `aggregate`, `listSatker`, `listPpk`) — mudah diuji dan jadi **template untuk refactor modul lain**.

Sumber: `view_dashboard_gabungan_satker`. Menghasilkan `RingkasanAggregate` = KPI + agregat per metode + rekap kurasi + rekap & daftar anomali. Komponen: `KpiCards`, `MetodeDonutChart`, `MetodeBarChart`, `ItkpGauge`, `KurasiAkurasi`, `AnomaliPanel`, `AnomaliTable`. Filter: Satker + PPK (dependent).

### 7.2 Lima modul Realisasi

Struktur nyaris identik (~500–600 baris/view). Bagian bersama: `useOrgFilters` → `OrgFilterBar` → `MetricGrid` → `AnomaliPanel` → `DualProgressBar` → panel Filter Lanjutan → `PaketTable` → `PaketDetailModal` + `ExportDataModal`.

| Modul | View sumber | Kekhususan |
|---|---|---|
| E-Purchasing | `view_dashboard_epurchasing_v6` | **Dedupe per `kd_rup` di client** — satu RUP bisa banyak `order_id`, kalau tidak digabung jumlah paket & realisasi dobel |
| Tender | `view_dashboard_tender` | Filter metode 4 opsi; `contextPagu` & jumlah paket **tidak** di-gate `is_from_sirup` |
| Pengadaan Langsung | `view_dashboard_pengadaan_langsung` | `contextPagu` & jumlah paket **di-gate** `is_from_sirup !== false`; ada `total_pencatatan` vs `total_transaksional` |
| Penunjukan Langsung | `view_dashboard_penunjukan_langsung` | idem PL |
| Swakelola | `view_dashboard_swakelola_v1` | tipe swakelola |

> ⚠️ **Inkonsistensi yang diketahui & disengaja (didokumentasikan di kode):** Tender & E-Purchasing tidak menggating metrik dengan `is_from_sirup`, PL & PnL menggating. Artinya angka "Total Anggaran" antar modul tidak dihitung dengan aturan yang sama. Kalau di masa depan ini diseragamkan, angka di dashboard **akan berubah** — perlu keputusan eksplisit.

### 7.3 Perencanaan

- **`/rencana-pengadaan`** — keterisian RUP. Dua mode: `eselon1` → `view_dashboard_keterisian_sirup_eselon1`; `satker` → `data_afirmasi_pdn_perencanaan`. Donut Chart.js + tabel paginasi 10/halaman + export.
- **`/ppk`** — roster PPK & paket per PPK, satu-satunya modul yang murni lewat `/api/ppk`. Ada `MetodePengadaanChart`.

### 7.4 ITKP (`/itkp`, `/itkp/pemanfaatan-sistem`)

Modul dengan logika paling padat, seluruhnya di `src/lib/itkp/`:

- **`itkpModel.ts`** — predikat resmi 2026–2029 (`AA` 90–100 … `D` <30), `buildComponents()` yang membentuk 4 komponen dengan bobot **A=30, B=30, C=30, D=10**.
- **`calcA.ts`** — 7 indikator Komponen A (Pemanfaatan Sistem) dengan tabel *band* skor eksplisit per indikator; menangani "penyebut = 0" → `applicable: false` dan dikeluarkan dari skor maksimum saat ini. Juga `buildAnalysisA()` yang menghasilkan narasi risiko + rekomendasi per indikator.
- **`fetchA.ts`** — merakit `ItkpAInput` per unit: sisi **rencana** dari `data_afirmasi_pdn_perencanaan`, sisi **realisasi** didistribusikan dari 5 view dashboard.
- **`crosswalk.ts`** — jembatan granularitas: view realisasi mencatat satker level biro/direktorat (~83 unit), sumber afirmasi hanya ~44 unit setingkat KPA/Ditjen. Bridging lewat `master_data.KPA` + `fuzzyContains`. Yang gagal cocok masuk `unidentifiedValue`/`unidentifiedRows`.
- **`calcBCD.ts`** — skor kualitatif B/C/D dari pilihan kondisi (formasi SDM, penugasan, renaksi, kematangan UKPBJ, nilai SPI). Menyimpan catatan bahwa **tabel Kepka 74/2026 sendiri inkonsisten** (≥90% → 11, sedangkan 80–<90% → 15) dan mengikutinya apa adanya.
- **`dummyBCD.ts`** — ⚠️ **B/C/D masih nilai tetap hard-coded** yang sama untuk semua unit. Ini utang teknis terbesar modul ITKP.

### 7.5 AI Kurasi (`/api/kurasi` + `KurasiAkurasi`)

Alur: klien POST `/api/kurasi` → ambil ≤**40** paket dengan `status_kurasi IS NULL` (penyedia dulu, habis → swakelola) → kirim ke Gemini dengan `SYSTEM_INSTRUCTION` berisi ambang Perpres 12/2021 → respons JSON terstruktur (`responseSchema` + validasi zod) → `upsert` ke `ai_kurasi_paket` `onConflict: 'kd_rup'` → frontend jeda 5 detik dan ulangi sampai habis.

Penanganan kasus batas yang sudah ada:
- Batch kecil (40, bukan 100) agar JSON tidak terpotong; error parse memberi pesan "kurangi BATCH_SIZE".
- Rate limit Gemini dideteksi (`RESOURCE_EXHAUSTED` / `"code":429`) → diteruskan sebagai **HTTP 429** + `retryAfterSeconds` supaya klien menunggu, bukan berhenti.
- Kalau AI mengembalikan hasil tapi **nol** baris berhasil disimpan → balas 500 agar loop tidak berputar tanpa henti pada batch yang sama.
- Prompt secara eksplisit melarang menebak: data kode akun tidak tersedia → jangan dinilai; Penunjukan Langsung & Swakelola default "Belum Dikurasi".

> ⚠️ Route `/api/kurasi` **tidak memanggil `getApiProfile()`** — satu-satunya endpoint tanpa auth. Endpoint ini menulis ke DB dan membakar kuota API. Lihat §11.
>
> ⚠️ Route ini juga membuat client Supabase sendiri dengan **anon key** (bukan service role), jadi kemampuan tulisnya bergantung pada grant tabel `ai_kurasi_paket`.

### 7.6 Anomali (`src/lib/anomali.ts`)

Dua jenis, murni turunan data:

| Jenis | Aturan | Nilai yang dilaporkan |
|---|---|---|
| `tanpa_rup` — Realisasi Tanpa RUP | `total > 0 && is_from_sirup === false` | Σ realisasi |
| `lebih_pagu` — Realisasi > Pagu | `!tanpaRup && total > 0 && total > pagu` | Σ (total − pagu) |

Sengaja **tidak dobel-flag**: paket tanpa RUP berpagu 0, jadi cukup ditandai `tanpa_rup`. `summarizeAnomali()` memakai `countRup()` agar hitungan paket konsisten dengan halaman. API: `anomaliOf`, `isAnomali`, `matchesAnomali`, `summarizeAnomali` — dipakai seragam oleh 5 modul realisasi + Ringkasan.

### 7.7 Export (`lib/utils/exportUtils.ts` + `ui/ExportDataModal`)

Tiga format: **XLSX** (ExcelJS — header freeze, `numFmt` per tipe kolom, border, wrap), **CSV** (delimiter `;` untuk Excel Indonesia), **PDF** (jsPDF autoTable, landscape otomatis bila >6 kolom). Tiap modul mendefinisikan `exportColumns` + `mapForExport`, dan menyediakan dua dataset: **semua** (`baseData`) vs **terfilter** (`sortedPackages`). Sejak commit `979ca64`, catatan & rekomendasi kurasi disertakan di semua export.

---

## 8. Filter & Sinkronisasi URL

[`useOrgFilters`](../src/hooks/useOrgFilters.ts) adalah kontrak filter utama seluruh modul realisasi:

- Query params pendek & independen: `e1` (Eselon I), `s` (Satker), `p` (PPK), `q` (pencarian).
- **Cascading tapi tidak wajib berurutan**: set `e1` menghapus `s` & `p`; set `s` menghapus `p`.
- `router.replace` (bukan `push`) supaya tweak filter tidak membanjiri history browser.
- Pencarian di-debounce **300 ms**, dengan state lokal agar input tetap responsif.
- **Role `ppk`**: `eselon1`/`satker` dipaksa `null`, `ppk` dipaksa `ppk_name`, dan semua setter jadi no-op.

Filter tambahan (metode, tipe RUP, status kurasi, anomali, urutan) **tidak** masuk URL — hanya `useState` lokal di tiap view.

---

## 9. Design System

- Semua token di `src/app/globals.css`: brand navy (`--navy-900/700/500`), surface, border, teks 3 tingkat, aksen semantik (teal=baik, amber=perhatian, merah=buruk, info=biru), palet chart, `--shadow-sm/md/lg`, radius `6→24px` + pill, skala spasi `--space-1..12`.
- Tema: `data-theme` di `<html>`, default **light**, `suppressHydrationWarning`, toggle via `ThemeToggle`. Chart menyesuaikan lewat `useIsDark()` di `charts/chartTheme.ts`.
- Font: **Inter** (`--font-inter`) untuk teks, **IBM Plex Mono** (`--font-plex-mono`) untuk angka/kode.
- Sidebar: bisa diciutkan, grup bisa ditutup, keduanya persist ke `localStorage` (`dewa-pbj:sidebar-collapsed`, `dewa-pbj:sidebar-closed-groups`), animasi framer-motion, footer "UKPBJ Kementerian Ketenagakerjaan".
- `Badge` variant mengikuti semantik risiko: `rendah` (hijau) · `sedang` (amber) · `tinggi` (merah) · `default`.

---

## 10. Build Database dari Nol

Ikuti [sql/migrations/README.md](../sql/migrations/README.md) — jalankan `00` → `61` berurutan di Supabase SQL Editor, **berhenti di `25_IMPORT_DATA_CSV.sql`** untuk import CSV manual lewat Table Editor, lanjutkan view & index. Verifikasi akhir:

```bash
node scripts/diag_unknown_satker.mjs   # satker & eselon1 'Tidak Diketahui' harus 0
```

Folder `sql/` (tanpa subfolder) adalah **arsip historis**: berisi versi lama yang sudah *superseded*. Daftar SKIP-nya ada di runbook. Kalau menambah patch view baru: taruh definisi final di `sql/migrations/` dengan nomor berikutnya, dan **update kedua README/runbook**.

View realisasi (`40`–`44`) sengaja dijalankan berlapis: status final tiap view tercapai **kumulatif**, meniru hasil deploy saat ini tanpa menulis ulang definisi.

---

## 11. Utang Teknis & Celah Terbuka

Diurutkan dari yang paling berdampak.

### Keamanan

1. **`/api/kurasi` tanpa autentikasi.** Satu-satunya Route Handler yang tidak memanggil `getApiProfile()`, padahal ia menulis ke DB dan mengonsumsi kuota Gemini. Perbaikan minimal: `getApiProfile()` + batasi ke role `admin`.
2. **Anon key membaca semua view dari browser.** Scoping PPK hanya di layer aplikasi. Rencana pengerasan sudah tertulis di `sql/rbac/001_schema.sql`; belum dieksekusi.
3. **`.env.local` ter-commit? Tidak** — `.gitignore` mencakup `.env*`. Aman, tapi berarti onboarding butuh distribusi kredensial manual.

### Kebenaran data

4. **Celah 1–3 koneksi satker** — lihat [ANALISIS-KONEKSI-SATKER.md](../ANALISIS-KONEKSI-SATKER.md). Ringkasnya: `"SATUAN KERJA"` masih di-gate kecocokan PPK; sumber afirmasi/ITKP tak punya kolom kode sehingga dicocokkan by nama (rawan mismatch teks). `view_dashboard_epurchasing_v6` sudah menambal sebagian lewat fallback berlapis + `satker_kode_alias`, view lain belum.
5. **`pencatatan_non_tender_realisasi` tanpa DDL & tanpa entri import.** Tabel ini di-JOIN oleh view PL & PnL (`40_`, `42_`, `43_`) tapi tidak dibuat oleh migrasi apa pun dan tidak ada di checklist `25_IMPORT_DATA_CSV.sql`. Sumbernya cuma ada sebagai `data/xlsx/pencatatan-non-tender-realisasi_2026.xlsx` (belum ada CSV). **Setup dari nol akan gagal di fase 40** sampai ini dilengkapi.
6. **`api_paket_penyedia_terumumkan` & `api_paket_swakelola_terumumkan` tanpa DDL** — strukturnya bergantung inferensi tipe saat import CSV. Rapuh.
7. **Metrik antar modul realisasi tidak konsisten** soal gating `is_from_sirup` (§7.2).

### Kelengkapan fitur

8. **ITKP B/C/D masih dummy tetap** (`dummyBCD.ts`) — nilai identik untuk semua unit. Perlu tabel sumber (formasi SDM, hasil PKP UKPBJ, nilai SPI per satker).
9. **`unidentifiedValue`/`unidentifiedRows` dari `fetchA.ts` sudah dihitung tapi belum ditampilkan** di UI. Ini indikator kualitas data yang murah untuk dipasang.
10. **Ambang risiko paket hard-coded** di `/api/paket` & `/api/ppk` (pagu >1 M & realisasi 0% → tinggi; <50% & belum selesai → sedang), termasuk teks `alasanRisiko`. Belum ada sumber kebijakan.

### Kebersihan kode

11. **`temp_epurchasing.tsx` (97 KB) di root** — file mati, tidak diimpor. Hapus.
12. **`frontend/`** hanya berisi artefak `.next/dev/types` — sisa struktur lama. Hapus.
13. **`tsconfig.tsbuildinfo` (170 KB) ter-commit** padahal `.gitignore` mencantumkan `*.tsbuildinfo`. Perlu `git rm --cached`.
14. **±40 skrip diagnostik di `scripts/`** tanpa README, banyak yang duplikatif (`check-count.mjs`, `check-count-v2`, `check-count-v3`). Sebagian sudah tidak relevan.
15. **`any` masif** di 5 modul realisasi (`useState<any[]>`, `PaketColumn<any>`). Tidak ada tipe baris per view — padahal `strict: true`.
16. **Duplikasi ±80% antar 5 modul realisasi.** `ringkasanData.ts` sudah menunjukkan pola yang benar; modul realisasi belum mengikuti.
17. **`zustand` terpasang tapi tidak dipakai** — hapus atau pakai.
18. **README.md masih template `create-next-app`** — belum menjelaskan project ini.
19. **Tidak ada test sama sekali** dan tidak ada CI. Fungsi murni yang paling layak diuji sudah ada: `lib/anomali.ts`, `lib/itkp/calcA.ts`, `calcBCD.ts`, `features/ringkasan/lib/ringkasanData.ts`, `lib/auth/access.ts`.

---

## 12. Resep Pengembangan

### Menambah modul realisasi baru

1. Buat view SQL final di `sql/migrations/` (nomor berikutnya), pastikan kolom kanonik §5.3 lengkap termasuk `is_from_sirup` & tiga kolom kurasi.
2. Kalau perlu masuk Ringkasan, tambahkan cabang `UNION ALL` ke `view_dashboard_gabungan_satker` — kolom harus sama urutan & tipe.
3. Buat `src/features/<modul>/components/<Modul>View.tsx`, salin pola dari `TenderView.tsx` (paling representatif), pakai `paketView.module.css` bersama.
4. Buat `src/app/(app)/<modul>/page.tsx`: `metadata` + `<PageTransition>` + **`<Suspense>`**.
5. Daftarkan di `NAV_GROUPS` ([lib/nav.ts](../src/lib/nav.ts)) dan tambahkan path ke `ROUTE_ACCESS` untuk role yang berhak.
6. Update kedua README SQL.

### Menambah role baru

Ubah enum `app_role` di `sql/rbac/001_schema.sql`, tipe `Role` di `src/types/index.ts`, lalu **tiga peta** di `src/lib/auth/access.ts` (`ROUTE_ACCESS`, `LANDING`, `ROLE_LABEL`). Sidebar, proxy, DAL, dan API ikut otomatis. Kalau role itu butuh scoping data, tambahkan cabangnya di `/api/paket`, `/api/ppk`, dan `useOrgFilters`.

### Menambah jenis anomali

Cukup di `src/lib/anomali.ts`: tambah nilai ke `AnomaliJenis`, label ke `ANOMALI_LABEL`, aturan di `anomaliOf()`, bucket di `AnomaliSummary`/`summarizeAnomali()`. Semua konsumen (`AnomaliPanel`, `AnomaliBadge`, `AnomaliTable`, filter di 5 modul) mengikuti otomatis.

### Mengubah view yang sudah dipakai

Selalu `CREATE OR REPLACE` dengan **kolom output identik** (nama, urutan, tipe) supaya `view_dashboard_gabungan_satker` tidak ikut runtuh. Kolom baru **hanya boleh ditambah di akhir**. Tulis header komentar bergaya file yang ada: MASALAH → SOLUSI → CATATAN → VERIFIKASI (query SQL yang bisa dijalankan untuk membuktikan perbaikan).

---

## 13. Prioritas yang Disarankan

**Segera (risiko nyata)**
1. Auth + gating role admin pada `/api/kurasi`.
2. Lengkapi DDL/import `pencatatan_non_tender_realisasi` — tanpa ini jalur setup turnkey belum benar-benar jalan.
3. `git rm --cached tsconfig.tsbuildinfo`, hapus `temp_epurchasing.tsx` & `frontend/`.

**Jangka pendek (kualitas & kepercayaan angka)**
4. Putuskan & seragamkan aturan gating `is_from_sirup` di 5 modul realisasi; catat keputusannya.
5. Tulis tes untuk fungsi murni (`anomali`, `calcA`, `calcBCD`, `ringkasanData`, `access`) + CI `npm run build && npm run lint`.
6. Tampilkan panel "Tidak Teridentifikasi" ITKP dari data yang sudah dihitung.
7. Tulis ulang `README.md`.

**Jangka menengah (fondasi)**
8. Tipe baris per view (`types/views.ts`) untuk menghapus `any` di modul realisasi.
9. Ekstrak logika 5 modul realisasi ke `features/<modul>/lib/` mengikuti pola `ringkasanData.ts`; pertimbangkan satu `useRealisasiModule()`.
10. RLS data-level + `security_invoker` sesuai rencana di `001_schema.sql`.
11. Sambungkan ITKP B/C/D ke data sumber nyata, ganti `dummyBCD.ts`.
12. Pindahkan agregasi berat ke SQL (view/RPC) supaya browser tidak lagi menarik puluhan ribu baris.
