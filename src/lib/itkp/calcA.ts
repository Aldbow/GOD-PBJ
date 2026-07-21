import { fmtDec, fmtPct } from '@/lib/format';

export interface ItkpAInput {
  totalNilaiBelanjaPBJ: number;
  totalPengumumanRUP: number;
  rupPenyedia: number;
  rupETendering: number;
  rupEPurchasing: number;
  rupPengadaanLangsung: number;
  rupPenunjukanLangsung: number;
  realisasiETendering: number;
  realisasiEPurchasing: number;
  realisasiPLTransaksional: number;
  realisasiPnLTransaksional: number;
  pencatatanNonTender: number;
  pencatatanSwakelola: number;
}

export interface ItkpARowResult {
  key: string;
  label: string;
  dataDasar: string;
  formula: string;
  persentase: string;
  alasan: string;
  skor: number;
  skorMax: number;
}

export interface ItkpAResult {
  rows: ItkpARowResult[];
  nilaiRencana: number;
  nilaiRealisasi: number;
  total: number;
}

const TIDAK_DAPAT_DIHITUNG = 'Tidak dapat dihitung (penyebut = 0)';

function pct(num: number, den: number): number | null {
  if (!den || den === 0) return null;
  return (num / den) * 100;
}

function rasio(num: number, den: number): string {
  return `${fmtDec(num)} / ${fmtDec(den)}`;
}

function buildRow(args: {
  key: string;
  label: string;
  num: number;
  den: number;
  formula: string;
  skorMax: number;
  band: (p: number) => { skor: number; band: string };
}): ItkpARowResult {
  const { key, label, num, den, formula, skorMax, band } = args;
  const p = pct(num, den);
  if (p === null) {
    return {
      key,
      label,
      dataDasar: rasio(num, den),
      formula,
      persentase: TIDAK_DAPAT_DIHITUNG,
      alasan: `Pembagi bernilai 0 sehingga persentase tidak dapat dihitung; skor diberikan 0 sesuai aturan.`,
      skor: 0,
      skorMax,
    };
  }
  const { skor, band: bandLabel } = band(p);
  return {
    key,
    label,
    dataDasar: rasio(num, den),
    formula,
    persentase: fmtPct(p),
    alasan: `${fmtPct(p)} berada pada rentang ${bandLabel} → skor ${skor}${skor === skorMax ? ' (maksimal)' : ''}.`,
    skor,
    skorMax,
  };
}

function bandPengumumanRUP(p: number) {
  if (p >= 150) return { skor: 0, band: '≥150%' };
  if (p >= 110) return { skor: 4, band: '110%–<150%' };
  if (p >= 90) return { skor: 5, band: '90%–<110%' };
  if (p >= 80) return { skor: 4, band: '80%–<90%' };
  if (p >= 70) return { skor: 3, band: '70%–<80%' };
  if (p >= 60) return { skor: 2, band: '60%–<70%' };
  if (p >= 50) return { skor: 1, band: '50%–<60%' };
  return { skor: 0, band: '<50%' };
}

function bandRupPenyedia(p: number) {
  if (p >= 80) return { skor: 2.5, band: '≥80%' };
  if (p >= 70) return { skor: 2, band: '70%–<80%' };
  if (p >= 60) return { skor: 1.5, band: '60%–<70%' };
  if (p >= 50) return { skor: 1, band: '50%–<60%' };
  if (p >= 40) return { skor: 0.5, band: '40%–<50%' };
  return { skor: 0, band: '<40%' };
}

function bandRupTenderPurchasing(p: number) {
  if (p >= 60) return { skor: 2.5, band: '≥60%' };
  if (p >= 50) return { skor: 2, band: '50%–<60%' };
  if (p >= 40) return { skor: 1.5, band: '40%–<50%' };
  if (p >= 30) return { skor: 1, band: '30%–<40%' };
  if (p >= 20) return { skor: 0.5, band: '20%–<30%' };
  return { skor: 0, band: '<20%' };
}

function bandRealisasiTenderPurchasing(p: number) {
  if (p >= 60) return { skor: 10, band: '≥60%' };
  if (p >= 50) return { skor: 8, band: '50%–<60%' };
  if (p >= 40) return { skor: 6, band: '40%–<50%' };
  if (p >= 30) return { skor: 4, band: '30%–<40%' };
  if (p >= 20) return { skor: 2, band: '20%–<30%' };
  return { skor: 0, band: '<20%' };
}

function bandRealisasiTransaksional(p: number) {
  if (p >= 50) return { skor: 2.5, band: '≥50%' };
  if (p >= 40) return { skor: 2, band: '40%–<50%' };
  if (p >= 30) return { skor: 1.5, band: '30%–<40%' };
  if (p >= 20) return { skor: 1, band: '20%–<30%' };
  if (p >= 10) return { skor: 0.5, band: '10%–<20%' };
  return { skor: 0, band: '<10%' };
}

function bandDigitalisasi(p: number) {
  if (p >= 80) return { skor: 5, band: '≥80%' };
  if (p >= 70) return { skor: 4, band: '70%–<80%' };
  if (p >= 60) return { skor: 3, band: '60%–<70%' };
  if (p >= 50) return { skor: 2, band: '50%–<60%' };
  if (p >= 40) return { skor: 1, band: '40%–<50%' };
  return { skor: 0, band: '<40%' };
}

export function computeItkpA(input: ItkpAInput): ItkpAResult {
  const pengumumanRUP = buildRow({
    key: 'pengumumanRup',
    label: 'Pengumuman RUP',
    num: input.totalPengumumanRUP,
    den: input.totalNilaiBelanjaPBJ,
    formula: 'Persentase = (Total Pengumuman RUP / Total Nilai Belanja PBJ) × 100%',
    skorMax: 5,
    band: bandPengumumanRUP,
  });

  const rupPenyedia = buildRow({
    key: 'rupPenyedia',
    label: 'RUP melalui Penyedia',
    num: input.rupPenyedia,
    den: input.totalPengumumanRUP,
    formula: 'Persentase = (RUP Penyedia / Total Pengumuman RUP) × 100%',
    skorMax: 2.5,
    band: bandRupPenyedia,
  });

  const rupTenderPurchasing = buildRow({
    key: 'rupTenderPurchasing',
    label: 'RUP e-Tendering + e-Purchasing',
    num: input.rupETendering + input.rupEPurchasing,
    den: input.rupPenyedia,
    formula: 'Persentase = (RUP e-Tendering + RUP e-Purchasing) / RUP Penyedia × 100%',
    skorMax: 2.5,
    band: bandRupTenderPurchasing,
  });

  const realisasiTenderPurchasing = buildRow({
    key: 'realisasiTenderPurchasing',
    label: 'Realisasi e-Tendering + e-Purchasing',
    num: input.realisasiETendering + input.realisasiEPurchasing,
    den: input.rupPenyedia,
    formula: 'Persentase = (Realisasi e-Tendering + Realisasi e-Purchasing) / RUP Penyedia × 100%',
    skorMax: 10,
    band: bandRealisasiTenderPurchasing,
  });

  const realisasiPL = buildRow({
    key: 'realisasiPL',
    label: 'Realisasi Pengadaan Langsung Transaksional',
    num: input.realisasiPLTransaksional,
    den: input.rupPengadaanLangsung,
    formula: 'Persentase = Realisasi Pengadaan Langsung Transaksional / RUP Pengadaan Langsung × 100%',
    skorMax: 2.5,
    band: bandRealisasiTransaksional,
  });

  const realisasiPnL = buildRow({
    key: 'realisasiPnL',
    label: 'Realisasi Penunjukan Langsung Transaksional',
    num: input.realisasiPnLTransaksional,
    den: input.rupPenunjukanLangsung,
    formula: 'Persentase = Realisasi Penunjukan Langsung Transaksional / RUP Penunjukan Langsung × 100%',
    skorMax: 2.5,
    band: bandRealisasiTransaksional,
  });

  const digitalisasiNum =
    input.realisasiETendering +
    input.realisasiEPurchasing +
    input.realisasiPLTransaksional +
    input.realisasiPnLTransaksional +
    input.pencatatanNonTender +
    input.pencatatanSwakelola;

  const realisasiDigitalisasi = buildRow({
    key: 'realisasiDigitalisasi',
    label: 'Realisasi Digitalisasi PBJ',
    num: digitalisasiNum,
    den: input.totalPengumumanRUP,
    formula:
      'Persentase = (Realisasi e-Tendering + Realisasi e-Purchasing + Realisasi e-Pengadaan Langsung + Realisasi e-Penunjukan Langsung + Pencatatan Non Tender + Pencatatan Swakelola) / Total Pengumuman RUP × 100%',
    skorMax: 5,
    band: bandDigitalisasi,
  });

  const rows = [
    pengumumanRUP,
    rupPenyedia,
    rupTenderPurchasing,
    realisasiTenderPurchasing,
    realisasiPL,
    realisasiPnL,
    realisasiDigitalisasi,
  ];

  const nilaiRencana = pengumumanRUP.skor + rupPenyedia.skor + rupTenderPurchasing.skor;
  const nilaiRealisasi = realisasiTenderPurchasing.skor + realisasiPL.skor + realisasiPnL.skor + realisasiDigitalisasi.skor;

  return {
    rows,
    nilaiRencana,
    nilaiRealisasi,
    total: nilaiRencana + nilaiRealisasi,
  };
}

export interface ItkpAnalysisText {
  maksimal: string[];
  kehilanganNilai: { label: string; detail: string }[];
  risiko: string[];
  rekomendasi: string[];
}

const RISIKO_MAP_A: Record<string, string> = {
  pengumumanRup: 'Rasio yang jauh dari 100% (baik kurang maupun kelebihan) mengindikasikan RUP tidak mencerminkan seluruh belanja PBJ, sehingga perencanaan sulit dijadikan basis pengawasan dan pengendalian anggaran.',
  rupPenyedia: 'Dominasi metode swakelola/non-kompetitif yang berlebihan berisiko menghindari kompetisi pada paket yang seharusnya dilakukan lewat penyedia, berpotensi menurunkan efisiensi harga.',
  rupTenderPurchasing: 'Rendahnya porsi RUP yang direncanakan lewat Tender/e-Purchasing berarti banyak paket bergantung pada metode manual (PL/PnL) yang lebih rawan dari sisi transparansi dan kompetisi harga.',
  realisasiTenderPurchasing: 'Realisasi jauh di bawah RUP menandakan backlog pengadaan besar — paket sudah direncanakan tapi belum terlaksana, berisiko terhadap capaian target kinerja tahun berjalan.',
  realisasiPL: 'RUP Pengadaan Langsung yang tidak terealisasi berarti kebutuhan barang/jasa operasional belum terpenuhi, berisiko mengganggu kelancaran kegiatan satker.',
  realisasiPnL: 'RUP Penunjukan Langsung yang tidak terealisasi berisiko sama — kebutuhan mendesak/khusus yang direncanakan lewat metode ini belum tertangani.',
  realisasiDigitalisasi: 'Rendahnya proporsi realisasi yang tercatat/terlaksana secara elektronik menurunkan transparansi dan auditability keseluruhan proses pengadaan, serta menyulitkan pemantauan real-time.',
};

const REKOMENDASI_MAP_A: Record<string, string> = {
  pengumumanRup: 'Lakukan rekonsiliasi rutin antara data RUP dan pagu belanja PBJ di RKA/DPA agar seluruh paket (termasuk revisi) terumumkan tepat waktu dan sesuai nilai riil.',
  rupPenyedia: 'Identifikasi paket swakelola yang sebenarnya memenuhi syarat kompetisi dan dorong perencanaannya lewat metode penyedia pada RUP tahun berikutnya.',
  rupTenderPurchasing: 'Migrasikan paket Pengadaan Langsung/Penunjukan Langsung yang memenuhi syarat nilai/spesifikasi ke metode Tender atau e-Purchasing sejak tahap perencanaan RUP.',
  realisasiTenderPurchasing: 'Percepat proses pemilihan penyedia untuk paket Tender/e-Purchasing yang masih "Belum Realisasi", termasuk audit paket yang mangkrak sejak awal tahun anggaran.',
  realisasiPL: 'Dorong PPK/Pejabat Pengadaan mempercepat eksekusi paket Pengadaan Langsung yang RUP-nya sudah tersedia namun belum ada transaksi/kontrak.',
  realisasiPnL: 'Dorong percepatan eksekusi paket Penunjukan Langsung, sekaligus evaluasi apakah keterlambatan disebabkan oleh proses administratif atau ketersediaan penyedia.',
  realisasiDigitalisasi: 'Tingkatkan kepatuhan pencatatan realisasi swakelola dan non-tender ke sistem elektronik, serta pastikan seluruh transaksi Tender/e-Purchasing/PL/PnL yang sudah selesai segera diinput.',
};

export function buildAnalysisA(result: ItkpAResult): ItkpAnalysisText {
  const maksimal: string[] = [];
  const kehilanganNilai: { label: string; detail: string }[] = [];
  const risiko: string[] = [];
  const rekomendasi: string[] = [];

  for (const row of result.rows) {
    if (row.skor >= row.skorMax) {
      maksimal.push(`${row.label} (skor ${fmtDec(row.skor, 1)}/${fmtDec(row.skorMax, 1)}).`);
    } else {
      const gap = row.skorMax - row.skor;
      kehilanganNilai.push({
        label: row.label,
        detail: `skor ${fmtDec(row.skor, 1)}/${fmtDec(row.skorMax, 1)} — kehilangan ${fmtDec(gap, 1)} poin. ${row.alasan}`,
      });
      if (RISIKO_MAP_A[row.key]) risiko.push(`${row.label}: ${RISIKO_MAP_A[row.key]}`);
      if (REKOMENDASI_MAP_A[row.key]) rekomendasi.push(`${row.label}: ${REKOMENDASI_MAP_A[row.key]}`);
    }
  }

  return { maksimal, kehilanganNilai, risiko, rekomendasi };
}
