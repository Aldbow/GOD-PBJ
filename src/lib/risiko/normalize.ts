/** Pecah kolom yang bisa memuat beberapa kode RUP dalam satu baris (dipisah titik koma, koma,
 * line break, atau pipe) menjadi daftar kode individual. kd_rup diperlakukan sebagai string —
 * JANGAN menghapus nol di depan. Menghilangkan akhiran ".0" hasil konversi spreadsheet. */
export function splitCompositeIds(raw: unknown): string[] {
  return String(raw ?? '')
    .split(/[;,|\n]+/)
    .map((s) => s.trim().replace(/\.0$/, ''))
    .filter(Boolean);
}

/** Kode RUP pertama dari sebuah field yang mungkin komposit — dipakai saat butuh satu id
 * representatif (mis. join ke master data), mengikuti pola split_part(...,';',1) yang sudah
 * dipakai view SQL lain di proyek ini. */
export function primaryId(raw: unknown): string | null {
  const parts = splitCompositeIds(raw);
  return parts[0] ?? null;
}
