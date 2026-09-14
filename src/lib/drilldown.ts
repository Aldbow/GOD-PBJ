import type { Role } from '@/types';
import { canAccess } from '@/lib/auth/access';

/**
 * SATU sumber kebenaran ke mana sebuah kategori pengadaan "menuju".
 *
 * Dipakai oleh Ringkasan (klik donut / chart batang / baris tabel) dan
 * Notifikasi (tombol "Buka di Realisasi ..."). Sebelumnya dua tempat itu punya
 * petanya masing-masing dan sempat berbeda isi — mis. "Dikecualikan" dilempar ke
 * Risiko Pengadaan padahal paketnya tinggal di view Pengadaan Langsung.
 */

/** Halaman daftar paket lintas metode — tujuan universal drill-down. */
export const DAFTAR_PAKET_PATH = '/daftar-paket';

/**
 * Bucket residual di Ringkasan untuk paket yang `jenis_pengadaan`-nya kosong.
 * Bukan nama jenis yang benar-benar ada di sumber data.
 */
export const JENIS_ANOMALI = 'Paket Anomali';

/** Nilai tampilan untuk metode yang kosong di sumber data. */
export const METODE_LAINNYA = 'Lainnya';

export interface KategoriRow {
  metode_pengadaan?: string | null;
  jenis_pengadaan?: string | null;
}

/**
 * Metode sebuah baris — PERSIS seperti `aggregate()` di ringkasanData.ts.
 * Halaman tujuan wajib memakai fungsi ini, bukan membaca kolomnya langsung,
 * supaya jumlah paket yang muncul di sana sama dengan angka yang barusan diklik.
 */
export function metodeOf(row: KategoriRow): string {
  return (row.metode_pengadaan && row.metode_pengadaan.trim()) || METODE_LAINNYA;
}

/**
 * Jenis sebuah baris — PERSIS seperti `aggregate()` di ringkasanData.ts.
 *
 * Swakelola dipisahkan karena bukan bagian taksonomi Barang/Jasa/Konstruksi/
 * Konsultansi: kolom `jenis_pengadaan`-nya memang selalu kosong di sumber. Tanpa
 * pengecualian ini, 43 paket swakelola akan tertumpuk ke bucket 'Paket Anomali'
 * yang justru disediakan untuk hal lain (realisasi tanpa RUP terumumkan).
 */
export function jenisOf(row: KategoriRow): string {
  if (metodeOf(row) === 'Swakelola') return 'Swakelola';
  return (row.jenis_pengadaan && row.jenis_pengadaan.trim()) || JENIS_ANOMALI;
}

interface HalamanRealisasi {
  href: string;
  label: string;
}

/**
 * Nilai `metode_pengadaan` di bawah ini persis seperti yang tersimpan di
 * database (dikonfirmasi terhadap view_dashboard_gabungan_satker: 8 nilai
 * berbeda, tidak ada yang lain).
 */
const METODE_PAGE: Record<string, HalamanRealisasi> = {
  Tender: { href: '/tender', label: 'Realisasi Tender' },
  Seleksi: { href: '/tender', label: 'Realisasi Tender' },
  'Tender Cepat': { href: '/tender', label: 'Realisasi Tender' },
  'Pembayaran untuk Kontrak Tahun Jamak': { href: '/tender', label: 'Realisasi Tender' },
  'E-Purchasing': { href: '/epurchasing', label: 'Realisasi E-Purchasing' },
  'Pengadaan Langsung': { href: '/pengadaan-langsung', label: 'Realisasi Pengadaan Langsung' },
  Dikecualikan: { href: '/pengadaan-langsung', label: 'Realisasi Pengadaan Langsung' },
  'Penunjukan Langsung': { href: '/penunjukan-langsung', label: 'Realisasi Penunjukan Langsung' },
  Swakelola: { href: '/swakelola', label: 'Realisasi Swakelola' },
};

/**
 * Metode yang punya pill filter di halaman tujuannya — gabungan persis dari
 * METODE_OPTIONS milik PengadaanLangsungView dan TenderView. Hanya untuk nilai
 * di daftar ini `?m=` boleh dikirim; kalau tidak, halaman tujuan akan menyaring
 * ke nol baris memakai pill yang tidak ada di layar, sehingga pengguna tidak
 * punya cara mematikannya.
 *
 * 'Tender Cepat' sengaja TIDAK di sini: pill-nya tidak ada di TenderView (dan
 * tidak ada satu pun barisnya di data), jadi kliknya membuka halaman Tender apa
 * adanya — 63 paket, jujur, bukan halaman kosong.
 */
const METODE_BERFILTER = new Set([
  'Pengadaan Langsung',
  'Dikecualikan',
  'Tender',
  'Seleksi',
  'Pembayaran untuk Kontrak Tahun Jamak',
]);

/**
 * Lingkup organisasi yang sedang dilihat pengguna saat mengklik. Dibawa serta
 * supaya yang terbuka adalah paket pada lingkup yang sama dengan angka yang
 * barusan diklik — bukan lingkup penuh se-kementerian.
 */
export interface DrilldownContext {
  role: Role;
  satker?: string | null;
  ppk?: string | null;
}

export interface DrilldownTarget {
  href: string;
  /** Nama halaman tujuan, untuk tooltip dan label aksesibilitas. */
  label: string;
  /**
   * true bila halaman Realisasi khusus tidak dipakai (tidak ada, atau role ini
   * tidak berhak membukanya) sehingga dialihkan ke Daftar Paket.
   */
  isFallback: boolean;
}

/** Rakit URL: lingkup organisasi dulu, baru kategori. */
function buildHref(path: string, params: Record<string, string>, ctx: DrilldownContext): string {
  const sp = new URLSearchParams();
  // Kontrak nama param mengikuti useOrgFilters: s = satker, p = PPK.
  if (ctx.satker) sp.set('s', ctx.satker);
  if (ctx.ppk) sp.set('p', ctx.ppk);
  for (const [k, v] of Object.entries(params)) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Halaman untuk satu metode pengadaan.
 *
 * Role `sekjend` tidak punya akses ke halaman Realisasi mana pun (lihat
 * ROUTE_ACCESS di auth/access.ts) — kalau kliknya tetap diarahkan ke sana, yang
 * didapat adalah penolakan akses. Klik yang menjanjikan sesuatu lalu ditolak
 * lebih buruk daripada tidak bisa diklik sama sekali, jadi role yang tidak
 * berhak dialihkan ke Daftar Paket yang terbuka untuk semua role.
 */
export function metodeDrilldown(metode: string, ctx: DrilldownContext): DrilldownTarget {
  const page = METODE_PAGE[metode];

  if (!page || !canAccess(ctx.role, page.href)) {
    return {
      href: buildHref(DAFTAR_PAKET_PATH, { m: metode }, ctx),
      label: 'Daftar Seluruh Paket',
      isFallback: true,
    };
  }

  const params: Record<string, string> = METODE_BERFILTER.has(metode) ? { m: metode } : {};
  return { href: buildHref(page.href, params, ctx), label: page.label, isFallback: false };
}

/**
 * Halaman untuk satu jenis pengadaan — selalu Daftar Paket.
 *
 * Jenis memotong melintang metode: 5.909 paket "Barang" tersebar di kelima
 * halaman Realisasi sekaligus, jadi tidak ada satu halaman Realisasi yang isinya
 * "Barang". Daftar Paket memuat seluruh paket lintas metode, sehingga jumlahnya
 * bisa cocok persis dengan angka di Ringkasan.
 */
export function jenisDrilldown(jenis: string, ctx: DrilldownContext): DrilldownTarget {
  return {
    href: buildHref(DAFTAR_PAKET_PATH, { j: jenis }, ctx),
    label: 'Daftar Seluruh Paket',
    isFallback: false,
  };
}

/** Halaman Realisasi mentah untuk sebuah metode — dipakai modul Notifikasi. */
export function realisasiPageFor(metode: string | null | undefined): HalamanRealisasi | null {
  return (metode && METODE_PAGE[metode]) || null;
}
