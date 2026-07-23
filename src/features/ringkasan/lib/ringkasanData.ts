import { supabase } from '@/lib/supabase';

// Satu baris paket dari view gabungan (sudah termasuk status_kurasi setelah migrasi
// sql/add_status_kurasi_to_gabungan_view.sql).
export interface GabunganRow {
  kd_rup: string;
  rup_name: string | null;
  satker: string | null;
  nama_ppk: string | null;
  metode_pengadaan: string | null;
  pagu: number | null;
  total: number | null;
  status_kurasi: string | null;
  catatan_kurasi: string | null;
  rekomendasi_kurasi: string | null;
}

export interface MetodeAggregate {
  metode: string;
  jumlahPaket: number;
  pagu: number;
  realisasi: number;
  belum: number;
  pctRealisasi: number;
  paketSudah: number;
  paketBelum: number;
  // Breakdown hasil kurasi AI per metode.
  akurat: number;
  perluKoreksi: number; // "Tidak Akurat"
  belumDikurasi: number; // null / "Belum Dikurasi"
}

export interface KurasiAggregate {
  totalDikurasi: number; // Akurat + Tidak Akurat (punya keputusan)
  akurat: number;
  perluKoreksi: number; // "Tidak Akurat"
  belumDikurasi: number; // null / "Belum Dikurasi"
  totalPaket: number;
  pctAkurasi: number; // akurat / (akurat + perluKoreksi)
  pctSelesai: number; // (akurat + perluKoreksi) / totalPaket
}

export interface RingkasanKpi {
  totalPagu: number;
  totalRealisasi: number;
  belumRealisasi: number;
  totalPaket: number;
  paketSudah: number;
  paketBelum: number;
  pctRealisasi: number;
}

export interface RingkasanAggregate {
  kpi: RingkasanKpi;
  metode: MetodeAggregate[];
  kurasi: KurasiAggregate;
}

export interface RingkasanFilterValue {
  satker: string; // '' = Semua Satker
  ppk: string; // '' = Semua PPK
}

const SELECT_COLS = 'kd_rup,rup_name,satker,nama_ppk,metode_pengadaan,pagu,total,status_kurasi,catatan_kurasi,rekomendasi_kurasi';

// Ambil SELURUH baris view gabungan via paginasi (pola sama seperti fetchAll di
// src/lib/itkp/fetchA.ts). View bisa >1000 baris sedangkan Supabase membatasi
// 1000 baris per query.
export async function fetchGabunganRows(): Promise<GabunganRow[]> {
  let all: GabunganRow[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('view_dashboard_gabungan_satker')
      .select(SELECT_COLS)
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Gagal memuat data ringkasan: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data as unknown as GabunganRow[]);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

const num = (v: number | null | undefined): number => Number(v) || 0;

export function filterRows(rows: GabunganRow[], filter: RingkasanFilterValue): GabunganRow[] {
  return rows.filter((r) => {
    if (filter.satker && r.satker !== filter.satker) return false;
    if (filter.ppk && r.nama_ppk !== filter.ppk) return false;
    return true;
  });
}

// Daftar Satker unik (untuk opsi filter), diurutkan alfabetis.
export function listSatker(rows: GabunganRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.satker && r.satker.trim()) set.add(r.satker);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
}

// Daftar PPK unik pada Satker tertentu (dependent). Bila satker kosong → semua PPK.
export function listPpk(rows: GabunganRow[], satker: string): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (satker && r.satker !== satker) continue;
    if (r.nama_ppk && r.nama_ppk.trim()) set.add(r.nama_ppk);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'));
}

// Fungsi murni: filter + hitung seluruh angka yang dipakai halaman Ringkasan.
export function aggregate(rows: GabunganRow[], filter: RingkasanFilterValue): RingkasanAggregate {
  const data = filterRows(rows, filter);

  let totalPagu = 0;
  let totalRealisasi = 0;
  let paketSudah = 0;
  let akurat = 0;
  let perluKoreksi = 0;

  const metodeMap = new Map<string, MetodeAggregate>();

  for (const r of data) {
    const pagu = num(r.pagu);
    const realisasi = num(r.total);
    const sudah = realisasi > 0;
    const metode = (r.metode_pengadaan && r.metode_pengadaan.trim()) || 'Lainnya';

    totalPagu += pagu;
    totalRealisasi += realisasi;
    if (sudah) paketSudah += 1;

    if (r.status_kurasi === 'Akurat') akurat += 1;
    else if (r.status_kurasi === 'Tidak Akurat') perluKoreksi += 1;

    let m = metodeMap.get(metode);
    if (!m) {
      m = { metode, jumlahPaket: 0, pagu: 0, realisasi: 0, belum: 0, pctRealisasi: 0, paketSudah: 0, paketBelum: 0, akurat: 0, perluKoreksi: 0, belumDikurasi: 0 };
      metodeMap.set(metode, m);
    }
    m.jumlahPaket += 1;
    m.pagu += pagu;
    m.realisasi += realisasi;
    if (sudah) m.paketSudah += 1;
    else m.paketBelum += 1;
    if (r.status_kurasi === 'Akurat') m.akurat += 1;
    else if (r.status_kurasi === 'Tidak Akurat') m.perluKoreksi += 1;
  }

  const metode = Array.from(metodeMap.values())
    .map((m) => ({
      ...m,
      belum: Math.max(m.pagu - m.realisasi, 0),
      pctRealisasi: m.pagu > 0 ? (m.realisasi / m.pagu) * 100 : 0,
      belumDikurasi: Math.max(m.jumlahPaket - m.akurat - m.perluKoreksi, 0),
    }))
    .sort((a, b) => b.jumlahPaket - a.jumlahPaket);

  const totalPaket = data.length;
  const paketBelum = totalPaket - paketSudah;
  const belumDikurasi = Math.max(totalPaket - akurat - perluKoreksi, 0);
  const totalDikurasi = akurat + perluKoreksi;

  return {
    kpi: {
      totalPagu,
      totalRealisasi,
      belumRealisasi: Math.max(totalPagu - totalRealisasi, 0),
      totalPaket,
      paketSudah,
      paketBelum,
      pctRealisasi: totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0,
    },
    metode,
    kurasi: {
      totalDikurasi,
      akurat,
      perluKoreksi,
      belumDikurasi,
      totalPaket,
      pctAkurasi: totalDikurasi > 0 ? (akurat / totalDikurasi) * 100 : 0,
      pctSelesai: totalPaket > 0 ? (totalDikurasi / totalPaket) * 100 : 0,
    },
  };
}
