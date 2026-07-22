"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, Info, TriangleAlert, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Select } from '@/components/ui/Select';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { computeItkpA, buildAnalysisA, type ItkpAInput, type ItkpARowResult } from '@/lib/itkp/calcA';
import { fetchItkpAData, type ItkpAUnit } from '@/lib/itkp/fetchA';
import { fmtDec, fmtRupiahDetail } from '@/lib/format';
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

export function PemanfaatanSistemDetailView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [units, setUnits] = useState<ItkpAUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<string | null>(null);

  const [selectedEselon1, setSelectedEselon1] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>(searchParams.get('satker') || '');

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

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedUnit) params.set('satker', selectedUnit);
    else params.delete('satker');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit]);

  const eselon1Options = useMemo(() => {
    const set = new Set(units.map((u) => u.eselon1));
    return [SEMUA_ESELON1, ...Array.from(set).sort()];
  }, [units]);

  const unitsInEselon1 = useMemo(() => {
    if (!selectedEselon1 || selectedEselon1 === SEMUA_ESELON1) return units;
    return units.filter((u) => u.eselon1 === selectedEselon1);
  }, [units, selectedEselon1]);

  const satkerOptions = useMemo(() => unitsInEselon1.map((u) => u.name), [unitsInEselon1]);

  const scopeLabel = selectedUnit || (selectedEselon1 && selectedEselon1 !== SEMUA_ESELON1 ? selectedEselon1 : KEMENTERIAN_LABEL);

  const currentInput = useMemo<ItkpAInput>(() => {
    if (selectedUnit) {
      return units.find((u) => u.name === selectedUnit)?.input ?? emptyInput();
    }
    return sumInputs(unitsInEselon1);
  }, [selectedUnit, unitsInEselon1, units]);

  const result = useMemo(() => computeItkpA(currentInput), [currentInput]);
  const analysis = useMemo(() => buildAnalysisA(result), [result]);

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Link href="/itkp" className={styles.backLink}>
        <ArrowLeft size={14} /> Kembali ke Dashboard ITKP
      </Link>

      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>Detail Pemanfaatan Sistem</h2>
          <p className={styles.headerSub}>Penilaian Sementara ITKP 2026 — Satuan Kerja Kemnaker</p>
        </div>
      </div>

      {error && <ErrorBox className={styles.sectionSpacer}>{error}</ErrorBox>}

      <div className={styles.filterBar}>
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
        <div className={styles.filterCol}>
          <span className={styles.filterLabel}>Satuan Kerja</span>
          <SearchableSelect
            value={selectedUnit}
            onChange={setSelectedUnit}
            options={satkerOptions}
            placeholder={selectedEselon1 && selectedEselon1 !== SEMUA_ESELON1 ? `Semua di ${selectedEselon1}` : KEMENTERIAN_LABEL}
            ariaLabel="Pilih satuan kerja"
          />
        </div>
        <div className={styles.filterMeta}>
          <CalendarDays size={14} />
          <span>Update data terakhir: {updatedLabel}</span>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.cardsCol}>
          {loading ? (
            <div className={styles.loadingBox}>Memuat data dari Supabase...</div>
          ) : (
            <div className={styles.cardGrid}>
              {result.rows.map((row, i) => (
                <ComponentCard key={row.key} index={i + 1} row={row} />
              ))}
            </div>
          )}
        </div>

        <aside className={styles.summaryCol}>
          <div className={styles.totalBox}>
            <span className={styles.totalLabel}>Total Skor</span>
            <span className={styles.totalValue}>{fmtDec(result.total, 2)}</span>
          </div>
          <div className={styles.subBox}>
            <span className={styles.subLabel}>Skor Max Saat Ini</span>
            <span className={styles.subValue}>{fmtDec(result.totalMaxSaatIni, 2)}</span>
          </div>
          <div className={styles.subBoxMuted}>
            <span className={styles.subLabel}>Skor Max Kepka</span>
            <span className={styles.subValue}>{fmtDec(result.totalMaxKepka, 0)}</span>
          </div>
          <div className={styles.noteBox}>
            <FileText size={14} />
            <span>
              Jika ada indikator yang tidak tersedia/tidak berlaku, skor maksimum saat ini menyesuaikan parameter yang
              berlaku untuk cakupan ini.
            </span>
          </div>
        </aside>
      </div>

      <div className={styles.footerRow}>
        <div className={styles.keteranganBox}>
          <FileText size={14} />
          <div>
            <strong>Keterangan</strong>
            <p>
              {analysis.tidakBerlaku.length > 0
                ? analysis.tidakBerlaku.join(' ')
                : 'Seluruh 7 komponen berlaku untuk cakupan ini.'}{' '}
              Indikator yang tidak tersedia/tidak berlaku tidak dihitung sebagai parameter 100%.
            </p>
          </div>
        </div>
        <div className={styles.tanggalBox}>
          <CalendarDays size={14} />
          <div>
            <strong>Tanggal pembaruan data</strong>
            <p>{updatedLabel}</p>
          </div>
        </div>
      </div>

      <div className={styles.analysisSection}>
        <h3 className={styles.sectionTitle}>Analisis — {scopeLabel}</h3>
        <div className={styles.analysisGrid}>
          <div className={styles.analysisCard}>
            <p className={styles.analysisCardTitle}>Komponen maksimal</p>
            {analysis.maksimal.length > 0 ? (
              <ul>
                {analysis.maksimal.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyNote}>Belum ada komponen yang mencapai skor maksimal.</p>
            )}
          </div>
          <div className={styles.analysisCard}>
            <p className={styles.analysisCardTitle}>Komponen masih rendah</p>
            {analysis.kehilanganNilai.length > 0 ? (
              <ul>
                {analysis.kehilanganNilai.map((t, i) => (
                  <li key={i}>
                    <strong>{t.label}</strong> — {t.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyNote}>Seluruh komponen yang berlaku sudah maksimal.</p>
            )}
          </div>
          <div className={styles.analysisCard}>
            <p className={styles.analysisCardTitle}>Risiko bila tidak diperbaiki</p>
            {analysis.risiko.length > 0 ? (
              <ul>
                {analysis.risiko.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyNote}>Tidak ada risiko signifikan saat ini.</p>
            )}
          </div>
          <div className={styles.analysisCard}>
            <p className={styles.analysisCardTitle}>Rekomendasi peningkatan</p>
            {analysis.rekomendasi.length > 0 ? (
              <ul>
                {analysis.rekomendasi.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyNote}>Pertahankan capaian pada periode penilaian berikutnya.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ComponentCard({ index, row }: { index: number; row: ItkpARowResult }) {
  return (
    <div className={styles.compCard}>
      <div className={styles.compHeader}>
        A{index} {row.label}
      </div>
      <div className={styles.compStats}>
        <div className={styles.compStat}>
          <span className={styles.compStatLabel}>Skor Max</span>
          <span className={styles.compStatValue}>{fmtDec(row.skorMax, row.skorMax % 1 === 0 ? 0 : 1)}</span>
        </div>
        <div className={styles.compStat}>
          <span className={styles.compStatLabel}>Persentase</span>
          <span className={styles.compStatValue}>{row.applicable ? row.persentase : '-'}</span>
        </div>
        <div className={styles.compStat}>
          <span className={styles.compStatLabel}>Skor Saat Ini</span>
          <span className={`${styles.compStatValue} ${styles.compStatValueStrong}`}>
            {row.applicable ? fmtDec(row.skor, row.skor % 1 === 0 ? 0 : 1) : '-'}
          </span>
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
        <div className={styles.compDetailFormula}>{row.formula}</div>
      </div>
      <div className={`${styles.compNote} ${row.applicable ? styles.compNoteInfo : styles.compNoteWarn}`}>
        {row.applicable ? <Info size={14} /> : <TriangleAlert size={14} />}
        <span>{row.catatan}</span>
      </div>
    </div>
  );
}
