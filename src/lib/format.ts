export function fmtRupiah(m: number): string {
  if (!m) return 'Rp 0';
  if (m >= 1e9) return 'Rp ' + (m / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (m >= 1e6) return 'Rp ' + (m / 1e6).toFixed(2).replace('.', ',') + ' Jt';
  return 'Rp ' + Math.round(m).toLocaleString('id-ID');
}

export function fmtRupiahDetail(m: number): string {
  if (!m) return 'Rp 0';
  return 'Rp ' + Math.round(m).toLocaleString('id-ID');
}

export function countRup(kdRup: unknown): number {
  return String(kdRup || '').split(';').length;
}

export function fmtDec(n: number, decimals: number = 2): string {
  return n.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(n: number, decimals: number = 2): string {
  return fmtDec(n, decimals) + '%';
}

// Dibulatkan secara sengaja -- bukan cuma untuk kerapian tampilan, tapi supaya
// aman dipakai sebagai `format` <AnimatedNumber> (src/components/ui/AnimatedNumber.tsx):
// nilai di tengah animasi hitung-naik itu pecahan (mis. 41,7 menuju 42), dan
// tanpa pembulatan koma desimal id-ID-nya terbaca seperti pemisah ribuan lain
// (mis. "41,7" bisa disalahbaca, dan kasus lebih parah pernah kejadian nyata:
// "7.978,988" alih-alih "7.979"). Untuk nilai yang memang sudah bulat, ini no-op.
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('id-ID');
}
