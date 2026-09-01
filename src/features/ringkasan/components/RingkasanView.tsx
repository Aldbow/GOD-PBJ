"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { RefreshCw, Download, PieChart, BarChart3, ChevronUp, ChevronDown, ChevronsUpDown, Printer, Percent, Package, Building2, Route, Tags, Trophy, Gauge, Sparkles, ShieldAlert, ExternalLink, Landmark, Lock, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
import { useSession } from '@/components/auth/SessionProvider';
import { fmtInt, fmtPct, fmtRupiah } from '@/lib/format';
import { metodeDrilldown, jenisDrilldown, type DrilldownContext, type DrilldownTarget } from '@/lib/drilldown';
import {
  fetchGabunganRows,
  aggregate,
  listSatker,
  listPpk,
  getSatkerForPpk,
  filterRows,
  type GabunganRow,
  type RingkasanFilterValue,
  type MetodeAggregate,
  type JenisAggregate,
  type SumberAggregate,
} from '../lib/ringkasanData';

function AccordionTableWrapper({ title, count, isOpen, onToggle, children }: any) {
  return (
    <Card variant="flush" className={styles.accordionCard}>
      <Card.Header
        as="button"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={styles.accordionHead}
      >
        <Card.Icon tone="neutral"><Tags /></Card.Icon>
        <Card.Title as="span">{title}</Card.Title>
        <span className={styles.accordionCount}>{count} baris data</span>
        <Card.Action as="span" aria-hidden>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Card.Action>
      </Card.Header>
      {isOpen && <Card.Body className={styles.accordionBody}>{children}</Card.Body>}
    </Card>
  );
}

import { RingkasanFilter } from './RingkasanFilter';
import { KpiCards } from './KpiCards';
import { CategoryDonutChart } from './charts/CategoryDonutChart';
import { CategoryBarChart } from './charts/CategoryBarChart';
import { SatkerRankingChart } from './charts/SatkerRankingChart';
import { KurvaRealisasiTarget } from './charts/KurvaRealisasiTarget';
import { fetchPetaWaktu, bangunKurva, type PetaWaktu } from '../lib/realisasiTimeline';
import { metodeColor, jenisColor, sumberColor, useIsDark } from './charts/chartTheme';
import { ItkpGauge } from './ItkpGauge';
import { PedomanLengkapCard } from '@/features/itkp/components/PedomanLengkapCard';
import { KurasiAkurasi } from './KurasiAkurasi';
import { AnomaliPanel } from '@/components/paket/AnomaliPanel';
import { AnomaliTable } from './AnomaliTable';
import { SatkerDetailModal } from './SatkerDetailModal';
import { KurasiTidakAkuratTable } from './KurasiTidakAkuratTable';
import { RisikoInsightPanel } from './RisikoInsightPanel';
import { PrintSectionsProvider, usePrintSectionsStore } from '../lib/pdf/printSections';
import styles from './RingkasanView.module.css';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
};

const EMPTY_FILTER: RingkasanFilterValue = { satker: '', ppk: '' };

/** Lingkup data yang boleh dipilih role PPK pada halaman Ringkasan. */
type PpkScope = 'satker' | 'kementerian';

/**
 * Pemilih lingkup untuk role PPK — menempati slot yang sama dengan
 * RingkasanFilter milik admin. Memakai kelas segmented control halaman ini
 * (dipakai juga oleh toggle Persentase/Jumlah Paket) supaya kontrol paling
 * menentukan di halaman ini tidak memperkenalkan bahasa visual baru.
 *
 * Penjelasan batas per-paket sengaja hanya muncul di lingkup Kementerian, dan
 * hanya di sini: dijelaskan sekali pada kontrol yang menyebabkannya, bukan
 * diulang sebagai placeholder di setiap section yang menghilang.
 */
function PpkScopeBar({
  scope,
  onChange,
  satkerName,
  disabled,
}: {
  scope: PpkScope;
  onChange: (scope: PpkScope) => void;
  satkerName: string;
  disabled?: boolean;
}) {
  const hasSatker = Boolean(satkerName);
  const noSatkerHint = 'Profil Anda belum memiliki Satuan Kerja. Hubungi admin UKPBJ.';

  return (
    <Card padding="tight" className={styles.scopeBar}>
      <Card.Header className={styles.scopeBarHead}>
        <Card.Icon tone="neutral"><SlidersHorizontal /></Card.Icon>
        <Card.Title>Lingkup data</Card.Title>
      </Card.Header>
      <Card.Body className={styles.scopeBarRow}>
        <div className={styles.segmentedControl} role="group" aria-label="Lingkup data">
          <div
            className={styles.segmentedBg}
            style={{ transform: scope === 'kementerian' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          <button
            type="button"
            className={`${styles.segmentedBtn} ${scope === 'satker' ? styles.active : ''}`}
            onClick={() => onChange('satker')}
            disabled={disabled || !hasSatker}
            aria-pressed={scope === 'satker'}
            title={hasSatker ? undefined : noSatkerHint}
          >
            <Building2 size={13} />
            Satuan Kerja Saya
          </button>
          <button
            type="button"
            className={`${styles.segmentedBtn} ${scope === 'kementerian' ? styles.active : ''}`}
            onClick={() => onChange('kementerian')}
            disabled={disabled}
            aria-pressed={scope === 'kementerian'}
          >
            <Landmark size={13} />
            Kementerian
          </button>
        </div>
      </Card.Body>

      {scope === 'kementerian' ? (
        <Card.Footer className={styles.scopeNote}>
          <Lock size={13} className={styles.scopeNoteIcon} />
          <span>
            Menampilkan agregat seluruh kementerian. export dan laporan tetap terbatas pada satuan kerja Anda.
            {!hasSatker && ` ${noSatkerHint}`}
          </span>
        </Card.Footer>
      ) : (
        <Card.Footer className={styles.scopeInfo}>
          Menampilkan data: <b>{satkerName}</b>
        </Card.Footer>
      )}
    </Card>
  );
}

/**
 * Sel kategori di tabel rincian — jalan masuk ke daftar paketnya.
 *
 * Isinya tautan sungguhan, bukan sekadar baris ber-onClick: baris tabel tidak
 * bisa difokuskan keyboard dan tidak bisa dibuka di tab baru. Barisnya tetap
 * ikut bisa diklik demi kenyamanan, tapi tautan inilah yang menanggung
 * aksesibilitasnya.
 */
function KategoriCell({
  nama,
  warna,
  jumlah,
  target,
}: {
  nama: string;
  warna: string;
  jumlah: number;
  target: DrilldownTarget;
}) {
  return (
    <td>
      <span className={styles.swatch} style={{ background: warna }} />
      <Link
        href={target.href}
        className={styles.kategoriLink}
        title={`Buka ${fmtInt(jumlah)} paket ${nama} di ${target.label}`}
      >
        {nama}
        <ArrowUpRight size={13} className={styles.kategoriArrow} aria-hidden="true" />
      </Link>
    </td>
  );
}

// Getter label stabil (identitas referensi tetap sama antar-render) supaya
// CategoryDonutChart/CategoryBarChart tidak recompute chart data tiap render.
const getMetodeLabel = (m: MetodeAggregate) => m.metode;
const getJenisLabel = (j: JenisAggregate) => j.jenis;
const getSumberLabel = (s: SumberAggregate) => s.kategori;

export function RingkasanView() {
  // Role PPK punya DUA lingkup: satkernya sendiri, atau agregat se-kementerian.
  // Yang dibatasi bukan datasetnya melainkan granularitasnya — angka rollup
  // terbuka di kedua lingkup, sedangkan identitas paket (nama paket, kode RUP,
  // nama PPK, catatan kurasi AI) hanya boleh terlihat untuk satkernya sendiri.
  const { role, satker: profileSatker } = useSession();
  const isPpk = role === 'ppk';
  const hasSatker = Boolean(profileSatker);
  const [ppkScope, setPpkScope] = useState<PpkScope>(hasSatker ? 'satker' : 'kementerian');

  const [rows, setRows] = useState<GabunganRow[]>([]);
  // Bobot waktu realisasi. Dimuat terpisah dari baris view karena tanggalnya
  // memang tidak ada di view mana pun — lihat lib/realisasiTimeline.ts.
  const [petaWaktu, setPetaWaktu] = useState<PetaWaktu | null>(null);
  /** Kurva gagal dimuat sementara sisa halaman baik-baik saja. */
  const [kurvaError, setKurvaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  // Filter tersimpan hanya milik admin/sekjend. Untuk PPK, `applied` DITURUNKAN
  // dari lingkup aktif — bukan disimpan — supaya tidak bisa digeser ke satker
  // lain lewat ?satker= atau lewat state di devtools.
  const [appliedState, setApplied] = useState<RingkasanFilterValue>(EMPTY_FILTER);
  const applied = useMemo<RingkasanFilterValue>(() => {
    if (!isPpk) return appliedState;
    return ppkScope === 'satker' ? { satker: profileSatker ?? '', ppk: '' } : EMPTY_FILTER;
  }, [isPpk, ppkScope, profileSatker, appliedState]);

  // SATU gerbang untuk semua permukaan per-paket (tabel anomali, tabel kurasi
  // tidak akurat, export). Peran lain tidak terpengaruh.
  const canSeePaketDetail = !isPpk || (ppkScope === 'satker' && hasSatker);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExportPrintMenuOpen, setIsExportPrintMenuOpen] = useState(false);

  const [showSumberTable, setShowSumberTable] = useState(false);
  const [showMetodeTable, setShowMetodeTable] = useState(false);
  const [showJenisTable, setShowJenisTable] = useState(false);
  const [sortCol, setSortCol] = useState<'peringkat' | 'satker' | 'jumlahPaket' | 'pagu' | 'realisasi' | 'pctRealisasi'>('pctRealisasi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSatkerForDetail, setSelectedSatkerForDetail] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingPeringkat, setPrintingPeringkat] = useState(false);
  // Papan tempat seksi ITKP & Risiko menerbitkan ringkasan cetaknya — keduanya
  // memuat datanya sendiri, jadi angkanya tidak ada di `agg`.
  const printSections = usePrintSectionsStore();
  const [barChartMode, setBarChartMode] = useState<'keuangan' | 'paket'>('keuangan');
  const [jenisChartMode, setJenisChartMode] = useState<'keuangan' | 'paket'>('keuangan');
  const [sumberChartMode, setSumberChartMode] = useState<'keuangan' | 'paket'>('keuangan');
  const isDark = useIsDark();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setKurvaError(null);
    try {
      // Baris dimuat utuh untuk semua peran — agregat kementerian butuh itu.
      // Pembatasan role PPK ditegakkan pada tingkat tampilan (canSeePaketDetail)
      // dan pada baris export, bukan dengan memotong dataset di sini.
      // Keduanya diambil berbarengan; menunggunya berurutan menambah satu
      // putaran jaringan penuh. Kegagalan bobot waktu ditangkap sendiri: kurva
      // adalah pelengkap kartu KPI, dan menjatuhkan seluruh Ringkasan hanya
      // karena satu grafik tidak bisa disusun jelas bukan pertukaran yang benar.
      const [data, peta] = await Promise.all([
        fetchGabunganRows(),
        fetchPetaWaktu().catch((e) => {
          setKurvaError(e instanceof Error ? e.message : 'Gagal memuat sumbu waktu realisasi.');
          return new Map() as PetaWaktu;
        }),
      ]);
      setRows(data);
      setPetaWaktu(peta);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data ringkasan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const agg = useMemo(() => aggregate(rows, applied), [rows, applied]);
  // Kurva memakai baris yang SUDAH difilter, dengan pagu dari agregat yang sama
  // dengan kartu KPI — supaya ujung kurva dan kartu tidak pernah berbeda angka.
  const kurva = useMemo(
    () => bangunKurva(filterRows(rows, applied), petaWaktu ?? new Map(), agg.kpi.totalPagu),
    [rows, applied, petaWaktu, agg.kpi.totalPagu]
  );
  const satkerOptions = useMemo(() => listSatker(rows), [rows]);
  const getPpkOptions = useCallback((satker: string) => listPpk(rows, satker), [rows]);
  const getSatkerByPpk = useCallback((ppk: string) => getSatkerForPpk(rows, ppk), [rows]);

  const updatedLabel = lastUpdate
    ? `${lastUpdate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, ${lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
    : 'Memuat...';

  // Data export dari baris terfilter.
  const exportColumns = useMemo(
    () => [
      { key: 'kd_rup', label: 'Kode RUP' },
      { key: 'satker', label: 'Satuan Kerja' },
      { key: 'nama_ppk', label: 'Nama PPK' },
      { key: 'rup_name', label: 'Nama Paket', width: 40 },
      { key: 'metode_pengadaan', label: 'Metode' },
      { key: 'status', label: 'Status' },
      { key: 'pagu', label: 'Pagu (Rp)', type: 'currency' },
      { key: 'total', label: 'Realisasi (Rp)', type: 'currency' },
      { key: 'realisasi_pct', label: 'Realisasi (%)', type: 'number' },
      { key: 'status_kurasi', label: 'Status Kurasi AI' },
      { key: 'catatan_kurasi', label: 'Catatan Kurasi AI', width: 40 },
      { key: 'rekomendasi_kurasi', label: 'Rekomendasi Kurasi AI', width: 40 },
    ],
    []
  );

  // Baris export role PPK selalu terkunci ke satkernya, di lingkup manapun —
  // termasuk opsi "Semua Data" yang mengabaikan filter aktif. Profil tanpa
  // satker WAJIB dijaga eksplisit: filterRows(rows, { satker: '' }) justru
  // mengembalikan seluruh baris, jadi tanpa guard ini satker kosong malah
  // membuka satu kementerian.
  const buildExportRows = useCallback(
    (f: RingkasanFilterValue) => {
      if (isPpk && !profileSatker) return [];
      const base = isPpk ? filterRows(rows, { satker: profileSatker!, ppk: '' }) : rows;
      return filterRows(base, f).map((r) => {
        const pagu = Number(r.pagu) || 0;
        const total = Number(r.total) || 0;
        return {
          kd_rup: r.kd_rup || '-',
          satker: r.satker || 'Tidak Diketahui',
          nama_ppk: r.nama_ppk || 'Tidak Diketahui',
          rup_name: r.rup_name || 'Tidak Diketahui',
          metode_pengadaan: r.metode_pengadaan || 'Lainnya',
          status: r.status || '-',
          pagu,
          total,
          realisasi_pct: pagu > 0 ? Math.round((total / pagu) * 100) : 0,
          status_kurasi: r.status_kurasi || 'Belum Dikurasi',
          catatan_kurasi: r.catatan_kurasi || '-',
          rekomendasi_kurasi: r.rekomendasi_kurasi || '-',
        };
      });
    },
    [rows, isPpk, profileSatker]
  );

  const allExport = useMemo(() => buildExportRows(EMPTY_FILTER), [buildExportRows]);
  const filteredExport = useMemo(() => buildExportRows(applied), [buildExportRows, applied]);

  const totalPaketSemua = agg.metode.reduce((s, m) => s + m.jumlahPaket, 0);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return <ChevronsUpDown size={14} style={{ opacity: 0.3, marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }} />;
    return sortDir === 'asc' ? (
      <ChevronUp size={14} style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }} />
    ) : (
      <ChevronDown size={14} style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }} />
    );
  };

  const sortedSatker = useMemo(() => {
    const withRank = [...agg.satker]
      .sort((a, b) => b.pctRealisasi - a.pctRealisasi)
      .map((s, i) => ({ ...s, baseRank: i + 1 }));

    return withRank.sort((a, b) => {
      const valA = sortCol === 'peringkat' ? a.baseRank : a[sortCol];
      const valB = sortCol === 'peringkat' ? b.baseRank : b[sortCol];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [agg.satker, sortCol, sortDir]);

  const searchedSatker = useMemo(() => {
    if (!searchQuery) return sortedSatker;
    const q = searchQuery.toLowerCase();
    return sortedSatker.filter((s) => s.satker.toLowerCase().includes(q));
  }, [sortedSatker, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(searchedSatker.length / ITEMS_PER_PAGE));
  const paginatedSatker = searchedSatker.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getCapaianBadgeClass = (pct: number) => {
    if (pct < 25) return styles.badgeRed;
    if (pct < 50) return styles.badgeYellow;
    if (pct < 75) return styles.badgeBlue;
    return styles.badgeGreen;
  };

  // Jika filter PPK aktif tapi Satker kosong, cari Satker dari PPK tersebut untuk ITKP.
  const impliedSatkerForItkp = useMemo(() => {
    if (applied.satker) return applied.satker;
    if (applied.ppk) {
      const row = rows.find((r) => r.nama_ppk === applied.ppk && r.satker);
      return row?.satker || '';
    }
    return '';
  }, [applied, rows]);

  // Filter Satker/PPK aktif -> sembunyikan Pemeringkatan Satker (tidak relevan
  // untuk satu satker/ppk) dan pecah ITKP+Kurasi jadi stack penuh + tabel awareness.
  const isFiltered = !!applied.satker || !!applied.ppk;

  // Di lingkup Kementerian `applied.satker` kosong sehingga tak ada baris yang
  // tersorot — padahal justru di situlah PPK perlu tahu posisi satkernya.
  const highlightSatker = isPpk ? profileSatker : applied.satker;

  /* ---------------------------------------------------------------- */
  /* Drill-down: dari kategori ke daftar paketnya                       */
  /* ---------------------------------------------------------------- */

  // Lingkup yang sedang dilihat ikut terbawa ke halaman tujuan, supaya yang
  // terbuka adalah paket pada lingkup yang sama dengan angka yang barusan
  // diklik — bukan lingkup penuh se-kementerian.
  const drilldownCtx = useMemo<DrilldownContext>(
    () => ({ role, satker: applied.satker || null, ppk: applied.ppk || null }),
    [role, applied.satker, applied.ppk]
  );

  // Identitas callback dijaga stabil: keduanya jadi dependensi useMemo di dalam
  // CategoryDonutChart/CategoryBarChart, jadi fungsi baru tiap render akan
  // membangun ulang seluruh konfigurasi chart tanpa alasan.
  const linkMetode = useCallback((metode: string) => metodeDrilldown(metode, drilldownCtx), [drilldownCtx]);
  const linkJenis = useCallback((jenis: string) => jenisDrilldown(jenis, drilldownCtx), [drilldownCtx]);

  const router = useRouter();
  const bukaBaris = useCallback(
    (e: React.MouseEvent, href: string) => {
      // Kalau kliknya mendarat di tautan di dalam baris, biarkan tautan itu yang
      // bekerja — kalau tidak, navigasinya berjalan dua kali.
      if ((e.target as HTMLElement).closest('a')) return;
      router.push(href);
    },
    [router]
  );

  // Mencetak seluruh baris hasil pencarian (bukan hanya halaman yang tampak),
  // dalam urutan sort yang sedang aktif — jadi PDF-nya sama dengan yang dibaca
  // di layar, hanya tanpa batas paginasi.
  const handleCetakPeringkat = useCallback(async () => {
    if (searchedSatker.length === 0) return;
    setPrintingPeringkat(true);
    try {
      const { cetakPeringkatSatker } = await import('../lib/cetakPeringkatSatker');
      await cetakPeringkatSatker({
        rows: searchedSatker,
        searchQuery,
        highlightSatker: highlightSatker || '',
        scopeLabel: applied.satker || 'Kementerian Ketenagakerjaan',
        exclusion: agg.satkerExclusion,
      });
    } catch (err) {
      console.error('Gagal mencetak peringkat satuan kerja', err);
    } finally {
      setPrintingPeringkat(false);
    }
  }, [searchedSatker, searchQuery, highlightSatker, applied.satker, agg.satkerExclusion]);

  /**
   * Cetak Laporan.
   *
   * Tidak lagi memotret halaman. Isinya disusun dari `agg` — agregat yang sama
   * dengan yang dipakai layar — sehingga seksi yang sedang tergulung, tabel
   * yang sedang terpaginasi, dan bagian yang berada di luar layar tetap
   * tercetak utuh, dan tidak ada state layar yang perlu dimutasi dulu.
   */
  const handleDownloadPdf = useCallback(async () => {
    setDownloadingPdf(true);
    try {
      const { cetakLaporanRingkasan } = await import('../lib/pdf/cetakLaporanRingkasan');
      await cetakLaporanRingkasan({
        agg,
        scopeLabel: applied.satker || 'Kementerian Ketenagakerjaan',
        filter: applied,
        isFiltered,
        canSeePaketDetail,
        highlightSatker: highlightSatker || undefined,
        scopeNote:
          isPpk && ppkScope === 'kementerian'
            ? 'Lingkup Kementerian — rincian per-paket dibatasi pada satuan kerja Anda.'
            : null,
        sections: printSections.read(),
        printedAt: new Date(),
      });
    } catch (err) {
      console.error('Gagal mencetak laporan ringkasan', err);
      setError('Gagal menyiapkan berkas PDF laporan. Coba lagi.');
    } finally {
      setDownloadingPdf(false);
    }
  }, [agg, applied, isFiltered, canSeePaketDetail, highlightSatker, isPpk, ppkScope, printSections]);

  return (
    <PrintSectionsProvider store={printSections}>
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '4px' }}>
      {/* Baris 1 — Header */}
      <motion.div variants={item} className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {applied.satker || 'Kementerian Ketenagakerjaan'}
          </h1>
          <p className={styles.pageSub}>
            {isPpk && ppkScope === 'satker'
              ? 'Gambaran umum pengadaan, realisasi, pemanfaatan sistem, dan hasil kurasi paket pada satuan kerja Anda.'
              : 'Gambaran umum pelaksanaan pengadaan, realisasi, pemanfaatan sistem, dan hasil kurasi paket.'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostBtn} onClick={handleDownloadPdf} disabled={loading || downloadingPdf}>
            {downloadingPdf ? <RefreshCw size={15} className={styles.spin} /> : <Printer size={15} />} Cetak Laporan
          </button>
          <button className={styles.ghostBtn} onClick={() => setIsExportOpen(true)} disabled={loading}>
            <Download size={15} /> Export
          </button>
          <button className={styles.ghostBtn} onClick={load} disabled={loading} aria-label="Muat ulang data">
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
        </div>
      </motion.div>

      {error && <ErrorBox className={styles.spacer}>{error}</ErrorBox>}

      {/* Baris 2 — Kontrol lingkup data (disembunyikan dari hasil cetak/PDF).
          Slot yang sama untuk semua peran: admin/sekjend mendapat pemilih
          Satker/PPK, PPK mendapat pemilih lingkup 2-state. Pemilih penuh tidak
          diberikan ke PPK karena dropdown-nya memuat daftar lengkap nama satker
          dan nama SELURUH PPK — data yang tidak dibutuhkan untuk membaca agregat. */}
      <motion.div variants={item}>
        {isPpk ? (
          <PpkScopeBar
            scope={ppkScope}
            onChange={setPpkScope}
            satkerName={profileSatker ?? ''}
            disabled={loading}
          />
        ) : (
          <RingkasanFilter
            satkerOptions={satkerOptions}
            getPpkOptions={getPpkOptions}
            getSatkerByPpk={getSatkerByPpk}
            applied={applied}
            onApply={setApplied}
            disabled={loading}
          />
        )}
      </motion.div>

      {/* Baris 3 — KPI Cards */}
      <motion.div variants={item}>
        <KpiCards kpi={agg.kpi} loading={loading} />
      </motion.div>

      {/* Baris 3a — Kurva realisasi vs target triwulan. Ditaruh tepat di bawah
          KPI karena inilah bentuk waktu dari angka "Sudah Realisasi" di atasnya. */}
      <motion.div variants={item}>
        <KurvaRealisasiTarget
          kurva={kurva}
          loading={loading || petaWaktu === null}
          error={kurvaError}
        />
      </motion.div>

      {/* Baris 3b — Ringkasan Sumber Pengadaan (dari RUP, bukan dari realisasi) */}
      <motion.div variants={item} className={styles.sectionGroup}>
        <SectionHeader
          title={<span className={styles.sectionEyebrow}><Building2 size={16} /> Ringkasan Cara Pengadaan</span>}
          caption="Proporsi paket Penyedia vs Swakelola dari RUP terumumkan (bukan dari realisasi)"
        />
        <div className={styles.methodGrid}>
          <Card>
            <Card.Header>
              <Card.Icon tone="neutral"><PieChart /></Card.Icon>
              <Card.Title>Proporsi Jumlah Paket</Card.Title>
            </Card.Header>
            <Card.Body>
              <CategoryDonutChart data={agg.sumber} getLabel={getSumberLabel} getColor={sumberColor} totalPaket={agg.sumber.reduce((s, x) => s + x.jumlahPaket, 0)} />
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className={styles.panelHeaderRow}>
              <Card.Icon tone="positive"><BarChart3 /></Card.Icon>
              <Card.Title>Realisasi per Cara Pengadaan</Card.Title>
              <div className={styles.segmentedControl}>
                <div className={styles.segmentedBg} style={{ transform: sumberChartMode === 'paket' ? 'translateX(100%)' : 'translateX(0)' }} />
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${sumberChartMode === 'keuangan' ? styles.active : ''}`}
                  onClick={() => setSumberChartMode('keuangan')}
                >
                  <Percent size={13} />
                  Persentase Realisasi
                </button>
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${sumberChartMode === 'paket' ? styles.active : ''}`}
                  onClick={() => setSumberChartMode('paket')}
                >
                  <Package size={13} />
                  Jumlah Paket
                </button>
              </div>
            </Card.Header>
            <Card.Body>
              <CategoryBarChart data={agg.sumber} getLabel={getSumberLabel} getColor={sumberColor} mode={sumberChartMode} />
            </Card.Body>
          </Card>
        </div>

        <AccordionTableWrapper 
          title="Rincian Tabel Sumber Pengadaan" 
          count={agg.sumber.length} 
          isOpen={showSumberTable}
          onToggle={() => setShowSumberTable(!showSumberTable)}
        >
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sumber</th>
                  <th className={styles.num}>Jumlah Paket</th>
                  <th className={styles.num}>Pagu</th>
                  <th className={styles.num}>Realisasi</th>
                  <th className={styles.num}>% Realisasi</th>
                </tr>
              </thead>
              <tbody>
                {agg.sumber.map((s) => (
                  <tr key={s.kategori}>
                    <td>
                      <span className={styles.swatch} style={{ background: sumberColor(s.kategori, isDark) }} />
                      {s.kategori}
                    </td>
                    <td className={styles.num}>{fmtInt(s.jumlahPaket)}</td>
                    <td className={styles.num}>{fmtRupiah(s.pagu)}</td>
                    <td className={styles.num}>{fmtRupiah(s.realisasi)}</td>
                    <td className={styles.num}>{fmtPct(s.pctRealisasi)}</td>
                  </tr>
                ))}
                {agg.sumber.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.tableEmpty}>Tidak ada data untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AccordionTableWrapper>
      </motion.div>

      {/* Baris 4 — Ringkasan Metode Pengadaan */}
      <motion.div variants={item} className={styles.sectionGroup}>
        <SectionHeader
          title={<span className={styles.sectionEyebrow}><Route size={16} /> Ringkasan Metode Pengadaan</span>}
          caption="Distribusi paket, pagu & realisasi per metode"
        />
        <div className={styles.methodGrid}>
          <Card>
            <Card.Header>
              <Card.Icon tone="neutral"><PieChart /></Card.Icon>
              <Card.Title>Proporsi Jumlah Paket</Card.Title>
            </Card.Header>
            <Card.Body>
              <CategoryDonutChart data={agg.metode} getLabel={getMetodeLabel} getColor={metodeColor} totalPaket={totalPaketSemua} getLink={linkMetode} />
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className={styles.panelHeaderRow}>
              <Card.Icon tone="positive"><BarChart3 /></Card.Icon>
              <Card.Title>Realisasi per Metode</Card.Title>
              <div className={styles.segmentedControl}>
                <div className={styles.segmentedBg} style={{ transform: barChartMode === 'paket' ? 'translateX(100%)' : 'translateX(0)' }} />
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${barChartMode === 'keuangan' ? styles.active : ''}`}
                  onClick={() => setBarChartMode('keuangan')}
                >
                  <Percent size={13} />
                  Persentase Realisasi
                </button>
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${barChartMode === 'paket' ? styles.active : ''}`}
                  onClick={() => setBarChartMode('paket')}
                >
                  <Package size={13} />
                  Jumlah Paket
                </button>
              </div>
            </Card.Header>
            <Card.Body>
              <CategoryBarChart data={agg.metode} getLabel={getMetodeLabel} getColor={metodeColor} mode={barChartMode} getLink={linkMetode} />
            </Card.Body>
          </Card>
        </div>

        <AccordionTableWrapper 
          title="Rincian Tabel Metode Pengadaan" 
          count={agg.metode.length} 
          isOpen={showMetodeTable}
          onToggle={() => setShowMetodeTable(!showMetodeTable)}
        >
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Metode</th>
                  <th className={styles.num}>Jumlah Paket</th>
                  <th className={styles.num}>Pagu</th>
                  <th className={styles.num}>Realisasi</th>
                  <th className={styles.num}>% Realisasi</th>
                </tr>
              </thead>
              <tbody>
                {agg.metode.map((m) => {
                  const target = linkMetode(m.metode);
                  return (
                  <tr
                    key={m.metode}
                    className={styles.interactiveRow}
                    onClick={(e) => bukaBaris(e, target.href)}
                    style={{ cursor: 'pointer' }}
                    title={`Buka ${fmtInt(m.jumlahPaket)} paket ${m.metode} di ${target.label}`}
                  >
                    <KategoriCell nama={m.metode} warna={metodeColor(m.metode, isDark)} jumlah={m.jumlahPaket} target={target} />
                    <td className={styles.num}>{fmtInt(m.jumlahPaket)}</td>
                    <td className={styles.num}>{fmtRupiah(m.pagu)}</td>
                    <td className={styles.num}>{fmtRupiah(m.realisasi)}</td>
                    <td className={styles.num}>{fmtPct(m.pctRealisasi)}</td>
                  </tr>
                  );
                })}
                {agg.metode.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.tableEmpty}>Tidak ada data untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
              {agg.metode.length > 0 && (
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className={styles.num}>{fmtInt(agg.kpi.totalPaket)}</td>
                    <td className={styles.num}>{fmtRupiah(agg.kpi.totalPagu)}</td>
                    <td className={styles.num}>{fmtRupiah(agg.kpi.totalRealisasi)}</td>
                    <td className={styles.num}>{fmtPct(agg.kpi.pctRealisasi)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </AccordionTableWrapper>
      </motion.div>

      {/* Baris 4b — Ringkasan Jenis Pengadaan */}
      <motion.div variants={item} className={styles.sectionGroup}>
        <SectionHeader
          title={<span className={styles.sectionEyebrow}><Tags size={16} /> Ringkasan Jenis Pengadaan</span>}
          caption="Distribusi paket, pagu & realisasi per jenis (Barang, Jasa, Konstruksi, Swakelola)"
        />
        <div className={styles.methodGrid}>
          <Card>
            <Card.Header>
              <Card.Icon tone="neutral"><PieChart /></Card.Icon>
              <Card.Title>Proporsi Jumlah Paket</Card.Title>
            </Card.Header>
            <Card.Body>
              <CategoryDonutChart data={agg.jenis} getLabel={getJenisLabel} getColor={jenisColor} totalPaket={totalPaketSemua} getLink={linkJenis} />
            </Card.Body>
          </Card>
          <Card>
            <Card.Header className={styles.panelHeaderRow}>
              <Card.Icon tone="positive"><BarChart3 /></Card.Icon>
              <Card.Title>Realisasi per Jenis</Card.Title>
              <div className={styles.segmentedControl}>
                <div className={styles.segmentedBg} style={{ transform: jenisChartMode === 'paket' ? 'translateX(100%)' : 'translateX(0)' }} />
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${jenisChartMode === 'keuangan' ? styles.active : ''}`}
                  onClick={() => setJenisChartMode('keuangan')}
                >
                  <Percent size={13} />
                  Persentase Realisasi
                </button>
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${jenisChartMode === 'paket' ? styles.active : ''}`}
                  onClick={() => setJenisChartMode('paket')}
                >
                  <Package size={13} />
                  Jumlah Paket
                </button>
              </div>
            </Card.Header>
            <Card.Body>
              <CategoryBarChart data={agg.jenis} getLabel={getJenisLabel} getColor={jenisColor} mode={jenisChartMode} getLink={linkJenis} />
            </Card.Body>
          </Card>
        </div>

        <AccordionTableWrapper 
          title="Rincian Tabel Jenis Pengadaan" 
          count={agg.jenis.length} 
          isOpen={showJenisTable}
          onToggle={() => setShowJenisTable(!showJenisTable)}
        >
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Jenis</th>
                  <th className={styles.num}>Jumlah Paket</th>
                  <th className={styles.num}>Pagu</th>
                  <th className={styles.num}>Realisasi</th>
                  <th className={styles.num}>% Realisasi</th>
                </tr>
              </thead>
              <tbody>
                {agg.jenis.map((j) => {
                  const target = linkJenis(j.jenis);
                  return (
                    <tr
                      key={j.jenis}
                      className={styles.interactiveRow}
                      onClick={(e) => bukaBaris(e, target.href)}
                      style={{ cursor: 'pointer' }}
                      title={`Buka ${fmtInt(j.jumlahPaket)} paket ${j.jenis} di ${target.label}`}
                    >
                      <KategoriCell nama={j.jenis} warna={jenisColor(j.jenis, isDark)} jumlah={j.jumlahPaket} target={target} />
                      <td className={styles.num}>{fmtInt(j.jumlahPaket)}</td>
                      <td className={styles.num}>{fmtRupiah(j.pagu)}</td>
                      <td className={styles.num}>{fmtRupiah(j.realisasi)}</td>
                      <td className={styles.num}>{fmtPct(j.pctRealisasi)}</td>
                    </tr>
                  );
                })}
                {agg.jenis.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.tableEmpty}>Tidak ada data untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AccordionTableWrapper>
      </motion.div>

      {/* Baris 5 — Pemeringkatan Satuan Kerja (disembunyikan saat filter Satker/PPK aktif) */}
      {!isFiltered && (
        <motion.div variants={item} className={styles.sectionGroup}>
          <SectionHeader
            title={<span className={styles.sectionEyebrow}><Trophy size={16} /> Peringkat Realisasi Satuan Kerja</span>}
            caption="Peringkat satker berdasarkan realisasi di SPSE"
            action={
              <button
                type="button"
                className={`${styles.ghostBtn} ${styles.sectionAction}`}
                onClick={handleCetakPeringkat}
                disabled={loading || printingPeringkat || searchedSatker.length === 0}
                title={
                  searchedSatker.length === 0
                    ? 'Tidak ada satuan kerja untuk dicetak'
                    : `Cetak ${fmtInt(searchedSatker.length)} satuan kerja ke PDF`
                }
              >
                {printingPeringkat ? (
                  <RefreshCw size={15} className={styles.spin} />
                ) : (
                  <Printer size={15} />
                )}
                {printingPeringkat ? 'Menyiapkan...' : 'Cetak Peringkat'}
              </button>
            }
          />
          <Card className={styles.chartCard}>
            <Card.Header>
              <Card.Icon tone="neutral"><Trophy /></Card.Icon>
              <Card.Title>Peringkat Realisasi Satuan Kerja</Card.Title>
            </Card.Header>
            <Card.Body>
              <SatkerRankingChart satker={agg.satker} selectedSatker={applied.satker} />
            </Card.Body>
          </Card>

          <Card variant="flush">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Cari nama satuan kerja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('peringkat')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} className={styles.colPeringkat}>
                      Peringkat <SortIcon col="peringkat" />
                    </th>
                    <th onClick={() => handleSort('satker')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} className={styles.colSatker}>
                      Satker <SortIcon col="satker" />
                    </th>
                    <th className={styles.num} onClick={() => handleSort('jumlahPaket')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Jumlah Paket <SortIcon col="jumlahPaket" />
                    </th>
                    <th className={styles.num} onClick={() => handleSort('pagu')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Pagu <SortIcon col="pagu" />
                    </th>
                    <th className={styles.num} onClick={() => handleSort('realisasi')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Realisasi <SortIcon col="realisasi" />
                    </th>
                    <th className={styles.num} onClick={() => handleSort('pctRealisasi')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      % Capaian <SortIcon col="pctRealisasi" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSatker.map((s) => (
                    <tr
                      key={s.satker}
                      className={`${styles.interactiveRow} ${s.satker === highlightSatker ? styles.rowHighlight : ''}`}
                      onClick={() => setSelectedSatkerForDetail(s.satker)}
                      style={{ cursor: 'pointer' }}
                      title="Klik untuk melihat detail satuan kerja"
                    >
                      <td className={`${styles.num} ${styles.colPeringkat}`}>{s.baseRank}</td>
                      <td className={styles.colSatker}>{s.satker}</td>
                      <td className={styles.num}>{fmtInt(s.jumlahPaket)}</td>
                      <td className={styles.num}>{fmtRupiah(s.pagu)}</td>
                      <td className={styles.num}>{fmtRupiah(s.realisasi)}</td>
                      <td className={styles.num}>
                        <span className={`${styles.badge} ${getCapaianBadgeClass(s.pctRealisasi)}`}>
                          {fmtPct(s.pctRealisasi)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginatedSatker.length === 0 && (
                    <tr>
                      <td colSpan={6} className={styles.tableEmpty}>Tidak ada data untuk filter ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {searchedSatker.length > ITEMS_PER_PAGE && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '24px', marginBottom: '8px' }}>
                <button
                  className={styles.ghostBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Sebelumnya
                </button>
                <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  className={styles.ghostBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Selanjutnya
                </button>
              </div>
            )}
            {agg.satkerExclusion.jumlahPaket > 0 && (
              <p className={styles.tableFootnote}>
                <ShieldAlert size={13} />
                <span>
                  {fmtInt(agg.satkerExclusion.jumlahPaket)} paket realisasi tanpa RUP terumumkan
                  ({fmtRupiah(agg.satkerExclusion.realisasi)}) tidak masuk peringkat: pagunya nol,
                  sehingga persentase capaiannya tidak dapat dihitung. Nilainya tetap terhitung di
                  KPI atas dan rinciannya ada di panel Anomali.
                  {agg.satkerExclusion.satkerHilang.length > 0 && (
                    <>
                      {' '}Termasuk{' '}
                      {agg.satkerExclusion.satkerHilang.map((nama, i) => (
                        <React.Fragment key={nama}>
                          {i > 0 && ', '}
                          <strong>{nama}</strong>
                        </React.Fragment>
                      ))}
                      {' '}yang seluruh paketnya tanpa RUP sehingga tidak muncul sama sekali di tabel ini.
                    </>
                  )}
                </span>
              </p>
            )}
          </Card>
        </motion.div>
      )}

      {/* Baris 7 — Pemanfaatan Sistem (ITKP), section tersendiri. Pedoman
          Lengkap menyatu langsung di bawah gauge (bukan section terpisah)
          supaya konteks skor & rujukan regulasinya tetap satu blok. */}
      <motion.div variants={item} className={styles.sectionGroup}>
        <SectionHeader title={<span className={styles.sectionEyebrow}><Gauge size={16} /> Indeks Tata Kelola Pengadaan</span>} />
        <div className={styles.stackedFull}>
          <ItkpGauge satker={impliedSatkerForItkp} forceComponentA={isFiltered} rows={rows} rowsLoading={loading} />
          <PedomanLengkapCard />
        </div>
      </motion.div>

      {/* Baris 7a — Insight Risiko Pengadaan (Ditambahkan sesuai permintaan) */}
      <motion.div variants={item} className={styles.sectionGroup}>
        <SectionHeader
          title={<span className={styles.sectionEyebrow}><ShieldAlert size={16} /> Risiko Pengadaan</span>}
          action={
            <Link href="/risiko-pengadaan" className={styles.ghostBtn} style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '11.5px', height: '28px' }}>
              Lihat Detail Halaman <ExternalLink size={13} style={{ marginLeft: 4 }} />
            </Link>
          }
        />
        <div className={styles.stackedFull}>
          <RisikoInsightPanel satker={applied.satker} ppk={applied.ppk} canSeePaketDetail={canSeePaketDetail} />
        </div>
      </motion.div>

      {/* Baris 7b — Kurasi Paket Pengadaan: dipisah dari ITKP karena konsepnya
          beda (kualitas kurasi AI, bukan skor pemanfaatan sistem), konsisten
          dengan pola summary-lalu-detail di Baris 8 (AnomaliPanel -> AnomaliTable). */}
      <motion.div variants={item} className={styles.sectionGroup}>
        <SectionHeader title={<span className={styles.sectionEyebrow}><Sparkles size={16} /> Kurasi Paket Pengadaan</span>} />
        <div className={styles.stackedFull}>
          <KurasiAkurasi kurasi={agg.kurasi} metode={agg.metode} onRefresh={load} isFullWidth />
          {/* Rincian per-paket: identitas paket + nama PPK. Disembunyikan bagi
              PPK di lingkup Kementerian; ringkasan akurasi di atasnya tetap ada
              sehingga section tidak pernah kosong. */}
          {canSeePaketDetail && <KurasiTidakAkuratTable rows={agg.kurasiTidakAkurat} />}
        </div>
      </motion.div>

      {/* Baris 8 — Deteksi Anomali */}
      <motion.div variants={item} className={styles.sectionGroup}>
        <AnomaliPanel summary={agg.anomali} />
        {/* Idem. Gerbang yang sama juga dipegang `buildLaporan`, jadi
            menyembunyikannya di sini tidak lagi menentukan isi Cetak Laporan. */}
        {canSeePaketDetail && <AnomaliTable rows={agg.anomaliRows} />}
      </motion.div>
      
      <ExportDataModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Laporan Ringkasan Pengadaan"
        filename={`Ringkasan_Pengadaan_${new Date().toISOString().slice(0, 10)}`}
        columns={exportColumns}
        allData={allExport}
        filteredData={filteredExport}
        scopeLocked={isPpk}
        scopeNotice={
          hasSatker
            ? `Seluruh paket ${profileSatker}. Export rincian paket dibatasi pada satuan kerja Anda.`
            : 'Profil Anda belum memiliki Satuan Kerja, sehingga tidak ada rincian paket yang bisa diexport. Hubungi admin UKPBJ.'
        }
      />
      
      <SatkerDetailModal 
        satkerName={selectedSatkerForDetail}
        rows={rows}
        onClose={() => setSelectedSatkerForDetail(null)}
      />
    </motion.div>
    </PrintSectionsProvider>
  );
}
