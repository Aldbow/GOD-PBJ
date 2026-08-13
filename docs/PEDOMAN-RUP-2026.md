# Pedoman Pengisian RUP 2026

> Transkripsi dari `data/Copy of PEDOMAN RUP 2026.pdf`.
>
> **Sumber:** Lampiran Nota Dinas Nomor **1/41/UM.02/I/2026**, Tanggal **07 Januari 2026**.
>
> Ekstraksi PDF asli sempat menggabungkan kolom secara tidak konsisten karena beberapa
> sel tabel sumbernya membungkus 2 baris teks (nama akun panjang, atau "Cara
> Pengadaan"/"Metode Pemilihan" yang juga dua baris). Transkripsi di bawah sudah
> disatukan per baris data dan divalidasi silang lewat dua mode ekstraksi berbeda
> (`pdftotext -layout` dan `pdftotext -table`) — bila ragu pada satu baris tertentu,
> rujuk kembali ke PDF asli.
>
> **Catatan penting untuk pemakaian di AI Kurasi:** tabel ini memetakan berdasarkan
> **Kode Akun (MAK)**, sedangkan data paket RUP yang tersedia untuk kurasi **tidak
> memuat kode akun sama sekali** (lihat batasan data di `src/lib/kurasi/prompt.ts`).
> Karena itu tabel ini dipakai sebagai referensi pola **nama paket** yang lazim per
> kategori (Non Pengadaan / Dikecualikan / Penyedia), bukan sebagai lookup langsung
> kode akun → status.

## 1. Pedoman Pengisian RUP per Kode Akun

| Kode Akun | Akun | Cara Pengadaan | Metode Pemilihan |
|---|---|---|---|
| 521111 | Belanja Keperluan Perkantoran | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521113 | Belanja Penambah Daya Tahan Tubuh | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521114 | Belanja Pengiriman Surat Dinas Pos Pusat | Penyedia | **Dikecualikan** |
| 521115 | Belanja Honor Operasional Satuan Kerja | **Non Pengadaan** | Non Pengadaan |
| 521119 | Belanja Barang Operasional Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521211 | Belanja Bahan | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521213 | Belanja Honor Output Kegiatan | **Non Pengadaan** | Non Pengadaan |
| 521219 | Belanja Barang Non Operasional Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521231 | Belanja Barang Pemberian Penghargaan **dalam bentuk uang** | **Non Pengadaan** | Non Pengadaan |
| 521234 | Belanja Barang Pemberian Penghargaan **dalam bentuk barang** | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521252 | Belanja Peralatan dan Mesin - Ekstrakomptabel | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521811 | Belanja Barang Persediaan Barang Konsumsi | Penyedia | Pengadaan Langsung / E-Purchasing |
| 521832 | Belanja Barang Persediaan Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing |
| 522111 | Belanja Langganan Listrik | Penyedia | **Dikecualikan** |
| 522112 | Belanja Langganan Telepon | Penyedia | **Dikecualikan** |
| 522113 | Belanja Langganan Air | Penyedia | **Dikecualikan** |
| 522119 | Belanja Langganan Daya dan Jasa Lainnya | Penyedia | **Dikecualikan** |
| 522121 | Belanja Jasa Pos dan Giro | Penyedia | **Dikecualikan** |
| 522131 | Belanja Jasa Konsultan | Penyedia | Pengadaan Langsung / Seleksi |
| 522141 | Belanja Sewa | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 522151 | Belanja Jasa Profesi | **Non Pengadaan** | Non Pengadaan |
| 522191 | Belanja Jasa Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 523111 | Belanja Pemeliharaan Gedung dan Bangunan | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 523112 | Belanja Barang Persediaan Pemeliharaan Gedung dan Bangunan | Penyedia | Pengadaan Langsung / E-Purchasing |
| 523113 | Belanja Asuransi Gedung dan Bangunan | Penyedia | Penunjukan Langsung |
| 523119 | Belanja Pemeliharaan Gedung dan Bangunan Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 523121 | Belanja Pemeliharaan Peralatan dan Mesin | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 523123 | Belanja Barang Persediaan Pemeliharaan Peralatan dan Mesin | Penyedia | Pengadaan Langsung / E-Purchasing |
| 523129 | Belanja Pemeliharaan Peralatan dan Mesin Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 523132 | Belanja Pemeliharaan Irigasi | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 523133 | Belanja Pemeliharaan Jaringan | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 523199 | Belanja Pemeliharaan Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 524111 | Belanja Perjalanan Dinas Biasa | **Non Pengadaan** | Non Pengadaan |
| 524111 | &nbsp;&nbsp;- Tiket | Non Pengadaan | Non Pengadaan |
| 524111 | &nbsp;&nbsp;- Penginapan | Non Pengadaan | Non Pengadaan |
| 524111 | &nbsp;&nbsp;- Uang Harian | Non Pengadaan | Non Pengadaan |
| 524111 | &nbsp;&nbsp;- Taxi Bandara | Non Pengadaan | Non Pengadaan |
| 524111 | &nbsp;&nbsp;- Taxi Daerah | Non Pengadaan | Non Pengadaan |
| 524113 | Belanja Perjalanan Dinas Dalam Kota | **Non Pengadaan** | Non Pengadaan |
| 524114 | Belanja Perjalanan Dinas Paket Meeting Dalam Kota | — | — |
| 524114 | &nbsp;&nbsp;- Paket Fullday/Fullboard Meeting | Penyedia | **Dikecualikan / E-Purchasing** |
| 524114 | &nbsp;&nbsp;- Uang Harian Peserta | Non Pengadaan | Non Pengadaan |
| 524114 | &nbsp;&nbsp;- Uang Harian Panitia | Non Pengadaan | Non Pengadaan |
| 524114 | &nbsp;&nbsp;- Transport Peserta | Non Pengadaan | Non Pengadaan |
| 524114 | &nbsp;&nbsp;- Transport Narasumber dan Moderator | Non Pengadaan | Non Pengadaan |
| 524114 | &nbsp;&nbsp;- Transport Panitia | Non Pengadaan | Non Pengadaan |
| 524119 | Belanja Perjalanan Dinas Paket Meeting Luar Kota | — | — |
| 524119 | &nbsp;&nbsp;- Paket Fullday/Fullboard Meeting | Penyedia | **Dikecualikan / E-Purchasing** |
| 524119 | &nbsp;&nbsp;- Uang Harian Peserta | Non Pengadaan | Non Pengadaan |
| 524119 | &nbsp;&nbsp;- Uang Harian Panitia | Non Pengadaan | Non Pengadaan |
| 524119 | &nbsp;&nbsp;- Transport Peserta | Non Pengadaan | Non Pengadaan |
| 524119 | &nbsp;&nbsp;- Transport Narasumber dan Moderator | Non Pengadaan | Non Pengadaan |
| 524119 | &nbsp;&nbsp;- Transport Panitia | Non Pengadaan | Non Pengadaan |
| 524211 | Belanja Perjalanan Dinas Biasa - Luar Negeri (+ Tiket/Penginapan/Uang Harian/Taxi Bandara/Taxi Daerah) | Non Pengadaan | Non Pengadaan |
| 524219 | Belanja Perjalanan Dinas Lainnya - Luar Negeri (+ Tiket/Penginapan/Uang Harian/Taxi Bandara/Taxi Daerah) | Non Pengadaan | Non Pengadaan |
| 526112 | Belanja Peralatan Dan Mesin Untuk Diserahkan Kepada Masyarakat/Pemda | Penyedia | Pengadaan Langsung / E-Purchasing |
| 526123 | Belanja Gedung Dan Bangunan Untuk Diserahkan kepada Masyarakat/Pemda **dalam bentuk uang** | Non Pengadaan / Swakelola | Non Pengadaan / Swakelola |
| 526312 | Belanja Barang untuk Bantuan Lainnya yang Memiliki Karakteristik Bantuan Pemerintah | Penyedia | Pengadaan Langsung / E-Purchasing |
| 531114 | Belanja Modal Pembuatan Sertifikat Tanah | Penyedia | Pengadaan Langsung |
| 532111 | Belanja Modal Peralatan dan Mesin | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 533111 | Belanja Modal Gedung dan Bangunan | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 533113 | Belanja Modal Upah Tenaga Kerja dan Honor Pengelola Teknis Gedung dan Bangunan | Non Pengadaan / Swakelola | Non Pengadaan / Swakelola |
| 533115 | Belanja Modal Perencanaan dan Pengawasan Gedung dan Bangunan | Penyedia | Pengadaan Langsung / Seleksi |
| 533121 | Belanja Penambahan Nilai Gedung dan Bangunan | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |
| 536111 | Belanja Modal Lainnya | Penyedia | Pengadaan Langsung / E-Purchasing / Tender |

\* Tabel ini disusun sebagai rujukan umum. Paket pengadaan dapat diidentifikasi sebagai
Swakelola apabila memiliki Surat Keputusan (SK) kegiatan swakelola meliputi Tim
Persiapan, Tim Pelaksana, dan Tim Pengawas swakelola.

### Pola yang terlihat dari tabel di atas

- **"Non Pengadaan"** selalu dipakai untuk: honorarium (Honor Operasional, Honor
  Output Kegiatan, Honor Pengelola Teknis), penghargaan **dalam bentuk uang** (bukan
  barang), jasa profesi, dan **seluruh komponen perjalanan dinas** (tiket, penginapan,
  uang harian, taksi, transport peserta/panitia/narasumber) — **kecuali** paket
  Fullday/Fullboard Meeting itu sendiri (524114/524119), yang tetap `Penyedia` /
  `Dikecualikan / E-Purchasing` karena itu jasa penyelenggaraan event dari vendor,
  bukan komponen personal.
- **"Dikecualikan"** pada kelompok akun ini konsisten dipakai untuk **layanan utilitas
  bertarif tetap/monopoli**: langganan listrik (PLN), telepon (Telkom), air (PDAM),
  daya & jasa lainnya, jasa pos & giro, dan pengiriman surat dinas — bukan soal nilai
  pagunya, tapi karena sifat layanannya (penyedia tunggal, tarif sudah ditetapkan
  pemerintah/BUMN).
- Beberapa akun modal Swakelola (526123, 533113) memakai notasi ganda **"Non
  Pengadaan / Swakelola"** — artinya nilainya bisa dibayarkan langsung (non
  pengadaan) atau dilaksanakan lewat skema Swakelola, tidak pernah lewat Penyedia.

## 2. Klasifikasi Paket Pengadaan Berdasarkan Metode Pemilihan

| No | Metode Pemilihan | Jenis Pengadaan | Batasan Nilai (Nominal) | Catatan |
|---|---|---|---|---|
| 1 | E-Purchasing | Barang / Pekerjaan Konstruksi / Jasa Konsultansi / Jasa Lainnya | Tidak dibatasi | — |
| 2 | Pengadaan Langsung | Barang | Rp200.000.000 | Rp50 juta wajib SPSE fitur transaksional |
| 2 | Pengadaan Langsung | Pekerjaan Konstruksi | Rp400.000.000 | Rp50 juta wajib SPSE fitur transaksional |
| 2 | Pengadaan Langsung | Jasa Lainnya | Rp200.000.000 | Rp50 juta wajib SPSE fitur transaksional |
| 2 | Pengadaan Langsung | Jasa Konsultansi | Rp100.000.000 | Wajib SPSE fitur transaksional (berapapun nilainya) |
| 3 | Penunjukan Langsung | Barang / Pekerjaan Konstruksi / Jasa Konsultansi / Jasa Lainnya | Tidak dibatasi | Keadaan Kahar / Hanya 1 Penyedia yang mampu / Instruksi Presiden / sesuai ketentuan Perpres No.46/2025 Pasal 38 (5) dan Pasal 41 (5) |
| 4 | Tender Cepat | Barang / Pekerjaan Konstruksi / Jasa Lainnya | Tidak dibatasi | Spesifikasi standar, penyedia terkualifikasi |
| 5 | Tender | Barang | > Rp200.000.000 | — |
| 5 | Tender | Pekerjaan Konstruksi | > Rp400.000.000 | — |
| 5 | Tender | Jasa Lainnya | > Rp200.000.000 | — |
| 6 | Seleksi | Jasa Konsultansi | > Rp100.000.000 | — |

\* Pelaksanaan E-Purchasing wajib dilakukan apabila tersedia dalam katalog elektronik.
Apabila tidak terdapat dalam katalog elektronik, dapat menggunakan metode pengadaan
lainnya sesuai ketentuan Pengadaan Barang/Jasa Pemerintah.

> Tabel klasifikasi ini sudah konsisten dengan ambang nilai yang dipakai
> `src/lib/kurasi/prompt.ts` — tidak ada perubahan ambang nilai yang diperlukan di
> sana. Perbaikan dari dokumen ini difokuskan pada bagian **"Dikecualikan"** dan
> **"Non Pengadaan"**, yang sebelumnya tidak dijelaskan berbasis contoh nyata.
