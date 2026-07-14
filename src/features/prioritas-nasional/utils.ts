export function parseIndonesianNumber(value?: string | number): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  
  // Remove spaces, Rp, % symbols
  let cleaned = value.replace(/Rp|\s|%/g, '');
  
  // Replace dots with empty string (thousands separator)
  cleaned = cleaned.replace(/\./g, '');
  
  // Replace comma with dot (decimal separator)
  cleaned = cleaned.replace(/,/g, '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatRupiah(number: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}
