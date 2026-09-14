// Jaring pengaman terakhir untuk hasil kurasi AI: mendeteksi kalau kesimpulan yang
// ditulis AI sendiri di catatan_kurasi (mis. "...Jadi statusnya Akurat.") bertentangan
// dengan tag status_kurasi yang dikembalikan. Ini bisa terjadi karena status_kurasi
// digenerate sebelum catatan_kurasi selesai "dipikirkan" AI — reorder field di schema
// (catatan dulu, baru status) sudah mengurangi kejadian ini di sumbernya, fungsi ini
// hanya menangkap sisa kasus yang masih lolos.
const CONCLUSION_MARKER = /(jadi|maka|sehingga|dengan demikian|kesimpulannya|kesimpulan)[^.!?]*\b(tidak\s+akurat|akurat)\b/gi;

export function detectStatusConflict(catatan: string | null | undefined, status: string): boolean {
  if (!catatan || status === 'Belum Dikurasi') return false;

  const matches = [...catatan.matchAll(CONCLUSION_MARKER)];
  if (matches.length === 0) return false;

  // Ambil kesimpulan TERAKHIR yang ditulis — itu yang paling mencerminkan keputusan final AI.
  const last = matches[matches.length - 1][0];
  const concludesTidakAkurat = /tidak\s+akurat/i.test(last);
  const concludesAkurat = !concludesTidakAkurat;

  if (status === 'Akurat' && concludesTidakAkurat) return true;
  if (status === 'Tidak Akurat' && concludesAkurat) return true;
  return false;
}
