import type { BadgeVariant } from '@/components/ui/Badge';
import type { ItkpAResult } from './calcA';
import type { ItkpBCDResult } from './calcBCD';
import { fmtPct } from '@/lib/format';

// ── Predikat / kategori penilaian ITKP (batas resmi, jangan di-hardcode di UI) ──
export type PredikatLevel = 'kurang' | 'cukup_baik' | 'baik' | 'sangat_baik' | 'istimewa';

export interface PredikatBand {
  level: PredikatLevel;
  label: string;
  min: number;
  max: number;
  rangeLabel: string;
}

export const PREDIKAT_BANDS: PredikatBand[] = [
  { level: 'kurang', label: 'Kurang', min: 0, max: 35, rangeLabel: '< 35' },
  { level: 'cukup_baik', label: 'Cukup Baik', min: 35, max: 50, rangeLabel: '35–<50' },
  { level: 'baik', label: 'Baik', min: 50, max: 65, rangeLabel: '50–<65' },
  { level: 'sangat_baik', label: 'Sangat Baik', min: 65, max: 80, rangeLabel: '65–<80' },
  { level: 'istimewa', label: 'Istimewa', min: 80, max: 100, rangeLabel: '≥ 80' },
];

export function predikatOf(score: number): PredikatBand {
  for (let i = PREDIKAT_BANDS.length - 1; i >= 0; i--) {
    if (score >= PREDIKAT_BANDS[i].min) return PREDIKAT_BANDS[i];
  }
  return PREDIKAT_BANDS[0];
}

// ── Status capaian (dipakai badge + warna progress indikator) ──
export interface StatusInfo {
  label: string;
  variant: BadgeVariant;
}

export function statusForRatio(ratio: number, applicable: boolean): StatusInfo {
  if (!applicable) return { label: 'Belum ada capaian', variant: 'default' };
  if (ratio >= 1) return { label: 'Tercapai', variant: 'rendah' };
  if (ratio >= 0.6) return { label: 'Baik', variant: 'rendah' };
  if (ratio >= 0.3) return { label: 'Perlu perhatian', variant: 'sedang' };
  return { label: 'Sangat rendah', variant: 'tinggi' };
}

// ── Model terpadu untuk render data-driven ──
export type ComponentCode = 'A' | 'B' | 'C' | 'D';

export interface ItkpIndicatorModel {
  code: string; // A1, B1, C1, D1 ...
  name: string;
  score: number;
  maxScore: number;
  attainment: number; // skor / maxScore * 100 (dipakai status & progress)
  capaianLabel: string; // teks persen besar
  overTarget: number | null; // kelebihan di atas 100% (khusus rasio A) atau null
  description: string;
  applicable: boolean;
  status: StatusInfo;
  formula: string;
}

export interface ItkpComponentModel {
  code: ComponentCode;
  name: string;
  score: number;
  maxScore: number;
  weight: number; // bobot % (= maxScore pada skala ITKP 100)
  percentage: number; // score / maxScore * 100
  status: StatusInfo;
  indicators: ItkpIndicatorModel[];
  detailHref?: string; // hanya komponen yang punya halaman detail
}

const COMPONENT_META: Record<ComponentCode, { name: string }> = {
  A: { name: 'Pemanfaatan Sistem' },
  B: { name: 'Kompetensi SDM PBJ' },
  C: { name: 'Kematangan UKPBJ' },
  D: { name: 'Integritas Pengadaan' },
};

function pctSafe(num: number, den: number): number | null {
  if (!den || den === 0) return null;
  return (num / den) * 100;
}

// Bangun indikator komponen A (A1–A7) dari hasil perhitungan calcA.
function indicatorsA(resultA: ItkpAResult | null): ItkpIndicatorModel[] {
  if (!resultA) return [];
  return resultA.rows.map((row, i) => {
    const attainment = row.skorMax > 0 ? (row.skor / row.skorMax) * 100 : 0;
    const rasio = row.applicable ? pctSafe(row.numValue, row.denValue) : null;
    const over = rasio !== null && rasio > 100 ? rasio - 100 : null;
    return {
      code: `A${i + 1}`,
      name: row.label,
      score: row.skor,
      maxScore: row.skorMax,
      attainment,
      capaianLabel: row.applicable ? row.persentase : '—',
      overTarget: over,
      description: row.catatan,
      applicable: row.applicable,
      status: statusForRatio(attainment / 100, row.applicable),
      formula: row.formula,
    };
  });
}

// Bangun indikator komponen B/C/D dari calcBCD. Persentase = capaian skor
// (kondisi kualitatif tak punya rasio numerik), deskripsi = kondisi terpilih.
function bcdIndicator(
  code: string,
  row: { label: string; skor: number; skorMax: number; persentaseAtauKondisi: string; formula: string }
): ItkpIndicatorModel {
  const attainment = row.skorMax > 0 ? (row.skor / row.skorMax) * 100 : 0;
  return {
    code,
    name: row.label,
    score: row.skor,
    maxScore: row.skorMax,
    attainment,
    capaianLabel: fmtPct(attainment),
    overTarget: null,
    description: row.persentaseAtauKondisi,
    applicable: true,
    status: statusForRatio(attainment / 100, true),
    formula: row.formula,
  };
}

export interface BuildComponentsArgs {
  resultA: ItkpAResult | null;
  totalA: number;
  nilaiB: number;
  nilaiC: number;
  nilaiD: number;
  bcdRows?: ItkpBCDResult | null; // rincian indikator B/C/D (opsional; agregat kementerian tak memilikinya)
  detailHrefA: string;
}

export function buildComponents(args: BuildComponentsArgs): ItkpComponentModel[] {
  const { resultA, totalA, nilaiB, nilaiC, nilaiD, bcdRows, detailHrefA } = args;

  const mk = (
    code: ComponentCode,
    score: number,
    maxScore: number,
    indicators: ItkpIndicatorModel[],
    detailHref?: string
  ): ItkpComponentModel => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    return {
      code,
      name: COMPONENT_META[code].name,
      score,
      maxScore,
      weight: maxScore,
      percentage,
      status: statusForRatio(percentage / 100, true),
      indicators,
      detailHref,
    };
  };

  const bIndicators: ItkpIndicatorModel[] = bcdRows
    ? [
        bcdIndicator('B1', bcdRows.formasi),
        bcdIndicator('B2', bcdRows.penugasan),
        bcdIndicator('B3', bcdRows.renaksi),
      ]
    : [];
  const cIndicators: ItkpIndicatorModel[] = bcdRows ? [bcdIndicator('C1', bcdRows.kematangan)] : [];
  const dIndicators: ItkpIndicatorModel[] = bcdRows ? [bcdIndicator('D1', bcdRows.integritas)] : [];

  return [
    mk('A', totalA, 30, indicatorsA(resultA), detailHrefA),
    mk('B', nilaiB, 30, bIndicators),
    mk('C', nilaiC, 30, cIndicators),
    mk('D', nilaiD, 10, dIndicators),
  ];
}
