export function normSatker(s: unknown): string {
  return String(s ?? '').toUpperCase().trim().replace(/\s+/g, ' ');
}

function fuzzyContains(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

export function buildFineSatkerToKpa(masterData: { 'SATUAN KERJA': string | null; KPA: string | null }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of masterData) {
    const sk = normSatker(m['SATUAN KERJA']);
    const kpa = normSatker(m.KPA);
    if (sk && kpa && !map.has(sk)) map.set(sk, kpa);
  }
  return map;
}

/**
 * Realisasi views record `satker` at fine biro/direktorat granularity (~83
 * unit), while data_afirmasi_pdn_perencanaan (sumber RUP Indikator A) hanya
 * punya ~44 unit setingkat KPA/Ditjen. Jembatani lewat master_data.KPA;
 * kembalikan null bila tidak ada kecocokan langsung maupun via KPA (masuk ke
 * bucket "Tidak Teridentifikasi" di pemanggil).
 */
export function resolveAfirmasiUnit(
  fineSatkerName: string,
  afirmasiUnitsNorm: string[],
  fineSatkerToKpa: Map<string, string>
): string | null {
  const sNorm = normSatker(fineSatkerName);
  if (afirmasiUnitsNorm.includes(sNorm)) return sNorm;

  const kpa = fineSatkerToKpa.get(sNorm);
  if (kpa) {
    const bridged = afirmasiUnitsNorm.find((a) => fuzzyContains(a, kpa));
    if (bridged) return bridged;
  }
  return null;
}
