import { supabase } from '@/lib/supabase';

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

const JENJANG_URUTAN = ['Ahli Pertama', 'Ahli Muda', 'Ahli Madya', 'Ahli Utama'];

export function groupByJenjang(rows: PerpindahanJfPerson[]): PerpindahanJfSummaryRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const jenjang = row.jenjang_jf || 'Tidak diketahui';
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
    .map(([jenjang, jumlahPengajuan]) => ({ jenjang, jumlahPengajuan }));

  return [...known, ...rest];
}
