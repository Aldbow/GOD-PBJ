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

// Input nol — dipakai untuk mengambil metadata statis (label/formula/skorMax/
// rentang) tiap indikator komponen A tanpa perlu data Supabase, mis. untuk
// kartu Pedoman Lengkap yang murni referensi regulasi.
export function emptyItkpAInput(): ItkpAInput {
  return {
    totalNilaiBelanjaPBJ: 0,
    totalPengumumanRUP: 0,
    rupPenyedia: 0,
    rupETendering: 0,
    rupEPurchasing: 0,
    rupPengadaanLangsung: 0,
    rupPenunjukanLangsung: 0,
    realisasiETendering: 0,
    realisasiEPurchasing: 0,
    realisasiPLTransaksional: 0,
    realisasiPnLTransaksional: 0,
    pencatatanNonTender: 0,
    pencatatanSwakelola: 0,
  };
}

export interface ItkpABand {
  // Ambang batas bawah persentase untuk band ini (dipakai internal oleh
  // pickBand); UI cukup menampilkan `label` & `skor`.
  min: number;
  label: string;
  skor: number;
}

export interface ItkpARowResult {
  key: string;
  label: string;
  dataDasar: string;
  formula: string;
  persentase: string;
  alasan: string;
  catatan: string;
  applicable: boolean;
  skor: number;
  skorMax: number;
  numLabel: string;
  denLabel: string;
  numValue: number;
  denValue: number;
  // Tabel konversi persentase -> skor lengkap (Kepka LKPP No. 74/2026), untuk
  // ditampilkan ke user sebagai info "kenapa skornya segitu". `rentangAktifLabel`
  // menandai baris mana yang sedang berlaku (null bila tidak dapat dihitung).
  rentang: ItkpABand[];
  rentangAktifLabel: string | null;
}

export interface ItkpAResult {
  rows: ItkpARowResult[];
  nilaiRencana: number;
  nilaiRencanaMaxSaatIni: number;
  nilaiRealisasi: number;
  nilaiRealisasiMaxSaatIni: number;
  total: number;
  totalMaxSaatIni: number;
  totalMaxKepka: number;
}

const TIDAK_DAPAT_DIHITUNG = 'Tidak dapat dihitung (penyebut = 0)';

function pct(num: number, den: number): number | null {
  if (!den || den === 0) return null;
  return (num / den) * 100;
}

function rasio(num: number, den: number): string {
  return `${fmtDec(num)} / ${fmtDec(den)}`;
}

// Tabel konversi persentase -> skor didefinisikan sebagai data (bukan if-chain)
// supaya bisa ditampilkan utuh ke user sebagai "Informasi Rentang Nilai" —
// bukan cuma baris yang sedang aktif. Urutan array = urutan ambang batas
// menurun (dicek dari atas ke bawah, entri pertama yang p >= min yang dipakai).
function pickBand(p: number, table: ItkpABand[]): ItkpABand {
  for (const b of table) {
    if (p >= b.min) return b;
  }
  return table[table.length - 1];
}

const BAND_PENGUMUMAN_RUP: ItkpABand[] = [
  { min: 150, label: '≥150%', skor: 0 },
  { min: 110, label: '110%–<150%', skor: 4 },
  { min: 90, label: '90%–<110%', skor: 5 },
  { min: 80, label: '80%–<90%', skor: 4 },
  { min: 70, label: '70%–<80%', skor: 3 },
  { min: 60, label: '60%–<70%', skor: 2 },
  { min: 50, label: '50%–<60%', skor: 1 },
  { min: -Infinity, label: '<50%', skor: 0 },
];

const BAND_RUP_PENYEDIA: ItkpABand[] = [
  { min: 80, label: '≥80%', skor: 2.5 },
  { min: 70, label: '70%–<80%', skor: 2 },
  { min: 60, label: '60%–<70%', skor: 1.5 },
  { min: 50, label: '50%–<60%', skor: 1 },
  { min: 40, label: '40%–<50%', skor: 0.5 },
  { min: -Infinity, label: '<40%', skor: 0 },
];

const BAND_RUP_TENDER_PURCHASING: ItkpABand[] = [
  { min: 60, label: '≥60%', skor: 2.5 },
  { min: 50, label: '50%–<60%', skor: 2 },
  { min: 40, label: '40%–<50%', skor: 1.5 },
  { min: 30, label: '30%–<40%', skor: 1 },
  { min: 20, label: '20%–<30%', skor: 0.5 },
  { min: -Infinity, label: '<20%', skor: 0 },
];

const BAND_REALISASI_TENDER_PURCHASING: ItkpABand[] = [
  { min: 60, label: '≥60%', skor: 10 },
  { min: 50, label: '50%–<60%', skor: 8 },
  { min: 40, label: '40%–<50%', skor: 6 },
  { min: 30, label: '30%–<40%', skor: 4 },
  { min: 20, label: '20%–<30%', skor: 2 },
  { min: -Infinity, label: '<20%', skor: 0 },
];

const BAND_REALISASI_TRANSAKSIONAL: ItkpABand[] = [
  { min: 50, label: '≥50%', skor: 2.5 },
  { min: 40, label: '40%–<50%', skor: 2 },
  { min: 30, label: '30%–<40%', skor: 1.5 },
  { min: 20, label: '20%–<30%', skor: 1 },
  { min: 10, label: '10%–<20%', skor: 0.5 },
  { min: -Infinity, label: '<10%', skor: 0 },
];

const BAND_DIGITALISASI: ItkpABand[] = [
  { min: 80, label: '≥80%', skor: 5 },
  { min: 70, label: '70%–<80%', skor: 4 },
  { min: 60, label: '60%–<70%', skor: 3 },
  { min: 50, label: '50%–<60%', skor: 2 },
  { min: 40, label: '40%–<50%', skor: 1 },
  { min: -Infinity, label: '<40%', skor: 0 },
];

function buildRow(args: {
  key: string;
  label: string;
  num: number;
  den: number;
  numLabel: string;
  denLabel: string;
  formula: string;
  skorMax: number;
  bandTable: ItkpABand[];
  catatanOk: string;
  catatanNa: string;
}): ItkpARowResult {
  const { key, label, num, den, numLabel, denLabel, formula, skorMax, bandTable, catatanOk, catatanNa } = args;
  const p = pct(num, den);
  if (p === null) {
    return {
      key,
      label,
      dataDasar: rasio(num, den),
      formula,
      persentase: TIDAK_DAPAT_DIHITUNG,
      alasan: 'Pembagi bernilai 0 sehingga persentase tidak dapat dihitung; skor diberikan 0 dan komponen ini dikeluarkan dari skor maksimum saat ini karena tidak berlaku untuk cakupan ini.',
      catatan: catatanNa,
      applicable: false,
      skor: 0,
      skorMax,
      numLabel,
      denLabel,
      numValue: num,
      denValue: den,
      rentang: bandTable,
      rentangAktifLabel: null,
    };
  }
  const { skor, label: bandLabel } = pickBand(p, bandTable);
  return {
    key,
    label,
    dataDasar: rasio(num, den),
    formula,
    persentase: fmtPct(p),
    alasan: `${fmtPct(p)} berada pada rentang ${bandLabel} → skor ${skor}${skor === skorMax ? ' (maksimal)' : ''}.`,
    catatan: catatanOk,
    applicable: true,
    skor,
    skorMax,
    numLabel,
    denLabel,
    numValue: num,
    denValue: den,
    rentang: bandTable,
    rentangAktifLabel: bandLabel,
  };
}

export function computeItkpA(input: ItkpAInput): ItkpAResult {
  const pengumumanRUP = buildRow({
    key: 'pengumumanRup',
    label: 'Pengumuman RUP',
    num: input.totalPengumumanRUP,
    den: input.totalNilaiBelanjaPBJ,
    numLabel: 'Total Pengumuman RUP',
    denLabel: 'Total Nilai Belanja PBJ',
    formula: 'Persentase = (Total Pengumuman RUP / Total Nilai Belanja PBJ) × 100%',
    skorMax: 5,
    bandTable: BAND_PENGUMUMAN_RUP,
    catatanOk: 'Pengumuman RUP pada SIRUP telah dilakukan secara lengkap dan tepat waktu.',
    catatanNa: 'Tidak ada data Total Nilai Belanja PBJ untuk cakupan ini.',
  });

  const rupPenyedia = buildRow({
    key: 'rupPenyedia',
    label: 'RUP melalui Penyedia',
    num: input.rupPenyedia,
    den: input.totalPengumumanRUP,
    numLabel: 'RUP Penyedia',
    denLabel: 'Total Pengumuman RUP',
    formula: 'Persentase = (RUP Penyedia / Total Pengumuman RUP) × 100%',
    skorMax: 2.5,
    bandTable: BAND_RUP_PENYEDIA,
    catatanOk: 'Seluruh/sebagian paket RUP telah direncanakan melalui Penyedia pada sistem.',
    catatanNa: 'Tidak ada RUP yang diumumkan pada cakupan ini.',
  });

  const rupTenderPurchasing = buildRow({
    key: 'rupTenderPurchasing',
    label: 'RUP e-Tendering + e-Purchasing',
    num: input.rupETendering + input.rupEPurchasing,
    den: input.rupPenyedia,
    numLabel: 'RUP e-Tendering + e-Purchasing',
    denLabel: 'RUP Penyedia',
    formula: 'Persentase = (RUP e-Tendering + RUP e-Purchasing) / RUP Penyedia × 100%',
    skorMax: 2.5,
    bandTable: BAND_RUP_TENDER_PURCHASING,
    catatanOk: 'Sebagian RUP Penyedia direncanakan lewat metode Tender/e-Purchasing.',
    catatanNa: 'Tidak ada RUP Penyedia pada cakupan ini, sehingga komponen ini tidak menjadi parameter.',
  });

  const realisasiTenderPurchasing = buildRow({
    key: 'realisasiTenderPurchasing',
    label: 'Realisasi e-Tendering + e-Purchasing',
    num: input.realisasiETendering + input.realisasiEPurchasing,
    den: input.rupPenyedia,
    numLabel: 'Realisasi e-Tendering + e-Purchasing',
    denLabel: 'RUP Penyedia',
    formula: 'Persentase = (Realisasi e-Tendering + Realisasi e-Purchasing) / RUP Penyedia × 100%',
    skorMax: 10,
    bandTable: BAND_REALISASI_TENDER_PURCHASING,
    catatanOk: 'Realisasi e-Tendering + e-Purchasing berdasarkan nilai transaksi.',
    catatanNa: 'Tidak ada RUP Penyedia pada cakupan ini, sehingga komponen ini tidak menjadi parameter.',
  });

  const realisasiPL = buildRow({
    key: 'realisasiPL',
    label: 'Realisasi Pengadaan Langsung Transaksional',
    num: input.realisasiPLTransaksional,
    den: input.rupPengadaanLangsung,
    numLabel: 'Realisasi Pengadaan Langsung Transaksional',
    denLabel: 'RUP Pengadaan Langsung',
    formula: 'Persentase = Realisasi Pengadaan Langsung Transaksional / RUP Pengadaan Langsung × 100%',
    skorMax: 2.5,
    bandTable: BAND_REALISASI_TRANSAKSIONAL,
    catatanOk: 'Realisasi Pengadaan Langsung Transaksional berdasarkan nilai transaksi.',
    catatanNa: 'Tidak ada pagu Pengadaan Langsung pada cakupan ini.',
  });

  const realisasiPnL = buildRow({
    key: 'realisasiPnL',
    label: 'Realisasi Penunjukan Langsung Transaksional',
    num: input.realisasiPnLTransaksional,
    den: input.rupPenunjukanLangsung,
    numLabel: 'Realisasi Penunjukan Langsung Transaksional',
    denLabel: 'RUP Penunjukan Langsung',
    formula: 'Persentase = Realisasi Penunjukan Langsung Transaksional / RUP Penunjukan Langsung × 100%',
    skorMax: 2.5,
    bandTable: BAND_REALISASI_TRANSAKSIONAL,
    catatanOk: 'Realisasi Penunjukan Langsung Transaksional berdasarkan nilai transaksi.',
    catatanNa: 'Tidak ada pagu Penunjukan Langsung pada cakupan ini.',
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
    numLabel: 'Realisasi Digitalisasi PBJ (gabungan)',
    denLabel: 'Total Pengumuman RUP',
    formula:
      'Persentase = (Realisasi e-Tendering + Realisasi e-Purchasing + Realisasi e-Pengadaan Langsung + Realisasi e-Penunjukan Langsung + Pencatatan Non Tender + Pencatatan Swakelola) / Total Pengumuman RUP × 100%',
    skorMax: 5,
    bandTable: BAND_DIGITALISASI,
    catatanOk: 'Pemanfaatan fitur digitalisasi PBJ sesuai ketentuan yang berlaku.',
    catatanNa: 'Tidak ada RUP yang diumumkan pada cakupan ini, sehingga komponen ini tidak menjadi parameter.',
  });

  const rencanaRows = [pengumumanRUP, rupPenyedia, rupTenderPurchasing];
  const realisasiRows = [realisasiTenderPurchasing, realisasiPL, realisasiPnL, realisasiDigitalisasi];
  const rows = [...rencanaRows, ...realisasiRows];

  const sumSkor = (rs: ItkpARowResult[]) => rs.reduce((s, r) => s + r.skor, 0);
  const sumMaxApplicable = (rs: ItkpARowResult[]) => rs.reduce((s, r) => s + (r.applicable ? r.skorMax : 0), 0);
  const sumMaxKepka = (rs: ItkpARowResult[]) => rs.reduce((s, r) => s + r.skorMax, 0);

  const nilaiRencana = sumSkor(rencanaRows);
  const nilaiRencanaMaxSaatIni = sumMaxApplicable(rencanaRows);
  const nilaiRealisasi = sumSkor(realisasiRows);
  const nilaiRealisasiMaxSaatIni = sumMaxApplicable(realisasiRows);

  return {
    rows,
    nilaiRencana,
    nilaiRencanaMaxSaatIni,
    nilaiRealisasi,
    nilaiRealisasiMaxSaatIni,
    total: nilaiRencana + nilaiRealisasi,
    totalMaxSaatIni: nilaiRencanaMaxSaatIni + nilaiRealisasiMaxSaatIni,
    totalMaxKepka: sumMaxKepka(rows),
  };
}

export interface ItkpAnalysisText {
  maksimal: string[];
  kehilanganNilai: { label: string; detail: string }[];
  tidakBerlaku: string[];
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
  const tidakBerlaku: string[] = [];
  const risiko: string[] = [];
  const rekomendasi: string[] = [];

  for (const row of result.rows) {
    if (!row.applicable) {
      tidakBerlaku.push(`${row.label} — ${row.catatan}`);
      continue;
    }
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

  return { maksimal, kehilanganNilai, tidakBerlaku, risiko, rekomendasi };
}
