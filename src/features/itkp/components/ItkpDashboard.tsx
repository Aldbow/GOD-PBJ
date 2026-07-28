"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { Modal } from '@/components/ui/Modal';
import { computeItkpA, type ItkpAInput, type ItkpAResult } from '@/lib/itkp/calcA';
import { computeItkpBCD, type ItkpBCDResult } from '@/lib/itkp/calcBCD';
import { fetchItkpBCDData } from '@/lib/itkp/fetchBCD';
import { fetchItkpAData } from '@/lib/itkp/fetchA';
import { fmtDec, fmtPct } from '@/lib/format';
import {
  buildComponents,
  predikatOf,
  PREDIKAT_BANDS,
  type ComponentCode,
  type ItkpComponentModel,
  type ItkpIndicatorModel,
} from '@/lib/itkp/itkpModel';
import { PedomanLengkapCard } from './PedomanLengkapCard';
import styles from './ItkpDashboard.module.css';

const KEMENTERIAN_LABEL = 'Kementerian (Total)';
const TAHUN = 2026;

const COMP_ICON: Record<ComponentCode, React.ReactNode> = {
  A: <MonitorSmartphone size={18} />,
  B: <Users size={18} />,
  C: <Building2 size={18} />,
  D: <ShieldCheck size={18} />,
};

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
      const [resultA, bcdInput] = await Promise.all([
        fetchItkpAData(),
        fetchItkpBCDData(),
      ]);
      setKementerian(resultA.kementerian);
      setBcdResult(computeItkpBCD(bcdInput));
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
          <div className={styles.pedomanPanel}>
            <p className={styles.pedomanIntro}>
              Formula perhitungan tiap indikator Komponen {activeComp.code} (sesuai Kepka penilaian ITKP):
            </p>
            <ul className={styles.pedomanList}>
              {activeComp.indicators.map((ind) => (
                <li key={ind.code}>
                  <span className={styles.pedomanCode}>{ind.code}</span>
                  <span>
                    <strong>{ind.name}.</strong> {ind.formula}
                  </span>
                </li>
              ))}
              {activeComp.indicators.length === 0 && <li>Rincian tersedia saat memilih satu Unit Penilaian.</li>}
            </ul>
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

      {/* ── Pedoman Lengkap: referensi utuh formula & rentang nilai A-D ── */}
      <div className={styles.pedomanSection}>
        <PedomanLengkapCard />
      </div>
      {/* ── Modal Detail ── */}
      <Modal 
        isOpen={!!modalData} 
        onClose={() => setModalData(null)}
        title={
          modalData?.type === 'formasi' ? 'Rincian Keterisian Formasi' : 
          modalData?.type === 'penugasan' ? 'Daftar Penugasan JF PBJ' : 
          modalData?.type === 'renaksi' ? 'Data Pendukung Renaksi' : 
          'Rincian Survei Penilaian Integritas (SPI)'
        }
      >
        {modalData?.type === 'formasi' && (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px' }}>Jenjang</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Kebutuhan</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Eksisting</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Kekurangan</th>
                </tr>
              </thead>
              <tbody>
                {modalData.data.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>{row['Jenjang']}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row['Formasi Kebutuhan']}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row['Formasi Terpenuhi']}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row['Kekurangan']}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                  <td style={{ padding: '8px 12px' }}>Total</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{modalData.data.reduce((s: number, r: any) => s + (Number(r['Formasi Kebutuhan']) || 0), 0)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{modalData.data.reduce((s: number, r: any) => s + (Number(r['Formasi Terpenuhi']) || 0), 0)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{modalData.data.reduce((s: number, r: any) => s + (Number(r['Kekurangan']) || 0), 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {modalData?.type === 'penugasan' && (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px' }}>Nama / NIP</th>
                  <th style={{ padding: '8px 12px' }}>Unit Kerja</th>
                  <th style={{ padding: '8px 12px' }}>Jenjang</th>
                  <th style={{ padding: '8px 12px' }}>Penugasan</th>
                </tr>
              </thead>
              <tbody>
                {modalData.data.map((row: any, i: number) => {
                  const p = String(row['Penugasan'] || '').toUpperCase();
                  let bg = '#f1f5f9';
                  let color = '#475569';
                  
                  if (p.includes('POKJA')) {
                    bg = '#dbeafe'; // blue-100
                    color = '#1e40af'; // blue-800
                  } else if (p.includes('PEJABAT PENGADAAN')) {
                    bg = '#ffedd5'; // orange-100
                    color = '#9a3412'; // orange-800
                  } else if (p.includes('PPK')) {
                    bg = '#dcfce7'; // green-100
                    color = '#166534'; // green-800
                  } else if (p.trim() !== '') {
                    bg = '#f3e8ff'; // purple-100
                    color = '#6b21a8'; // purple-800
                  }

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 500 }}>{row['Nama']}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{row['NIP']}</div>
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
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
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
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px' }}>{row['Tahun']}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row['Pelaku Pengadaan']}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: '#e0e7ff', color: '#3730a3' 
                        }}>
                          {row['Renaksi'] || 'Kosong'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ 
                            width: 'fit-content', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: isValid ? '#dcfce7' : '#fee2e2', color: isValid ? '#166534' : '#991b1b'
                          }}>
                            {isValid ? '✅ Memenuhi Syarat' : '❌ Tidak Memenuhi'}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{reason}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {modalData?.type === 'spi' && modalData.data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
            {/* Header / Gauge Section */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ 
                position: 'relative', width: 140, height: 110, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0
              }}>
                <svg viewBox="0 0 100 50" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - (modalData.data.indeks / 100))} />
                </svg>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: -10 }}>{modalData.data.indeks}</div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#0f172a' }}>Indeks Kementerian Ketenagakerjaan</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  Merupakan rerata Indeks Integritas dari Kementerian Ketenagakerjaan di Indonesia.<br/>
                  Indeks Integritas Pemerintah Daerah {modalData.data.instansiPemerintahDaerah} dari total {modalData.data.totalInstansiPemerintahDaerah} instansi.<br/>
                  Indeks Integritas Kementerian dan Lembaga {modalData.data.instansiKL} dari total {modalData.data.totalInstansiKL} instansi.
                </p>
              </div>
            </div>

            {/* Detail Section */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Detail Skor Hasil Survei Penilaian Integritas - Tahun {modalData.data.tahun}</h3>
              </div>
              
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto' }}>
                {[...Object.keys(modalData.data.categories), 'Perhitungan'].map(cat => {
                  const isActive = spiTab === cat;
                  const catData = modalData.data.categories[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setSpiTab(cat as any)}
                      style={{
                        flex: 1, padding: '12px 8px', border: 'none', background: isActive ? '#fff' : 'transparent',
                        borderBottom: isActive ? '2px solid #ef4444' : '2px solid transparent',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        color: isActive ? '#b91c1c' : '#475569', transition: 'all 0.2s', minWidth: 100
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
              <div style={{ padding: 0, background: '#fff' }}>
                {spiTab !== 'Perhitungan' ? (
                  modalData.data.categories[spiTab].dimensions.map((dim: any, i: number) => (
                    <div key={i} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '12px 24px', borderBottom: '1px solid #f1f5f9'
                    }}>
                      <span style={{ fontSize: 14, color: '#334155' }}>{dim.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{dim.value}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 24px', fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Perhitungannya:</div>
                    <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, marginBottom: 20 }}>
                      (76,59 &times; 0,305) + (88,10 &times; 0,328) + (58,37 &times; 0,367) = 73,67854
                    </div>
                    
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Kemudian dikurangi faktor koreksi:</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <th style={{ padding: '8px 0', textAlign: 'left', color: '#0f172a' }}>Faktor koreksi</th>
                          <th style={{ padding: '8px 0', textAlign: 'right', color: '#0f172a' }}>Pengurangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0' }}>Pelaksanaan SPI</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>4,49</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '8px 0' }}>Fakta Korupsi</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>sekitar 3,07</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '12px 0', fontWeight: 700, color: '#0f172a' }}>Total faktor koreksi</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>7,56</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginBottom: 20, fontSize: 13, color: '#475569' }}>
                      Angka <strong>Fakta Korupsi sekitar 3,07</strong> merupakan hasil rekonstruksi karena bagian tersebut belum terlihat pada tangkapan layar:
                      <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontFamily: 'monospace', marginTop: 8, textAlign: 'center' }}>
                        73,68 - 66,12 = 7,56<br/>
                        7,56 - 4,49 = 3,07
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Sehingga nilai akhirnya:</div>
                    <div style={{ 
                      padding: '12px 20px', border: '1px solid #0f172a', display: 'inline-block', 
                      borderRadius: 4, fontFamily: 'monospace', fontWeight: 600, fontSize: 15, color: '#0f172a' 
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
            marginTop: 12, 
            padding: '6px 12px', 
            fontSize: 12, 
            borderRadius: 6, 
            border: '1px solid #e2e8f0', 
            background: '#f8fafc', 
            color: '#334155',
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
