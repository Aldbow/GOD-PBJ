import { fmtDec, fmtInt, fmtPct } from '@/lib/format';

export type PenugasanKondisi = 'a' | 'b' | 'c' | 'd' | 'e';
export type RenaksiKondisi = 'jf_ppk' | 'jf' | 'ppk' | 'none';
export type KematanganLevel =
  | 'unggul'
  | 'strategis'
  | 'proaktif'
  | 'sembilan_sembilan'
  | 'enam_delapan'
  | 'satu_lima'
  | 'nol';

export interface ItkpBCDInput {
  kebutuhanFormasi: number;
  formasiTerisi: number;
  penugasan: PenugasanKondisi;
  renaksi: RenaksiKondisi;
  kematangan: KematanganLevel;
  nilaiSpi: number;
  tahunPenilaianSpi: number;
}

export const PENUGASAN_OPTIONS: { value: PenugasanKondisi; label: string; skor: number }[] = [
  { value: 'a', label: 'Seluruh JF/Personel Lainnya ditugaskan sebagai Pokja Pemilihan, Pejabat Pengadaan, dan PPK', skor: 9 },
  { value: 'b', label: 'Seluruh JF/Personel Lainnya ditugaskan sebagai Pokja Pemilihan, dan Pejabat Pengadaan atau PPK', skor: 8 },
  { value: 'c', label: 'Seluruh JF/Personel Lainnya ditugaskan sebagai Pokja Pemilihan', skor: 6 },
  { value: 'd', label: 'Sebagian JF/Personel Lainnya ditugaskan sebagai Pokja Pemilihan', skor: 4 },
  { value: 'e', label: 'Belum ada JF PPBJ yang ditugaskan sebagai Pokja Pemilihan', skor: 0 },
];

export const RENAKSI_OPTIONS: { value: RenaksiKondisi; label: string; skor: number }[] = [
  { value: 'jf_ppk', label: 'Menyusun Renaksi pemenuhan JF PPBJ/Personel Lainnya bersertifikat kompetensi DAN PPK bersertifikat kompetensi', skor: 6 },
  { value: 'jf', label: 'Menyusun Renaksi JF PPBJ/Personel Lainnya bersertifikat kompetensi saja', skor: 5 },
  { value: 'ppk', label: 'Menyusun Renaksi PPK bersertifikat kompetensi saja', skor: 2 },
  { value: 'none', label: 'Belum menyusun Renaksi', skor: 0 },
];

export const KEMATANGAN_OPTIONS: { value: KematanganLevel; label: string; skor: number }[] = [
  { value: 'unggul', label: 'PKP Unggul', skor: 30 },
  { value: 'strategis', label: 'PKP Strategis', skor: 27 },
  { value: 'proaktif', label: 'PKP Proaktif', skor: 24 },
  { value: 'sembilan_sembilan', label: '9/9 Proaktif', skor: 21 },
  { value: 'enam_delapan', label: '6/9–8/9', skor: 14 },
  { value: 'satu_lima', label: '1/9–5/9', skor: 7 },
  { value: 'nol', label: '0/9', skor: 0 },
];

export const CATATAN_INKONSISTENSI_FORMASI =
  'Tabel skor Kepka Nomor 74 Tahun 2026 menetapkan nilai 11 untuk persentase ≥90% — lebih rendah dari nilai 15 pada rentang 80%–<90%. Ketentuan ini diikuti apa adanya tanpa diubah/dinormalisasi. Berpotensi merupakan inkonsistensi pada regulasi asli; disarankan klarifikasi ke LKPP sebelum dipakai sebagai dasar penilaian resmi.';

export interface ItkpRowResult {
  key: string;
  label: string;
  dataDasar: string;
  formula: string;
  persentaseAtauKondisi: string;
  alasan: string;
  skor: number;
  skorMax: number;
  catatan?: string;
}

export interface ItkpBCDResult {
  formasi: ItkpRowResult;
  penugasan: ItkpRowResult;
  renaksi: ItkpRowResult;
  kematangan: ItkpRowResult;
  integritas: ItkpRowResult;
  rows: ItkpRowResult[];
  nilaiB: number;
  nilaiC: number;
  nilaiD: number;
  total: number;
}

function skorFormasi(pct: number | null): number {
  if (pct === null) return 0;
  if (pct >= 90) return 11;
  if (pct >= 80) return 15;
  if (pct >= 70) return 13;
  if (pct >= 60) return 11;
  if (pct >= 30) return 7;
  if (pct > 0) return 3;
  return 0;
}

function bandFormasi(pct: number): string {
  if (pct >= 90) return '≥90%';
  if (pct >= 80) return '80%–<90%';
  if (pct >= 70) return '70%–<80%';
  if (pct >= 60) return '60%–<70%';
  if (pct >= 30) return '30%–<60%';
  if (pct > 0) return '0%–<30%';
  return '0%';
}

function hitungFormasi(kebutuhan: number, terisi: number): ItkpRowResult {
  if (!kebutuhan || kebutuhan === 0) {
    return {
      key: 'formasi',
      label: 'Keterisian Formasi JF PPBJ / Personel Lainnya',
      dataDasar: `Formasi Terisi ${fmtInt(terisi)} / Kebutuhan Formasi ${fmtInt(kebutuhan)}`,
      formula: 'Persentase = (Formasi Terisi / Kebutuhan Formasi) × 100%',
      persentaseAtauKondisi: 'Tidak dapat dihitung (kebutuhan formasi = 0)',
      alasan: 'Pembagi (kebutuhan formasi) bernilai 0 sehingga persentase tidak dapat dihitung; skor diberikan 0 sesuai aturan.',
      skor: 0,
      skorMax: 15,
      catatan: CATATAN_INKONSISTENSI_FORMASI,
    };
  }

  const pct = (terisi / kebutuhan) * 100;
  const skor = skorFormasi(pct);
  return {
    key: 'formasi',
    label: 'Keterisian Formasi JF PPBJ / Personel Lainnya',
    dataDasar: `Formasi Terisi ${fmtInt(terisi)} / Kebutuhan Formasi ${fmtInt(kebutuhan)}`,
    formula: 'Persentase = (Formasi Terisi / Kebutuhan Formasi) × 100%',
    persentaseAtauKondisi: fmtPct(pct),
    alasan: `${fmtPct(pct)} berada pada rentang ${bandFormasi(pct)} → skor ${skor} sesuai tabel Kepka.`,
    skor,
    skorMax: 15,
    catatan: CATATAN_INKONSISTENSI_FORMASI,
  };
}

function hitungPenugasan(kondisi: PenugasanKondisi): ItkpRowResult {
  const opt = PENUGASAN_OPTIONS.find((o) => o.value === kondisi)!;
  const letter = kondisi;
  return {
    key: 'penugasan',
    label: 'Penugasan JF PPBJ / Personel Lainnya',
    dataDasar: `Kondisi (${letter})`,
    formula: 'Nilai ditentukan langsung dari kondisi penugasan yang dipilih (bukan rumus persentase).',
    persentaseAtauKondisi: opt.label,
    alasan: `Kondisi (${letter}) sesuai tabel Kepka → skor ${opt.skor}${opt.skor === 9 ? ' (maksimal)' : ''}.`,
    skor: opt.skor,
    skorMax: 9,
  };
}

function hitungRenaksi(kondisi: RenaksiKondisi): ItkpRowResult {
  const opt = RENAKSI_OPTIONS.find((o) => o.value === kondisi)!;
  return {
    key: 'renaksi',
    label: 'Penyusunan Rencana Aksi (Renaksi)',
    dataDasar: opt.label,
    formula: 'Nilai ditentukan langsung dari status penyusunan Renaksi yang dipilih.',
    persentaseAtauKondisi: opt.label,
    alasan: `Status Renaksi terpilih sesuai tabel Kepka → skor ${opt.skor}${opt.skor === 6 ? ' (maksimal)' : ''}.`,
    skor: opt.skor,
    skorMax: 6,
  };
}

function hitungKematangan(level: KematanganLevel): ItkpRowResult {
  const opt = KEMATANGAN_OPTIONS.find((o) => o.value === level)!;
  return {
    key: 'kematangan',
    label: 'Tingkat Kematangan UKPBJ',
    dataDasar: `Level: ${opt.label}`,
    formula: 'Tidak ada perhitungan persentase — nilai mengikuti level kematangan yang dipilih.',
    persentaseAtauKondisi: opt.label,
    alasan: `Level "${opt.label}" → skor ${opt.skor}${opt.skor === 30 ? ' (maksimal)' : ''} sesuai tabel Kepka.`,
    skor: opt.skor,
    skorMax: 30,
  };
}

function hitungIntegritas(nilaiSpi: number, tahun: number): ItkpRowResult {
  let skor: number;
  let kategori: string;
  if (nilaiSpi >= 78) {
    skor = 10;
    kategori = 'Hijau / Terjaga (78–100)';
  } else if (nilaiSpi >= 73) {
    skor = 5;
    kategori = 'Kuning / Waspada (73–77,9)';
  } else {
    skor = 0;
    kategori = 'Merah / Rentan (0–72,9)';
  }
  return {
    key: 'integritas',
    label: 'Integritas Pengadaan (SPI)',
    dataDasar: `Nilai SPI ${fmtDec(nilaiSpi)} (Tahun Penilaian ${tahun})`,
    formula: 'Nilai ditentukan dari kategori skor SPI KPK (Hijau/Kuning/Merah).',
    persentaseAtauKondisi: kategori,
    alasan: `Nilai SPI ${fmtDec(nilaiSpi)} masuk kategori ${kategori} → skor ${skor}${skor === 10 ? ' (maksimal)' : ''}.`,
    skor,
    skorMax: 10,
  };
}

export function computeItkpBCD(input: ItkpBCDInput): ItkpBCDResult {
  const formasi = hitungFormasi(input.kebutuhanFormasi, input.formasiTerisi);
  const penugasan = hitungPenugasan(input.penugasan);
  const renaksi = hitungRenaksi(input.renaksi);
  const kematangan = hitungKematangan(input.kematangan);
  const integritas = hitungIntegritas(input.nilaiSpi, input.tahunPenilaianSpi);

  const nilaiB = formasi.skor + penugasan.skor + renaksi.skor;
  const nilaiC = kematangan.skor;
  const nilaiD = integritas.skor;

  return {
    formasi,
    penugasan,
    renaksi,
    kematangan,
    integritas,
    rows: [formasi, penugasan, renaksi, kematangan, integritas],
    nilaiB,
    nilaiC,
    nilaiD,
    total: nilaiB + nilaiC + nilaiD,
  };
}

export interface ItkpAnalysisText {
  maksimal: string[];
  kehilanganNilai: { label: string; detail: string }[];
  risiko: string[];
  rekomendasi: string[];
}

const RISIKO_MAP: Record<string, string> = {
  formasi: 'Beban kerja pengadaan menumpuk pada personel yang tersedia, berisiko menurunkan kualitas evaluasi/dokumen pengadaan dan memperlambat proses.',
  penugasan: 'JF PPBJ/Personel Lainnya yang belum ditugaskan penuh pada peran Pokja/PP/PPK membuat fungsi jabatan fungsional tidak optimal dan pekerjaan pengadaan rawan dirangkap oleh pihak yang tidak seharusnya.',
  renaksi: 'Tanpa Renaksi yang lengkap, tidak ada peta jalan terukur untuk memenuhi sertifikasi kompetensi JF PPBJ maupun PPK, sehingga kesenjangan kompetensi berlarut tanpa target waktu.',
  kematangan: 'UKPBJ dengan level kematangan rendah cenderung lemah dalam standardisasi proses, manajemen risiko, dan inovasi pengadaan, sehingga rentan terhadap temuan audit.',
  integritas: 'Skor SPI rendah mengindikasikan persepsi risiko korupsi/suap dalam proses pengadaan, yang berdampak pada kepercayaan publik dan potensi sanksi/pengawasan tambahan dari KPK/APIP.',
};

const REKOMENDASI_MAP: Record<string, string> = {
  formasi: 'Ajukan penambahan formasi JF PPBJ/Personel Lainnya ke unit kepegawaian, atau optimalkan personel eksisting melalui pelatihan multi-peran sambil menunggu formasi terpenuhi.',
  penugasan: 'Susun SK penugasan agar seluruh JF PPBJ/Personel Lainnya merangkap peran Pokja Pemilihan, Pejabat Pengadaan, dan PPK secara resmi dan terdokumentasi.',
  renaksi: 'Susun/lengkapi dokumen Renaksi pemenuhan sertifikasi kompetensi untuk JF PPBJ/Personel Lainnya (minimal UK 4 atau UK 2) dan PPK (minimal UK 2), lengkap dengan target waktu dan verifikasi.',
  kematangan: 'Ikuti asesmen kematangan UKPBJ berikutnya dengan menindaklanjuti area penilaian yang masih lemah (proses bisnis, manajemen risiko, manajemen kinerja) untuk naik ke level PKP Proaktif/Strategis/Unggul.',
  integritas: 'Tindak lanjuti area survei SPI dengan skor terendah (mis. gratifikasi, transparansi proses) melalui perbaikan tata kelola dan sosialisasi internal sebelum periode penilaian SPI berikutnya.',
};

export function buildAnalysis(result: ItkpBCDResult): ItkpAnalysisText {
  const maksimal: string[] = [];
  const kehilanganNilai: { label: string; detail: string }[] = [];
  const risiko: string[] = [];
  const rekomendasi: string[] = [];

  for (const row of result.rows) {
    if (row.skor >= row.skorMax) {
      maksimal.push(`${row.label} (skor ${row.skor}/${row.skorMax}).`);
    } else {
      const gap = row.skorMax - row.skor;
      kehilanganNilai.push({
        label: row.label,
        detail: `skor ${row.skor}/${row.skorMax} — kehilangan ${gap} poin. ${row.alasan}`,
      });
      if (RISIKO_MAP[row.key]) risiko.push(`${row.label}: ${RISIKO_MAP[row.key]}`);
      if (REKOMENDASI_MAP[row.key]) rekomendasi.push(`${row.label}: ${REKOMENDASI_MAP[row.key]}`);
    }
  }

  return { maksimal, kehilanganNilai, risiko, rekomendasi };
}
