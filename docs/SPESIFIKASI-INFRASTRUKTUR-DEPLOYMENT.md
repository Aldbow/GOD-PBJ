# Spesifikasi Kebutuhan Infrastruktur & Deployment
## DEWA-PBJ (GOD-PBJ) — Digital Early Warning Analytics Pengadaan Barang/Jasa

**Untuk:** UKPBJ & Pusat Data dan Teknologi Informasi, Kementerian Ketenagakerjaan
**Versi dokumen:** 1.0
**Tanggal:** 3 September 2026
**Klasifikasi:** Internal — Terbatas
**Basis teknis:** branch `rework-pengadaan`, commit `8248793`

> **Dokumen rujukan internal**
>
> - [docs/BASELINE-ARSITEKTUR.md](BASELINE-ARSITEKTUR.md) — arsitektur aplikasi & utang teknis
> - [docs/LAPORAN-ANALISIS-PERFORMA.md](LAPORAN-ANALISIS-PERFORMA.md) — pengukuran beban nyata (6 Agustus 2026)
> - [docs/RUNBOOK-UPDATE-DATA.md](RUNBOOK-UPDATE-DATA.md) — mekanisme pembaruan data
> - [sql/migrations/README.md](../sql/migrations/README.md) — urutan build database

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Ruang Lingkup & Asumsi](#2-ruang-lingkup--asumsi)
3. [Profil Aplikasi & Karakterisasi Beban Kerja](#3-profil-aplikasi--karakterisasi-beban-kerja)
4. [Arsitektur Deployment Target](#4-arsitektur-deployment-target)
5. [Spesifikasi Perangkat Keras / Resource](#5-spesifikasi-perangkat-keras--resource)
6. [Software Dependencies & Baseline Platform](#6-software-dependencies--baseline-platform)
7. [Konfigurasi Jaringan](#7-konfigurasi-jaringan)
8. [Keamanan](#8-keamanan)
9. [Capacity Planning](#9-capacity-planning)
10. [Environment & Prosedur Deployment](#10-environment--prosedur-deployment)
11. [Backup, Disaster Recovery, RPO/RTO](#11-backup-disaster-recovery-rporto)
12. [Monitoring, Logging & Alerting](#12-monitoring-logging--alerting)
13. [Prasyarat Wajib Sebelum Go-Live](#13-prasyarat-wajib-sebelum-go-live)
14. [Lampiran](#14-lampiran)

---

## 1. Ringkasan Eksekutif

### 1.1. Apa yang akan di-deploy

DEWA-PBJ adalah dashboard analitik pemantauan Pengadaan Barang/Jasa Kementerian Ketenagakerjaan. Aplikasi bersifat **read-heavy / analitik**: membaca data hasil ETL dari SIRUP, SPSE/INAPROC, dan e-Katalog, lalu menyajikan ringkasan eksekutif, keterisian RUP, realisasi lima metode pengadaan, penilaian ITKP, deteksi anomali, dan kurasi berbasis AI.

Secara teknis aplikasi terdiri atas **dua sistem yang harus disediakan bersama**:

| # | Sistem | Peran | Kondisi saat ini |
|---|---|---|---|
| 1 | **Aplikasi web Next.js 16** | Render halaman, autentikasi & gate rute, 5 Route Handler API | Berjalan di Vercel (PaaS publik) |
| 2 | **Platform data Supabase** | PostgreSQL + PostgREST + Auth (GoTrue) + RPC | Berjalan di Supabase Cloud (project `bsskoapfeejutazpsyvd`) |

Pemindahan ke on-premise berarti **kedua-duanya** harus disediakan sendiri. Menyediakan hanya server aplikasi tidak cukup — aplikasi tidak akan menampilkan satu angka pun tanpa endpoint PostgREST dan GoTrue.

### 1.2. Rekomendasi utama

| Aspek | Rekomendasi |
|---|---|
| **Topologi produksi** | 2-tier: 1 VM Aplikasi + 1 VM Data, di belakang satu reverse proxy Nginx ber-TLS |
| **Sizing minimum produksi** | App: 4 vCPU / 8 GB / 60 GB · Data: 8 vCPU / 32 GB / 250 GB NVMe |
| **Platform data** | Supabase self-hosted (Docker Compose) — **bukan** PostgreSQL polos, karena aplikasi bergantung pada PostgREST + GoTrue |
| **Sistem operasi** | Ubuntu Server 24.04 LTS (alternatif: RHEL 9 / Rocky Linux 9) |
| **Runtime** | Node.js 22 LTS (minimum absolut 20.9.0) |
| **Koneksi keluar internet** | Dibutuhkan **hanya** untuk fitur AI Kurasi (Google Gemini) dan untuk proses *build*. Runtime inti dapat berjalan tanpa internet |

### 1.3. Tiga temuan yang menentukan desain infrastruktur

Ketiga hal berikut bukan preferensi, melainkan konsekuensi teknis dari kode yang ada sekarang. Ketiganya harus dipahami instansi sebelum menetapkan spesifikasi.

#### Temuan 1 — Browser pengguna berkomunikasi LANGSUNG dengan database, bukan lewat server aplikasi

Mayoritas modul (5 modul realisasi, Ringkasan, Rencana Pengadaan, ITKP) memanggil Supabase langsung dari browser memakai *anon key*. Konsekuensi infrastruktur:

- Endpoint Supabase (Kong gateway) **wajib dapat dijangkau dari jaringan klien**, tidak boleh disembunyikan di segmen backend murni.
- Beban trafik terberat mengalir pada jalur **klien ↔ Supabase**, bukan klien ↔ server Next.js. Perencanaan bandwidth harus mengikuti jalur ini.
- Alamat Supabase **ditanam ke dalam bundle JavaScript saat build** (prefiks `NEXT_PUBLIC_`), sehingga **tiap environment memerlukan build tersendiri** — mengganti variabel lingkungan saat runtime tidak berpengaruh.

#### Temuan 2 — Beban per pembukaan halaman sangat besar dan tidak di-cache

Hasil pengukuran langsung (lihat [LAPORAN-ANALISIS-PERFORMA.md](LAPORAN-ANALISIS-PERFORMA.md)):

| Metrik per satu kali buka halaman Ringkasan | Nilai terukur |
|---|---|
| Data dipindahkan | **± 19,7 MB** |
| Permintaan ke database | **± 26 kali** |
| Baris data dikirim ke browser | **± 21.700 baris** |
| Waktu sampai grafik pertama muncul | **± 10 detik** |
| Bundle JavaScript awal | **± 1,4 MB** |

Angka ini **berbanding lurus dengan jumlah pengguna**, bukan dengan jumlah data. 50 pengguna bersamaan menghasilkan ± 1.300 permintaan dan ± 950 MB lalu lintas pada jendela waktu yang sama.

Dokumen ini karenanya menyajikan **dua skenario sizing**:

- **Skenario A (as-is)** — deploy kode apa adanya. Membutuhkan perangkat keras jauh lebih besar.
- **Skenario B (setelah optimasi)** — setelah delapan langkah perbaikan pada laporan performa dikerjakan. Kebutuhan turun drastis.

Instansi perlu memilih secara sadar. Rekomendasi: **anggarkan perangkat keras Skenario A, kerjakan optimasi menuju Skenario B**, sehingga sistem memiliki ruang tumbuh alih-alih pas-pasan sejak hari pertama.

#### Temuan 3 — Dua celah keamanan terbuka yang harus ditutup sebelum go-live

Sudah terdokumentasi di [BASELINE-ARSITEKTUR.md §11](BASELINE-ARSITEKTUR.md):

1. *Anon key* dapat membaca **seluruh** view pengadaan lewat PostgREST. Pembatasan cakupan data per PPK saat ini ditegakkan di lapisan aplikasi, **bukan** oleh Row Level Security. Siapa pun yang membaca bundle JavaScript memperoleh anon key tersebut.
2. Route `/api/kurasi` adalah satu-satunya endpoint **tanpa autentikasi**, padahal ia menulis ke database dan mengonsumsi kuota API berbayar.

Pada lingkungan Vercel dengan pengguna terbatas, risikonya masih tertahan. Pada lingkungan instansi dengan kewajiban kepatuhan (SPBE, UU PDP), keduanya **harus** ditutup lebih dahulu. Rincian dan mitigasi pada [§8.6](#86-register-risiko-keamanan-yang-harus-ditutup).

---

## 2. Ruang Lingkup & Asumsi

### 2.1. Termasuk dalam ruang lingkup

- Spesifikasi resource server (compute, memori, storage, jaringan) untuk aplikasi dan platform data
- Daftar dependensi perangkat lunak beserta versi minimum dan versi teruji
- Desain jaringan: segmentasi, matriks port, DNS, TLS, arah lalu lintas
- Kendali keamanan pada tingkat platform, aplikasi, dan data
- Perhitungan kapasitas dan proyeksi pertumbuhan 5 tahun
- Prosedur deployment, environment, backup, DR, dan monitoring

### 2.2. Tidak termasuk

- Pengadaan/lisensi perangkat keras fisik beserta biayanya
- Konfigurasi jaringan tingkat kementerian (core switch, WAN, SD-WAN)
- Eksekusi migrasi data historis dari Supabase Cloud (prosedurnya dibahas, eksekusinya tidak)
- Penyelesaian utang teknis fungsional aplikasi (ITKP komponen B/C/D masih dummy, konsistensi metrik antar-modul)

### 2.3. Asumsi perencanaan

| # | Asumsi | Dasar |
|---|---|---|
| A1 | Total pengguna terdaftar 200–500 akun (admin UKPBJ, Sekretariat Jenderal, PPK lintas satker) | ± 83 unit satker realisasi, ± 44 unit setingkat KPA |
| A2 | Puncak pengguna bersamaan **50 orang**, dengan headroom desain hingga **100** | Target eksplisit pada laporan performa |
| A3 | Pola pemakaian *bursty*: puncak pada jam kerja & akhir triwulan penyusunan laporan | Sifat pelaporan pengadaan |
| A4 | Pembaruan data **terjadwal, bukan real-time** — sekali sehari memadai | Sumber SIRUP/INAPROC ditarik berkala |
| A5 | Akses dari jaringan internal kementerian dan/atau VPN; **tidak** dipublikasikan ke internet terbuka | Sifat data internal |
| A6 | Instansi menyediakan sertifikat TLS dari CA internal atau CA publik | Praktik standar SPBE |

Bila salah satu asumsi tidak berlaku — misalnya A5, sistem akan dipublikasikan ke internet — spesifikasi pada [§7](#7-konfigurasi-jaringan) dan [§8](#8-keamanan) perlu ditinjau ulang.

---

## 3. Profil Aplikasi & Karakterisasi Beban Kerja

Bagian ini menyajikan fakta terukur yang menjadi dasar seluruh angka spesifikasi berikutnya. Semua angka berasal dari repositori dan dari pengukuran langsung, bukan estimasi kasar.

### 3.1. Profil kode

| Metrik | Nilai |
|---|---|
| Framework | Next.js **16.2.9** (App Router) |
| Runtime UI | React **19.2.4** |
| Bahasa | TypeScript 5, `strict: true` |
| Berkas `.ts` / `.tsx` di `src/` | **180** berkas |
| Baris kode `src/` | **± 27.868** baris |
| Route Handler (API) | **5** endpoint, **1.084** baris |
| Halaman terproteksi | 13 rute pada grup `(app)` |
| Berkas migrasi SQL | **33** berkas, urutan `00` → `70` |
| Aset statis `public/` | 131 KB |
| Aset build klien `.next/static` | **5,2 MB** |
| `node_modules` (build-time) | **654 MB** |

### 3.2. Sifat beban kerja

| Dimensi | Karakter | Implikasi infrastruktur |
|---|---|---|
| Rasio baca : tulis | **± 99 : 1** | Optimasi diarahkan ke cache & read replica, bukan ke IOPS tulis |
| Lokasi komputasi | **Sisi klien** (agregasi dilakukan browser dengan `useMemo`) | CPU server aplikasi relatif ringan; CPU database dan bandwidth yang berat |
| Sesi | Stateless, cookie Supabase Auth | Aplikasi dapat di-scale horizontal tanpa sticky session |
| Jalur data dominan | Browser → PostgREST **langsung** | Kapasitas jaringan dihitung pada segmen klien ↔ Supabase |
| Bentuk puncak beban | Lonjakan saat pembukaan halaman (cold load) | Beban berbentuk *burst* pendek, bukan aliran tetap |

### 3.3. Anatomi satu kali pembukaan halaman Ringkasan

| Tahap | Beban | Ditanggung oleh |
|---|---|---|
| Unduh bundle JS + CSS | ± 1,4 MB | Server aplikasi / CDN internal |
| Proxy `src/proxy.ts` — refresh sesi + query `profiles` | 2 panggilan ke Supabase **per navigasi** | Server aplikasi → Supabase |
| Rombongan A — paket gabungan | 7.734 baris · 8 request · 3,7 MB | Browser → Supabase |
| Rombongan B — risiko pengadaan | 7.741 baris · 8 request · **15,0 MB** | Browser → Supabase |
| Rombongan C — data ITKP | ± 6.238 baris · ± 10 request · 1,0 MB | Browser → Supabase |
| Agregasi & render | 21.700 baris diproses | CPU/RAM perangkat pengguna |
| **Total** | **± 21.700 baris · ± 26 request · ± 19,7 MB** | |

> **Catatan penting tentang `src/proxy.ts`.** Proxy Next.js 16 (pengganti middleware) berjalan pada setiap permintaan non-aset dan melakukan dua panggilan jaringan ke Supabase: `auth.getUser()` lalu `SELECT role FROM profiles`. Pada 50 pengguna yang aktif bernavigasi, ini saja sudah menambah beban koneksi yang tidak kecil ke GoTrue dan PostgREST. Latensi antara VM Aplikasi dan VM Data karenanya **harus di bawah 1 ms** — keduanya wajib berada pada segmen/host yang sama, bukan lintas data center.

### 3.4. Volume data

Ukuran berkas sumber pada `data/data_update/` (gabungan JSON + CSV + XLSX):

| Tabel | Ukuran sumber | Mode update |
|---|---:|---|
| `api_paket_penyedia_terumumkan` | 34 MB | upsert |
| `paket_anggaran_penyedia` | 18 MB | upsert |
| `history_kaji_ulang` | 9,6 MB | replace |
| `paket_e_purchasing` | 9,4 MB | upsert |
| `pencatatan_non_tender_realisasi` | 273 KB | replace |
| `non_tender_selesai` | 233 KB | replace |
| `api_paket_swakelola_terumumkan` | 157 KB | upsert |
| `paket_anggaran_swakelola` | 117 KB | upsert |
| `tender_selesai_nilai` | 37 KB | upsert |
| `data_afirmasi_pdn_perencanaan` | 8 KB | replace |
| **Total sumber** | **± 71 MB** | |

Ditambah 12 tabel di luar mekanisme update rutin (`master_data`, `satker_kode_alias`, `master_data_pn`, `master_data_ro`, `profiles`, `ai_kurasi_paket`, `risiko_pengadaan`, dan lainnya).

**Estimasi ukuran database aktual:** dengan overhead baris PostgreSQL, indeks fungsional (`LTRIM`), kolom JSONB pada `risiko_pengadaan` (± 2 KB/baris × 7.741 baris ≈ 15 MB), serta bloat wajar → **± 1,5–2,5 GB untuk satu tahun anggaran**.

Volume datanya kecil. Yang membebani sistem bukan besarnya data, melainkan **frekuensi dan pola pembacaannya**.

---

## 4. Arsitektur Deployment Target

### 4.1. Diagram logis (topologi rekomendasi — 2-tier)

```
                    JARINGAN KLIEN (LAN Kemnaker / VPN)
                                  │
                                  │ HTTPS 443
                                  ▼
        ┌──────────────────────────────────────────────────┐
        │              REVERSE PROXY (Nginx)               │
        │   TLS termination · rate limit · security hdr    │
        │                                                  │
        │   dewa-pbj.kemnaker.go.id      → 10.x.x.10:3000  │
        │   api-dewa-pbj.kemnaker.go.id  → 10.x.x.20:8000  │
        └───────────────┬──────────────────┬───────────────┘
                        │                  │
         ┌──────────────▼──────┐    ┌──────▼─────────────────────────┐
         │   VM APLIKASI       │    │   VM DATA                      │
         │   10.x.x.10         │    │   10.x.x.20                    │
         │                     │    │                                │
         │  Node.js 22 LTS     │    │  Docker Compose:               │
         │  next start / PM2   │───▶│   ├─ Kong (gateway)   :8000    │
         │  (standalone build) │    │   ├─ GoTrue (auth)             │
         │                     │    │   ├─ PostgREST (REST)          │
         │  systemd service    │    │   ├─ Supavisor (pooler) :6543  │
         │                     │    │   ├─ PostgreSQL 15+   :5432    │
         │  Cron: update data  │    │   └─ Studio (admin, dibatasi)  │
         └─────────────────────┘    └────────────────────────────────┘
                        │
                        │ HTTPS keluar (OPSIONAL — hanya AI Kurasi)
                        ▼
              generativelanguage.googleapis.com
```

**Perhatikan dua garis panah dari reverse proxy.** Klien mengakses **dua** hostname: satu untuk aplikasi, satu untuk gateway Supabase. Ini konsekuensi langsung dari Temuan 1 — browser memang harus bisa mencapai PostgREST.

### 4.2. Pemetaan komponen: kondisi sekarang → target on-premise

| Komponen | Sekarang (cloud publik) | Target on-premise | Catatan migrasi |
|---|---|---|---|
| Hosting aplikasi | Vercel (serverless) | Node.js `next start` di balik Nginx | Perlu `output: 'standalone'` pada `next.config.ts` |
| CDN aset statis | Vercel Edge | Nginx menyajikan `.next/static` dengan `Cache-Control: immutable` | Aset ber-hash, aman di-cache 1 tahun |
| Image Optimization | Vercel | `sharp` di server Node | Perlu konfigurasi alokator memori glibc |
| Database | Supabase Cloud Postgres | PostgreSQL 15+ dalam stack Supabase | Migrasi `pg_dump` → `pg_restore` |
| REST API data | Supabase PostgREST | PostgREST self-hosted | Kompatibel penuh, tanpa perubahan kode |
| Autentikasi | Supabase Auth (GoTrue) | GoTrue self-hosted | JWT secret baru; seluruh pengguna harus reset kata sandi |
| RPC (`get_rup_history`) | Supabase | Fungsi PostgreSQL yang sama | Ikut terbawa `pg_dump` |
| Connection pooling | Supabase pooler | Supavisor / PgBouncer | **Wajib** — lihat §5.4 |
| AI Kurasi | Google Gemini API | Tetap Gemini (butuh egress) **atau** dinonaktifkan | Lihat §4.4 |
| CI/CD | Git push → Vercel | Build server internal → artefak → deploy | Lihat §10.3 |

### 4.3. Mengapa Supabase self-hosted, bukan PostgreSQL polos

Pertanyaan ini hampir selalu muncul. Jawabannya bersifat teknis, bukan preferensi:

| Yang dipakai aplikasi | Disediakan oleh | Tersedia di Postgres polos? |
|---|---|---|
| `supabase.from('view').select().range()` | **PostgREST** | Tidak |
| `supabase.auth.getUser()`, sesi, cookie refresh | **GoTrue** | Tidak |
| `supabase.rpc('get_rup_history')` | PostgREST → fungsi SQL | Tidak (endpoint HTTP-nya) |
| Row Level Security, `auth.uid()` | Postgres + GoTrue JWT | Sebagian |

Mengganti Supabase dengan PostgreSQL polos berarti **menulis ulang seluruh lapisan akses data dan autentikasi aplikasi** — pekerjaan berbulan-bulan, di luar lingkup deployment. Supabase self-hosted (`supabase/docker`) menyediakan komponen yang persis sama dengan versi cloud, sehingga kode aplikasi **tidak perlu diubah sama sekali**.

### 4.4. Perlakuan terhadap fitur AI Kurasi

Fitur AI Kurasi memanggil Google Gemini melalui internet. Instansi memiliki tiga opsi:

| Opsi | Konsekuensi | Rekomendasi |
|---|---|---|
| **1. Izinkan egress terbatas** ke `generativelanguage.googleapis.com:443` melalui proxy keluar | Fitur berjalan penuh. Perlu persetujuan keamanan atas pengiriman metadata paket (nama paket, pagu, metode) ke layanan pihak ketiga | Bila data dinilai tidak sensitif |
| **2. Nonaktifkan fitur** — kosongkan `GEMINI_API_KEY` | `/api/kurasi` membalas HTTP 500 dengan pesan jelas; **seluruh bagian aplikasi lain tetap berjalan normal**. Kolom kurasi menampilkan "Belum Dikurasi" | Bila kebijakan melarang egress |
| **3. Ganti dengan LLM on-premise** | Butuh pengembangan: adaptasi `@google/genai` ke endpoint kompatibel-OpenAI, plus GPU (≥ 24 GB VRAM) | Jangka menengah |

**Penting:** hasil kurasi yang sudah tersimpan pada tabel `ai_kurasi_paket` bersifat permanen dan tidak pernah terhapus oleh proses update data. Opsi 2 tidak menghilangkan hasil yang sudah ada.

### 4.5. Opsi topologi

| Opsi | Bentuk | Cocok untuk | Kelemahan |
|---|---|---|---|
| **T1 — All-in-one** | 1 VM: Nginx + Node + Supabase stack | DEV / UAT / pilot | Tidak ada isolasi kegagalan; kontensi CPU antara Node dan Postgres |
| **T2 — 2-tier** ★ | VM Aplikasi + VM Data | **Produksi** | SPOF pada masing-masing tier |
| **T3 — HA** | 2 VM Aplikasi di balik LB + Postgres primary/standby (streaming replication) + Patroni/keepalived | Bila SLA menuntut ≥ 99,9% | Biaya & kompleksitas operasional 2× |

★ = rekomendasi. Aplikasi bersifat stateless, sehingga peningkatan T2 → T3 tidak memerlukan perubahan kode; cukup menambah instance dan load balancer.

---

## 5. Spesifikasi Perangkat Keras / Resource

### 5.1. Ringkasan spesifikasi produksi (rekomendasi)

#### VM Aplikasi

| Komponen | Minimum | **Rekomendasi** | Optimal (100 concurrent) |
|---|---|---|---|
| vCPU | 2 core | **4 core** | 8 core |
| RAM | 4 GB | **8 GB** | 16 GB |
| Storage sistem | 40 GB SSD | **60 GB SSD** | 80 GB SSD |
| IOPS | 500 | **1.000** | 2.000 |
| NIC | 1 Gbps | **1 Gbps** | 10 Gbps |
| Arsitektur | x86-64 (AMD64) | x86-64 | x86-64 |

**Dasar perhitungan:**
- Proses Node.js Next.js produksi: RSS 350–600 MB pada kondisi tenang; dapat mencapai 1,2 GB saat render dan optimasi gambar bersamaan.
- `sharp` (optimasi gambar) menambah 200–400 MB dan bersifat CPU-intensif secara sesaat.
- Alokasi 8 GB memberi ruang untuk 2 proses cluster + page cache Nginx + proses cron update data.
- Storage: OS 15 GB + Node & runtime 3 GB + artefak build standalone (± 400 MB × 3 rilis untuk rollback) + log 20 GB + ruang kerja `data/data_update` 5 GB.

#### VM Data (PostgreSQL + Supabase stack)

| Komponen | Minimum | **Rekomendasi (Skenario A)** | Optimal |
|---|---|---|---|
| vCPU | 4 core | **8 core** | 16 core |
| RAM | 16 GB | **32 GB** | 64 GB |
| Storage data | 100 GB SSD | **250 GB NVMe** | 500 GB NVMe |
| IOPS | 3.000 | **8.000** | 20.000 |
| Throughput disk | 200 MB/s | **500 MB/s** | 1 GB/s |
| NIC | 1 Gbps | **10 Gbps** | 10 Gbps |

**Dasar perhitungan:** lihat [§9.2](#92-perhitungan-kapasitas-vm-data) untuk uraian lengkap. Ringkasnya: pada Skenario A, database harus melayani ± 1.300 permintaan dengan agregat ± 950 MB dalam jendela beberapa menit, sebagian besar berupa pemindaian view berlapis dengan `FULL OUTER JOIN`. RAM besar diperlukan agar seluruh working set (± 2,5 GB) muat di `shared_buffers` + page cache OS, sehingga hampir tidak ada pembacaan ke disk.

### 5.2. Spesifikasi per environment

| Environment | vCPU | RAM | Storage | Topologi | Catatan |
|---|---|---|---|---|---|
| **DEV** | 2 | 8 GB | 80 GB | T1 all-in-one | Boleh berbagi host; data anonim/subset |
| **UAT / Staging** | 4 | 16 GB | 150 GB | T1 all-in-one | Salinan struktur produksi, data disamarkan |
| **PRODUKSI** | 4 + 8 = **12** | 8 + 32 = **40 GB** | 60 + 250 = **310 GB** | T2 dua VM | Sesuai §5.1 |
| **Build server** (opsional) | 4 | 8 GB | 100 GB | 1 VM | Butuh egress ke npm registry & Google Fonts |
| **Total pengadaan** | **± 22 vCPU** | **± 72 GB** | **± 640 GB** | | Di luar build server: 18 vCPU / 64 GB / 540 GB |

### 5.3. Rincian alokasi storage

#### VM Aplikasi (60 GB)

| Peruntukan | Alokasi | Keterangan |
|---|---:|---|
| Sistem operasi + paket | 15 GB | Ubuntu Server minimal + utilitas |
| Node.js runtime | 1 GB | |
| Artefak rilis (3 versi) | 6 GB | Build standalone ± 400 MB + `.next/static` 5,2 MB per rilis, dengan margin |
| Ruang kerja build (bila build di VM ini) | 10 GB | `node_modules` 654 MB + `.next` hingga 1 GB |
| Berkas sumber `data/data_update/` | 5 GB | Sumber ± 71 MB/tarikan × retensi 30 hari |
| Log aplikasi & Nginx | 20 GB | Rotasi harian, retensi 30 hari |
| Cadangan bebas (≥ 20%) | 3 GB | |

#### VM Data (250 GB)

| Peruntukan | Alokasi | Keterangan |
|---|---:|---|
| Sistem operasi + Docker | 25 GB | Termasuk image Supabase ± 5 GB |
| Data PostgreSQL tahun berjalan | 5 GB | Estimasi aktual 1,5–2,5 GB, dibulatkan ke atas |
| Data historis 5 tahun anggaran | 20 GB | Lihat §9.4 |
| Indeks | 10 GB | Termasuk indeks fungsional `LTRIM` dan indeks dashboard |
| Materialized view (Skenario B) | 5 GB | Rekap tersimpan sesuai rekomendasi laporan performa |
| WAL (`max_wal_size` 4 GB + arsip) | 30 GB | Kritis: jangan sampai penuh — Postgres berhenti menulis |
| Backup lokal (7 hari terakhir) | 60 GB | Sebelum di-offload ke storage backup terpisah |
| Bloat & ruang `VACUUM FULL` | 40 GB | Perlu ruang ≈ ukuran tabel terbesar |
| Log Docker & Postgres | 15 GB | |
| Cadangan bebas (≥ 20%) | 40 GB | |

> **Aturan operasional:** utilisasi disk VM Data tidak boleh melampaui **80%**. Di atas ambang itu, `VACUUM` dan `pg_dump` berisiko gagal dan performa menurun tajam.

### 5.4. Connection pooling — komponen wajib, bukan opsional

Laporan performa mencatat bahwa Supabase Cloud membatasi ± 10–15 koneksi bersamaan, dan sistem **sudah pernah mati** dengan galat `canceling statement due to statement timeout` pada jumlah pengguna yang masih sedikit.

Pada on-premise, batas itu dapat dinaikkan, tetapi tidak bisa dinaikkan tanpa batas: setiap koneksi PostgreSQL adalah proses tersendiri dengan biaya memori 5–10 MB. Maka:

| Parameter | Nilai | Alasan |
|---|---|---|
| `max_connections` (PostgreSQL) | **200** | 200 × 9 MB ≈ 1,8 GB — masih aman pada RAM 32 GB |
| Pooler | **Supavisor** (bawaan Supabase) atau PgBouncer | Mode *transaction pooling* |
| Ukuran pool per aplikasi | 40 | PostgREST + GoTrue + Route Handler + skrip update |
| `statement_timeout` | **30 detik** | Cukup untuk pemindaian view terberat; mencegah query nyangkut menahan koneksi |
| `idle_in_transaction_session_timeout` | 60 detik | Mencegah koneksi bocor |

### 5.5. Perangkat klien (pengguna akhir)

Karena seluruh agregasi dilakukan di browser, spesifikasi perangkat pengguna **ikut menentukan pengalaman pakai**. Ini konsekuensi Temuan 2 yang sering terlewat.

| Komponen | Minimum | Rekomendasi |
|---|---|---|
| RAM | 4 GB | **8 GB** |
| Prosesor | Dual-core 2 GHz | Quad-core |
| Peramban | Chrome/Edge 120+, Firefox 120+ | Versi terkini |
| Resolusi layar | 1366 × 768 | 1920 × 1080 |
| Bandwidth ke server | 10 Mbps | **50 Mbps** |

> Pada koneksi 10 Mbps, transfer 19,7 MB memerlukan **± 16 detik** hanya untuk pemindahan data — di luar waktu proses. Pengguna di kantor daerah dengan koneksi lambat akan merasakan aplikasi ini jauh lebih berat daripada pengguna di kantor pusat. Optimasi Skenario B menghilangkan masalah ini sepenuhnya.

---

## 6. Software Dependencies & Baseline Platform

### 6.1. Sistem operasi

| Item | Spesifikasi |
|---|---|
| **Rekomendasi utama** | Ubuntu Server 24.04 LTS (dukungan hingga April 2029) |
| Alternatif tervalidasi | Ubuntu Server 22.04 LTS · RHEL 9 · Rocky Linux 9 · AlmaLinux 9 |
| Arsitektur | x86-64 (AMD64) |
| Kernel | ≥ 5.15 |
| Berkas libc | **glibc** — *bukan* musl/Alpine, karena `sharp` memerlukan konfigurasi alokator memori khusus di lingkungan glibc dan bermasalah di musl |
| Locale | `en_US.UTF-8` + `id_ID.UTF-8` |
| Zona waktu | `Asia/Jakarta` (WIB) |
| Filesystem | ext4 atau XFS (XFS disarankan untuk volume data PostgreSQL) |
| Sinkronisasi waktu | `chrony` ke NTP internal kementerian — **wajib**, karena validasi JWT sensitif terhadap selisih waktu |

### 6.2. Runtime & tooling — VM Aplikasi

| Perangkat lunak | Versi minimum | Versi teruji | Sifat | Keterangan |
|---|---|---|---|---|
| **Node.js** | **20.9.0** | **22.20.0** | Wajib | Batas `engines` Next.js 16.2.9 adalah `>=20.9.0`. Gunakan jalur LTS 22 |
| **npm** | 10.x | 10.9.3 | Wajib | |
| **Nginx** | 1.24 | 1.26 | Wajib | Reverse proxy, TLS, rate limiting, penyajian aset statis |
| systemd | bawaan OS | — | Wajib | Manajemen service & auto-restart |
| PM2 | 5.x | — | Opsional | Alternatif systemd bila diinginkan mode cluster |
| Git | 2.34+ | — | Build-time | |
| logrotate | bawaan OS | — | Wajib | |
| chrony | bawaan OS | — | Wajib | |

### 6.3. Platform data — VM Data

| Perangkat lunak | Versi minimum | Sifat | Keterangan |
|---|---|---|---|
| **Docker Engine** | 24.0 | Wajib | Menjalankan stack Supabase |
| **Docker Compose** | v2.20 | Wajib | Plugin `docker compose`, bukan `docker-compose` v1 |
| **PostgreSQL** | **15** | Wajib | Versi bawaan image Supabase; 17 didukung |
| PostgREST | 12.x | Wajib | Bagian dari stack Supabase |
| GoTrue (Supabase Auth) | 2.x | Wajib | Bagian dari stack Supabase |
| Kong Gateway | 2.8.x | Wajib | API gateway Supabase |
| Supavisor / PgBouncer | — | **Wajib** | Connection pooling, lihat §5.4 |
| Supabase Studio | — | Opsional | Antarmuka admin — **batasi aksesnya**, lihat §8.4 |
| Realtime | — | **Tidak dipakai** | Aplikasi tidak menggunakan subscription; boleh dimatikan untuk menghemat resource |
| Storage API | — | **Tidak dipakai** | Aplikasi tidak menyimpan berkas di Supabase; boleh dimatikan |

> **Penghematan:** mematikan container Realtime dan Storage menghemat ± 1,5 GB RAM dan mengurangi permukaan serangan.

### 6.4. Ekstensi PostgreSQL yang dibutuhkan

| Ekstensi | Peruntukan | Sifat |
|---|---|---|
| `pgcrypto` | Dipakai GoTrue untuk hashing kredensial | Wajib |
| `uuid-ossp` / `pgcrypto` | Kolom PK bertipe UUID pada `pencatatan_non_tender_realisasi`, `non_tender_selesai` | Wajib |
| `pg_stat_statements` | Analisis query lambat | Sangat disarankan |
| `pg_cron` | Penjadwalan `REFRESH MATERIALIZED VIEW` (Skenario B) | Disarankan |
| `pgaudit` | Jejak audit tingkat database | Disarankan untuk kepatuhan |

### 6.5. Dependensi aplikasi (runtime)

Seluruhnya terpasang lewat `npm ci` dari `package-lock.json`. Tidak ada dependensi biner di luar `sharp`.

| Paket | Versi | Peran |
|---|---|---|
| `next` | 16.2.9 | Framework |
| `react` / `react-dom` | 19.2.4 | UI |
| `@supabase/supabase-js` | ^2.108.2 | Klien data |
| `@supabase/ssr` | ^0.12.3 | Sesi & cookie sisi server |
| `@google/genai` | ^2.13.0 | AI Kurasi (Gemini) |
| `chart.js` + `react-chartjs-2` | ^4.5.1 / ^5.3.1 | Grafik |
| `exceljs` | ^4.4.0 | Ekspor XLSX (± 950 KB bundle) |
| `jspdf` + `jspdf-autotable` | ^4.2.1 / ^5.0.8 | Ekspor PDF (± 400 KB bundle) |
| `html-to-image` | ^1.11.13 | Fitur Cetak (± 50 KB bundle) |
| `framer-motion` | ^12.41.0 | Animasi |
| `lucide-react` | ^1.21.0 | Ikon |
| `zod` | ^4.4.3 | Validasi skema |
| `file-saver` | ^2.0.5 | Unduhan sisi klien |
| `zustand` | ^5.0.14 | Terpasang, belum dipakai |

### 6.6. Dependensi build-time dan kebutuhan koneksi keluar

Ini bagian yang paling sering menjadi kejutan pada lingkungan tertutup.

| Kebutuhan | Tujuan | Waktu | Bila diblokir |
|---|---|---|---|
| `registry.npmjs.org:443` | `npm ci` mengunduh 654 MB dependensi | Build | **Build gagal.** Mitigasi: mirror npm internal (Verdaccio/Nexus) atau bundel `node_modules` sebagai artefak |
| `fonts.googleapis.com` + `fonts.gstatic.com` | `next/font/google` mengunduh **IBM Plex Sans** dan **IBM Plex Mono** saat build | Build | **Build gagal.** Mitigasi: ganti ke `next/font/local` dengan berkas font di-*vendor* ke repo (font berlisensi SIL OFL, sah untuk didistribusikan ulang) |
| `github.com` | `git clone` / `git pull` | Build | Mitigasi: GitLab/Gitea internal |
| `generativelanguage.googleapis.com:443` | AI Kurasi | **Runtime** | Fitur AI Kurasi mati; bagian aplikasi lain tetap berjalan |
| Registry Docker (`ghcr.io`, `docker.io`) | Menarik image Supabase | Instalasi | Mitigasi: registry internal / `docker save` + `docker load` |

> **Rekomendasi arsitektur build:** pisahkan **build server** (punya egress terkendali) dari **server produksi** (tanpa egress). Server produksi hanya menerima artefak jadi. Pola ini memenuhi prinsip pemisahan lingkungan sekaligus menghindari pemasangan toolchain pengembangan di produksi.

### 6.7. Perubahan kode yang diperlukan untuk deployment on-premise

Empat perubahan berikut harus dilakukan sebelum deployment. Tiga pertama bersifat teknis-ringan; yang keempat opsional namun sangat disarankan.

| # | Perubahan | Berkas | Alasan |
|---|---|---|---|
| 1 | Tambahkan `output: 'standalone'` | [next.config.ts](../next.config.ts) | Menghasilkan `.next/standalone` berisi hanya berkas yang dibutuhkan + `server.js` minimal, sehingga `node_modules` 654 MB tidak perlu ikut ke produksi |
| 2 | Salin aset setelah build | Skrip deploy | `cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/` — `server.js` tidak menyalin keduanya secara otomatis |
| 3 | Ganti `next/font/google` → `next/font/local` | [src/app/layout.tsx](../src/app/layout.tsx) | Menghilangkan ketergantungan build pada Google Fonts. IBM Plex berlisensi SIL OFL |
| 4 | Konfigurasi alokator memori `sharp` | systemd unit | Pada Linux berbasis glibc, `sharp` dapat mengonsumsi memori berlebihan. Setel `MALLOC_ARENA_MAX=2` atau pasang jemalloc |

Contoh `next.config.ts` hasil perubahan #1:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

---

## 7. Konfigurasi Jaringan

### 7.1. Segmentasi jaringan

| Zona | Isi | Kebijakan akses |
|---|---|---|
| **Zona Klien** | Workstation pengguna, klien VPN | Hanya boleh menjangkau Zona DMZ pada port 443 |
| **Zona DMZ Internal** | Reverse proxy Nginx | Menerima 443 dari Zona Klien; meneruskan ke Zona Aplikasi & Zona Data |
| **Zona Aplikasi** | VM Aplikasi (Node.js) | Menerima hanya dari reverse proxy; boleh menjangkau Zona Data |
| **Zona Data** | VM Data (Supabase + PostgreSQL) | Menerima dari Zona Aplikasi dan **dari reverse proxy** (karena browser mengakses PostgREST) |
| **Zona Manajemen** | Bastion/jump host, monitoring, backup | Akses SSH ke seluruh VM |

> **Penyimpangan dari pola tiga-lapis klasik.** Pada arsitektur konvensional, database tidak pernah dapat dijangkau dari zona klien. Di sini, karena browser memanggil PostgREST secara langsung, gateway Supabase **harus** terekspos melalui reverse proxy. Yang perlu ditegaskan: yang terekspos adalah **Kong pada port 8000 (HTTP API)**, bukan **PostgreSQL pada port 5432**. Port 5432 tetap tertutup rapat dari zona klien.

### 7.2. Matriks port & firewall

| # | Sumber | Tujuan | Port | Protokol | Peruntukan | Sifat |
|---|---|---|---|---|---|---|
| 1 | Zona Klien | Reverse Proxy | 443 | TCP/HTTPS | Akses aplikasi & API data | Wajib |
| 2 | Zona Klien | Reverse Proxy | 80 | TCP/HTTP | Redirect ke HTTPS saja | Opsional |
| 3 | Reverse Proxy | VM Aplikasi | 3000 | TCP/HTTP | Upstream Next.js | Wajib |
| 4 | Reverse Proxy | VM Data | 8000 | TCP/HTTP | Upstream Kong (PostgREST + GoTrue) | Wajib |
| 5 | VM Aplikasi | VM Data | 8000 | TCP/HTTP | Panggilan proxy & Route Handler | Wajib |
| 6 | VM Aplikasi | VM Data | 6543 | TCP | Supavisor pooler (skrip update data) | Wajib |
| 7 | VM Aplikasi | Internet (via proxy keluar) | 443 | TCP/HTTPS | Google Gemini — AI Kurasi | Opsional |
| 8 | Zona Manajemen | Semua VM | 22 | TCP/SSH | Administrasi | Wajib |
| 9 | Zona Manajemen | VM Data | 5432 | TCP | Administrasi DB & backup | Terbatas |
| 10 | Zona Manajemen | VM Aplikasi & Data | 9100 | TCP | node_exporter (monitoring) | Disarankan |
| 11 | Semua VM | NTP internal | 123 | UDP | Sinkronisasi waktu | Wajib |
| 12 | Semua VM | DNS internal | 53 | TCP/UDP | Resolusi nama | Wajib |
| 13 | VM Data | Storage backup | 22 / 445 | TCP | Offload backup | Wajib |
| — | **Zona Klien** | **VM Data:5432** | — | — | **DILARANG** | Blokir eksplisit |
| — | **Internet** | **Semua VM** | — | — | **DILARANG** (inbound) | Blokir eksplisit |

### 7.3. DNS & sertifikat TLS

| Item | Nilai yang diusulkan |
|---|---|
| Hostname aplikasi | `dewa-pbj.kemnaker.go.id` |
| Hostname API data | `api-dewa-pbj.kemnaker.go.id` |
| Jenis DNS record | A record ke VIP reverse proxy |
| Sertifikat | Wildcard `*.kemnaker.go.id` atau dua SAN pada satu sertifikat |
| Penerbit | CA internal kementerian atau CA publik (DigiCert/Sectigo) |
| Masa berlaku & rotasi | 1 tahun, dengan pengingat perpanjangan H-30 |
| Versi TLS | **TLS 1.2 dan 1.3 saja**. TLS 1.0/1.1 dan SSLv3 dinonaktifkan |
| Cipher suite | Hanya AEAD: `ECDHE-ECDSA-AES128-GCM-SHA256`, `ECDHE-RSA-AES256-GCM-SHA384`, `TLS_AES_256_GCM_SHA384` |

> **Konsekuensi penting.** Karena `NEXT_PUBLIC_SUPABASE_URL` ditanam ke dalam bundle saat build, **hostname API data harus ditetapkan sebelum build produksi pertama** dan tidak boleh berubah tanpa build ulang. Tetapkan nama DNS lebih dulu, baru lakukan build.

### 7.4. Konfigurasi reverse proxy (Nginx)

Poin-poin konfigurasi yang wajib ada:

| Aspek | Setelan | Alasan |
|---|---|---|
| `client_max_body_size` | 10 MB | Payload API terbesar berasal dari batch AI Kurasi |
| `proxy_read_timeout` | **120 detik** untuk `/api/`, 60 detik lainnya | Endpoint `recalculate` memproses 200 paket per panggilan |
| `gzip` / `brotli` | Aktif untuk `application/json`, `text/css`, `application/javascript` | **Dampak terbesar.** Payload JSON 19,7 MB terkompresi menjadi ± 2–3 MB |
| Cache aset statis | `location /_next/static/` → `Cache-Control: public, max-age=31536000, immutable` | Nama berkas ber-hash, aman di-cache permanen |
| Rate limiting | `limit_req_zone` 30 req/detik per IP, burst 60 | **Mitigasi langsung** terhadap efek bola salju "pengguna menekan Refresh" yang dijelaskan laporan performa |
| `limit_conn` | 20 koneksi bersamaan per IP | Mencegah satu klien memonopoli pool |
| Buffering | `proxy_buffering on`, `proxy_buffers 16 64k` | Melindungi Node dari klien lambat |
| HTTP/2 | Aktif | Memperbaiki paralelisme 26 permintaan per pemuatan halaman |
| Header keamanan | Lihat §8.3 | |

> **Aktifkan kompresi sebelum apa pun yang lain.** Kompresi gzip pada respons JSON PostgREST menurunkan lalu lintas dari ± 19,7 MB menjadi ± 2–3 MB per pemuatan halaman — perbaikan 6–8× yang diperoleh hanya dari satu baris konfigurasi, tanpa menyentuh kode.

### 7.5. Kebutuhan bandwidth

**Skenario A (as-is), tanpa kompresi:**

| Kondisi | Perhitungan | Kebutuhan |
|---|---|---|
| 1 pengguna, cold load | 19,7 MB + 1,4 MB ≈ 21 MB dalam ± 10 detik | ± 17 Mbps |
| 50 pengguna bersamaan | 50 × 21 MB = 1.050 MB dalam ± 10 detik | **± 840 Mbps** |
| 100 pengguna bersamaan | 2.100 MB dalam ± 10 detik | ± 1,7 Gbps |

**Skenario A + kompresi gzip (rasio ± 7:1 untuk JSON):**

| Kondisi | Kebutuhan |
|---|---|
| 50 pengguna bersamaan | **± 120 Mbps** |
| 100 pengguna bersamaan | ± 240 Mbps |

**Skenario B (setelah optimasi — rekap tersimpan + cache):**

| Kondisi | Kebutuhan |
|---|---|
| 50 pengguna bersamaan | **< 10 Mbps** |
| 100 pengguna bersamaan | < 20 Mbps |

**Kesimpulan bandwidth:**
- Backbone LAN antara reverse proxy, VM Aplikasi, dan VM Data: **10 Gbps** (atau kolokasi pada host yang sama).
- Uplink dari data center ke jaringan pengguna: **1 Gbps** memadai **dengan syarat kompresi aktif**. Tanpa kompresi, 1 Gbps akan jenuh pada ± 55 pengguna bersamaan.
- Kantor daerah lewat WAN: minimal 50 Mbps per lokasi pada Skenario A; Skenario B menghilangkan kendala ini.

---

## 8. Keamanan

### 8.1. Autentikasi & otorisasi

Aplikasi menerapkan **empat lapis penegakan** atas satu sumber kebenaran, yaitu peta `ROUTE_ACCESS` pada [src/lib/auth/access.ts](../src/lib/auth/access.ts):

| Lapis | Berkas | Fungsi |
|---|---|---|
| 1 | [src/proxy.ts](../src/proxy.ts) | Gate optimistik: belum login → `/login`; role tak berhak → landing sesuai role |
| 2 | `src/app/(app)/layout.tsx` | `await getProfile()` — tanpa sesi valid atau akun nonaktif → redirect |
| 3 | [src/lib/auth/dal.ts](../src/lib/auth/dal.ts) | DAL server-only, memoized: `verifySession`, `requireAccess`, `getApiProfile` |
| 4 | Route Handler | `getApiProfile()` → 401 bila null, lalu **scoping data**: role `ppk` dipaksa `.eq('nama_ppk', profile.ppk_name)` |

Tiga role: `admin` (UKPBJ, akses penuh), `sekjend` (Ringkasan, Rencana Pengadaan, ITKP), `ppk` (modul realisasi, dibatasi ke paket miliknya sendiri).

Kendali tingkat database: enum `app_role`, tabel `public.profiles` (1:1 dengan `auth.users`), trigger auto-provision `handle_new_user()`, helper `is_admin()` (SECURITY DEFINER, anti-rekursi RLS), serta RLS pada `profiles` — pengguna hanya membaca profilnya sendiri, hanya admin yang boleh menulis.

### 8.2. Manajemen kredensial

| Kredensial | Lokasi | Kendali |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Bundle klien (publik) | Tidak rahasia menurut desain |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Bundle klien (publik) | **Harus dianggap publik.** Pengamanannya bergantung sepenuhnya pada RLS — lihat §8.6 |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` sisi server, mode 0600 | **Tidak boleh** memakai prefiks `NEXT_PUBLIC_`. Tidak boleh menyentuh browser |
| `GEMINI_API_KEY` | `.env` sisi server, mode 0600 | Rotasi tiap 90 hari |
| JWT secret Supabase | `.env` VM Data, mode 0600 | Rotasi memaksa seluruh sesi berakhir |
| Kata sandi PostgreSQL | `.env` VM Data, mode 0600 | Minimal 32 karakter acak |

**Kendali operasional:**
- Berkas `.env` dimiliki user service, mode `0600`, dimuat lewat `EnvironmentFile=` pada systemd unit.
- `.gitignore` sudah mencakup `.env*` — terverifikasi.
- Disarankan menggunakan brankas rahasia instansi (HashiCorp Vault / Ansible Vault) bila tersedia.
- Rotasi kredensial dicatat pada log perubahan konfigurasi.

### 8.3. Header keamanan HTTP

Diterapkan di Nginx untuk seluruh respons:

| Header | Nilai | Peruntukan |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Memaksa HTTPS |
| `X-Content-Type-Options` | `nosniff` | Mencegah MIME sniffing |
| `X-Frame-Options` | `DENY` | Anti clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Membatasi kebocoran URL |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Mematikan API perangkat |
| `Content-Security-Policy` | Lihat catatan di bawah | Mitigasi XSS |

**Catatan CSP.** Next.js 16 menyediakan panduan CSP berbasis nonce (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`). CSP harus mengizinkan `connect-src` ke hostname API data, karena browser memanggil PostgREST secara langsung. Kerangka minimal:

```
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://api-dewa-pbj.kemnaker.go.id;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

> `style-src 'unsafe-inline'` masih diperlukan karena Chart.js dan framer-motion menyuntikkan gaya inline. Hilangkan bila di kemudian hari keduanya diganti.

### 8.4. Pengerasan platform

| Area | Kendali |
|---|---|
| SSH | Autentikasi kunci saja; `PermitRootLogin no`; akses hanya lewat bastion |
| Akun service | Node dan Docker berjalan sebagai user non-root khusus |
| Firewall host | `ufw`/`firewalld` default-deny inbound, hanya port pada §7.2 yang dibuka |
| Pembaruan | Patch keamanan otomatis untuk OS; pembaruan Node & Docker terjadwal bulanan |
| **Supabase Studio** | **Tidak boleh terekspos ke jaringan klien.** Batasi ke Zona Manajemen lewat SSH tunnel atau daftar IP di Kong |
| Kong | Nonaktifkan route yang tidak dipakai (Storage, Realtime); aktifkan rate limiting di tingkat Kong sebagai lapis kedua |
| PostgreSQL | `listen_addresses` hanya alamat internal; `pg_hba.conf` memakai `scram-sha-256`; tanpa `trust` |
| Docker | Container non-root bila memungkinkan; batasi `--memory` & `--cpus`; image di-pin ke digest, bukan tag `latest` |
| Antivirus/EDR | Sesuai standar kementerian; kecualikan direktori data PostgreSQL dari pemindaian real-time (menyebabkan degradasi berat) |

### 8.5. Perlindungan data & kepatuhan

| Aspek | Kendali |
|---|---|
| Data dalam transit | TLS 1.2/1.3 pada seluruh jalur eksternal |
| Data saat diam | Enkripsi volume (LUKS) pada volume data PostgreSQL |
| Backup | Terenkripsi (GPG atau enkripsi native `pg_dump` + `age`) |
| Klasifikasi data | Data pengadaan bersifat internal; sebagian nama PPK adalah data pribadi → tunduk pada UU 27/2022 (PDP) |
| Retensi | Data pengadaan mengikuti jadwal retensi arsip kementerian (usulan: 5 tahun aktif, selanjutnya arsip dingin) |
| Jejak audit | `pgaudit` untuk DDL & DML pada tabel sensitif; log akses Nginx retensi 90 hari |
| Rujukan regulasi | Perpres 95/2018 (SPBE) · PP 71/2019 (PSTE) · UU 27/2022 (PDP) · Perpres 12/2021 (Pengadaan) |

### 8.6. Register risiko keamanan yang harus ditutup

Empat butir berikut adalah temuan nyata pada basis kode saat ini, bukan risiko hipotetis. Butir R1 dan R2 **memblokir go-live**.

| ID | Temuan | Dampak | Mitigasi | Prioritas |
|---|---|---|---|---|
| **R1** | *Anon key* dapat membaca **seluruh** view pengadaan lewat PostgREST. Scoping PPK hanya di lapisan aplikasi, bukan RLS | Siapa pun yang memiliki anon key (tersedia di bundle JS mana pun) dapat mengunduh seluruh data pengadaan kementerian, melewati pembatasan role | Jalankan rencana pengerasan yang **sudah tertulis** di akhir [sql/rbac/001_schema.sql](../sql/rbac/001_schema.sql): `security_invoker` pada view, cabut `GRANT` untuk peran `anon`, aktifkan RLS tingkat data | **Pemblokir** |
| **R2** | `/api/kurasi` tidak memanggil `getApiProfile()` — satu-satunya endpoint tanpa autentikasi, padahal menulis ke DB dan mengonsumsi kuota API | Pihak tak berwenang dapat memicu penulisan dan menghabiskan kuota berbayar | Tambahkan `getApiProfile()` + batasi ke role `admin` (perbaikan beberapa baris) | **Pemblokir** |
| **R3** | Tidak ada rate limiting; laporan performa mendokumentasikan efek bola salju akibat pengguna menekan Refresh | Sistem bisa jatuh dan sulit pulih | `limit_req` + `limit_conn` di Nginx (§7.4) | Tinggi |
| **R4** | Tabel `pencatatan_non_tender_realisasi` tidak memiliki DDL dan tidak masuk daftar impor, padahal di-JOIN oleh view PL & PnL | **Setup database dari nol akan gagal pada fase `40_`** | Tulis DDL, tambahkan ke `25_IMPORT_DATA_CSV.sql` | Tinggi (memblokir instalasi bersih) |

---

## 9. Capacity Planning

### 9.1. Model beban

| Parameter | Nilai | Sumber |
|---|---|---|
| Pengguna terdaftar | 200–500 | Asumsi A1 |
| Puncak bersamaan (target) | 50 | Asumsi A2 |
| Puncak bersamaan (headroom desain) | 100 | Asumsi A2 |
| Pemuatan halaman per sesi | ± 8 | Estimasi pola pemakaian |
| Rasio puncak terhadap rata-rata | 5 : 1 | Beban terkonsentrasi pada jam kerja |
| Request database per pemuatan halaman | 26 (A) → 2 (B) | Terukur / target |
| Payload per pemuatan halaman | 19,7 MB (A) → ± 50 KB (B) | Terukur / target |

### 9.2. Perhitungan kapasitas VM Data

**Skenario A — deploy kode apa adanya**

| Langkah perhitungan | Nilai |
|---|---|
| Request bersamaan pada puncak | 50 pengguna × 26 request = **1.300** |
| Sebaran waktu request | ± 10 detik | 
| Laju request | **130 request/detik** |
| Waktu proses rata-rata per request (view berlapis, terukur) | 1,3 detik |
| Kapasitas CPU yang diperlukan | 130 × 1,3 = **169 detik-CPU per detik** |
| Core yang dibutuhkan bila serial murni | 169 core ← **tidak realistis** |
| Setelah indeks + cache (hit ratio ≥ 95%) | Waktu proses turun ke ± 0,05 detik → 130 × 0,05 = **6,5 core** |
| **Rekomendasi** | **8 core** (6,5 + margin) |

Perhitungan ini menjelaskan mengapa VM Data harus dispesifikasikan dengan RAM besar: **satu-satunya cara membuat Skenario A layak adalah memastikan seluruh working set berada di memori.** Bila database membaca dari disk, angka 1,3 detik yang berlaku, dan tidak ada jumlah core yang mencukupi.

| Alokasi memori | Nilai |
|---|---|
| Working set (data + indeks tahun berjalan) | ± 2,5 GB |
| `shared_buffers` | **8 GB** (25% dari 32 GB) |
| `effective_cache_size` | 24 GB |
| `work_mem` | 32 MB (× hingga 200 koneksi = potensi 6,4 GB) |
| `maintenance_work_mem` | 1 GB |
| Overhead koneksi | 200 × 9 MB ≈ 1,8 GB |
| Container Supabase (Kong, GoTrue, PostgREST, Supavisor) | ± 2 GB |
| Page cache OS | sisanya ± 8 GB |
| **Total** | **32 GB** |

**Skenario B — setelah optimasi**

| Langkah perhitungan | Nilai |
|---|---|
| Request bersamaan pada puncak | 50 × 2 = **100** |
| Laju request | 10 request/detik |
| Waktu proses per request (baca materialized view) | 0,015 detik |
| Kapasitas CPU yang diperlukan | **0,15 core** |
| **Rekomendasi** | **4 core / 16 GB** sudah lebih dari cukup |

> Perbedaan antara kedua skenario adalah **faktor ± 40× pada kebutuhan CPU database**. Ini bukan penghematan marginal — ini perbedaan antara server kelas menengah dan server kelas kecil.

### 9.3. Perhitungan kapasitas VM Aplikasi

Server aplikasi menanggung beban yang jauh lebih ringan, karena agregasi dilakukan di browser.

| Beban | Perhitungan | Kebutuhan |
|---|---|---|
| Penyajian aset statis | 5,2 MB × 50 pengguna, cache-able | Ditangani Nginx, ± 0,5 core |
| Eksekusi proxy (`src/proxy.ts`) | 50 pengguna × 8 navigasi = 400 eksekusi, masing-masing 2 panggilan jaringan | Terikat I/O, bukan CPU: ± 1 core |
| Route Handler API | `/api/paket`, `/api/ppk` — trafik rendah | ± 0,5 core |
| `recalculate` risiko | 200 paket per panggilan, hanya dijalankan admin, terjadwal | ± 1 core, sesaat |
| Render SSR | Minimal (halaman sebagian besar client-side) | ± 0,5 core |
| **Total** | | **± 3,5 core → alokasikan 4** |

Memori: 2 proses Node × (600 MB baseline + 400 MB puncak `sharp`) = ± 2 GB, ditambah page cache Nginx dan headroom OS → **8 GB**.

### 9.4. Proyeksi pertumbuhan 5 tahun

Data pengadaan bertambah per tahun anggaran. Basis: 7.734 paket untuk TA 2026.

| Tahun | Tahun anggaran aktif | Kumulatif paket | Ukuran DB | Beban query | Tindakan |
|---|---|---|---|---|---|
| 2026 | 1 | 7.734 | ± 2,5 GB | Baseline | — |
| 2027 | 2 | ± 16.000 | ± 5 GB | 2× | **Wajib** filter tahun anggaran pada seluruh view (Langkah 2 laporan performa) |
| 2028 | 3 | ± 25.000 | ± 8 GB | 2× (dengan filter tahun) | Partisi tabel per `tahun_anggaran` |
| 2029 | 4 | ± 34.000 | ± 11 GB | 2× | Arsipkan TA 2026 ke tabel dingin |
| 2030 | 5 | ± 43.000 | ± 14 GB | 2× | Tinjau kebijakan retensi |

> **Peringatan pertumbuhan yang paling penting.** View saat ini **tidak memfilter berdasarkan tahun anggaran** — pengguna yang membuka Ringkasan menarik seluruh paket dari seluruh tahun. Tanpa perbaikan, beban per pemuatan halaman **berlipat ganda setiap tahun anggaran baru**. Pada TA 2028 payload akan mencapai ± 60 MB per pemuatan halaman, yang tidak lagi dapat dipakai. Penambahan filter tahun anggaran bersifat **wajib sebelum akhir 2026**, terlepas dari optimasi lain.

Storage 250 GB pada VM Data mencukupi hingga tahun ke-5 dengan margin lebar; batasannya adalah ruang backup dan `VACUUM`, bukan volume data itu sendiri.

### 9.5. Ambang batas untuk scale-up

| Metrik | Ambang peringatan | Ambang tindakan | Tindakan |
|---|---|---|---|
| CPU VM Data (rata-rata 5 menit) | > 60% | > 80% | Tambah core atau percepat optimasi Skenario B |
| Cache hit ratio PostgreSQL | < 98% | < 95% | Tambah RAM / naikkan `shared_buffers` |
| Utilisasi pool koneksi | > 70% | > 85% | Perbesar pool atau tambah read replica |
| p95 waktu respons halaman | > 5 detik | > 10 detik | Investigasi query, aktifkan cache |
| Utilisasi disk | > 70% | > 80% | Perluas volume |
| Laju galat 5xx | > 0,5% | > 2% | Insiden |
| RSS proses Node | > 1,5 GB | > 2,5 GB | Investigasi kebocoran memori; jadwalkan restart bergilir |

---

## 10. Environment & Prosedur Deployment

### 10.1. Matriks environment

| Aspek | DEV | UAT | PRODUKSI |
|---|---|---|---|
| Tujuan | Pengembangan | Pengujian penerimaan pengguna | Layanan operasional |
| Topologi | T1 all-in-one | T1 all-in-one | T2 dua VM |
| Data | Subset anonim | Salinan produksi tersamarkan | Data sebenarnya |
| Hostname | `dev-dewa-pbj.internal` | `uat-dewa-pbj.kemnaker.go.id` | `dewa-pbj.kemnaker.go.id` |
| Build terpisah | Ya (URL Supabase berbeda tertanam) | Ya | Ya |
| Backup | Tidak | Mingguan | Harian + WAL |
| Monitoring | Tidak | Dasar | Penuh |
| Akses | Tim pengembang | Tim + pengguna penguji | Seluruh pengguna |

> **Setiap environment memerlukan build tersendiri.** Karena `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` ditanam ke bundle saat `next build`, artefak UAT **tidak dapat** dipromosikan langsung ke produksi. Yang dipromosikan adalah *commit*, bukan artefak build.

### 10.2. Variabel lingkungan

| Variabel | Sifat | Contoh | Waktu berlaku |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Wajib** | `https://api-dewa-pbj.kemnaker.go.id` | **Build** (tertanam di bundle) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Wajib** | `eyJhbGciOi...` | **Build** (tertanam di bundle) |
| `SUPABASE_SERVICE_ROLE_KEY` | Disarankan | `eyJhbGciOi...` | Runtime (server) |
| `GEMINI_API_KEY` | Opsional | `AIza...` | Runtime (server) |
| `GEMINI_MODEL` | Opsional | default `gemini-3.5-flash` | Runtime (server) |
| `PORT` | Opsional | `3000` | Runtime |
| `HOSTNAME` | Opsional | `0.0.0.0` | Runtime |
| `NODE_ENV` | Wajib | `production` | Runtime |
| `MALLOC_ARENA_MAX` | Disarankan | `2` | Runtime (pengendali memori `sharp`) |

Tanpa dua variabel Supabase, **seluruh pengambilan data gagal**. Tanpa `GEMINI_API_KEY`, hanya `/api/kurasi` yang membalas 500 dengan pesan jelas; bagian aplikasi lain tetap berjalan.

### 10.3. Alur build & deployment

```
  Git repository (GitLab/Gitea internal)
            │  git tag v1.x.x
            ▼
  ┌─────────────────────────────────────┐
  │ BUILD SERVER (punya egress)         │
  │  1. npm ci                          │
  │  2. npm run lint                    │
  │  3. npm run test        (vitest)    │
  │  4. npx tsc --noEmit                │
  │  5. npm run build       (standalone)│
  │  6. cp -r public   .next/standalone/│
  │     cp -r .next/static              │
  │            .next/standalone/.next/  │
  │  7. tar + checksum SHA-256          │
  └───────────────┬─────────────────────┘
                  │ artefak ± 400 MB
                  ▼
  ┌─────────────────────────────────────┐
  │ VM APLIKASI (tanpa egress)          │
  │  8.  verifikasi checksum            │
  │  9.  ekstrak ke /opt/dewa-pbj/      │
  │      releases/<tag>/                │
  │  10. symlink current → <tag>        │
  │  11. systemctl restart dewa-pbj     │
  │  12. health check                   │
  │  13. rollback bila gagal            │
  └─────────────────────────────────────┘
```

**Gerbang mutu wajib sebelum artefak dibuat:** `npm run lint`, `npm run test`, dan `npx tsc --noEmit` harus lulus. Proyek memakai `strict: true` dan build pernah gagal karena pelanggaran tipe — memindahkan kegagalan itu ke build server jauh lebih murah daripada menemukannya di produksi.

### 10.4. Contoh systemd unit

```ini
[Unit]
Description=DEWA-PBJ Next.js Application
After=network.target

[Service]
Type=simple
User=dewa
Group=dewa
WorkingDirectory=/opt/dewa-pbj/current
EnvironmentFile=/opt/dewa-pbj/config/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=MALLOC_ARENA_MAX=2
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/dewa-pbj/app.log
StandardError=append:/var/log/dewa-pbj/error.log

# Pengerasan
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/dewa-pbj /opt/dewa-pbj/data
MemoryMax=3G

[Install]
WantedBy=multi-user.target
```

### 10.5. Prosedur pembangunan database

Ikuti [sql/migrations/README.md](../sql/migrations/README.md) — jalankan berkas `00` hingga `70` secara berurutan.

| Fase | Berkas | Isi |
|---|---|---|
| 1. RBAC | `00`–`01` | Enum `app_role`, tabel `profiles`, trigger, RLS, seed |
| 2. Tabel sumber | `10`–`18` | `master_data`, e-purchasing, non-tender, anggaran, afirmasi, kaji ulang, alias, kurasi |
| 3. **Impor data** | `25` | **BERHENTI di sini** — impor CSV/JSON manual atau lewat `scripts/update_from_data_update.mjs` |
| 4. View dasar | `30`–`31` | `view_paket_*_master_data`, `view_rup_final`, RPC `get_rup_history` |
| 5. View dashboard | `40`–`45` | Lima view realisasi + view gabungan |
| 6. View agregat | `50` | Keterisian SIRUP per Eselon I |
| 7. **Indeks** | `60`–`61` | **Jangan dilewati** — tanpa indeks fungsional `LTRIM`, join satker melakukan full scan |
| 8. Tambahan | `62`–`70` | Risiko, kolom lokasi, HPS, perpindahan JF |

**Verifikasi akhir:**

```bash
node scripts/diag_unknown_satker.mjs   # satker & eselon1 'Tidak Diketahui' harus 0
```

> ⚠️ **Pemblokir yang diketahui.** Tabel `pencatatan_non_tender_realisasi` di-JOIN oleh view PL dan PnL (`40_`, `42_`, `43_`) tetapi **tidak dibuat oleh migrasi mana pun** dan tidak ada pada daftar impor `25_`. Instalasi bersih akan gagal pada fase 5 sampai DDL-nya dilengkapi. Lihat R4 pada §8.6.

### 10.6. Migrasi data dari Supabase Cloud

| Langkah | Perintah / tindakan |
|---|---|
| 1. Dump skema + data | `pg_dump -h db.<ref>.supabase.co -U postgres --schema=public --schema=auth -Fc -f dewa.dump` |
| 2. Salin ke VM Data | Melalui jump host, terenkripsi |
| 3. Restore | `pg_restore -d postgres -j 4 --no-owner dewa.dump` |
| 4. Verifikasi jumlah baris | Bandingkan `COUNT(*)` per tabel antara sumber dan tujuan |
| 5. Regenerasi tipe TypeScript | `npx supabase gen types typescript --db-url <url-lokal> --schema public > database.types.ts` |
| 6. **Reset kata sandi seluruh pengguna** | JWT secret berbeda; hash kata sandi GoTrue tidak dapat dipindah antar-instance |
| 7. Jalankan `diag_unknown_satker.mjs` | Verifikasi integritas join |

### 10.7. Pembaruan data terjadwal

Mekanisme sudah ada: [`scripts/update_from_data_update.mjs`](../scripts/update_from_data_update.mjs). **Jangan menulis skrip impor baru.**

| Aspek | Setelan |
|---|---|
| Jadwal | Harian pukul 02.00 WIB (di luar jam kerja) |
| Penjadwal | systemd timer (lebih disarankan daripada cron — lognya terintegrasi) |
| Sumber | `data/data_update/<nama_tabel>/*.json` — **selalu utamakan JSON**, karena CSV/Excel menghilangkan nol di depan pada `kd_satker_str` |
| Prosedur wajib | **Selalu jalankan `--dry-run` lebih dahulu** |
| Kredensial | `SUPABASE_SERVICE_ROLE_KEY` (setelah RLS diperketat sesuai R1, anon key tidak lagi cukup) |
| Refresh view | Tidak perlu — seluruhnya view biasa, bukan materialized view. **Berubah setelah Skenario B**: tambahkan `REFRESH MATERIALIZED VIEW CONCURRENTLY` sesudah update |
| Pemantauan | Kegagalan job harus memicu alert; data basi lebih berbahaya daripada data kosong |

---

## 11. Backup, Disaster Recovery, RPO/RTO

### 11.1. Sasaran

| Sasaran | Nilai | Justifikasi |
|---|---|---|
| **RPO** (Recovery Point Objective) | **24 jam** | Data bersumber dari SIRUP/INAPROC dan dapat ditarik ulang; kehilangan satu siklus update dapat dipulihkan dengan menjalankan ulang skrip update |
| **RTO** (Recovery Time Objective) | **4 jam** | Sistem bersifat analitik/pelaporan, bukan transaksional. Ketidaktersediaan tidak menghentikan proses pengadaan itu sendiri |
| **RPO data unik** (`ai_kurasi_paket`, `risiko_pengadaan`, `profiles`) | **1 jam** | Ini satu-satunya data yang **tidak dapat** ditarik ulang dari sumber eksternal |

> Pembedaan pada baris terakhir penting. Sebagian besar isi database adalah salinan sumber eksternal dan dapat dibangun ulang. Tiga tabel di atas — hasil kurasi AI, skor risiko, dan akun pengguna — dihasilkan sistem ini sendiri dan hilang selamanya bila tidak di-backup.

### 11.2. Strategi backup

| Jenis | Frekuensi | Retensi | Lokasi | Metode |
|---|---|---|---|---|
| Dump logis penuh | Harian 03.00 WIB | 30 hari | Storage backup + salinan luar lokasi | `pg_dump -Fc` |
| Arsip WAL | Berkelanjutan | 7 hari | Storage backup | `archive_command` → PITR |
| Snapshot basis fisik | Mingguan | 12 minggu | Storage backup | `pg_basebackup` |
| Tabel data unik | Tiap jam | 7 hari | Storage backup | `pg_dump -t ai_kurasi_paket -t risiko_pengadaan -t profiles` |
| Konfigurasi (`.env`, Nginx, systemd, compose) | Setiap perubahan | 1 tahun | Repositori konfigurasi | Git terenkripsi |
| Artefak rilis | Setiap rilis | 5 rilis terakhir | Repositori artefak | tar + SHA-256 |
| Sumber `data/data_update/` | Setiap tarikan | 90 hari | Storage backup | rsync |

**Aturan 3-2-1:** 3 salinan, 2 media berbeda, 1 di luar lokasi. Seluruh backup **terenkripsi**.

### 11.3. Pengujian pemulihan

| Uji | Frekuensi | Kriteria lulus |
|---|---|---|
| Restore dump ke environment UAT | Bulanan | Jumlah baris cocok; `diag_unknown_satker.mjs` bersih |
| PITR ke titik waktu tertentu | Triwulanan | Berhasil memulihkan ke T-6 jam |
| Simulasi DR penuh (bangun ulang dari nol) | Tahunan | RTO 4 jam tercapai |
| Verifikasi integritas berkas backup | Mingguan otomatis | Checksum valid, `pg_restore --list` berhasil dibaca |

> Backup yang belum pernah diuji restore-nya bukan backup — ia baru sekadar berkas.

### 11.4. Skenario kegagalan & tindakan

| Skenario | Dampak | Tindakan | Estimasi waktu |
|---|---|---|---|
| Proses Node crash | Aplikasi mati | `Restart=always` pada systemd | < 10 detik, otomatis |
| VM Aplikasi mati | Aplikasi mati; data aman | Bangun ulang dari artefak rilis | < 30 menit |
| PostgreSQL korup | Sistem mati total | Restore dari dump harian + replay WAL | < 4 jam |
| Disk VM Data penuh | Postgres berhenti menulis | Perluas volume; bersihkan WAL lama | < 1 jam |
| Kesalahan update data (data salah masuk) | Angka dashboard keliru | Mode `upsert` menyimpan data lama; mode `replace` memulihkan otomatis dari backup internal skrip | < 1 jam |
| Kuota Gemini habis | AI Kurasi mati | Fitur lain tetap berjalan; tunggu reset kuota | Tidak berdampak pada layanan inti |
| Sertifikat TLS kedaluwarsa | Seluruh akses gagal | **Cegah** dengan alert H-30 | — |

---

## 12. Monitoring, Logging & Alerting

### 12.1. Tumpukan monitoring yang diusulkan

| Lapis | Perangkat | Metrik utama |
|---|---|---|
| Infrastruktur | Prometheus + node_exporter | CPU, RAM, disk, I/O, jaringan |
| Database | postgres_exporter | Koneksi, cache hit ratio, query lambat, ukuran tabel, lag replikasi |
| Aplikasi | node_exporter + log terstruktur | RSS proses, event loop lag, laju galat |
| Reverse proxy | nginx_exporter | Laju request, kode status, waktu upstream |
| Sintetik | Blackbox exporter | Health check tiap 60 detik terhadap `/login` dan `/api/paket` |
| Dasbor | Grafana | Ringkasan eksekutif + panel teknis |
| Alert | Alertmanager → email/WhatsApp instansi | Lihat §12.3 |

Alternatif ringan bila instansi tidak menginginkan tumpukan Prometheus: Zabbix (umum dipakai di lingkungan pemerintah) dengan template PostgreSQL dan Nginx.

### 12.2. Log yang wajib dikumpulkan

| Sumber | Lokasi | Retensi | Catatan |
|---|---|---|---|
| Akses Nginx | `/var/log/nginx/access.log` | 90 hari | Format JSON agar mudah diurai |
| Galat Nginx | `/var/log/nginx/error.log` | 90 hari | |
| Aplikasi Node | `/var/log/dewa-pbj/app.log` | 30 hari | Rotasi harian |
| PostgreSQL | `log_min_duration_statement = 1000` | 30 hari | Menangkap query > 1 detik |
| Audit PostgreSQL | `pgaudit` | 1 tahun | DDL & DML pada tabel sensitif |
| Autentikasi GoTrue | Log container | 90 hari | Percobaan login gagal |
| Job update data | Journal systemd | 90 hari | Termasuk keluaran dry-run |
| SSH / sudo | `/var/log/auth.log` | 1 tahun | Kepatuhan |

**Wajib:** log tidak boleh memuat anon key, service role key, `GEMINI_API_KEY`, atau isi cookie sesi.

### 12.3. Aturan alert

| Alert | Kondisi | Tingkat | Aksi |
|---|---|---|---|
| Aplikasi mati | Health check gagal 2× berturut-turut | Kritis | Panggil piket segera |
| Database mati | `pg_isready` gagal | Kritis | Panggil piket segera |
| Disk > 80% | Utilisasi disk mana pun | Kritis | Perluas dalam 4 jam |
| Cache hit ratio < 95% | Rata-rata 15 menit | Peringatan | Tinjau `shared_buffers` |
| p95 respons > 10 detik | Rata-rata 5 menit | Peringatan | Investigasi query |
| Laju 5xx > 2% | Rata-rata 5 menit | Kritis | Investigasi |
| Pool koneksi > 85% | Sesaat | Peringatan | Perbesar pool |
| Job update data gagal | Kode keluar bukan nol | Kritis | Jalankan ulang manual |
| Sertifikat TLS < 30 hari | Harian | Peringatan | Perpanjang |
| Backup gagal | Kode keluar bukan nol | Kritis | Investigasi hari itu juga |
| RSS Node > 2,5 GB | Rata-rata 10 menit | Peringatan | Jadwalkan restart |

---

## 13. Prasyarat Wajib Sebelum Go-Live

### 13.1. Pemblokir — go-live tidak boleh dilakukan sebelum selesai

| # | Item | Penanggung jawab | Rujukan |
|---|---|---|---|
| B1 | Tutup celah anon key: `security_invoker` + cabut grant `anon` + RLS tingkat data | Tim pengembang | R1, §8.6 |
| B2 | Tambahkan autentikasi + gating role admin pada `/api/kurasi` | Tim pengembang | R2, §8.6 |
| B3 | Lengkapi DDL & entri impor `pencatatan_non_tender_realisasi` | Tim pengembang | R4, §8.6 |
| B4 | Tambahkan `output: 'standalone'` pada `next.config.ts` | Tim pengembang | §6.7 |
| B5 | Tetapkan hostname DNS final **sebelum** build produksi pertama | Tim infrastruktur | §7.3 |
| B6 | Sertifikat TLS terbit dan terpasang | Tim infrastruktur | §7.3 |
| B7 | Aktifkan kompresi gzip/brotli di Nginx | Tim infrastruktur | §7.4 |
| B8 | Pasang connection pooler (Supavisor/PgBouncer) | Tim infrastruktur | §5.4 |
| B9 | Backup berjalan dan **uji restore berhasil** | Tim infrastruktur | §11.3 |
| B10 | Reset kata sandi seluruh pengguna pasca-migrasi | Tim aplikasi | §10.6 |

### 13.2. Sangat disarankan — dikerjakan pada 30 hari pertama

| # | Item | Dampak |
|---|---|---|
| S1 | Rate limiting Nginx | Mencegah efek bola salju yang terdokumentasi (R3) |
| S2 | Filter tahun anggaran pada seluruh view | **Wajib sebelum TA 2027** — tanpa ini beban berlipat tiap tahun (§9.4) |
| S3 | Materialized view untuk agregat Ringkasan | Langkah tunggal berdampak terbesar; ± 1 hari kerja |
| S4 | Lazy-load `exceljs` / `jspdf` / `html-to-image` | Memangkas bundle awal dari 1,4 MB ke ± 400 KB |
| S5 | Ganti `next/font/google` → `next/font/local` | Menghilangkan ketergantungan build pada internet |
| S6 | Monitoring & alerting aktif penuh | Visibilitas operasional |
| S7 | Seragamkan format `kd_rup` dan tipe data nilai uang | Mencegah galat angka senyap (§5.2 laporan performa) |

### 13.3. Jangka menengah — 3 sampai 6 bulan

| # | Item |
|---|---|
| M1 | Cache lapis kedua (Redis atau `unstable_cache` Next.js) untuk agregat bersama |
| M2 | Partisi tabel per `tahun_anggaran` |
| M3 | Read replica PostgreSQL untuk beban baca berat |
| M4 | Topologi HA (T3) bila SLA menuntut ≥ 99,9% |
| M5 | Sambungkan ITKP komponen B/C/D ke sumber data nyata (kini masih `dummyBCD.ts`) |
| M6 | Pipeline CI/CD penuh dengan gerbang mutu otomatis |

---

## 14. Lampiran

### Lampiran A — Ringkasan permintaan resource kepada instansi

| Item | Spesifikasi | Jumlah |
|---|---|---|
| VM Produksi — Aplikasi | 4 vCPU · 8 GB RAM · 60 GB SSD · Ubuntu 24.04 LTS | 1 |
| VM Produksi — Data | 8 vCPU · 32 GB RAM · 250 GB NVMe · Ubuntu 24.04 LTS | 1 |
| VM UAT | 4 vCPU · 16 GB RAM · 150 GB SSD | 1 |
| VM DEV | 2 vCPU · 8 GB RAM · 80 GB SSD | 1 |
| VM Build (opsional) | 4 vCPU · 8 GB RAM · 100 GB SSD · egress terkendali | 1 |
| Kuota storage backup | 500 GB | 1 |
| Alamat IP internal | 5 (ditambah 1 VIP untuk reverse proxy) | 6 |
| DNS record | `dewa-pbj`, `api-dewa-pbj` (+ varian uat/dev) | 6 |
| Sertifikat TLS | Wildcard `*.kemnaker.go.id` atau 2 SAN | 1 |
| Aturan firewall | Sesuai §7.2 | 13 |
| Egress internet (opsional) | `generativelanguage.googleapis.com:443` dari VM Aplikasi | 1 |
| Egress internet (build) | npm registry, Google Fonts, Git | 3 |
| **Total produksi** | **12 vCPU · 40 GB RAM · 310 GB** | |
| **Total seluruh environment** | **± 22 vCPU · 72 GB RAM · 640 GB** | |

### Lampiran B — Checklist verifikasi pasca-deployment

**Fungsional**

- [ ] Halaman login tampil, autentikasi berhasil untuk ketiga role
- [ ] Role `admin` dapat mengakses seluruh 13 rute
- [ ] Role `sekjend` hanya dapat mengakses `/`, `/rencana-pengadaan`, `/itkp`
- [ ] Role `ppk` hanya melihat paket miliknya sendiri; filter Eselon/Satker terkunci
- [ ] Halaman Ringkasan menampilkan KPI, grafik, dan panel anomali
- [ ] Kelima modul realisasi memuat tabel paket dan modal detail
- [ ] ITKP menampilkan skor komponen A–D
- [ ] Ekspor XLSX, CSV, dan PDF menghasilkan berkas benar
- [ ] `/api/paket` dan `/api/ppk` membalas 401 tanpa sesi
- [ ] AI Kurasi berjalan **atau** membalas galat yang jelas bila dinonaktifkan

**Non-fungsional**

- [ ] TLS berlaku, nilai SSL Labs A atau lebih baik
- [ ] Seluruh header keamanan §8.3 terpasang
- [ ] Kompresi gzip/brotli aktif — verifikasi `Content-Encoding` pada respons PostgREST
- [ ] Aset statis dikirim dengan `Cache-Control: immutable`
- [ ] Rate limiting terbukti (uji dengan 100 request cepat)
- [ ] Port 5432 **tidak** dapat dijangkau dari zona klien
- [ ] Supabase Studio **tidak** dapat dijangkau dari zona klien
- [ ] Backup berjalan otomatis dan uji restore lulus
- [ ] Monitoring mengirim data; alert diuji dengan pemadaman terkendali
- [ ] `diag_unknown_satker.mjs` melaporkan 0 satker tak dikenal
- [ ] Uji beban 50 pengguna bersamaan lulus dengan p95 < 10 detik

### Lampiran C — Glosarium

| Istilah | Penjelasan |
|---|---|
| **PostgREST** | Layanan yang mengubah tabel dan view PostgreSQL menjadi REST API secara otomatis. Inilah yang dipanggil browser secara langsung |
| **GoTrue** | Layanan autentikasi Supabase yang menerbitkan dan memperbarui token JWT |
| **Kong** | API gateway yang menjadi pintu masuk tunggal ke seluruh layanan Supabase |
| **Anon key** | Kunci publik yang tertanam di bundle JavaScript. Bukan rahasia; pengamanannya bergantung pada RLS |
| **Service role key** | Kunci istimewa yang melewati RLS. **Tidak boleh** menyentuh browser |
| **RLS (Row Level Security)** | Fitur PostgreSQL yang membatasi baris yang boleh dibaca tiap pengguna, ditegakkan oleh database, bukan aplikasi |
| **Materialized view** | Hasil query yang disimpan sebagai tabel dan disegarkan berkala. Disebut "rekap tersimpan" pada laporan performa |
| **Connection pooling** | Berbagi pakai sejumlah kecil koneksi database untuk melayani banyak permintaan |
| **Standalone output** | Mode build Next.js yang menghasilkan berkas minimal siap jalan tanpa `node_modules` |
| **RPO / RTO** | Berapa banyak data yang boleh hilang / berapa lama sistem boleh mati |
| **Cold load** | Pembukaan halaman tanpa cache — kondisi terberat |
| **Working set** | Bagian data yang aktif dibaca; idealnya seluruhnya muat di RAM |

### Lampiran D — Rujukan

**Internal**

- [docs/BASELINE-ARSITEKTUR.md](BASELINE-ARSITEKTUR.md) — arsitektur, RBAC, model data, utang teknis
- [docs/LAPORAN-ANALISIS-PERFORMA.md](LAPORAN-ANALISIS-PERFORMA.md) — pengukuran beban, 8 langkah optimasi
- [docs/RUNBOOK-UPDATE-DATA.md](RUNBOOK-UPDATE-DATA.md) — prosedur pembaruan data
- [sql/migrations/README.md](../sql/migrations/README.md) — urutan build database
- [AGENTS.md](../AGENTS.md) — catatan bahwa Next.js di repo ini berbeda dari versi umum
- `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` — panduan self-hosting resmi versi terpasang

**Eksternal**

- Next.js 16 — Deploying, Self-Hosting, `output: 'standalone'`, Content Security Policy
- Supabase — Self-Hosting with Docker
- PostgreSQL 15 — Server Configuration, Backup and Restore
- Perpres 95/2018 (SPBE) · PP 71/2019 (PSTE) · UU 27/2022 (PDP) · Perpres 12/2021 (Pengadaan)

---

**Riwayat dokumen**

| Versi | Tanggal | Perubahan | Penyusun |
|---|---|---|---|
| 1.0 | 3 September 2026 | Terbitan awal | Tim Pengembang DEWA-PBJ |

**Persetujuan**

| Peran | Nama | Tanda tangan | Tanggal |
|---|---|---|---|
| Penyusun — Tim Pengembang | | | |
| Peninjau — Pusat Data & Teknologi Informasi | | | |
| Peninjau — Keamanan Informasi | | | |
| Menyetujui — Kepala UKPBJ | | | |
