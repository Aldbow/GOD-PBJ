"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { CalendarDays, Info, TriangleAlert, ArrowLeft, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Gauge, MonitorSmartphone } from 'lucide-react';
import Link from 'next/link';
import { Select } from '@/components/ui/Select';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { computeItkpA, type ItkpAInput, type ItkpAResult, type ItkpARowResult } from '@/lib/itkp/calcA';
import { fetchItkpAData, type ItkpAUnit } from '@/lib/itkp/fetchA';
import { normSatker } from '@/lib/itkp/crosswalk';
import { useSession } from '@/components/auth/SessionProvider';
import { fmtDec, fmtPct, fmtRupiahDetail } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import styles from './PemanfaatanSistemDetailView.module.css';

const KEMENTERIAN_LABEL = 'Kementerian (Total)';
const SEMUA_ESELON1 = 'Semua Eselon I';

function emptyInput(): ItkpAInput {
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

function sumInputs(units: ItkpAUnit[]): ItkpAInput {
  const acc = emptyInput();
  const keys = Object.keys(acc) as (keyof ItkpAInput)[];
  for (const u of units) {
    for (const k of keys) acc[k] += u.input[k];
  }
  return acc;
}

function capaianOf(result: ItkpAResult): number {
  return result.totalMaxSaatIni > 0 ? (result.total / result.totalMaxSaatIni) * 100 : 0;
}

function capaianBadgeVariant(p: number): BadgeVariant {
  if (p >= 65) return 'rendah';
  if (p >= 50) return 'sedang';
  return 'tinggi';
}

function capaianColorVar(p: number): string {
  if (p >= 65) return 'var(--teal-600)';
  if (p >= 50) return 'var(--amber-600)';
  return 'var(--red-600)';
}

/**
 * Versi teks dari capaianColorVar. Varian -600 dipakai sebagai isi bar/badge dan
 * memang bersaturasi penuh, tapi sebagai teks di atas surface terang rasio
 * kontrasnya cuma 2,0–3,3:1 (di bawah ambang WCAG 4,5:1). Varian -700 adalah
 * yang disiapkan token untuk teks dan sudah menyesuaikan diri di tema gelap.
 */
function capaianTextColorVar(p: number): string {
  if (p >= 65) return 'var(--teal-700)';
  if (p >= 50) return 'var(--amber-700)';
  return 'var(--red-700)';
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const CARD_CONTAINER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const CARD_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

const RENTANG_TRANSITION = { duration: 0.26, ease: EASE_OUT };

// Geometri gauge semi-lingkaran — mengikuti motif yang sama dengan ItkpGauge
// di Ringkasan, supaya "skor ITKP" selalu terbaca dengan bahasa visual yang
// sama di seluruh aplikasi.
const GAUGE_ARC_PATH = 'M 18 100 A 82 82 0 0 1 182 100';
const GAUGE_ARC_LEN = Math.PI * 82;

// Skor bertambah dari 0 ke nilai akhir saat kartu pertama kali menampilkan
// hasil — memberi momen "hidup" satu kali di titik paling penting halaman ini,
// alih-alih animasi seragam di semua elemen.
function useCountUp(value: number, duration = 0.9) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);

  return display;
}

/**
 * Meter satu tahap penilaian (A1–A3 atau A4–A7). Dipakai di kartu skor untuk
 * menunjukkan dari mana total skor berasal — pertanyaan pertama yang muncul
 * setelah orang membaca angka totalnya, dan sebelumnya tidak terjawab tanpa
 * menggulir ke kartu A1–A7 di bawah.
 */
function StageMeter({
  label,
  caption,
  nilai,
  nilaiMax,
}: {
  label: string;
  caption: string;
  nilai: number;
  nilaiMax: number;
}) {
  const persen = nilaiMax > 0 ? (nilai / nilaiMax) * 100 : 0;
  const warnaIsi = capaianColorVar(persen);
  const warnaTeks = capaianTextColorVar(persen);

  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>{label}</span>
        <span className={styles.meterValue}>
          {fmtDec(nilai, 2)}
          <span className={styles.meterMax}> / {fmtDec(nilaiMax, 2)}</span>
        </span>
      </div>
      <div
        className={styles.meterTrack}
        role="img"
        aria-label={`${label}: skor ${fmtDec(nilai, 2)} dari ${fmtDec(nilaiMax, 2)}`}
      >
        <div
          className={styles.meterFill}
          style={{ transform: `scaleX(${Math.max(0, Math.min(persen / 100, 1))})`, background: warnaIsi }}
        />
      </div>
      <div className={styles.meterFoot}>
        <span className={styles.meterCaption}>{caption}</span>
        <span className={styles.meterPct} style={{ color: warnaTeks }}>
          {fmtPct(persen, 1)}
        </span>
      </div>
    </div>
  );
}

type SortKey = 'name' | 'total' | 'capaian' | string;

interface SatkerSortRow {
  name: string;
  result: ItkpAResult;
  capaian: number;
}

export function PemanfaatanSistemDetailView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Berbeda dari Dashboard ITKP (yang memang dinilai untuk satu kementerian),
  // rincian Pemanfaatan Sistem punya granularitas satker — jadi role PPK dikunci
  // ke satkernya sendiri: pemilih Eselon I/Satker disembunyikan dan daftar unit
  // dipangkas ke satu satker itu sebelum dipakai kartu maupun tabel.
  const { role, satker: profileSatker } = useSession();
  const isPpkScoped = role === 'ppk';

  const [units, setUnits] = useState<ItkpAUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<string | null>(null);

  const [selectedEselon1, setSelectedEselon1] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>(searchParams.get('satker') || '');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchItkpAData();
        setUnits(result.units);
        setDataUpdatedAt(result.dataUpdatedAt);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data ITKP dari Supabase.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Unit ITKP milik PPK yang sedang login. Nama satker di profil berasal dari
  // master_data sedangkan nama unit di sini dari data_afirmasi_pdn_perencanaan,
  // jadi cocokkan ternormalisasi dulu, baru fallback ke pencocokan parsial
  // (unit afirmasi kerap setingkat KPA, lebih luas dari satker di profil).
  const lockedUnit = useMemo<ItkpAUnit | null>(() => {
    if (!isPpkScoped || !profileSatker) return null;
    const target = normSatker(profileSatker);
    return (
      units.find((u) => normSatker(u.name) === target) ??
      units.find((u) => {
        const name = normSatker(u.name);
        return name.includes(target) || target.includes(name);
      }) ??
      null
    );
  }, [isPpkScoped, profileSatker, units]);

  // Unit yang benar-benar dipakai halaman ini. Untuk PPK nilainya diturunkan dari
  // scope-nya, bukan dari state — sehingga ?satker= di URL tidak bisa menggeser
  // tampilan ke satker lain.
  const effectiveUnit = isPpkScoped ? lockedUnit?.name ?? '' : selectedUnit;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (effectiveUnit) params.set('satker', effectiveUnit);
    else params.delete('satker');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUnit]);

  const eselon1Options = useMemo(() => {
    const set = new Set(units.map((u) => u.eselon1));
    return [SEMUA_ESELON1, ...Array.from(set).sort()];
  }, [units]);

  const unitsInEselon1 = useMemo(() => {
    if (isPpkScoped) return lockedUnit ? [lockedUnit] : [];
    if (!selectedEselon1 || selectedEselon1 === SEMUA_ESELON1) return units;
    return units.filter((u) => u.eselon1 === selectedEselon1);
  }, [units, selectedEselon1, isPpkScoped, lockedUnit]);

  const satkerOptions = useMemo(() => unitsInEselon1.map((u) => u.name), [unitsInEselon1]);

  const currentInput = useMemo<ItkpAInput>(() => {
    if (effectiveUnit) {
      return units.find((u) => u.name === effectiveUnit)?.input ?? emptyInput();
    }
    return sumInputs(unitsInEselon1);
  }, [effectiveUnit, unitsInEselon1, units]);

  const result = useMemo(() => computeItkpA(currentInput), [currentInput]);
  const capaian = capaianOf(result);
  const gaugeRatio = result.totalMaxSaatIni > 0 ? Math.max(0, Math.min(result.total / result.totalMaxSaatIni, 1)) : 0;

  // Busur digambar dari kosong ke nilai sesungguhnya sesaat setelah mount,
  // supaya transisi CSS pada stroke-dashoffset punya state awal untuk animasi
  // (kalau langsung dirender di nilai akhir, tidak ada apa pun untuk dianimasikan).
  const [drawnGaugeRatio, setDrawnGaugeRatio] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawnGaugeRatio(gaugeRatio));
    return () => cancelAnimationFrame(id);
  }, [gaugeRatio]);

  const displayTotal = useCountUp(result.total);

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  const satkerRows = useMemo<SatkerSortRow[]>(
    () =>
      unitsInEselon1.map((u) => {
        const r = computeItkpA(u.input);
        return { name: u.name, result: r, capaian: capaianOf(r) };
      }),
    [unitsInEselon1]
  );

  // Bahan zona "yang perlu diperhatikan" di kartu skor. Keduanya sudah dihitung
  // computeItkpA, tapi sebelumnya baru terlihat kalau pengguna membuka kartu
  // A1–A7 satu per satu — padahal justru ini yang menjelaskan kenapa skor
  // maksimum saat ini bisa lebih kecil dari maksimum menurut Kepka.
  const heroDiagnosa = useMemo(() => {
    const tidakBerlaku = result.rows.filter((r) => !r.applicable);
    const defisit = result.rows
      .filter((r) => r.applicable)
      .map((r) => ({ row: r, selisih: r.skorMax - r.skor }))
      .sort((a, b) => b.selisih - a.selisih);
    return {
      tidakBerlaku,
      terbesar: defisit.length > 0 && defisit[0].selisih > 0.005 ? defisit[0] : null,
    };
  }, [result]);

  // Peringkat hanya bermakna kalau satu satker sedang dipilih DAN ada pembanding
  // di lingkup yang sama. Diurutkan sendiri, bukan memakai sortedSatkerRows,
  // supaya tidak ikut berubah saat pengguna menyortir tabel di bawah.
  const peringkatSatker = useMemo(() => {
    if (!effectiveUnit || satkerRows.length < 2) return null;
    const urut = [...satkerRows].sort((a, b) => b.result.total - a.result.total);
    const idx = urut.findIndex((r) => r.name === effectiveUnit);
    return idx === -1 ? null : { posisi: idx + 1, dari: urut.length };
  }, [effectiveUnit, satkerRows]);

  const lingkupLabel =
    effectiveUnit ||
    (selectedEselon1 && selectedEselon1 !== SEMUA_ESELON1 ? selectedEselon1 : KEMENTERIAN_LABEL);

  const sortedSatkerRows = useMemo(() => {
    const rows = [...satkerRows];
    rows.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === 'total') {
        cmp = a.result.total - b.result.total;
      } else if (sortKey === 'capaian') {
        cmp = a.capaian - b.capaian;
      } else {
        const av = a.result.rows.find((r) => r.key === sortKey)?.skor ?? 0;
        const bv = b.result.rows.find((r) => r.key === sortKey)?.skor ?? 0;
        cmp = av - bv;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [satkerRows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  function renderSortIcon(key: SortKey) {
    if (sortKey !== key) return <ChevronsUpDown size={11} className={styles.thSortIconIdle} />;
    return sortDir === 'asc' ? (
      <ChevronUp size={11} className={styles.thSortIconActive} />
    ) : (
      <ChevronDown size={11} className={styles.thSortIconActive} />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <Link href="/itkp" className={styles.backLink}>
        <ArrowLeft size={14} /> Kembali ke Dashboard ITKP
      </Link>

      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>Detail Pemanfaatan Sistem</h2>
          <p className={styles.headerSub}>
            {isPpkScoped
              ? `Penilaian Sementara ITKP 2026 — ${lockedUnit?.name ?? profileSatker ?? 'Satuan Kerja Anda'}`
              : 'Penilaian Sementara ITKP 2026 — Satuan Kerja Kemnaker'}
          </p>
        </div>
      </div>

      {error && <ErrorBox className={styles.sectionSpacer}>{error}</ErrorBox>}
      {isPpkScoped && !loading && !lockedUnit && (
        <ErrorBox className={styles.sectionSpacer}>
          Satuan kerja pada profil Anda{profileSatker ? ` (${profileSatker})` : ''} belum terpetakan ke unit penilaian
          ITKP, sehingga rincian Pemanfaatan Sistem tidak dapat ditampilkan. Hubungi admin UKPBJ.
        </ErrorBox>
      )}

      <Card padding="tight" className={styles.filterBar}>
        <Card.Header className={styles.filterHead}>
          <Card.Icon tone="neutral"><SlidersHorizontal /></Card.Icon>
          <Card.Title>Lingkup Penilaian</Card.Title>
        </Card.Header>
        <Card.Body className={styles.filterBody}>
        {!isPpkScoped && (
          <>
            <div className={styles.filterCol}>
              <span className={styles.filterLabel}>Eselon I</span>
              <Select
                options={eselon1Options.map((e) => ({ value: e === SEMUA_ESELON1 ? '' : e, label: e }))}
                value={selectedEselon1}
                onChange={(e) => {
                  setSelectedEselon1(e.target.value);
                  setSelectedUnit('');
                }}
              />
            </div>
            <div className={`${styles.filterCol} ${styles.filterColWide}`}>
              <span className={styles.filterLabel}>Satuan Kerja</span>
              <SearchableSelect
                value={selectedUnit}
                onChange={setSelectedUnit}
                options={satkerOptions}
                placeholder={selectedEselon1 && selectedEselon1 !== SEMUA_ESELON1 ? `Semua di ${selectedEselon1}` : KEMENTERIAN_LABEL}
                ariaLabel="Pilih satuan kerja"
              />
            </div>
          </>
        )}
        </Card.Body>
        <Card.Footer className={styles.filterMeta}>
          <CalendarDays size={14} />
          <span>Update data terakhir: {updatedLabel}</span>
        </Card.Footer>
      </Card>

      <div className={styles.layout}>
        {loading ? (
          <Card aria-hidden>
            <Card.Body className={styles.loadingBox}>Memuat data dari Supabase...</Card.Body>
          </Card>
        ) : (
          <>
            {/* Hero: total skor gabungan A1-A7, ditonjolkan lewat gauge — motif yang
                sama dengan skor ITKP di Ringkasan — supaya angka paling penting di
                halaman ini langsung terbaca sebelum melihat rincian per komponen. */}
            <Card className={styles.heroCard}>
              <Card.Header className={styles.heroTopRow}>
                <Card.Icon tone="neutral"><Gauge /></Card.Icon>
                <div className={styles.heroTitleWrap}>
                  <Card.Title className={styles.heroTitle}>Skor Pemanfaatan Sistem</Card.Title>
                  <p className={styles.heroSub}>Total gabungan komponen A1–A7</p>
                </div>
                <Badge variant={capaianBadgeVariant(capaian)} className={styles.heroBadge}>{fmtPct(capaian, 1)} capaian</Badge>
              </Card.Header>

              <Card.Body className={styles.heroBody}>
                <div className={styles.heroScore}>
                  <div className={styles.heroGaugeWrap}>
                    <svg
                      viewBox="0 0 200 110"
                      className={styles.heroGauge}
                      role="img"
                      aria-label={`Skor total ${fmtDec(result.total, 2)} dari ${fmtDec(result.totalMaxSaatIni, 2)}`}
                    >
                      <defs>
                        <linearGradient id="pemanfaatanGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#163B63" />
                          <stop offset="55%" stopColor="#1A5D91" />
                          <stop offset="100%" stopColor="#27B6D6" />
                        </linearGradient>
                      </defs>
                      <path d={GAUGE_ARC_PATH} className={styles.heroGaugeTrack} strokeLinecap="round" fill="transparent" strokeWidth="15" />
                      <path
                        d={GAUGE_ARC_PATH}
                        className={styles.heroGaugeValue}
                        strokeLinecap="round"
                        fill="transparent"
                        strokeWidth="15"
                        style={{ strokeDasharray: GAUGE_ARC_LEN, strokeDashoffset: GAUGE_ARC_LEN * (1 - drawnGaugeRatio) }}
                      />
                    </svg>
                    <div className={styles.heroGaugeCenter}>
                      <span className={styles.heroGaugeScore}>{fmtDec(displayTotal, 2)}</span>
                      <span className={styles.heroGaugeMax}>/ {fmtDec(result.totalMaxSaatIni, 2)}</span>
                    </div>
                  </div>
                  <p className={styles.heroKepka}>
                    Maksimum saat ini <span className={styles.heroKepkaNum}>{fmtDec(result.totalMaxSaatIni, 2)}</span> dari{' '}
                    <span className={styles.heroKepkaNum}>{fmtDec(result.totalMaxKepka, 0)}</span> menurut Kepka
                  </p>
                </div>

                <div className={styles.heroZone}>
                  <h3 className={styles.heroZoneTitle}>Asal skor</h3>
                  <StageMeter
                    label="Tahap Perencanaan"
                    caption="A1–A3 · kelengkapan RUP"
                    nilai={result.nilaiRencana}
                    nilaiMax={result.nilaiRencanaMaxSaatIni}
                  />
                  <StageMeter
                    label="Tahap Realisasi"
                    caption="A4–A7 · pelaksanaan elektronik"
                    nilai={result.nilaiRealisasi}
                    nilaiMax={result.nilaiRealisasiMaxSaatIni}
                  />
                </div>

                <div className={styles.heroZone}>
                  <h3 className={styles.heroZoneTitle}>Yang perlu diperhatikan</h3>

                  <div className={styles.heroFacts}>
                    <div className={styles.heroFact}>
                      <span className={styles.heroFactLabel}>Kehilangan skor terbesar</span>
                      {heroDiagnosa.terbesar ? (
                        <>
                          <span className={styles.heroFactValue}>
                            <span>{heroDiagnosa.terbesar.row.label}</span>
                            <span className={styles.heroFactNum} style={{ color: 'var(--red-700)' }}>
                              −{fmtDec(heroDiagnosa.terbesar.selisih, 2)}
                            </span>
                          </span>
                          <span className={styles.heroFactNote}>
                            Bernilai {fmtDec(heroDiagnosa.terbesar.row.skor, 2)} dari maksimum{' '}
                            {fmtDec(heroDiagnosa.terbesar.row.skorMax, 2)}.
                          </span>
                        </>
                      ) : (
                        <span className={styles.heroFactValue}>Semua indikator sudah bernilai penuh</span>
                      )}
                    </div>

                    <div className={styles.heroFact}>
                      <span className={styles.heroFactLabel}>Indikator tidak berlaku</span>
                      {heroDiagnosa.tidakBerlaku.length > 0 ? (
                        <>
                          <span className={styles.heroFactValue}>
                            <span className={styles.heroFactNum}>{heroDiagnosa.tidakBerlaku.length}</span>
                            <span>dari {result.rows.length} indikator</span>
                          </span>
                          <span className={styles.heroFactNote}>
                            {heroDiagnosa.tidakBerlaku.map((r) => r.label).join(', ')} — penyebutnya nol, jadi
                            dikeluarkan dari skor maksimum saat ini.
                          </span>
                        </>
                      ) : (
                        <span className={styles.heroFactValue}>
                          Seluruh {result.rows.length} indikator dapat dinilai
                        </span>
                      )}
                    </div>

                    <div className={styles.heroFact}>
                      {peringkatSatker ? (
                        <>
                          <span className={styles.heroFactLabel}>Posisi terhadap satker lain</span>
                          <span className={styles.heroFactValue}>
                            <span>Peringkat</span>
                            <span className={styles.heroFactNum}>
                              {peringkatSatker.posisi} dari {peringkatSatker.dari}
                            </span>
                          </span>
                          <span className={styles.heroFactNote}>Diurutkan menurut total skor dalam lingkup ini.</span>
                        </>
                      ) : (
                        <>
                          <span className={styles.heroFactLabel}>Cakupan penilaian</span>
                          <span className={styles.heroFactValue}>
                            <span className={styles.heroFactNum}>{unitsInEselon1.length}</span>
                            <span>unit penilaian</span>
                          </span>
                          <span className={styles.heroFactNote}>
                            Skor di atas adalah agregat seluruh unit dalam lingkup ini.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>

              <Card.Footer className={styles.heroFoot}>
                <span className={styles.heroFootScope}>
                  Lingkup
                  <span className={styles.heroFootScopeName}>{lingkupLabel}</span>
                </span>
                <p className={styles.heroFormula}>
                  Penilaian kumulatif A1–A7. Indikator yang penyebutnya nol dikeluarkan dari perhitungan, sehingga
                  skor maksimum saat ini bisa lebih kecil daripada {fmtDec(result.totalMaxKepka, 0)} menurut Kepka.
                </p>
              </Card.Footer>
            </Card>

            {/* A1-A7 dikelompokkan sesuai tahapnya (bukan dibagi rata per baris grid):
                A1-A3 mengukur kelengkapan RUP sebelum pelaksanaan, A4-A7 mengukur
                seberapa jauh rencana itu benar-benar terealisasi. Pengelompokan ini
                mengikuti perhitungan skor itu sendiri (nilaiRencana/nilaiRealisasi
                di computeItkpA) — bukan sekat visual buatan — sekaligus membuat
                setiap baris grid selalu penuh (3 kartu di grid 3 kolom, 4 kartu di
                grid 4 kolom), jadi tidak ada baris terakhir yang menggantung. */}
            <CardGroup
              title="Tahap Perencanaan (RUP)"
              caption="A1–A3 · Kelengkapan Rencana Umum Pengadaan sebelum pelaksanaan."
              nilai={result.nilaiRencana}
              nilaiMax={result.nilaiRencanaMaxSaatIni}
              rows={result.rencanaRows}
              startIndex={1}
              columnClass={styles.cardGrid3}
            />

            <CardGroup
              title="Tahap Realisasi"
              caption="A4–A7 · Seberapa jauh rencana benar-benar terlaksana dan tercatat elektronik."
              nilai={result.nilaiRealisasi}
              nilaiMax={result.nilaiRealisasiMaxSaatIni}
              rows={result.realisasiRows}
              startIndex={result.rencanaRows.length + 1}
              columnClass={styles.cardGrid4}
            />
          </>
        )}
      </div>

      <div className={styles.tableSection}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>
            {isPpkScoped
              ? 'Nilai ITKP Pemanfaatan Sistem — Satuan Kerja Anda'
              : 'Nilai ITKP Pemanfaatan Sistem — Seluruh Satuan Kerja'}
            {!isPpkScoped && selectedEselon1 && selectedEselon1 !== SEMUA_ESELON1 ? ` (${selectedEselon1})` : ''}
          </h3>
          <span className={styles.sectionCaption}>
            {isPpkScoped
              ? 'Rincian per subindikator A1–A7 untuk satuan kerja Anda, dengan komposisi skor yang sama seperti kartu di atas.'
              : `${satkerRows.length} satuan kerja, diurutkan berdasarkan skor total tertinggi secara default — klik header kolom untuk mengurutkan, klik baris untuk melihat rincian satker tersebut di atas.`}
          </span>
        </div>

        {loading ? (
          <div className={styles.loadingBox}>Memuat data dari Supabase...</div>
        ) : (
          <Card variant="flush" className={styles.tableWrap}>
            <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>No.</th>
                  <th className={`${styles.th} ${styles.thSatker} ${styles.thSortable}`} onClick={() => toggleSort('name')}>
                    Satker {renderSortIcon('name')}
                  </th>
                  {satkerRows[0]?.result.rows.map((row, i) => (
                    <th
                      key={row.key}
                      className={`${styles.th} ${styles.thNum} ${styles.thSortable}`}
                      onClick={() => toggleSort(row.key)}
                    >
                      A{i + 1} {renderSortIcon(row.key)}
                      <span className={styles.thSub}>{row.label}</span>
                      <span className={styles.thSub}>(Maks. {fmtDec(row.skorMax, 1)})</span>
                    </th>
                  ))}
                  <th className={`${styles.th} ${styles.thNum} ${styles.thSortable}`} onClick={() => toggleSort('total')}>
                    Skor Total {renderSortIcon('total')}
                  </th>
                  <th className={`${styles.th} ${styles.thNum} ${styles.thSortable}`} onClick={() => toggleSort('capaian')}>
                    Capaian (%) {renderSortIcon('capaian')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSatkerRows.map((u, idx) => (
                  <tr
                    key={u.name}
                    className={`${isPpkScoped ? '' : styles.rowClickable} ${effectiveUnit === u.name ? styles.rowActive : ''}`}
                    onClick={isPpkScoped ? undefined : () => setSelectedUnit(u.name === selectedUnit ? '' : u.name)}
                  >
                    <td className={styles.td}>{idx + 1}</td>
                    <td className={`${styles.td} ${styles.tdSatker}`}>{u.name}</td>
                    {u.result.rows.map((row) => (
                      <td key={row.key} className={`${styles.td} ${styles.tdNum}`}>
                        {row.applicable ? fmtDec(row.skor, row.skor % 1 === 0 ? 0 : 1) : '-'}
                      </td>
                    ))}
                    <td className={`${styles.td} ${styles.tdNum} ${styles.tdTotal}`}>{fmtDec(u.result.total, 1)}</td>
                    <td className={`${styles.td} ${styles.tdCapaian}`}>
                      <Badge variant={capaianBadgeVariant(u.capaian)}>{fmtPct(u.capaian, 1)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        )}

        <p className={styles.tableNote}>
          Skor Total memakai perhitungan adaptif: komponen yang tidak berlaku (penyebut = 0) dikeluarkan dari skor
          maupun skor maksimum saat ini, sama seperti kartu rincian di atas. Capaian (%) = Skor Total ÷ Skor Max Saat
          Ini × 100%.
        </p>
      </div>
    </motion.div>
  );
}

function CardGroup({
  title,
  caption,
  nilai,
  nilaiMax,
  rows,
  startIndex,
  columnClass,
}: {
  title: string;
  caption: string;
  nilai: number;
  nilaiMax: number;
  rows: ItkpARowResult[];
  startIndex: number;
  columnClass: string;
}) {
  const pct = nilaiMax > 0 ? (nilai / nilaiMax) * 100 : 0;

  return (
    <div className={styles.cardGroup}>
      <div className={`${styles.sectionHead} ${styles.cardGroupHead}`}>
        <div>
          <h3 className={styles.sectionTitle}>{title}</h3>
          <span className={styles.sectionCaption}>{caption}</span>
        </div>
        <div className={styles.cardGroupStat}>
          <span className={styles.cardGroupStatValue}>
            {fmtDec(nilai, 2)} <span className={styles.cardGroupStatMax}>/ {fmtDec(nilaiMax, 2)}</span>
          </span>
          <Badge variant={capaianBadgeVariant(pct)}>{fmtPct(pct, 1)}</Badge>
        </div>
      </div>

      <motion.div
        className={`${styles.cardGrid} ${columnClass}`}
        variants={CARD_CONTAINER_VARIANTS}
        initial="hidden"
        animate="show"
      >
        {rows.map((row, i) => (
          <ComponentCard key={row.key} index={startIndex + i} row={row} />
        ))}
      </motion.div>
    </div>
  );
}

function ComponentCard({ index, row }: { index: number; row: ItkpARowResult }) {
  const [showRentang, setShowRentang] = useState(false);
  const progress = row.applicable && row.skorMax > 0 ? Math.max(0, Math.min(row.skor / row.skorMax, 1)) : 0;

  return (
    <Card className={styles.compCard}>
      <Card.Header className={styles.compHeader}>
        <Card.Icon tone={row.applicable ? 'neutral' : 'warning'}>
          <MonitorSmartphone />
        </Card.Icon>
        <span className={styles.compHeaderBadge}>A{index}</span>
        <Card.Title className={styles.compHeaderTitle}>{row.label}</Card.Title>
      </Card.Header>

      <Card.Body className={styles.compCardBody}>
      <div className={styles.compBody}>
        <div className={styles.compMainStat}>
          <span className={styles.compMainStatLabel}>Skor Saat Ini</span>
          <span className={styles.compMainStatValue}>
            {row.applicable ? fmtDec(row.skor, row.skor % 1 === 0 ? 0 : 1) : '-'}
          </span>
          <div className={styles.compProgressTrack}>
            <motion.div
              className={styles.compProgressFill}
              style={{ background: capaianColorVar(progress * 100) }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
            />
          </div>
        </div>

        <div className={styles.compSideStats}>
          <div className={styles.compSubStat}>
            <span className={styles.compSubStatLabel}>Skor Max</span>
            <span className={styles.compSubStatValue}>
              {fmtDec(row.skorMax, row.skorMax % 1 === 0 ? 0 : 1)}
            </span>
          </div>
          <div className={styles.compSubStat}>
            <span className={styles.compSubStatLabel}>Persentase</span>
            <span className={styles.compSubStatValue}>
              {row.applicable ? row.persentase : '-'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.compDetail}>
        <div className={styles.compDetailRow}>
          <span className={styles.compDetailLabel}>{row.numLabel}</span>
          <span className={styles.compDetailValue}>{fmtRupiahDetail(row.numValue)}</span>
        </div>
        <div className={styles.compDetailRow}>
          <span className={styles.compDetailLabel}>{row.denLabel}</span>
          <span className={styles.compDetailValue}>{fmtRupiahDetail(row.denValue)}</span>
        </div>
        <div className={styles.compDetailFormulaBox}>{row.formula}</div>

        {/* Kenapa skornya segitu: alasan spesifik (persentase & band yang cocok). */}
        <p className={styles.compAlasan}>{row.alasan}</p>

        <button
          type="button"
          className={styles.rentangToggle}
          onClick={() => setShowRentang((v) => !v)}
          aria-expanded={showRentang}
        >
          <span>Informasi Rentang Nilai</span>
          <motion.span
            className={styles.rentangChevron}
            animate={{ rotate: showRentang ? 180 : 0 }}
            transition={RENTANG_TRANSITION}
          >
            <ChevronDown size={13} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {showRentang && (
            <motion.div
              key="rentang"
              className={styles.rentangMotion}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={RENTANG_TRANSITION}
            >
              <div className={styles.rentangTable}>
                {row.rentang.map((b) => {
                  const aktif = row.applicable && b.label === row.rentangAktifLabel;
                  return (
                    <div key={b.label} className={`${styles.rentangRow} ${aktif ? styles.rentangRowActive : ''}`}>
                      <span className={styles.rentangLabel}>{b.label}</span>
                      <span className={styles.rentangSkor}>{fmtDec(b.skor, b.skor % 1 === 0 ? 0 : 1)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </Card.Body>
      <Card.Footer className={`${styles.compNote} ${row.applicable ? styles.compNoteInfo : styles.compNoteWarn}`}>
        {row.applicable ? <Info size={16} /> : <TriangleAlert size={16} />}
        <span>{row.catatan}</span>
      </Card.Footer>
    </Card>
  );
}
