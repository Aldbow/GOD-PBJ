export function fmtRupiah(m: number): string {
  if (!m) return 'Rp 0';
  if (m >= 1e9) return 'Rp ' + (m / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (m >= 1e6) return 'Rp ' + (m / 1e6).toFixed(2).replace('.', ',') + ' Jt';
  return 'Rp ' + m.toLocaleString('id-ID');
}

export function fmtRupiahDetail(m: number): string {
  if (!m) return 'Rp 0';
  return 'Rp ' + m.toLocaleString('id-ID');
}

export function countRup(kdRup: unknown): number {
  return String(kdRup || '').split(';').length;
}
