"use client";

import React from 'react';
import { Wallet, CircleCheckBig, Hourglass, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RingkasanKpi } from '../lib/ringkasanData';
import { fmtInt, fmtPct } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, type CardTone } from '@/components/ui/Card';
import styles from './KpiCards.module.css';

// Format nilai anggaran gaya KPI: "Rp125,8 Miliar".
function fmtRupiahKpi(m: number): string {
  const n = Number(m) || 0;
  const d = (x: number, dec = 1) => x.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (Math.abs(n) >= 1e12) return `Rp${d(n / 1e12)} Triliun`;
  if (Math.abs(n) >= 1e9) return `Rp${d(n / 1e9)} Miliar`;
  if (Math.abs(n) >= 1e6) return `Rp${d(n / 1e6)} Juta`;
  if (Math.abs(n) >= 1e3) return `Rp${d(n / 1e3, 0)} Ribu`;
  return `Rp${fmtInt(n)}`;
}

// Digit rupiah utuh, tanpa "Rp" dan tanpa pembulatan ke satuan besar. Kartu
// acuan memakai ini: angka pagu di situ dipakai apa adanya, bukan diringkas.
function digitRupiah(m: number): string {
  return fmtInt(Math.round(Number(m) || 0));
}

// Target realisasi kumulatif per triwulan (persen dari pagu). Dinilai dari
// pctRealisasi dan ditandai pada kolom Sudah Realisasi — kolom yang angkanya
// memang dinilai. Indeks 0 = TW1.
const TARGET_TRIWULAN = [20, 50, 80, 100] as const;

// Triwulan berjalan menurut tanggal saat ini. Halaman Ringkasan tidak punya
// pemilih periode, jadi acuannya kalender.
function triwulanBerjalan(now: Date = new Date()): 1 | 2 | 3 | 4 {
  return (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

const TOOLTIP_ACUAN =
  'Acuan pembanding: seluruh nilai pagu dan seluruh jumlah paket pengadaan pada cakupan filter aktif.';

type Tone = 'good' | 'warn' | 'danger';

// Rona status kini hanya hidup di tint Card.Icon — badan kartu tetap putih,
// tanpa latar berwarna maupun garis aksen.
const TINT: Record<Tone, CardTone> = {
  good: 'positive',
  warn: 'warning',
  danger: 'risk',
};

/** Satu ukuran di dalam kartu terukur: nilai + persentase pembandingnya. */
interface UkuranData {
  nilai: string;
  /** Porsi terhadap kartu acuan, 0..100. */
  pct: number;
  keterangan: React.ReactNode;
  /** Penanda status target, ditempel di bawah keterangan sebagai badge. */
  badge?: { teks: string; aman: boolean };
}

interface Kolom {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  tooltip: string;
  rupiah: UkuranData;
  paket: UkuranData;
}

/**
 * Bar-nya aria-hidden: ia hanya menggambar ulang persentase yang sudah tertulis
 * sebagai teks tepat di bawahnya, jadi mengumumkannya lagi hanya menggandakan
 * informasi yang sama bagi pengguna pembaca layar.
 */
function Ukuran({ data, size }: { data: UkuranData; size: 'utama' | 'pendamping' }) {
  const utama = size === 'utama';
  return (
    <div className={utama ? styles.blokUtama : styles.blokPendamping}>
      <div className={utama ? styles.nilaiUtama : styles.nilaiPendamping}>{data.nilai}</div>
      <div className={styles.track} aria-hidden="true">
        <div
          className={styles.fill}
          style={{ '--fill': Math.max(0, Math.min(data.pct, 100)) / 100 } as React.CSSProperties}
        />
      </div>
      <div className={styles.keterangan}>{data.keterangan}</div>
      {data.badge && (
        <div>
          <span className={`${styles.badge} ${data.badge.aman ? styles.badgeAman : ''}`}>
            {data.badge.aman ? <CircleCheckBig size={11} /> : <AlertTriangle size={11} />}
            {data.badge.teks}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Kartu acuan berbeda JENIS dari dua kartu di sebelahnya: isinya keadaan yang
 * sudah tetap — berapa uangnya, berapa paketnya — bukan proses yang sedang
 * berjalan. Bar 100% yang dipakai sebelumnya memaksakan bentuk "progres" pada
 * angka yang tidak pernah bergerak; yang tersisa hanya dekorasi yang selalu
 * penuh.
 *
 * Karena bedanya beda jenis, bedanya dibuat terbaca sejak satu meter dari
 * layar: kartu ini satu-satunya plat gelap di barisnya. Bahasanya bukan bahasa
 * baru — gradien navy, kisi bercahaya, dan aksen --accent-on-dark itu persis
 * yang dipakai sidebar dan hero halaman muka, ditarik masuk ke area konten.
 * Dua kartu putih di sampingnya adalah bagian; plat gelap ini alasnya.
 *
 * Isinya neraca, bukan pengukur: nilai pagu UTUH sampai rupiah terakhir, satu
 * garis cahaya, lalu jumlah paket dengan rata-rata pagunya. Tidak ada bentuk
 * ringkas "Rp1,5 Triliun" di sini — kartu ini justru dipakai orang saat butuh
 * angka yang bisa disalin ke nota dinas, dan pembulatan menghapus persis
 * bagian yang dicari.
 */
function KartuAcuan({ kpi }: { kpi: RingkasanKpi }) {
  const adaPaket = kpi.totalPaket > 0;

  return (
    <Card
      as="section"
      className={`${styles.kolom} ${styles.acuan}`}
      aria-label="Total Anggaran"
      title={TOOLTIP_ACUAN}
    >
      {/* Dua lapis latar. Keduanya murni dekor — dijaga aria-hidden dan
          pointer-events:none supaya tak pernah ikut terbaca atau tertekan. */}
      <span className={styles.cahaya} aria-hidden="true" />
      <span className={styles.kisi} aria-hidden="true" />
      <Card.Header className={styles.lapisAtas}>
        <Card.Icon tone="neutral" className={styles.ikon}><Wallet /></Card.Icon>
        <Card.Label as="h3" className={styles.judul}>Total Anggaran</Card.Label>
      </Card.Header>
      <Card.Body className={`${styles.isi} ${styles.lapisAtas}`}>
        <div className={styles.blokUtama}>
          <div className={styles.nilaiAcuan}>
            <span className={styles.rp}>Rp</span>
            {digitRupiah(kpi.totalPagu)}
          </div>
          <div className={styles.keterangan}>Nilai pagu keseluruhan</div>
        </div>
        <div className={`${styles.blokPendamping} ${styles.blokPendampingAcuan}`}>
          <div className={styles.garis} aria-hidden="true" />
          {/* Dibungkus satu span: di layar sempit .nilaiPendamping jadi flex
              container, dan angka telanjang akan terpisah jadi item sendiri
              sehingga satuannya tak lagi sebaris dasar dengan angkanya. */}
          <div className={styles.nilaiPendamping}>
            <span>
              {fmtInt(kpi.totalPaket)}
              <span className={styles.satuan}>paket</span>
            </span>
          </div>
          <div className={styles.keterangan}>
            {adaPaket
              ? `Rata-rata ${fmtRupiahKpi(kpi.totalPagu / kpi.totalPaket)} per paket`
              : 'Belum ada paket pada cakupan filter aktif'}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export function KpiCards({ kpi, loading }: { kpi: RingkasanKpi; loading?: boolean }) {
  if (loading) {
    return (
      <div className={styles.papan}>
        {/* Rangka mengikuti bentuk akhir tiap kartu — plat gelap tanpa bar di
            kiri, dua kartu terukur dengan bar — supaya tidak ada lompatan
            tinggi maupun kedip putih-ke-gelap saat data masuk. Di dalam plat,
            batang rangka ikut menggelap lewat --surface-2 yang ditimpa .acuan. */}
        {Array.from({ length: 3 }).map((_, i) => {
          const plat = i === 0;
          return (
            <Card
              key={i}
              className={plat ? `${styles.kolom} ${styles.acuan}` : styles.kolom}
              aria-hidden
            >
              {plat && <span className={styles.cahaya} />}
              {plat && <span className={styles.kisi} />}
              <Card.Header className={styles.lapisAtas}>
                <Skeleton width={30} height={30} />
                <Skeleton width="52%" height={12} />
              </Card.Header>
              <Card.Body className={`${styles.isi} ${styles.lapisAtas}`}>
                <div className={styles.blokUtama}>
                  {/* Rangka plat lebih lebar: yang menggantikannya nanti angka
                      rupiah utuh, bukan bentuk ringkasnya. */}
                  <Skeleton width={plat ? '92%' : '78%'} height={plat ? 30 : 28} />
                  {!plat && <Skeleton width="100%" height={4} style={{ marginTop: 10 }} />}
                  <Skeleton width="45%" height={11} style={{ marginTop: 8 }} />
                </div>
                <div className={styles.blokPendamping}>
                  <Skeleton width="46%" height={19} />
                  {!plat && <Skeleton width="100%" height={4} style={{ marginTop: 10 }} />}
                  <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    );
  }

  const belumPct = kpi.totalPagu > 0 ? (kpi.belumRealisasi / kpi.totalPagu) * 100 : 0;
  const sudahPaketPct = kpi.totalPaket > 0 ? (kpi.paketSudah / kpi.totalPaket) * 100 : 0;
  const belumPaketPct = kpi.totalPaket > 0 ? (kpi.paketBelum / kpi.totalPaket) * 100 : 0;

  // Triwulan berjalan belum selesai, jadi yang dinilai adalah triwulan terakhir
  // yang sudah tuntas: di TW3 yang dilihat capaian target TW2. Selama TW1 belum
  // ada satu pun triwulan yang selesai pada tahun anggaran berjalan, sehingga
  // belum ada target yang jatuh tempo.
  const triwulan = triwulanBerjalan();
  const triwulanDinilai = triwulan > 1 ? triwulan - 1 : null;
  const targetDinilai = triwulanDinilai !== null ? TARGET_TRIWULAN[triwulanDinilai - 1] : null;
  // Tanpa pagu tidak ada yang bisa dinilai, jadi jangan tandai merah hanya
  // karena filter aktif tidak mengembalikan paket.
  const adaPagu = kpi.totalPagu > 0;
  const dibawahTarget = adaPagu && targetDinilai !== null && kpi.pctRealisasi < targetDinilai;

  const kolom: Kolom[] = [
    {
      key: 'sudah',
      label: 'Sudah Realisasi',
      icon: dibawahTarget ? AlertTriangle : CircleCheckBig,
      tone: dibawahTarget ? 'danger' : 'good',
      tooltip:
        `Nilai realisasi/kontrak yang sudah terserap dan jumlah paket yang realisasinya lebih dari nol. ` +
        `Target realisasi kumulatif: TW1 20%, TW2 50%, TW3 80%, TW4 100%. ` +
        (targetDinilai === null
          ? `Yang dinilai selalu triwulan terakhir yang sudah selesai; TW1 masih berjalan sehingga belum ada target yang jatuh tempo.`
          : `Yang dinilai triwulan terakhir yang sudah selesai. Kini TW${triwulan} berjalan, jadi acuannya target TW${triwulanDinilai} (${targetDinilai}%). Realisasi saat ini ${fmtPct(kpi.pctRealisasi)}.`),
      rupiah: {
        nilai: fmtRupiahKpi(kpi.totalRealisasi),
        pct: kpi.pctRealisasi,
        keterangan:
          targetDinilai === null
            ? `${fmtPct(kpi.pctRealisasi)} dari pagu · penilaian target mulai TW2`
            : `${fmtPct(kpi.pctRealisasi)} dari pagu`,
        badge:
          targetDinilai !== null && adaPagu
            ? {
                teks: dibawahTarget
                  ? `Di bawah target TW${triwulanDinilai} (${targetDinilai}%)`
                  : `Target TW${triwulanDinilai} (${targetDinilai}%) tercapai`,
                aman: !dibawahTarget,
              }
            : undefined,
      },
      paket: {
        nilai: `${fmtInt(kpi.paketSudah)} paket`,
        pct: sudahPaketPct,
        keterangan: `${fmtPct(sudahPaketPct)} dari total paket`,
      },
    },
    {
      key: 'belum',
      label: 'Belum Realisasi',
      icon: Hourglass,
      tone: 'warn',
      tooltip: 'Sisa pagu yang belum terserap dan jumlah paket yang belum memiliki realisasi.',
      rupiah: {
        nilai: fmtRupiahKpi(kpi.belumRealisasi),
        pct: belumPct,
        keterangan: `${fmtPct(belumPct)} dari pagu`,
      },
      paket: {
        nilai: `${fmtInt(kpi.paketBelum)} paket`,
        pct: belumPaketPct,
        keterangan: `${fmtPct(belumPaketPct)} dari total paket`,
      },
    },
  ];

  return (
    <div className={styles.papan}>
      <KartuAcuan kpi={kpi} />
      {kolom.map((k) => {
        const Icon = k.icon;
        return (
          <Card
            key={k.key}
            as="section"
            className={`${styles.kolom} ${styles[k.tone]}`}
            aria-label={k.label}
            title={k.tooltip}
          >
            <Card.Header>
              <Card.Icon tone={TINT[k.tone]}><Icon /></Card.Icon>
              <Card.Label as="h3">{k.label}</Card.Label>
            </Card.Header>
            <Card.Body className={styles.isi}>
              <Ukuran data={k.rupiah} size="utama" />
              <Ukuran data={k.paket} size="pendamping" />
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
}
