/**
 * Urutan jenjang JF PBJ untuk tampilan: dari jenjang tertinggi ke terendah
 * (Madya -> Muda -> Pertama). Dipakai bersama oleh tabel-tabel jenjang di modal
 * ITKP supaya urutannya seragam, tidak bergantung urutan baris dari tabel sumber.
 *
 * Peringkat dihitung dari kata jenjangnya saja, bukan string utuh, karena tiga
 * sumber data menulisnya dengan label berbeda:
 *   - `formasi_jf_ukpbj`     -> "Ahli Pertama" / "Ahli Muda" / "Ahli Madya"
 *   - `data_perpindahan_jf`  -> sama, berprefiks "Ahli"
 *   - `data_jf_kemnaker`     -> "Pertama" / "Muda" / "Madya", tanpa prefiks
 *
 * "Ahli Utama" ikut diberi peringkat walau belum muncul di data mana pun, supaya
 * kalau suatu saat ada, ia tidak jatuh ke kelompok "tidak dikenal" di paling bawah.
 */
const PERINGKAT_JENJANG = ['utama', 'madya', 'muda', 'pertama'];

function peringkatJenjang(nilai: string | null | undefined): number {
  const kata = String(nilai ?? '')
    .toLowerCase()
    .replace(/^ahli\s+/, '')
    .trim();
  const idx = PERINGKAT_JENJANG.indexOf(kata);
  // Jenjang tak dikenal ditaruh paling bawah, bukan disisipkan di antara jenjang baku.
  return idx === -1 ? PERINGKAT_JENJANG.length : idx;
}

/** Comparator jenjang: yang tertinggi lebih dulu (Madya -> Muda -> Pertama). */
export function compareJenjang(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const selisih = peringkatJenjang(a) - peringkatJenjang(b);
  if (selisih !== 0) return selisih;
  // Sesama jenjang tak dikenal diurutkan alfabetis supaya tampilannya stabil.
  return String(a ?? '').localeCompare(String(b ?? ''), 'id');
}
