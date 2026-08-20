import type { BadgeVariant } from '@/components/ui/Badge';
import type { ItkpAResult } from './calcA';
import type { ItkpBCDResult } from './calcBCD';
import { fmtPct } from '@/lib/format';

// ── Predikat Indeks Tata Kelola Pengadaan 2026–2029 (batas resmi sesuai tabel) ──
// Nilai   Predikat  Interpretasi
// 90–100  AA        Sangat Memuaskan
// 80–<90  A         Memuaskan
// 70–<80  BB        Sangat Baik
// 60–<70  B         Baik
// 50–<60  CC        Cukup (Memadai)
// 30–<50  C         Kurang
// <30     D         Sangat Kurang
export type PredikatLevel = 'd' | 'c' | 'cc' | 'b' | 'bb' | 'a' | 'aa';

export interface PredikatBand {
  level: PredikatLevel;
  kode: string; // AA, A, BB, B, CC, C, D
  label: string; // interpretasi
  min: number;
  max: number;
  rangeLabel: string;
  color: string; // warna badge/segmen (teks putih)
}

export const PREDIKAT_BANDS: PredikatBand[] = [
  { level: 'd', kode: 'D', label: 'Sangat Kurang', min: 0, max: 30, rangeLabel: '< 30', color: '#B3261E' },
  { level: 'c', kode: 'C', label: 'Kurang', min: 30, max: 50, rangeLabel: '30–<50', color: '#D35400' },
  { level: 'cc', kode: 'CC', label: 'Cukup (Memadai)', min: 50, max: 60, rangeLabel: '50–<60', color: '#B8860B' },
  { level: 'b', kode: 'B', label: 'Baik', min: 60, max: 70, rangeLabel: '60–<70', color: '#6B8E23' },
  { level: 'bb', kode: 'BB', label: 'Sangat Baik', min: 70, max: 80, rangeLabel: '70–<80', color: '#1FA089' },
  { level: 'a', kode: 'A', label: 'Memuaskan', min: 80, max: 90, rangeLabel: '80–<90', color: '#1D5FA8' },
  { level: 'aa', kode: 'AA', label: 'Sangat Memuaskan', min: 90, max: 100, rangeLabel: '90–100', color: '#3730A3' },
];

export function predikatOf(score: number): PredikatBand {
  for (let i = PREDIKAT_BANDS.length - 1; i >= 0; i--) {
    if (score >= PREDIKAT_BANDS[i].min) return PREDIKAT_BANDS[i];
  }
  return PREDIKAT_BANDS[0];
}

// Interpretasi predikat satu tingkat di atas level saat ini (null bila tertinggi).
export function nextPredikatLabel(level: PredikatLevel): string | null {
  const idx = PREDIKAT_BANDS.findIndex((b) => b.level === level);
  if (idx < 0 || idx === PREDIKAT_BANDS.length - 1) return null;
  return PREDIKAT_BANDS[idx + 1].label;
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
  rawData?: any[];
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
    rawData: (row as any).rawData,
  };
}

// B1 (Formasi) berbeda dari B2/B3/C1/D1: dia satu-satunya indikator B/C/D yang
// punya rasio riil (terisi/kebutuhan), bukan cuma kondisi kualitatif. Supaya
// angka besar di kartu sama persis dengan Total di modal "Rincian Keterisian
// Formasi" (dan konsisten dengan pola komponen A, yang juga menaruh rasio riil
// di capaianLabel sementara attainment/bar tetap dari skor), override
// capaianLabel dengan keterisian riil — dihitung dari rawData yang sama
// (bukan re-parse string) supaya tidak bisa berbeda dari modalnya. Catatan di
// kartu (`description`) juga diganti dari sekadar angka mentah menjadi kalimat
// `alasan` bawaan hitungFormasi — sudah menyebut rentang pita Kepka yang cocok
// dengan persentase saat ini beserta skornya, dan otomatis ikut berubah kalau
// datanya berubah (bukan teks statis).
type FormasiRawRow = Record<string, unknown>;

function formasiIndicator(
  code: string,
  row: Parameters<typeof bcdIndicator>[1] & { rawData?: FormasiRawRow[]; alasan?: string }
): ItkpIndicatorModel {
  const base = bcdIndicator(code, row);
  const rows: FormasiRawRow[] = Array.isArray(row.rawData) ? row.rawData : [];
  const totalKebutuhan = rows.reduce((s, r) => s + (Number(r['Formasi Kebutuhan']) || 0), 0);
  const totalTerisi = rows.reduce((s, r) => s + (Number(r['Formasi Terpenuhi']) || 0), 0);
  const description = row.alasan ?? base.description;
  if (totalKebutuhan <= 0) return { ...base, description };
  return { ...base, capaianLabel: fmtPct((totalTerisi / totalKebutuhan) * 100), description };
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
        formasiIndicator('B1', bcdRows.formasi),
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
