"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, Info, TriangleAlert, FileText, ArrowLeft, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { Select } from '@/components/ui/Select';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { computeItkpA, type ItkpAInput, type ItkpAResult, type ItkpARowResult } from '@/lib/itkp/calcA';
import { fetchItkpAData, type ItkpAUnit } from '@/lib/itkp/fetchA';
import { fmtDec, fmtPct, fmtRupiahDetail } from '@/lib/format';
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

  const currentInput = useMemo<ItkpAInput>(() => {
    if (selectedUnit) {
      return units.find((u) => u.name === selectedUnit)?.input ?? emptyInput();
    }
    return sumInputs(unitsInEselon1);
  }, [selectedUnit, unitsInEselon1, units]);

  const result = useMemo(() => computeItkpA(currentInput), [currentInput]);

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

      <div className={styles.tableSection}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>
            Nilai ITKP Pemanfaatan Sistem — Seluruh Satuan Kerja
            {selectedEselon1 && selectedEselon1 !== SEMUA_ESELON1 ? ` (${selectedEselon1})` : ''}
          </h3>
          <span className={styles.sectionCaption}>
            {satkerRows.length} satuan kerja, diurutkan berdasarkan skor total tertinggi secara default — klik header
            kolom untuk mengurutkan, klik baris untuk melihat rincian satker tersebut di atas.
          </span>
        </div>

        {loading ? (
          <div className={styles.loadingBox}>Memuat data dari Supabase...</div>
        ) : (
          <div className={styles.tableWrap}>
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
                    <span className={styles.thSub}>(Maks. 30)</span>
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
                    className={`${styles.rowClickable} ${selectedUnit === u.name ? styles.rowActive : ''}`}
                    onClick={() => setSelectedUnit(u.name === selectedUnit ? '' : u.name)}
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
