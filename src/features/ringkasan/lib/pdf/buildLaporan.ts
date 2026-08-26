import { fmtDec, fmtInt, fmtPct, fmtRupiah, fmtRupiahDetail } from '@/lib/format';
import { ANOMALI_LABEL } from '@/lib/anomali';
import { jenisColor, metodeColor, sumberColor } from '../../components/charts/chartTheme';
import { stamp } from './ink';
import type { LaporanBlock, PrintSections, TableBlock } from './types';
import type { RingkasanAggregate, RingkasanFilterValue } from '../ringkasanData';

/**
 * Penyusun isi Cetak Laporan Ringkasan — FUNGSI MURNI.
 *
 * Tidak menyentuh DOM, jsPDF, tanggal sekarang, maupun tema aplikasi. Semua
 * yang berubah-ubah masuk lewat `LaporanInput`. Dua akibat yang memang dikejar:
 *
 * 1. Cetakan tidak lagi bergantung pada keadaan layar. Cetakan lama memotret
 *    `#report-snapshot`, sehingga akordeon harus dipaksa terbuka dan tabel
 *    anomali harus dibentangkan lebih dulu — layar dimutasi demi berkas PDF.
 *    Di sini isinya dibaca dari agregat yang sama dengan yang dipakai layar,
 *    jadi seksi yang sedang tergulung atau terpaginasi tetap tercetak utuh.
 * 2. Aturan kerahasiaan bisa diuji. `canSeePaketDetail` adalah gerbang yang
 *    sama dengan di RingkasanView; di sini ia bisa diassert tanpa browser.
 */

export interface LaporanInput {
  agg: RingkasanAggregate;
  /** Judul lingkup — nama satker, atau 'Kementerian Ketenagakerjaan'. */
  scopeLabel: string;
  filter: RingkasanFilterValue;
  /** Filter satker/ppk sedang aktif → peringkat antar-satker tidak relevan. */
  isFiltered: boolean;
  /** Gerbang identitas paket (nama paket, kode RUP, nama PPK, catatan kurasi). */
  canSeePaketDetail: boolean;
  /** Satker yang disorot di tabel peringkat. */
  highlightSatker?: string;
  /** Keterangan pembatasan lingkup, mis. untuk role PPK. */
  scopeNote?: string | null;
  /** Ringkasan yang diterbitkan seksi ITKP & Risiko. */
  sections: PrintSections;
  printedAt: Date;
}

export interface Laporan {
  title: string;
  subtitle: string;
  /** Baris keterangan kecil di kop dokumen. */
  meta: string[];
  blocks: LaporanBlock[];
  /** Teks kiri pada kaki setiap halaman. */
  footerNote: string;
  runningHead: string;
}

const SUMBER_DATA = 'Sumber: RUP terumumkan (SIRUP) & realisasi SPSE';

/** Nomor seksi berjalan — seksi bersyarat tidak boleh meninggalkan lubang. */
function counter() {
  let n = 0;
  return () => String((n += 1));
}

function pctOf(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/**
 * Tabel rincian kategori (Sumber/Metode/Jenis) — bentuknya sama untuk ketiganya.
 * Nilai rupiah ditulis penuh, bukan ringkas seperti di layar: cetakan dipakai
 * untuk merujuk dan mencocokkan angka, dan 'Rp 1,23 M' tidak bisa dicocokkan.
 */
function kategoriTable(
  header: string,
  rows: { label: string; jumlahPaket: number; pagu: number; realisasi: number; pctRealisasi: number }[],
  warna: (label: string) => string,
  foot?: string[]
): TableBlock {
  return {
    kind: 'table',
    columns: [
      { header, width: 'auto' },
      { header: 'Jumlah Paket', width: 68, align: 'right' },
      { header: 'Pagu', width: 96, align: 'right' },
      { header: 'Realisasi', width: 96, align: 'right' },
      { header: '% Realisasi', width: 64, align: 'right', tone: 'capaian' },
    ],
    rows: rows.map((r) => [
      r.label,
      fmtInt(r.jumlahPaket),
      fmtRupiahDetail(r.pagu),
      fmtRupiahDetail(r.realisasi),
      fmtPct(r.pctRealisasi),
    ]),
    swatches: rows.map((r) => warna(r.label)),
    foot,
    emptyText: 'Tidak ada data untuk lingkup ini.',
  };
}

export function buildLaporan(input: LaporanInput): Laporan {
  const { agg, scopeLabel, filter, isFiltered, canSeePaketDetail, sections, printedAt } = input;
  const { kpi } = agg;
  const no = counter();
  const blocks: LaporanBlock[] = [];

  const meta: string[] = [`Dicetak ${stamp(printedAt)}`, SUMBER_DATA];
  if (filter.ppk) meta.unshift(`PPK: ${filter.ppk}`);
  if (input.scopeNote) meta.push(input.scopeNote);

  // ── 1. Ikhtisar ───────────────────────────────────────────────────────────
  blocks.push({
    kind: 'heading',
    index: no(),
    title: 'Ikhtisar Kinerja Pengadaan',
    caption: 'Angka pokok pada lingkup yang dicetak',
  });
  blocks.push({
    kind: 'kpi',
    perRow: 3,
    items: [
      { label: 'Total Pagu', value: fmtRupiah(kpi.totalPagu), hint: fmtRupiahDetail(kpi.totalPagu), accent: '#2a78d6' },
      { label: 'Total Realisasi', value: fmtRupiah(kpi.totalRealisasi), hint: fmtRupiahDetail(kpi.totalRealisasi), accent: '#008300' },
      { label: 'Belum Realisasi', value: fmtRupiah(kpi.belumRealisasi), hint: fmtRupiahDetail(kpi.belumRealisasi), accent: '#94a3b8' },
      { label: 'Total Paket', value: fmtInt(kpi.totalPaket), hint: 'paket pada lingkup ini', accent: '#4a3aa7' },
      {
        label: 'Paket Sudah Realisasi',
        value: fmtInt(kpi.paketSudah),
        hint: `${fmtPct(pctOf(kpi.paketSudah, kpi.totalPaket))} dari total paket`,
        accent: '#1baf7a',
      },
      {
        label: 'Paket Belum Realisasi',
        value: fmtInt(kpi.paketBelum),
        hint: `${fmtPct(pctOf(kpi.paketBelum, kpi.totalPaket))} dari total paket`,
        accent: '#eb6834',
      },
    ],
  });
  blocks.push({
    kind: 'progress',
    label: 'Capaian Realisasi Anggaran',
    pct: kpi.pctRealisasi,
    leftCaption: `Realisasi ${fmtRupiahDetail(kpi.totalRealisasi)}`,
    rightCaption: `Pagu ${fmtRupiahDetail(kpi.totalPagu)}`,
  });

  // ── 2. Cara Pengadaan ─────────────────────────────────────────────────────
  const totalPaketSumber = agg.sumber.reduce((s, x) => s + x.jumlahPaket, 0);
  blocks.push({
    kind: 'heading',
    index: no(),
    title: 'Ringkasan Cara Pengadaan',
    caption: 'Proporsi paket Penyedia vs Swakelola dari RUP terumumkan (bukan dari realisasi)',
  });
  blocks.push({
    kind: 'split',
    leftRatio: 0.44,
    left: {
      kind: 'proporsi',
      title: 'Proporsi Jumlah Paket',
      centerValue: fmtInt(totalPaketSumber),
      centerLabel: 'Total Paket',
      items: agg.sumber.map((s) => ({
        label: s.kategori,
        value: s.jumlahPaket,
        colorHex: sumberColor(s.kategori, false),
      })),
    },
    right: {
      kind: 'barList',
      title: 'Realisasi per Cara Pengadaan',
      items: agg.sumber.map((s) => ({
        label: s.kategori,
        value: s.realisasi,
        total: s.pagu,
        valueText: fmtRupiah(s.realisasi),
        totalText: fmtRupiah(s.pagu),
        pct: s.pctRealisasi,
        colorHex: sumberColor(s.kategori, false),
      })),
    },
  });
  blocks.push(
    kategoriTable(
      'Cara Pengadaan',
      agg.sumber.map((s) => ({ label: s.kategori, ...s })),
      (l) => sumberColor(l, false)
    )
  );

  // ── 3. Metode Pengadaan ───────────────────────────────────────────────────
  const totalPaketMetode = agg.metode.reduce((s, m) => s + m.jumlahPaket, 0);
  blocks.push({
    kind: 'heading',
    index: no(),
    title: 'Ringkasan Metode Pengadaan',
    caption: 'Distribusi paket, pagu & realisasi per metode pemilihan',
  });
  blocks.push({
    kind: 'split',
    leftRatio: 0.44,
    left: {
      kind: 'proporsi',
      title: 'Proporsi Jumlah Paket',
      centerValue: fmtInt(totalPaketMetode),
      centerLabel: 'Total Paket',
      items: agg.metode.map((m) => ({ label: m.metode, value: m.jumlahPaket, colorHex: metodeColor(m.metode, false) })),
    },
    right: {
      kind: 'barList',
      title: 'Realisasi per Metode',
      items: agg.metode.map((m) => ({
        label: m.metode,
        value: m.realisasi,
        total: m.pagu,
        valueText: fmtRupiah(m.realisasi),
        totalText: fmtRupiah(m.pagu),
        pct: m.pctRealisasi,
        colorHex: metodeColor(m.metode, false),
      })),
    },
  });
  blocks.push(
    kategoriTable(
      'Metode Pengadaan',
      agg.metode.map((m) => ({ label: m.metode, ...m })),
      (l) => metodeColor(l, false),
      agg.metode.length > 0
        ? ['Total', fmtInt(kpi.totalPaket), fmtRupiahDetail(kpi.totalPagu), fmtRupiahDetail(kpi.totalRealisasi), fmtPct(kpi.pctRealisasi)]
        : undefined
    )
  );

  // ── 4. Jenis Pengadaan ────────────────────────────────────────────────────
  const totalPaketJenis = agg.jenis.reduce((s, j) => s + j.jumlahPaket, 0);
  blocks.push({
    kind: 'heading',
    index: no(),
    title: 'Ringkasan Jenis Pengadaan',
    caption: 'Distribusi paket, pagu & realisasi per jenis (Barang, Jasa, Konstruksi, Swakelola)',
  });
  blocks.push({
    kind: 'split',
    leftRatio: 0.44,
    left: {
      kind: 'proporsi',
      title: 'Proporsi Jumlah Paket',
      centerValue: fmtInt(totalPaketJenis),
      centerLabel: 'Total Paket',
      items: agg.jenis.map((j) => ({ label: j.jenis, value: j.jumlahPaket, colorHex: jenisColor(j.jenis, false) })),
    },
    right: {
      kind: 'barList',
      title: 'Realisasi per Jenis',
      items: agg.jenis.map((j) => ({
        label: j.jenis,
        value: j.realisasi,
        total: j.pagu,
        valueText: fmtRupiah(j.realisasi),
        totalText: fmtRupiah(j.pagu),
        pct: j.pctRealisasi,
        colorHex: jenisColor(j.jenis, false),
      })),
    },
  });
  blocks.push(
    kategoriTable(
      'Jenis Pengadaan',
      agg.jenis.map((j) => ({ label: j.jenis, ...j })),
      (l) => jenisColor(l, false)
    )
  );

  // ── 5. Peringkat Satuan Kerja (hanya saat tidak difilter) ─────────────────
  if (!isFiltered) {
    const peringkat = [...agg.satker]
      .sort((a, b) => b.pctRealisasi - a.pctRealisasi)
      .map((s, i) => ({ ...s, baseRank: i + 1 }));
    const highlightIdx = input.highlightSatker
      ? peringkat.reduce<number[]>((acc, s, i) => (s.satker === input.highlightSatker ? [...acc, i] : acc), [])
      : [];

    blocks.push({
      kind: 'heading',
      index: no(),
      title: 'Peringkat Realisasi Satuan Kerja',
      caption: `Diurutkan menurut persentase capaian — ${fmtInt(peringkat.length)} satuan kerja`,
    });
    blocks.push({
      kind: 'table',
      orientation: 'landscape',
      columns: [
        { header: 'Peringkat', width: 58, align: 'right' },
        { header: 'Satuan Kerja', width: 'auto' },
        { header: 'Jumlah Paket', width: 74, align: 'right' },
        { header: 'Pagu', width: 108, align: 'right' },
        { header: 'Realisasi', width: 108, align: 'right' },
        { header: '% Capaian', width: 68, align: 'right', tone: 'capaian' },
      ],
      rows: peringkat.map((s) => [
        String(s.baseRank),
        s.satker,
        fmtInt(s.jumlahPaket),
        fmtRupiahDetail(s.pagu),
        fmtRupiahDetail(s.realisasi),
        fmtPct(s.pctRealisasi),
      ]),
      highlightRows: highlightIdx,
      emptyText: 'Tidak ada satuan kerja pada lingkup ini.',
    });

    // Angka yang hilang tanpa keterangan lebih berbahaya daripada angka aneh —
    // aturan yang sama dengan catatan kaki tabel di layar.
    const ex = agg.satkerExclusion;
    if (ex.jumlahPaket > 0) {
      const hilang =
        ex.satkerHilang.length > 0
          ? ` Termasuk ${ex.satkerHilang.join(', ')} yang seluruh paketnya tanpa RUP sehingga tidak muncul sama sekali di tabel ini.`
          : '';
      blocks.push({
        kind: 'note',
        tone: 'warn',
        title: 'Yang tidak masuk peringkat',
        text:
          `${fmtInt(ex.jumlahPaket)} paket realisasi tanpa RUP terumumkan (${fmtRupiahDetail(ex.realisasi)}) ` +
          'tidak masuk peringkat: pagunya nol sehingga persentase capaiannya tidak dapat dihitung. ' +
          `Nilainya tetap terhitung pada Ikhtisar di atas dan rinciannya ada di seksi Deteksi Anomali.${hilang}`,
      });
    }
  }

  // ── 6. Indeks Tata Kelola Pengadaan ───────────────────────────────────────
  if (sections.itkp) {
    const it = sections.itkp;
    blocks.push({
      kind: 'heading',
      index: no(),
      title: 'Indeks Tata Kelola Pengadaan (ITKP)',
      caption: it.headline,
    });
    blocks.push({
      kind: 'score',
      scopeLabel: it.scopeLabel,
      value: fmtDec(it.total, it.total % 1 === 0 ? 0 : 1),
      max: fmtDec(it.max, it.max % 1 === 0 ? 0 : 1),
      ratioPct: it.ratioPct,
      predikat: it.predikat ?? undefined,
      komponen: it.komponen,
    });
    if (it.indikatorA.length > 0) {
      blocks.push({
        kind: 'table',
        title: 'Pemanfaatan Sistem (A) — 7 Indikator',
        columns: [
          { header: 'No', width: 30, align: 'right' },
          { header: 'Indikator', width: 'auto' },
          { header: 'Skor', width: 54, align: 'right' },
          { header: 'Skor Maks', width: 62, align: 'right' },
          { header: 'Capaian', width: 60, align: 'right', tone: 'capaian' },
        ],
        rows: it.indikatorA.map((r, i) => [
          `A${i + 1}`,
          r.label,
          r.applicable ? fmtDec(r.skor) : '—',
          r.applicable ? fmtDec(r.skorMax, r.skorMax % 1 === 0 ? 0 : 1) : '—',
          r.applicable ? fmtPct(pctOf(r.skor, r.skorMax)) : '—',
        ]),
        emptyText: 'Data indikator tidak tersedia.',
      });
    }
    if (it.note) blocks.push({ kind: 'note', tone: 'info', text: it.note });
  }

  // ── 7. Risiko Pengadaan ───────────────────────────────────────────────────
  if (sections.risiko) {
    const rk = sections.risiko;
    blocks.push({
      kind: 'heading',
      index: no(),
      title: 'Risiko Pengadaan',
      caption: `Penilaian risiko atas ${fmtInt(rk.totalPaket)} paket pada lingkup ini`,
    });
    blocks.push({
      kind: 'metric',
      items: rk.kategori.map((k) => ({
        label: `Risiko ${k.label}`,
        value: fmtInt(k.count),
        hint: `${fmtPct(pctOf(k.count, rk.totalPaket))} · ${fmtRupiah(k.pagu)}`,
      })),
    });
    if (rk.drivers.length > 0) {
      blocks.push({
        kind: 'table',
        title: 'Lima Pemicu Risiko Teratas',
        columns: [
          { header: 'Pemicu Risiko', width: 'auto' },
          { header: 'Skor 3 (Tinggi)', width: 74, align: 'right' },
          { header: 'Skor 2 (Sedang)', width: 74, align: 'right' },
          { header: 'Skor 1 (Rendah)', width: 74, align: 'right' },
          { header: 'Skor 0', width: 92, align: 'right' },
        ],
        rows: rk.drivers.map((d) => [
          d.label,
          fmtInt(d.tinggi),
          fmtInt(d.sedang),
          fmtInt(d.rendah),
          fmtInt(d.lainnya),
        ]),
        emptyText: 'Tidak ada pemicu risiko tercatat.',
      });
    }
    if (rk.satkerTinggi.length > 0) {
      blocks.push({
        kind: 'table',
        title: 'Satuan Kerja dengan Paket Berisiko Tinggi',
        columns: [
          { header: 'Satuan Kerja', width: 'auto' },
          { header: 'Paket Risiko Tinggi', width: 92, align: 'right' },
          { header: 'Pagu', width: 110, align: 'right' },
        ],
        rows: rk.satkerTinggi.map((s) => [s.satker, fmtInt(s.count), fmtRupiahDetail(s.pagu)]),
        emptyText: 'Tidak ada paket berisiko tinggi.',
      });
    }
  }

  // ── 8. Kurasi Paket Pengadaan ─────────────────────────────────────────────
  const k = agg.kurasi;
  blocks.push({
    kind: 'heading',
    index: no(),
    title: 'Kurasi Paket Pengadaan',
    caption: 'Kesesuaian metode pemilihan terhadap batas nilai & jenis pengadaan (Perpres 12/2021)',
  });
  blocks.push({
    kind: 'metric',
    items: [
      { label: 'Sudah Dikurasi', value: fmtInt(k.totalDikurasi), hint: `${fmtPct(k.pctSelesai)} dari ${fmtInt(k.totalPaket)} paket` },
      { label: 'Akurat', value: fmtInt(k.akurat), hint: 'metode sesuai ketentuan', tone: 'good' },
      { label: 'Tidak Akurat', value: fmtInt(k.perluKoreksi), hint: 'metode melanggar batas nilai', tone: 'warn' },
      { label: 'Belum Dikurasi', value: fmtInt(k.belumDikurasi), hint: 'belum dievaluasi / data kurang' },
      { label: 'Tingkat Akurasi', value: fmtPct(k.pctAkurasi), hint: 'akurat / sudah dikurasi', tone: 'info' },
    ],
  });
  blocks.push({
    kind: 'table',
    title: 'Hasil Kurasi per Metode Pengadaan',
    columns: [
      { header: 'Metode Pengadaan', width: 'auto' },
      { header: 'Jumlah Paket', width: 68, align: 'right' },
      { header: 'Akurat', width: 58, align: 'right' },
      { header: 'Tidak Akurat', width: 68, align: 'right' },
      { header: 'Belum Dikurasi', width: 76, align: 'right' },
      { header: 'Akurasi', width: 58, align: 'right', tone: 'capaian' },
    ],
    rows: agg.metode.map((m) => [
      m.metode,
      fmtInt(m.jumlahPaket),
      fmtInt(m.akurat),
      fmtInt(m.perluKoreksi),
      fmtInt(m.belumDikurasi),
      m.akurat + m.perluKoreksi > 0 ? fmtPct(pctOf(m.akurat, m.akurat + m.perluKoreksi)) : '—',
    ]),
    swatches: agg.metode.map((m) => metodeColor(m.metode, false)),
    emptyText: 'Tidak ada data untuk lingkup ini.',
  });

  if (canSeePaketDetail) {
    blocks.push({
      kind: 'table',
      title: `Paket dengan Kurasi Tidak Akurat — ${fmtInt(agg.kurasiTidakAkurat.length)} paket`,
      orientation: 'landscape',
      // Kolom catatan adalah teks terpanjang di seluruh laporan, jadi ia yang
      // memegang sisa lebar — kolom lain dipangkas seperlunya supaya sisanya
      // benar-benar layak dibaca, bukan remah beberapa puluh poin.
      columns: [
        { header: 'No', width: 24, align: 'right' },
        { header: 'Nama Paket', width: 132 },
        { header: 'Kode RUP', width: 58 },
        { header: 'Satuan Kerja', width: 92 },
        { header: 'PPK', width: 68 },
        { header: 'Metode', width: 66 },
        { header: 'Pagu', width: 72, align: 'right' },
        { header: 'Realisasi', width: 72, align: 'right' },
        { header: 'Catatan & Rekomendasi Kurasi AI', width: 'auto' },
      ],
      rows: agg.kurasiTidakAkurat.map((r, i) => [
        String(i + 1),
        r.rup_name || 'Tidak Diketahui',
        r.kd_rup || '-',
        r.satker || '-',
        r.nama_ppk || '-',
        r.metode_pengadaan || 'Lainnya',
        fmtRupiahDetail(r.pagu),
        fmtRupiahDetail(r.total),
        // '»' (U+00BB) dipakai, BUKAN '→': panah tidak ada di peta WinAnsi jsPDF
        // dan memaksa seluruh sel dikodekan UCS-2 — lihat `pdfText.ts`.
        [r.catatan_kurasi || '-', r.rekomendasi_kurasi ? `» ${r.rekomendasi_kurasi}` : '']
          .filter(Boolean)
          .join('\n'),
      ]),
      emptyText: 'Tidak ada paket berstatus Tidak Akurat pada lingkup ini.',
    });
  } else {
    blocks.push({
      kind: 'note',
      tone: 'info',
      text:
        'Rincian per-paket (nama paket, kode RUP, nama PPK, catatan kurasi) tidak disertakan ' +
        'karena laporan ini dicetak pada lingkup Kementerian. Angka ringkasan di atas tetap utuh.',
    });
  }

  // ── 9. Deteksi Anomali ────────────────────────────────────────────────────
  const an = agg.anomali;
  blocks.push({
    kind: 'heading',
    index: no(),
    title: 'Deteksi Anomali',
    caption: 'Ketidakcocokan antara realisasi SPSE dan RUP terumumkan',
  });
  blocks.push({
    kind: 'metric',
    items: [
      { label: 'Total Paket Anomali', value: fmtInt(an.totalPaket), hint: 'punya minimal satu anomali', tone: an.totalPaket > 0 ? 'warn' : 'good' },
      { label: ANOMALI_LABEL.tanpa_rup, value: fmtInt(an.tanpaRup.count), hint: `Nilai realisasi ${fmtRupiah(an.tanpaRup.nilai)}`, tone: 'warn' },
      { label: ANOMALI_LABEL.lebih_pagu, value: fmtInt(an.lebihPagu.count), hint: `Kelebihan ${fmtRupiah(an.lebihPagu.nilai)}`, tone: 'warn' },
    ],
  });

  if (canSeePaketDetail) {
    blocks.push({
      kind: 'table',
      title: `Rincian Paket Anomali — ${fmtInt(agg.anomaliRows.length)} paket`,
      orientation: 'landscape',
      // 'Realisasi Tanpa RUP' selebar ±72pt dan tidak boleh tercacah jadi
      // 'Realisa' — kolom terakhir harus memuatnya dalam satu baris.
      columns: [
        { header: 'No', width: 24, align: 'right' },
        { header: 'Nama Paket', width: 150 },
        { header: 'Kode RUP', width: 58 },
        { header: 'Satuan Kerja', width: 96 },
        { header: 'PPK', width: 74 },
        { header: 'Metode', width: 66 },
        { header: 'Pagu', width: 74, align: 'right' },
        { header: 'Realisasi', width: 74, align: 'right' },
        { header: 'Jenis Anomali', width: 'auto' },
      ],
      rows: agg.anomaliRows.map((r, i) => [
        String(i + 1),
        r.rup_name || 'Tidak Diketahui',
        r.kd_rup || '-',
        r.satker || '-',
        r.nama_ppk || '-',
        r.metode_pengadaan || 'Lainnya',
        fmtRupiahDetail(r.pagu),
        fmtRupiahDetail(r.total),
        r.jenis.map((j) => ANOMALI_LABEL[j]).join(', '),
      ]),
      emptyText: 'Tidak ditemukan anomali pada lingkup ini.',
    });
  } else {
    blocks.push({
      kind: 'note',
      tone: 'info',
      text:
        'Rincian per-paket anomali tidak disertakan karena laporan ini dicetak pada lingkup ' +
        'Kementerian. Angka ringkasan di atas tetap utuh.',
    });
  }

  return {
    title: scopeLabel,
    subtitle: 'Laporan Ringkasan Pengadaan',
    meta,
    blocks,
    footerNote: `Laporan Ringkasan Pengadaan — ${scopeLabel} · ${SUMBER_DATA}`,
    runningHead: `Laporan Ringkasan Pengadaan · ${scopeLabel}`,
  };
}
