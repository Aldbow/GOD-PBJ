"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CalendarDays,
  Clock3,
  Info,
  TriangleAlert,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  MonitorSmartphone,
  Users,
  Building2,
  ShieldCheck,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { Modal } from '@/components/ui/Modal';
import { computeItkpA, type ItkpAInput, type ItkpAResult } from '@/lib/itkp/calcA';
import { computeItkpBCD, type ItkpBCDResult } from '@/lib/itkp/calcBCD';
import { fetchItkpBCDData } from '@/lib/itkp/fetchBCD';
import { fetchItkpAData } from '@/lib/itkp/fetchA';
import { fetchPerpindahanJfData, groupByJenjang, groupBySatuanKerja, type PerpindahanJfPerson } from '@/lib/itkp/fetchPerpindahanJf';
import { fmtDec, fmtPct } from '@/lib/format';
import {
  buildComponents,
  predikatOf,
  PREDIKAT_BANDS,
  type ComponentCode,
  type ItkpComponentModel,
  type ItkpIndicatorModel,
} from '@/lib/itkp/itkpModel';
import { PEDOMAN, PedomanComponentDetail } from './PedomanLengkapCard';
import styles from './ItkpDashboard.module.css';

const KEMENTERIAN_LABEL = 'Kementerian (Total)';
const TAHUN = 2026;

const COMP_ICON: Record<ComponentCode, React.ReactNode> = {
  A: <MonitorSmartphone size={18} />,
  B: <Users size={18} />,
  C: <Building2 size={18} />,
  D: <ShieldCheck size={18} />,
};

function formasiStatus(kebutuhan: number, eksisting: number, kekurangan: number): { label: string; variant: 'success' | 'danger' | 'warning' | 'info' } {
  if (eksisting <= 0 && kebutuhan > 0) return { label: 'Kosong', variant: 'danger' };
  if (kekurangan > 0) return { label: 'Kurang', variant: 'warning' };
  if (kekurangan < 0) return { label: 'Sisa', variant: 'info' };
  return { label: 'Terisi', variant: 'success' };
}

const BADGE_POP_TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

function StatusBadge({ variant, children }: { variant: 'success' | 'danger' | 'warning' | 'info'; children: React.ReactNode }) {
  const variantClass = variant === 'success' ? styles.statusSuccess
    : variant === 'danger' ? styles.statusDanger
    : variant === 'warning' ? styles.statusWarning
    : styles.statusInfo;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={BADGE_POP_TRANSITION}
      className={`${styles.statusBadge} ${variantClass}`}
    >
      {children}
    </motion.span>
  );
}

// Entrance choreography untuk konten modal "Rincian Keterisian Formasi"
const FORMASI_CONTAINER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const FORMASI_SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

const FORMASI_ACCORDION_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };
const FORMASI_CHEVRON_TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

export function ItkpDashboard() {
  const [kementerian, setKementerian] = useState<ItkpAInput | null>(null);
  const [bcdResult, setBcdResult] = useState<ItkpBCDResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeCode, setActiveCode] = useState<ComponentCode>('A');
  const [pedomanOpen, setPedomanOpen] = useState(false);
  const [modalData, setModalData] = useState<{ type: 'formasi' | 'penugasan' | 'renaksi' | 'spi'; data: any } | null>(null);
  const [spiTab, setSpiTab] = useState<'Internal' | 'Eksternal' | 'Eksper' | 'Faktor Koreksi' | 'Perhitungan'>('Internal');
  const [perpindahanJf, setPerpindahanJf] = useState<PerpindahanJfPerson[]>([]);
  const [selectedJenjangPerpindahan, setSelectedJenjangPerpindahan] = useState<string | null>(null);
  const rincianRef = useRef<HTMLElement | null>(null);

  const handleIndicatorDetailClick = (ind: ItkpIndicatorModel) => {
    if (ind.code === 'B1' && ind.rawData) {
      setModalData({ type: 'formasi', data: ind.rawData });
    } else if (ind.code === 'B2' && ind.rawData) {
      setModalData({ type: 'penugasan', data: ind.rawData });
    } else if (ind.code === 'B3' && ind.rawData) {
      setModalData({ type: 'renaksi', data: ind.rawData });
    } else if (ind.code === 'D1' && ind.rawData) {
      setModalData({ type: 'spi', data: ind.rawData });
      setSpiTab('Internal');
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resultA, bcdInput, perpindahanJfData] = await Promise.all([
        fetchItkpAData(),
        fetchItkpBCDData(),
        fetchPerpindahanJfData(),
      ]);
      setKementerian(resultA.kementerian);
      setBcdResult(computeItkpBCD(bcdInput));
      setPerpindahanJf(perpindahanJfData);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data ITKP dari Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resultA: ItkpAResult | null = useMemo(
    () => (kementerian ? computeItkpA(kementerian) : null),
    [kementerian]
  );

  const bcdAgg = useMemo(() => {
    if (!bcdResult) return { nilaiB: 0, nilaiC: 0, nilaiD: 0, result: null };
    return {
      nilaiB: bcdResult.nilaiB,
      nilaiC: bcdResult.nilaiC,
      nilaiD: bcdResult.nilaiD,
      result: bcdResult,
    };
  }, [bcdResult]);

  const totalA = resultA?.total ?? 0;
  const totalItkp = totalA + bcdAgg.nilaiB + bcdAgg.nilaiC + bcdAgg.nilaiD;
  const currentPredikat = predikatOf(totalItkp);

  const detailHref = '/itkp/pemanfaatan-sistem';

  const components = useMemo(
    () =>
      buildComponents({
        resultA,
        totalA,
        nilaiB: bcdAgg.nilaiB,
        nilaiC: bcdAgg.nilaiC,
        nilaiD: bcdAgg.nilaiD,
        bcdRows: bcdAgg.result,
        detailHrefA: detailHref,
      }),
    [resultA, totalA, bcdAgg, detailHref]
  );

  const activeComp = components.find((c) => c.code === activeCode) ?? components[0];

  const perpindahanJfSummary = useMemo(() => groupByJenjang(perpindahanJf), [perpindahanJf]);
  const perpindahanJfDetailBySatker = useMemo(
    () => groupBySatuanKerja(perpindahanJf.filter((p) => p.jenjang_jf === selectedJenjangPerpindahan)),
    [perpindahanJf, selectedJenjangPerpindahan]
  );

  const selectComponent = (code: ComponentCode) => {
    setActiveCode(code);
    setPedomanOpen(false);
    // Scroll halus ke rincian tanpa reload halaman.
    window.requestAnimationFrame(() => {
      rincianRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const updatedLabel = lastUpdate
    ? `${lastUpdate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, ${lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
    : 'Memuat...';

  const markerPos = Math.max(0, Math.min(100, totalItkp));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {/* ── Judul ── */}
      <div className={styles.pageHead}>
        <span className={styles.crumb}>ITKP · Monitoring &amp; Evaluasi</span>
        <h1 className={styles.pageTitle}>Dashboard Penilaian ITKP</h1>
      </div>

      {error && <ErrorBox className={styles.sectionSpacer}>{error}</ErrorBox>}

      {/* ── Info Pembaruan ── */}
      <div className={styles.filterBar} style={{ justifyContent: 'flex-end', border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, marginBottom: 12 }}>
        <div className={styles.updatedWrap}>
          <span className={styles.updated}>
            <Clock3 size={13} />
            Data terakhir diperbarui {updatedLabel}
          </span>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={load}
            disabled={loading}
            aria-label="Muat ulang data"
          >
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* ── Ringkasan Skor ITKP ── */}
      <div className={styles.scoreSummary}>
        {/* Skor */}
        <div className={styles.sumScore}>
          <span className={styles.sumLabel}>Skor ITKP {TAHUN}</span>
          <div className={styles.sumScoreRow}>
            <span className={styles.sumScoreValue}>{fmtDec(totalItkp, 2)}</span>
            <span className={styles.predikatPill} style={{ background: currentPredikat.color }}>
              {currentPredikat.kode} · {currentPredikat.label}
            </span>
          </div>
          <span className={styles.sumScoreMeta}>
            Predikat {currentPredikat.kode} ({currentPredikat.rangeLabel}) · skor {fmtDec(totalItkp, 2)} dari 100
          </span>
        </div>

        {/* Distribusi kategori */}
        <div className={styles.sumDist}>
          <span className={styles.sumLabel}>Distribusi Kategori Penilaian</span>
          <div className={styles.distWrap}>
            <div className={styles.distMarker} style={{ left: `${markerPos}%` }}>
              <span className={styles.distMarkerValue}>{fmtDec(totalItkp, 2)}</span>
              <span className={styles.distMarkerStem} />
            </div>
            <div className={styles.distTrack}>
              {PREDIKAT_BANDS.map((b) => (
                <div
                  key={b.level}
                  className={styles.distSeg}
                  style={{ width: `${b.max - b.min}%`, background: b.color }}
                  title={`${b.kode} · ${b.label} · ${b.rangeLabel}`}
                >
                  <span className={styles.distSegLabel}>{b.kode}</span>
                </div>
              ))}
            </div>
            <div className={styles.distTicks}>
              {[0, 30, 50, 60, 70, 80, 90, 100].map((t) => (
                <span key={t} className={styles.distTick} style={{ left: `${t}%` }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Kartu Komponen A–D ── */}
      <div className={styles.compGrid}>
        {components.map((c) => (
          <ComponentCard key={c.code} comp={c} active={c.code === activeCode} onSelect={() => selectComponent(c.code)} />
        ))}
      </div>

      {/* ── Rincian Indikator Komponen Aktif ── */}
      <section ref={rincianRef} className={`${styles.rincian} ${styles[`comp${activeComp.code}`]}`}>
        <header className={styles.rincianHead}>
          <div className={styles.rincianTitleWrap}>
            <span className={styles.rincianIcon}>{COMP_ICON[activeComp.code]}</span>
            <div>
              <h2 className={styles.rincianTitle}>
                Rincian Indikator Komponen {activeComp.code} — {activeComp.name}
              </h2>
              <div className={styles.rincianMeta}>
                <span>
                  Bobot <strong>{activeComp.weight}%</strong>
                </span>
                <span className={styles.metaDot} />
                <span>
                  Skor{' '}
                  <strong>
                    {fmtDec(activeComp.score, 2)} / {fmtDec(activeComp.maxScore, 0)}
                  </strong>
                </span>
                <span className={styles.metaDot} />
                <span>
                  Capaian <strong>{fmtPct(activeComp.percentage)}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.pedomanBtn}
            onClick={() => setPedomanOpen((v) => !v)}
            aria-expanded={pedomanOpen}
          >
            <BookOpen size={14} />
            {pedomanOpen ? 'Tutup pedoman' : 'Lihat pedoman penilaian'}
          </button>
        </header>

        {pedomanOpen && (
          <div className={styles.pedomanPanel} style={{ padding: 0, overflow: 'hidden' }}>
            {(() => {
              const pedomanData = PEDOMAN.find((p) => p.code === activeComp.code);
              return pedomanData ? <PedomanComponentDetail comp={pedomanData} /> : null;
            })()}
          </div>
        )}

        <div className={styles.indGrid}>
          {activeComp.indicators.map((ind) => (
            <IndicatorCard key={ind.code} ind={ind} onDetailClick={handleIndicatorDetailClick} />
          ))}
          {activeComp.indicators.length === 0 && (
            <div className={styles.indEmpty}>
              <Info size={16} />
              <p>
                Rincian indikator Komponen {activeComp.code} ditampilkan saat memilih <strong>Unit Penilaian</strong>{' '}
                tertentu. Pada tingkat Kementerian (Total), nilai komponen ini merupakan agregat antar-unit.
              </p>
            </div>
          )}
          <ComponentSummaryCard comp={activeComp} />
        </div>
      </section>

      {/* Pedoman Lengkap telah dipindahkan ke masing-masing rincian komponen */}
      {/* ── Modal Detail ── */}
      <Modal
        isOpen={!!modalData}
        onClose={() => {
          setModalData(null);
          setSelectedJenjangPerpindahan(null);
        }}
        title={
          modalData?.type === 'formasi' ? 'Rincian Keterisian Formasi' : 
          modalData?.type === 'penugasan' ? 'Daftar Penugasan JF PBJ' : 
          modalData?.type === 'renaksi' ? 'Data Pendukung Renaksi' : 
          'Rincian Survei Penilaian Integritas (SPI)'
        }
      >
        {modalData?.type === 'formasi' && (
          <motion.div
            className={styles.formasiWrap}
            variants={FORMASI_CONTAINER_VARIANTS}
            initial="hidden"
            animate="show"
          >
            {/* ── Formasi Jabatan Fungsional PBJ ── */}
            <motion.section className={styles.formasiSection} variants={FORMASI_SECTION_VARIANTS}>
              <div className={styles.formasiSectionHead}>
                <div className={styles.formasiSectionIcon}>
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className={styles.formasiSectionTitle}>Formasi Jabatan Fungsional PBJ</h3>
                  <p className={styles.formasiSectionDesc}>
                    Perbandingan kebutuhan formasi dengan jumlah pegawai eksisting pada tiap jenjang JF PBJ.
                  </p>
                </div>
              </div>

              <div className={styles.formasiCard}>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.formasiTable}>
                    <thead>
                      <tr>
                        <th>Jenjang</th>
                        <th className={styles.formasiColRight}>Kebutuhan</th>
                        <th className={styles.formasiColRight}>Eksisting</th>
                        <th className={styles.formasiColRight}>Kekurangan</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.data.map((row: any, i: number) => {
                        const kebutuhan = Number(row['Formasi Kebutuhan']) || 0;
                        const eksisting = Number(row['Formasi Terpenuhi']) || 0;
                        const kekurangan = Number(row['Kekurangan']) || 0;
                        const status = formasiStatus(kebutuhan, eksisting, kekurangan);
                        return (
                          <tr key={i} className={styles.formasiRowAnim} style={{ animationDelay: `${i * 35}ms` }}>
                            <td className={styles.formasiRowName}>{row['Jenjang']}</td>
                            <td className={`${styles.formasiColRight} ${styles.formasiMono}`}>{kebutuhan}</td>
                            <td className={`${styles.formasiColRight} ${styles.formasiMono}`}>{eksisting}</td>
                            <td className={`${styles.formasiColRight} ${styles.formasiMono}`}>{kekurangan}</td>
                            <td>
                              <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className={styles.formasiTotalRow}>
                        <td>Total</td>
                        <td className={styles.formasiColRight}>{modalData.data.reduce((s: number, r: any) => s + (Number(r['Formasi Kebutuhan']) || 0), 0)}</td>
                        <td className={styles.formasiColRight}>{modalData.data.reduce((s: number, r: any) => s + (Number(r['Formasi Terpenuhi']) || 0), 0)}</td>
                        <td className={styles.formasiColRight}>{modalData.data.reduce((s: number, r: any) => s + (Number(r['Kekurangan']) || 0), 0)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </motion.section>

            {/* ── Proses Perpindahan JF ke JF PBJ ── */}
            <motion.section className={styles.formasiSection} variants={FORMASI_SECTION_VARIANTS}>
              <div className={styles.formasiSectionHead}>
                <div className={styles.formasiSectionIcon}>
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h3 className={styles.formasiSectionTitle}>Proses Perpindahan JF ke JF PBJ</h3>
                  <p className={styles.formasiSectionDesc}>
                    Jumlah pengajuan perpindahan per jenjang. Klik baris untuk melihat rincian per satuan kerja.
                  </p>
                </div>
              </div>

              <div className={styles.formasiCard}>
                <div style={{ overflowX: 'auto' }}>
                  <table className={`${styles.formasiTable} ${styles.formasiTableAccordion}`}>
                    <thead>
                      <tr>
                        <th>Jenjang JF</th>
                        <th className={styles.formasiColCenter}>Jumlah Pengajuan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perpindahanJfSummary.map((row, i) => {
                        const isSelected = selectedJenjangPerpindahan === row.jenjang;
                        const clickable = row.jumlahPengajuan > 0;
                        return (
                          <React.Fragment key={row.jenjang}>
                            <tr
                              onClick={() => clickable && setSelectedJenjangPerpindahan(isSelected ? null : row.jenjang)}
                              className={[
                                styles.formasiRowAnim,
                                clickable ? styles.formasiRowClickable : '',
                                isSelected ? styles.formasiRowSelected : '',
                              ].filter(Boolean).join(' ')}
                              style={{ animationDelay: `${i * 35}ms` }}
                            >
                              <td className={styles.formasiRowName}>
                                <span className={styles.formasiRowLabel}>
                                  {clickable && (
                                    <motion.span
                                      className={styles.formasiChevron}
                                      animate={{ rotate: isSelected ? 0 : -90 }}
                                      transition={FORMASI_CHEVRON_TRANSITION}
                                    >
                                      <ChevronDown size={14} />
                                    </motion.span>
                                  )}
                                  {row.jenjang}
                                </span>
                              </td>
                              <td className={`${styles.formasiColCenter} ${styles.formasiMono}`}>{row.jumlahPengajuan}</td>
                            </tr>
                            <tr className={styles.formasiSubRow}>
                              <td colSpan={2} style={{ padding: 0, border: isSelected ? undefined : 'none' }}>
                                <AnimatePresence initial={false}>
                                  {isSelected && (
                                    <motion.div
                                      key="panel"
                                      className={styles.formasiAccordionMotion}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={FORMASI_ACCORDION_TRANSITION}
                                    >
                                      <div className={styles.formasiSubPanel}>
                                        <div className={styles.formasiSubLabel}>
                                          Pengajuan jenjang <strong>{row.jenjang}</strong> per satuan kerja
                                        </div>
                                        {perpindahanJfDetailBySatker.length > 0 ? (
                                          <table className={styles.formasiSubTable}>
                                            <thead>
                                              <tr>
                                                <th>Nama Satuan Kerja</th>
                                                <th className={styles.formasiColCenter}>Jumlah</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {perpindahanJfDetailBySatker.map((s) => (
                                                <tr key={s.satuanKerja}>
                                                  <td>{s.satuanKerja}</td>
                                                  <td className={`${styles.formasiColCenter} ${styles.formasiMono}`}>{s.jumlah}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className={styles.formasiEmpty}>Tidak ada data satuan kerja.</div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className={styles.formasiTotalRow}>
                        <td>Total</td>
                        <td className={styles.formasiColCenter}>{perpindahanJf.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}

        {modalData?.type === 'penugasan' && (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px' }}>Nama / NIP</th>
                  <th style={{ padding: '8px 12px' }}>Unit Kerja</th>
                  <th style={{ padding: '8px 12px' }}>Jenjang</th>
                  <th style={{ padding: '8px 12px' }}>Penugasan</th>
                </tr>
              </thead>
              <tbody>
                {modalData.data.map((row: any, i: number) => {
                  const p = String(row['Penugasan'] || '').toUpperCase();
                  let bg = 'var(--surface-2)';
                  let color = 'var(--text-secondary)';
                  
                  if (p.includes('POKJA')) {
                    bg = 'var(--info-100)'; // blue-100
                    color = 'var(--info-600)'; // blue-800
                  } else if (p.includes('PEJABAT PENGADAAN')) {
                    bg = 'var(--amber-100)'; // orange-100
                    color = 'var(--amber-600)'; // orange-800
                  } else if (p.includes('PPK')) {
                    bg = 'var(--teal-100)'; // green-100
                    color = 'var(--teal-600)'; // green-800
                  } else if (p.trim() !== '') {
                    bg = 'var(--purple-100)'; // purple-100
                    color = 'var(--purple-600)'; // purple-800
                  }

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 500 }}>{row['Nama']}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{row['NIP']}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>{row['Unit Kerja']}</td>
                      <td style={{ padding: '8px 12px' }}>{row['Jenjang']}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 12, 
                          fontSize: 11,
                          fontWeight: 500,
                          background: bg,
                          color: color
                        }}>
                          {row['Penugasan'] || 'Belum ditugaskan'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {modalData?.type === 'renaksi' && (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px' }}>Tahun</th>
                  <th style={{ padding: '8px 12px' }}>Pelaku Pengadaan</th>
                  <th style={{ padding: '8px 12px' }}>Renaksi</th>
                  <th style={{ padding: '8px 12px' }}>Status Validasi</th>
                </tr>
              </thead>
              <tbody>
                {modalData.data.map((row: any, i: number) => {
                  const pelaku = String(row['Pelaku Pengadaan'] || '').toUpperCase();
                  const renaksiVal = String(row['Renaksi'] || '').toUpperCase();
                  
                  let ukLevel = 0;
                  const match = renaksiVal.match(/UK\s*(\d+)/);
                  if (match) ukLevel = parseInt(match[1], 10);
                  
                  let isValid = false;
                  let reason = 'Belum ada UK / Invalid';
                  
                  if (ukLevel > 0) {
                    if (pelaku.includes('PPK')) {
                      if (ukLevel >= 2) {
                        isValid = true;
                        reason = 'Lulus (Memenuhi min. UK 2)';
                      } else {
                        reason = 'Gagal (Butuh min. UK 2)';
                      }
                    } else if (pelaku.includes('JF PPBJ') || pelaku.includes('PERSONEL LAINNYA')) {
                      const isJF = pelaku.includes('JF PPBJ');
                      const isLainnya = pelaku.includes('PERSONEL LAINNYA');
                      
                      if (isJF && ukLevel >= 4) {
                        isValid = true;
                        reason = 'Lulus (Memenuhi min. UK 4)';
                      } else if (!isJF && isLainnya && ukLevel >= 2) {
                        isValid = true;
                        reason = 'Lulus (Memenuhi min. UK 2)';
                      } else if (isJF && ukLevel < 4) {
                        reason = 'Gagal (JF butuh min. UK 4)';
                      } else if (isLainnya && ukLevel < 2) {
                        reason = 'Gagal (Non-JF butuh min. UK 2)';
                      }
                    }
                  }

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>{row['Tahun']}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row['Pelaku Pengadaan']}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: 'var(--purple-100)', color: 'var(--purple-600)' 
                        }}>
                          {row['Renaksi'] || 'Kosong'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ 
                            width: 'fit-content', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: isValid ? 'var(--teal-100)' : 'var(--red-100)', color: isValid ? 'var(--teal-600)' : 'var(--red-600)'
                          }}>
                            {isValid ? '✅ Memenuhi Syarat' : '❌ Tidak Memenuhi'}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{reason}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Informasi Referensi UK */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                Referensi Ukuran Keberhasilan (UK)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--surface-2)', padding: '10px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    PPK
                  </div>
                  <ul style={{ padding: '12px 16px 12px 32px', margin: 0, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <li><strong>UK 1:</strong> Tersusunnya Kebutuhan PPK Bersertifikat Kompetensi</li>
                    <li><strong>UK 2:</strong> Tersusunnya Rencana Pemenuhan PPK Bersertifikat Kompetensi Tipe A/B/C</li>
                    <li><strong>UK 3:</strong> Terlaksananya Pemenuhan PPK Bersertifikat Kompetensi Tipe A/B/C</li>
                    <li><strong>UK 4:</strong> Tersedianya Laporan Hasil Pemenuhan PPK Bersertifikat Kompetensi</li>
                  </ul>
                </div>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--surface-2)', padding: '10px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    Pengelola PBJ / JF
                  </div>
                  <ul style={{ padding: '12px 16px 12px 32px', margin: 0, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <li><strong>UK 1:</strong> Tersusunnya Kebutuhan Pengelola PBJ</li>
                    <li><strong>UK 2:</strong> Tersampaikannya Hasil Penyusunan Kebutuhan Pengelola PBJ</li>
                    <li><strong>UK 3:</strong> Tersampaikannya Permohonan Penetapan Kebutuhan Pengelola PBJ</li>
                    <li><strong>UK 4:</strong> Tersusunnya Rencana Pemenuhan Pengelola PBJ</li>
                    <li><strong>UK 5:</strong> Terlaksananya Pemenuhan Pengelola PBJ melalui Pengangkatan Pertama</li>
                    <li><strong>UK 6:</strong> Terlaksananya Pemenuhan Pengelola PBJ melalui Perpindahan dari Jabatan Lain</li>
                    <li><strong>UK 7:</strong> Terlaksananya Pemenuhan Pengelola PBJ melalui Penyesuaian/Inpassing</li>
                    <li><strong>UK 8:</strong> Terlaksananya Pemenuhan Pengelola PBJ melalui Penyetaraan Jabatan Administrasi ke dalam Jabatan Fungsional</li>
                    <li><strong>UK 9:</strong> Tersedianya Laporan Hasil Pengangkatan Pengelola PBJ</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {modalData?.type === 'spi' && modalData.data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
            {/* Header / Gauge Section */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', background: 'var(--surface-2)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ 
                position: 'relative', width: 140, height: 110, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0
              }}>
                <svg viewBox="0 0 100 50" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--danger-500, #ef4444)" strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - (modalData.data.indeks / 100))} />
                </svg>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: -10 }}>{modalData.data.indeks}</div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'var(--text-primary)' }}>Indeks Kementerian Ketenagakerjaan</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Merupakan rerata Indeks Integritas dari Kementerian Ketenagakerjaan di Indonesia.<br/>
                  Indeks Integritas Pemerintah Daerah {modalData.data.instansiPemerintahDaerah} dari total {modalData.data.totalInstansiPemerintahDaerah} instansi.<br/>
                  Indeks Integritas Kementerian dan Lembaga {modalData.data.instansiKL} dari total {modalData.data.totalInstansiKL} instansi.
                </p>
              </div>
            </div>

            {/* Detail Section */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>Detail Skor Hasil Survei Penilaian Integritas - Tahun {modalData.data.tahun}</h3>
              </div>
              
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', overflowX: 'auto' }}>
                {[...Object.keys(modalData.data.categories), 'Perhitungan'].map(cat => {
                  const isActive = spiTab === cat;
                  const catData = modalData.data.categories[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setSpiTab(cat as any)}
                      style={{
                        flex: 1, padding: '12px 8px', border: 'none', background: isActive ? '#fff' : 'transparent',
                        borderBottom: isActive ? '2px solid var(--danger-500, #ef4444)' : '2px solid transparent',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        color: isActive ? 'var(--danger-600, #b91c1c)' : 'var(--text-secondary)', transition: 'all 0.2s', minWidth: 100
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                      {catData && catData.score !== null && (
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{catData.score}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* List / Content */}
              <div style={{ padding: 0, background: 'var(--surface)' }}>
                {spiTab !== 'Perhitungan' ? (
                  modalData.data.categories[spiTab].dimensions.map((dim: any, i: number) => (
                    <div key={i} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '12px 24px', borderBottom: '1px solid var(--border)'
                    }}>
                      <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{dim.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{dim.value}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 24px', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Perhitungannya:</div>
                    <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, marginBottom: 20 }}>
                      (76,59 &times; 0,305) + (88,10 &times; 0,328) + (58,37 &times; 0,367) = 73,67854
                    </div>
                    
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Kemudian dikurangi faktor koreksi:</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '8px 0', textAlign: 'left', color: 'var(--text-primary)' }}>Faktor koreksi</th>
                          <th style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-primary)' }}>Pengurangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 0' }}>Pelaksanaan SPI</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>4,49</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 0' }}>Fakta Korupsi</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>sekitar 3,07</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '12px 0', fontWeight: 700, color: 'var(--text-primary)' }}>Total faktor koreksi</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>7,56</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                      Angka <strong>Fakta Korupsi sekitar 3,07</strong> merupakan hasil rekonstruksi karena bagian tersebut belum terlihat pada tangkapan layar:
                      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8, fontFamily: 'monospace', marginTop: 8, textAlign: 'center' }}>
                        73,68 - 66,12 = 7,56<br/>
                        7,56 - 4,49 = 3,07
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Sehingga nilai akhirnya:</div>
                    <div style={{ 
                      padding: '12px 20px', border: '1px solid #0f172a', display: 'inline-block', 
                      borderRadius: 4, fontFamily: 'monospace', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' 
                    }}>
                      73,68 - 4,49 - 3,07 = 66,12
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

// ── Kartu Komponen A–D ──
function ComponentCard({
  comp,
  active,
  onSelect,
}: {
  comp: ItkpComponentModel;
  active: boolean;
  onSelect: () => void;
}) {
  const barPct = Math.max(0, Math.min(comp.percentage, 100));
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`${styles.compCard} ${styles[`comp${comp.code}`]} ${active ? styles.compCardActive : ''}`}
    >
      <div className={styles.compTop}>
        <span className={styles.compIcon}>{COMP_ICON[comp.code]}</span>
        <Badge variant={comp.status.variant}>{comp.status.label}</Badge>
      </div>
      <div className={styles.compName}>
        {comp.code}. {comp.name}
      </div>
      <span className={styles.compWeight}>Bobot {comp.weight}%</span>
      <div className={styles.compScoreRow}>
        <span className={styles.compScore}>{fmtDec(comp.score, 2)}</span>
        <span className={styles.compScoreMax}>/ {fmtDec(comp.maxScore, 0)}</span>
      </div>
      <div
        className={styles.compBarTrack}
        role="progressbar"
        aria-valuenow={Math.round(comp.percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Capaian Komponen ${comp.name}`}
      >
        <div className={styles.compBarFill} style={{ width: `${barPct}%` }} />
      </div>
      <div className={styles.compFoot}>
        <span className={styles.compPct}>{fmtPct(comp.percentage)}</span>
        <span className={styles.compDetail}>
          Lihat rincian <ArrowRight size={13} />
        </span>
      </div>
    </button>
  );
}

// ── Kartu Indikator ──
function IndicatorCard({ ind, onDetailClick }: { ind: ItkpIndicatorModel; onDetailClick?: (ind: ItkpIndicatorModel) => void }) {
  const barPct = ind.applicable ? Math.max(0, Math.min(ind.attainment, 100)) : 0;
  return (
    <div className={styles.indCard}>
      <div className={styles.indHead}>
        <div className={styles.indTitle}>
          <span className={styles.indCode}>{ind.code}</span>
          <span className={styles.indName}>{ind.name}</span>
          <button type="button" className={styles.infoBtn} title={ind.formula} aria-label={`Formula ${ind.name}`}>
            <Info size={12} />
          </button>
        </div>
        <Badge variant={ind.status.variant}>{ind.status.label}</Badge>
      </div>

      <div className={styles.indPct}>{ind.capaianLabel}</div>
      <span className={styles.indPctCaption}>Persentase capaian</span>

      <div className={styles.indBarTrack}>
        <div className={`${styles.indBarFill} ${styles[`bar_${ind.status.variant}`]}`} style={{ width: `${barPct}%` }} />
      </div>
      {ind.overTarget !== null && (
        <span className={styles.overBadge}>
          <ArrowUpRight size={11} /> Melampaui target +{fmtDec(ind.overTarget, 2)}%
        </span>
      )}

      <div className={styles.indScoreRow}>
        <span>Skor</span>
        <span className={styles.indScoreValue}>
          {ind.applicable ? fmtDec(ind.score, 2) : '—'} / {fmtDec(ind.maxScore, ind.maxScore % 1 === 0 ? 0 : 1)}
        </span>
      </div>

      <div className={`${styles.indNote} ${ind.applicable ? '' : styles.indNoteWarn}`}>
        {ind.applicable ? <Info size={11} /> : <TriangleAlert size={11} />}
        <span>{ind.description}</span>
      </div>
      
      {onDetailClick && ind.rawData && (Array.isArray(ind.rawData) ? ind.rawData.length > 0 : true) && (
        <button 
          type="button" 
          onClick={() => onDetailClick(ind)} 
          style={{ 
            marginTop: 'auto', 
            padding: '6px 12px', 
            fontSize: 12, 
            borderRadius: 6, 
            border: '1px solid var(--border)', 
            background: 'var(--surface-2)', 
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          Lihat Detail Data
        </button>
      )}
    </div>
  );
}

// ── Kartu Ringkasan Komponen ──
function ComponentSummaryCard({ comp }: { comp: ItkpComponentModel }) {
  const tercapai = comp.indicators.filter((i) => i.applicable && i.score >= i.maxScore).length;
  const inner = (
    <>
      <span className={styles.summaryHead}>Ringkasan Komponen {comp.code}</span>
      <div className={styles.summaryScoreRow}>
        <span className={styles.summaryScore}>
          {fmtDec(comp.score, 2)}
          <span className={styles.summaryScoreMax}>/ {fmtDec(comp.maxScore, 0)}</span>
        </span>
        <Badge variant={comp.status.variant}>{comp.status.label}</Badge>
      </div>
      <div className={styles.summaryRows}>
        <div className={styles.summaryRow}>
          <span>Bobot</span>
          <span>{comp.weight}%</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Persentase capaian</span>
          <span>{fmtPct(comp.percentage)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Subindikator</span>
          <span>{comp.indicators.length} indikator</span>
        </div>
        {comp.indicators.length > 0 && (
          <div className={styles.summaryRow}>
            <span>Indikator tercapai</span>
            <span>
              {tercapai} dari {comp.indicators.length}
            </span>
          </div>
        )}
      </div>
      {comp.detailHref && (
        <span className={styles.summaryCta}>
          Lihat analisis <ArrowRight size={13} />
        </span>
      )}
    </>
  );

  if (comp.detailHref) {
    return (
      <Link href={comp.detailHref} className={`${styles.summaryCard} ${styles.summaryCardLink}`}>
        {inner}
      </Link>
    );
  }
  return <div className={styles.summaryCard}>{inner}</div>;
}
