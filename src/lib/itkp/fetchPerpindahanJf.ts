import { supabase } from '@/lib/supabase';
import { compareJenjang } from '@/lib/itkp/jenjang';

export interface PerpindahanJfPerson {
  id: string;
  no_urut: number | null;
  satuan_kerja: string | null;
  jenjang_jf: string | null;
  nama: string | null;
  pangkat_golongan: string | null;
}

export interface PerpindahanJfSummaryRow {
  jenjang: string;
  jumlahPengajuan: number;
}

export interface PerpindahanJfSatkerRow {
  satuanKerja: string;
  jumlah: number;
}

/**
 * Mengambil daftar person pengajuan Perpindahan JF ke JF PBJ dari tabel
 * `data_perpindahan_jf`. Ringkasan per jenjang diturunkan lewat groupByJenjang,
 * bukan dari tabel/query terpisah.
 */
export async function fetchPerpindahanJfData(): Promise<PerpindahanJfPerson[]> {
  const { data, error } = await supabase
    .from('data_perpindahan_jf')
    .select('*')
    .order('no_urut', { ascending: true });

  if (error) {
    console.error('Error fetching data_perpindahan_jf:', error);
    return [];
  }

  return data ?? [];
}

// Urut dari jenjang tertinggi ke terendah, seragam dengan tabel jenjang lain di
// modal ITKP (lihat lib/itkp/jenjang.ts). Daftar ini juga menentukan baris baku
// yang selalu tampil, jadi 'Ahli Utama' sengaja TIDAK masuk — lihat catatan di bawah.
const JENJANG_URUTAN = ['Ahli Madya', 'Ahli Muda', 'Ahli Pertama'];

// Ahli Utama belum diatur untuk perpindahan ke JF PBJ pada peraturan saat ini —
// dikeluarkan sepenuhnya dari ringkasan (bukan cuma tidak dijadikan baris baku),
// supaya kalaupun ada entri bertanda jenjang ini di data, tetap tidak tampil.
const JENJANG_DIKECUALIKAN = new Set(['Ahli Utama']);

export function groupByJenjang(rows: PerpindahanJfPerson[]): PerpindahanJfSummaryRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const jenjang = row.jenjang_jf || 'Tidak diketahui';
    if (JENJANG_DIKECUALIKAN.has(jenjang)) continue;
    counts.set(jenjang, (counts.get(jenjang) ?? 0) + 1);
  }

  // Selalu tampilkan seluruh jenjang baku (termasuk yang 0 pengajuan),
  // meniru data/data-perpindahan-jf.csv yang mencantumkan baris 0.
  const known = JENJANG_URUTAN.map((jenjang) => ({
    jenjang,
    jumlahPengajuan: counts.get(jenjang) ?? 0,
  }));
  const rest = Array.from(counts.entries())
    .filter(([jenjang]) => !JENJANG_URUTAN.includes(jenjang))
    .map(([jenjang, jumlahPengajuan]) => ({ jenjang, jumlahPengajuan }))
    .sort((a, b) => compareJenjang(a.jenjang, b.jenjang));

  return [...known, ...rest];
}

/** Jumlah pengajuan per satuan kerja, diurutkan menurun. Dipakai untuk detail per-jenjang. */
export function groupBySatuanKerja(rows: PerpindahanJfPerson[]): PerpindahanJfSatkerRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const satker = row.satuan_kerja || 'Tidak diketahui';
    counts.set(satker, (counts.get(satker) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([satuanKerja, jumlah]) => ({ satuanKerja, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.satuanKerja.localeCompare(b.satuanKerja));
}
