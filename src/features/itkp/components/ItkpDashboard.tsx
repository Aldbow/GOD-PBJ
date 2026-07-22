"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { RefreshCw, CalendarDays, Clock3, Landmark, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatCard, type StatTone } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { computeItkpA, type ItkpAInput, type ItkpAResult } from '@/lib/itkp/calcA';
import { computeItkpBCD } from '@/lib/itkp/calcBCD';
import { getDummyBCDForUnit } from '@/lib/itkp/dummyBCD';
import { fetchItkpAData, type ItkpAUnit } from '@/lib/itkp/fetchA';
import { fmtDec } from '@/lib/format';
import styles from './ItkpDashboard.module.css';

const KEMENTERIAN_LABEL = 'Kementerian (Total)';
const TAHUN = 2026;

function predikat(pct: number): { label: string; tone: StatTone } {
  if (pct >= 80) return { label: 'Sangat Baik', tone: 'good' };
  if (pct >= 65) return { label: 'Baik', tone: 'good' };
  if (pct >= 50) return { label: 'Cukup Baik', tone: 'warn' };
  return { label: 'Kurang', tone: 'danger' };
}

function scoreHint(value: number, max: number) {
  const p = predikat((value / max) * 100);
  return <Badge variant={p.tone === 'good' ? 'rendah' : p.tone === 'warn' ? 'sedang' : 'tinggi'}>{p.label}</Badge>;
}

function totalRealisasiKementerian(input: ItkpAInput): number {
  return (
    input.realisasiETendering +
    input.realisasiEPurchasing +
    input.realisasiPLTransaksional +
    input.realisasiPnLTransaksional +
    input.pencatatanNonTender +
    input.pencatatanSwakelola
  );
}

interface BCDSummary {
  nilaiB: number;
  nilaiC: number;
  nilaiD: number;
  total: number;
}

export function ItkpDashboard() {
  const [units, setUnits] = useState<ItkpAUnit[]>([]);
  const [kementerian, setKementerian] = useState<ItkpAInput | null>(null);
  const [unidentified, setUnidentified] = useState<{ value: number; rows: number }>({ value: 0, rows: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchItkpAData();
      setUnits(result.units);
      setKementerian(result.kementerian);
      setUnidentified({ value: result.unidentifiedValue, rows: result.unidentifiedRows });
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

  const unitOptions = useMemo(() => units.map((u) => u.name), [units]);

  const unitRows = useMemo(
    () => units.map((u) => ({ name: u.name, result: computeItkpA(u.input) })),
    [units]
  );

  const averagesRow = useMemo(() => {
    if (unitRows.length === 0) return null;
    const n = unitRows.length;
    const avgAt = (i: number) => unitRows.reduce((s, u) => s + u.result.rows[i].skor, 0) / n;
    const avgTotal = unitRows.reduce((s, u) => s + u.result.total, 0) / n;
    return { perComponent: unitRows[0].result.rows.map((_, i) => avgAt(i)), total: avgTotal };
  }, [unitRows]);

  const currentAInput = useMemo<ItkpAInput | null>(() => {
    if (!selectedUnit) return kementerian;
    return units.find((u) => u.name === selectedUnit)?.input ?? kementerian;
  }, [selectedUnit, units, kementerian]);

  const resultA: ItkpAResult | null = useMemo(
    () => (currentAInput ? computeItkpA(currentAInput) : null),
    [currentAInput]
  );

  const resultBCD: BCDSummary = useMemo(() => {
    if (selectedUnit) {
      const full = computeItkpBCD(getDummyBCDForUnit(selectedUnit));
      return { nilaiB: full.nilaiB, nilaiC: full.nilaiC, nilaiD: full.nilaiD, total: full.total };
    }
    if (units.length === 0) return { nilaiB: 0, nilaiC: 0, nilaiD: 0, total: 0 };
    const perUnit = units.map((u) => computeItkpBCD(getDummyBCDForUnit(u.name)));
    const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
    const nilaiB = avg(perUnit.map((r) => r.nilaiB));
    const nilaiC = avg(perUnit.map((r) => r.nilaiC));
    const nilaiD = avg(perUnit.map((r) => r.nilaiD));
    return { nilaiB, nilaiC, nilaiD, total: Math.round((nilaiB + nilaiC + nilaiD) * 10) / 10 };
  }, [selectedUnit, units]);

  const totalA = resultA?.total ?? 0;
  const totalItkp = totalA + resultBCD.total;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Landmark size={22} />
          </div>
          <div>
            <h2 className={styles.headerTitle}>Dashboard Penilaian ITKP</h2>
            <p className={styles.headerSub}>Kementerian Ketenagakerjaan</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerMeta}>
            <CalendarDays size={14} />
            <span>Tahun {TAHUN}</span>
          </div>
          <div className={styles.headerMeta}>
            <Clock3 size={14} />
            <span>
              {lastUpdate
                ? `Last update ${lastUpdate.toLocaleDateString('id-ID')} ${lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                : 'Memuat...'}
            </span>
          </div>
          <button type="button" className={styles.refreshBtn} onClick={load} disabled={loading} aria-label="Muat ulang data">
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {error && <ErrorBox className={styles.sectionSpacer}>{error}</ErrorBox>}

      <div className={styles.dummyBanner}>
        Indikator <strong>A</strong> memakai data live dari Supabase. Indikator <strong>B, C, D</strong> masih memakai{' '}
        <strong>data contoh (dummy)</strong> — belum tersambung ke sumber data resmi.
        {unidentified.rows > 0 && kementerian && (
          <>
            {' '}
            Sekitar {fmtDec((unidentified.value / totalRealisasiKementerian(kementerian)) * 100)}% nilai realisasi tidak
            dapat diatribusikan ke satker tertentu ({unidentified.rows} baris) — tetap dihitung di Total Kementerian, tapi
            tidak muncul di breakdown per satker.
          </>
        )}
      </div>

      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Tampilkan untuk:</span>
        <SearchableSelect
          value={selectedUnit}
          onChange={setSelectedUnit}
          options={unitOptions}
          placeholder={KEMENTERIAN_LABEL}
          ariaLabel="Pilih satker"
          className={styles.filterSelect}
        />
      </div>

      <div className={styles.summaryGrid}>
        <StatCard
          label={`Nilai Total ITKP${selectedUnit ? ` — ${selectedUnit}` : ''}`}
          value={fmtDec(totalItkp, 1)}
          unit="/ 100"
          tone={predikat((totalItkp / 100) * 100).tone}
          hint={scoreHint(totalItkp, 100)}
        />
        <StatCard
          label="A. Pemanfaatan Sistem"
          value={fmtDec(totalA, 1)}
          unit="/ 30"
          tone={predikat((totalA / 30) * 100).tone}
          hint={scoreHint(totalA, 30)}
        />
        <StatCard
          label="B. Kualifikasi & Kompetensi SDM PBJ"
          value={fmtDec(resultBCD.nilaiB, 1)}
          unit="/ 30"
          tone={predikat((resultBCD.nilaiB / 30) * 100).tone}
          hint={scoreHint(resultBCD.nilaiB, 30)}
        />
        <StatCard
          label="C. Tingkat Kematangan UKPBJ"
          value={fmtDec(resultBCD.nilaiC, 1)}
          unit="/ 30"
          tone={predikat((resultBCD.nilaiC / 30) * 100).tone}
          hint={scoreHint(resultBCD.nilaiC, 30)}
        />
        <StatCard
          label="D. Integritas Pengadaan"
          value={fmtDec(resultBCD.nilaiD, 1)}
          unit="/ 10"
          tone={predikat((resultBCD.nilaiD / 10) * 100).tone}
          hint={scoreHint(resultBCD.nilaiD, 10)}
        />
      </div>

      <div className={styles.bobotBar}>
        <strong>Keterangan Bobot:</strong> A. Pemanfaatan Sistem (30) | B. Kualifikasi &amp; Kompetensi SDM PBJ (30) | C.
        Tingkat Kematangan UKPBJ (30) | D. Integritas Pengadaan (10) — Total Bobot: 100
      </div>

      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Nilai Indikator A (Pemanfaatan Sistem) per Satker</h3>
        <span className={styles.sectionCaption}>Bobot 30 — klik baris untuk melihat rincian satker tersebut di atas</span>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>Memuat data dari Supabase...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>No.</th>
                <th className={`${styles.th} ${styles.thSatker}`}>Satker</th>
                {unitRows[0]?.result.rows.map((row, i) => (
                  <th key={row.key} className={`${styles.th} ${styles.thNum}`}>
                    A{i + 1}
                    <span className={styles.thSub}>{row.label}</span>
                    <span className={styles.thSub}>(Maks. {fmtDec(row.skorMax, 1)})</span>
                  </th>
                ))}
                <th className={`${styles.th} ${styles.thNum}`}>Total A (Maks. 30)</th>
              </tr>
            </thead>
            <tbody>
              {unitRows.map((u, idx) => (
                <tr
                  key={u.name}
                  className={`${styles.rowClickable} ${selectedUnit === u.name ? styles.rowActive : ''}`}
                  onClick={() => setSelectedUnit(u.name === selectedUnit ? '' : u.name)}
                >
                  <td className={styles.td}>{idx + 1}</td>
                  <td className={`${styles.td} ${styles.tdSatker}`}>{u.name}</td>
                  {u.result.rows.map((row) => (
                    <td key={row.key} className={`${styles.td} ${styles.tdNum}`}>
                      {fmtDec(row.skor, 1)}
                    </td>
                  ))}
                  <td className={`${styles.td} ${styles.tdNum} ${styles.tdTotal}`}>{fmtDec(u.result.total, 1)}</td>
                </tr>
              ))}
            </tbody>
            {averagesRow && (
              <tfoot>
                <tr className={styles.rowAverage}>
                  <td className={styles.td} colSpan={2}>
                    Rata-rata
                  </td>
                  {averagesRow.perComponent.map((v, i) => (
                    <td key={i} className={`${styles.td} ${styles.tdNum}`}>
                      {fmtDec(v, 1)}
                    </td>
                  ))}
                  <td className={`${styles.td} ${styles.tdNum} ${styles.tdTotal}`}>{fmtDec(averagesRow.total, 1)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <p className={styles.footnote}>
        Nilai Indikator A menggunakan 7 komponen dengan total bobot 30 sesuai Kepka LKPP Nomor 74 Tahun 2026. Satker
        dipetakan dari 44 unit <code>data_afirmasi_pdn_perencanaan</code>, dijembatani ke satker realisasi lewat{' '}
        <code>master_data.KPA</code>.
      </p>

      {resultA && (
        <Card style={{ padding: '16px 20px', marginTop: 20 }} className={styles.detailLinkCard}>
          <div>
            <p className={styles.detailLinkTitle}>Rincian per komponen — {selectedUnit || KEMENTERIAN_LABEL}</p>
            <p className={styles.detailLinkCaption}>
              Lihat rumus, persentase, dan status tiap komponen A1–A7 (termasuk komponen yang tidak berlaku untuk
              cakupan ini) di halaman detail.
            </p>
          </div>
          <Link
            href={`/itkp/pemanfaatan-sistem${selectedUnit ? `?satker=${encodeURIComponent(selectedUnit)}` : ''}`}
            className={styles.detailLinkBtn}
          >
            Lihat Detail Pemanfaatan Sistem <ArrowRight size={15} />
          </Link>
        </Card>
      )}
    </motion.div>
  );
}
