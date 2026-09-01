import { supabase } from '@/lib/supabase';
import type { GabunganRow } from './ringkasanData';
import { TARGET_TRIWULAN } from './targetTriwulan';

/**
 * Sumbu waktu untuk realisasi.
 *
 * Persoalannya: SEMUA view dasbor (view_dashboard_gabungan_satker dan kawan-
 * kawannya) sudah teragregasi per kd_rup dan tidak membawa satu pun kolom
 * tanggal. Tanggalnya cuma ada di tabel dasar. Sebaliknya tabel dasar tidak
 * membawa satker/PPK hasil pemetaan master_data, jadi tidak bisa ikut filter
 * halaman Ringkasan.
 *
 * Jadi keduanya dipakai bersama, bukan salah satunya saja:
 *   - NILAI dan atribusi satker/PPK diambil dari baris view yang sudah difilter
 *     halaman — persis angka yang dipakai kartu KPI;
 *   - BENTUK waktunya diambil dari tabel dasar, sebagai bobot per kd_rup.
 *
 * Efeknya ujung kurva selalu sama dengan angka kartu "Sudah Realisasi" pada
 * filter apa pun, sehingga kurva tidak pernah menyanggah kartu di atasnya.
 */

type Row = Record<string, unknown>;

/** Angka dari Supabase bisa datang sebagai teks dengan koma desimal. */
function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function firstNonZero(...vs: unknown[]): number {
  for (const v of vs) {
    const n = num(v);
    if (n !== 0) return n;
  }
  return 0;
}

const STATUS_EPURCHASING_DIHITUNG = ['ON_PROCESS', 'ON_ADDENDUM', 'COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM'];

interface SumberWaktu {
  tabel: string;
  kolom: string;
  rup: (r: Row) => unknown;
  tgl: (r: Row) => unknown;
  nilai: (r: Row) => number;
}

/**
 * Sumber tanggal per metode. Kolom nilai dan penyaringnya disalin dari SQL
 * view masing-masing; kalau view-nya berubah, tempat ini ikut berubah.
 */
const SUMBER: SumberWaktu[] = [
  {
    tabel: 'paket_e_purchasing',
    kolom: 'rup_code,order_date,total,status',
    rup: (r) => r.rup_code,
    tgl: (r) => r.order_date,
    // Penyaring status disalin dari create_view_dashboard_epurchasing_v6.sql.
    // Tanpa ini bobot waktunya memuat order yang nilainya tidak pernah masuk
    // hitungan kartu KPI.
    nilai: (r) => (STATUS_EPURCHASING_DIHITUNG.includes(String(r.status)) ? num(r.total) : 0),
  },
  {
    tabel: 'tender_selesai_nilai',
    kolom: 'kd_rup_paket,tgl_penetapan_pemenang,nilai_kontrak,nilai_negosiasi,nilai_terkoreksi,nilai_penawaran,hps',
    rup: (r) => r.kd_rup_paket,
    tgl: (r) => r.tgl_penetapan_pemenang,
    // Rantai fallback disalin dari create_view_dashboard_tender.sql — termasuk
    // jatuh ke HPS. Lihat catatan soal proyeksi di bawah.
    nilai: (r) => firstNonZero(r.nilai_kontrak, r.nilai_negosiasi, r.nilai_terkoreksi, r.nilai_penawaran, r.hps),
  },
  {
    tabel: 'pencatatan_non_tender_realisasi',
    kolom: 'kd_rup_paket,tgl_realisasi,nilai_realisasi',
    rup: (r) => r.kd_rup_paket,
    tgl: (r) => r.tgl_realisasi,
    nilai: (r) => num(r.nilai_realisasi),
  },
  {
    tabel: 'non_tender_selesai',
    kolom: 'kd_rup,tgl_selesai_nontender,nilai_kontrak,nilai_negosiasi',
    rup: (r) => r.kd_rup,
    tgl: (r) => r.tgl_selesai_nontender,
    nilai: (r) => firstNonZero(r.nilai_kontrak, r.nilai_negosiasi),
  },
];

/** Satu peristiwa realisasi bertanggal, dipakai sebagai bobot pembagi. */
interface Bobot {
  tgl: string; // YYYY-MM-DD
  nilai: number;
}

/** Bobot waktu per kd_rup, hasil sekali ambil dari tabel dasar. */
export type PetaWaktu = Map<string, Bobot[]>;

async function ambilSemua(tabel: string, kolom: string): Promise<Row[]> {
  let all: Row[] = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await supabase.from(tabel).select(kolom).range(offset, offset + limit - 1);
    if (error) throw new Error(`Gagal memuat ${tabel}: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data as unknown as Row[]);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

/**
 * Ambil bobot waktu untuk seluruh sumber realisasi.
 *
 * kd_rup dinormalkan lewat view_rup_final (origin_rup ke final_rup) karena view
 * E-Purchasing memetakan RUP hasil kaji ulang ke RUP penggantinya. Tanpa langkah
 * ini sekitar Rp 18 miliar realisasi gagal dikenali dan kurvanya kehilangan
 * bentuk di bulan-bulan awal.
 */
export async function fetchPetaWaktu(): Promise<PetaWaktu> {
  const finalRup = new Map<string, string>();
  for (const r of await ambilSemua('view_rup_final', 'origin_rup,final_rup')) {
    if (r.origin_rup != null && r.final_rup != null) finalRup.set(String(r.origin_rup), String(r.final_rup));
  }
  const resolve = (k: unknown) => {
    const s = String(k ?? '').trim();
    return finalRup.get(s) ?? s;
  };

  const peta: PetaWaktu = new Map();
  for (const s of SUMBER) {
    for (const r of await ambilSemua(s.tabel, s.kolom)) {
      const nilai = s.nilai(r);
      const tglRaw = s.tgl(r);
      const rup = resolve(s.rup(r));
      if (!rup || !tglRaw || nilai <= 0) continue;
      const tgl = String(tglRaw).slice(0, 10);
      const list = peta.get(rup);
      if (list) list.push({ tgl, nilai });
      else peta.set(rup, [{ tgl, nilai }]);
    }
  }
  return peta;
}

export interface TitikKurva {
  /** Kunci bulan, YYYY-MM. */
  bulan: string;
  /** Label sumbu, mis. "Jan 26". */
  label: string;
  /** Realisasi kumulatif sampai akhir bulan ini. */
  realisasi: number;
  /** Target kumulatif pada akhir bulan ini. */
  target: number;
  /** Bulan ini menutup sebuah triwulan — titiknya ditonjolkan di grafik. */
  tutupTriwulan: 1 | 2 | 3 | 4 | null;
  /** Seluruh bulan ini berada di depan bulan berjalan. */
  proyeksi: boolean;
}

export interface KurvaRealisasi {
  titik: TitikKurva[];
  /**
   * Indeks titik terakhir yang isinya sudah benar-benar terjadi — batas garis
   * solid. Bukan sekadar "bulan sebelum hari ini": bulan berjalan pun masuk
   * proyeksi kalau seluruh isinya bertanggal di depan, seperti tender yang baru
   * ditetapkan pemenangnya untuk dua pekan lagi.
   */
  indeksAktual: number;
  /** Indeks titik terakhir yang punya data. Setelah ini kurva realisasi berhenti. */
  indeksAkhirData: number;
  /** Realisasi yang tanggalnya sudah lewat hari ini. */
  realisasiAktual: number;
  /** Nilai yang tanggalnya masih di depan (tender menang, belum berkontrak). */
  nilaiProyeksi: number;
  /** Realisasi yang tidak punya satu pun peristiwa bertanggal. */
  nilaiTanpaTanggal: number;
  /** Total realisasi pada filter aktif — sama dengan kartu "Sudah Realisasi". */
  totalRealisasi: number;
  totalPagu: number;
}

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function labelBulan(kunci: string): string {
  const [y, m] = kunci.split('-');
  return `${NAMA_BULAN[Number(m) - 1]} ${y.slice(2)}`;
}

function tambahBulan(kunci: string, n: number): string {
  const [y, m] = kunci.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
}

function kunciTanggal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Persen target kumulatif di akhir bulan ke-`bulan` (1-12) tahun anggaran.
 *
 * TARGET_TRIWULAN hanya menyebut empat titik. Di antara titik itu nilainya
 * ditarik lurus supaya targetnya jadi kurva yang bisa dibandingkan tiap bulan,
 * bukan tangga yang membuat setiap awal triwulan terlihat seperti gagal
 * mendadak. Awal tahun anggaran diikat di 0%.
 */
function persenTarget(bulan: number): number {
  const batas = [0, ...TARGET_TRIWULAN]; // indeks 0..4 pada bulan 0,3,6,9,12
  const i = Math.min(3, Math.floor((bulan - 1) / 3));
  const bawah = batas[i];
  const atas = batas[i + 1];
  const maju = (bulan - i * 3) / 3; // 1/3, 2/3, atau 1 di dalam triwulan
  return bawah + (atas - bawah) * maju;
}

/**
 * Susun kurva dari baris view yang SUDAH difilter halaman.
 *
 * Nilai tiap baris dibagi ke waktu menurut proporsi bobotnya, bukan diambil
 * langsung dari tabel dasar. Tabel dasar dan view memang berbeda angka (view
 * memfilter status, memakai rantai fallback, dan menyatukan RUP hasil kaji
 * ulang); yang dipercaya adalah view, karena itulah yang dibaca pengguna.
 */
export function bangunKurva(
  rows: GabunganRow[],
  peta: PetaWaktu,
  totalPagu: number,
  sekarang: Date = new Date()
): KurvaRealisasi {
  const perBulan = new Map<string, number>();
  /** Bagian dari perBulan yang tanggalnya sudah lewat hari ini. */
  const perBulanAktual = new Map<string, number>();
  let tanpaTanggal = 0;
  let total = 0;
  let aktual = 0;
  let proyeksi = 0;

  const hariIni = kunciTanggal(sekarang);

  for (const r of rows) {
    const nilai = Number(r.total) || 0;
    if (nilai <= 0) continue;
    total += nilai;

    // kd_rup gabungan bisa memuat beberapa RUP ("a;b") untuk paket multiple RUP.
    const kunci = String(r.kd_rup ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    const bobot: Bobot[] = [];
    for (const k of kunci) {
      const b = peta.get(k);
      if (b) bobot.push(...b);
    }
    const jumlahBobot = bobot.reduce((s, b) => s + b.nilai, 0);
    if (jumlahBobot <= 0) {
      tanpaTanggal += nilai;
      continue;
    }
    for (const b of bobot) {
      const bagian = (nilai * b.nilai) / jumlahBobot;
      const bulan = b.tgl.slice(0, 7);
      perBulan.set(bulan, (perBulan.get(bulan) ?? 0) + bagian);
      if (b.tgl <= hariIni) {
        perBulanAktual.set(bulan, (perBulanAktual.get(bulan) ?? 0) + bagian);
        aktual += bagian;
      } else {
        proyeksi += bagian;
      }
    }
  }

  const kosong: KurvaRealisasi = {
    titik: [],
    indeksAktual: -1,
    indeksAkhirData: -1,
    realisasiAktual: aktual,
    nilaiProyeksi: proyeksi,
    nilaiTanpaTanggal: tanpaTanggal,
    totalRealisasi: total,
    totalPagu,
  };
  if (perBulan.size === 0) return kosong;

  // Rentang bulan diisi penuh, termasuk bulan bernilai nol: sumbu waktu yang
  // melompati bulan kosong membuat kemiringan kurva berbohong. Sumbu juga
  // ditarik sampai akhir triwulan terakhir supaya titik targetnya punya tempat.
  const terurut = Array.from(perBulan.keys()).sort();
  const mulai = terurut[0];
  const bulanSekarang = hariIni.slice(0, 7);
  let akhir = terurut[terurut.length - 1];
  if (bulanSekarang > akhir) akhir = bulanSekarang;
  while (Number(akhir.split('-')[1]) % 3 !== 0) akhir = tambahBulan(akhir, 1);

  // Tahun anggaran menentukan di mana target 0% dimulai. Order E-Purchasing
  // untuk TA berjalan bisa bertanggal Desember tahun sebelumnya, dan bulan
  // seperti itu harus jatuh sebelum garis target mulai naik, bukan menggeser
  // seluruh jadwalnya mundur satu tahun.
  const tahunAnggaran = sekarang.getFullYear();

  const titik: TitikKurva[] = [];
  let kumulatif = 0;
  let kumulatifAktual = 0;
  let indeksAktual = -1;
  let indeksAkhirData = -1;
  for (let k = mulai; k <= akhir; k = tambahBulan(k, 1)) {
    const isiBulan = perBulan.get(k) ?? 0;
    kumulatif += isiBulan;
    kumulatifAktual += perBulanAktual.get(k) ?? 0;
    const [tahun, bulanKe] = k.split('-').map(Number);
    const pct = tahun < tahunAnggaran ? 0 : tahun > tahunAnggaran ? 100 : persenTarget(bulanKe);
    titik.push({
      bulan: k,
      label: labelBulan(k),
      realisasi: kumulatif,
      target: (totalPagu * pct) / 100,
      tutupTriwulan:
        tahun === tahunAnggaran && bulanKe % 3 === 0 ? ((bulanKe / 3) as 1 | 2 | 3 | 4) : null,
      proyeksi: k > bulanSekarang,
    });
    // Sebuah titik masih "aktual" selama kumulatifnya belum memuat satu rupiah
    // pun yang tanggalnya di depan. Perbandingan pakai toleransi karena nilainya
    // hasil pembagian proporsional.
    if (Math.abs(kumulatif - kumulatifAktual) < 1) indeksAktual = titik.length - 1;
    if (isiBulan > 0) indeksAkhirData = titik.length - 1;
  }

  return {
    titik,
    indeksAktual,
    indeksAkhirData,
    realisasiAktual: aktual,
    nilaiProyeksi: proyeksi,
    nilaiTanpaTanggal: tanpaTanggal,
    totalRealisasi: total,
    totalPagu,
  };
}
