"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { fmtRupiah } from '@/lib/format';
import { PaketDetailModal } from '@/components/paket/PaketDetailModal';
import { fetchRupHistory, type RupHistoryEntry } from '@/lib/paket/rupHistory';
import {
  fetchPpkNotifikasi,
  hasActionableType,
  realisasiTargetFor,
  ALERT_TYPE_META,
  ALERT_TYPE_ORDER,
  type AlertType,
  type NotifikasiItem,
} from '@/lib/notifikasi/alerts';
import { fetchNotifikasiDetail, type NotifikasiDetail } from '@/lib/notifikasi/detail';
import { NotifikasiDetailBody } from './NotifikasiDetailBody';
import styles from './NotifikasiView.module.css';

type FetchState = 'idle' | 'ready' | 'error';
/** 'semua' dan 'tindakan' adalah saringan lintas jenis; sisanya per AlertType. */
type FilterKey = 'semua' | 'tindakan' | AlertType;

const ANOMALI_TYPES: AlertType[] = ['anomali_tanpa_rup', 'anomali_lebih_pagu'];

/** Konstan supaya RupHistoryTimeline tidak menerima array baru tiap render. */
const EMPTY_HISTORY: RupHistoryEntry[] = [];

/** Formulir klarifikasi paket milik UKPBJ — hanya ditawarkan kepada role PPK,
 * karena merekalah yang bertanggung jawab menjelaskan temuan pada paketnya. */
const KLARIFIKASI_FORM_URL = 'https://forms.gle/sKEvJkYEEjdgBdgf7';

export function NotifikasiView() {
  const session = useSession();
  const [state, setState] = useState<FetchState>('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<NotifikasiItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('tindakan');
  const requestIdRef = useRef(0);

  /** Paket yang sedang dibuka di panel detail; null = panel tertutup. */
  const [selected, setSelected] = useState<NotifikasiItem | null>(null);
  // Hasil dibawa bersama kode RUP asalnya, bukan direset saat paket berganti:
  // dengan begitu "sedang memuat" cukup diturunkan dari perbandingan kode, dan
  // panel tidak pernah sempat menampilkan rincian paket sebelumnya.
  const [detailState, setDetailState] = useState<{ kdRup: string; detail: NotifikasiDetail | null } | null>(null);
  const [historyState, setHistoryState] = useState<{ kdRup: string; entries: RupHistoryEntry[] } | null>(null);

  const ppkName = useMemo(
    () => (session.ppk_name || session.full_name || '').trim(),
    [session.ppk_name, session.full_name]
  );

  const fetchData = useCallback(async () => {
    if (!ppkName) return;
    const requestId = ++requestIdRef.current;
    try {
      const data = await fetchPpkNotifikasi(ppkName);
      if (requestId !== requestIdRef.current) return;
      setRows(data);
      setState('ready');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('[NotifikasiView] gagal memuat notifikasi:', err);
      setState('error');
    }
  }, [ppkName]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (!ppkName) return;
    fetchData();
  }, [ppkName, fetchData]);

  /* Rincian lengkap (kolom JSONB skor + baris realisasi) dan riwayat revisi RUP
     baru diambil saat sebuah kartu dibuka, supaya daftar notifikasi tetap ringan
     untuk PPK dengan ratusan paket. */
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const kdRup = selected.kd_rup;

    fetchNotifikasiDetail(kdRup)
      .catch((err) => {
        console.error('[NotifikasiView] gagal memuat detail paket:', err);
        return null;
      })
      .then((result) => {
        if (!cancelled) setDetailState({ kdRup, detail: result });
      });

    fetchRupHistory(kdRup).then((entries) => {
      if (!cancelled) setHistoryState({ kdRup, entries });
    });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const detail = detailState && detailState.kdRup === selected?.kd_rup ? detailState.detail : null;
  const loadingDetail = selected != null && detailState?.kdRup !== selected.kd_rup;
  const historyData =
    historyState && historyState.kdRup === selected?.kd_rup ? historyState.entries : EMPTY_HISTORY;
  const loadingHistory = selected != null && historyState?.kdRup !== selected.kd_rup;

  const counts = useMemo(() => {
    const byType = {} as Record<AlertType, number>;
    for (const type of ALERT_TYPE_ORDER) byType[type] = 0;
    let tindakan = 0;
    for (const row of rows) {
      for (const type of row.types) byType[type] += 1;
      if (hasActionableType(row)) tindakan += 1;
    }
    return { byType, tindakan, semua: rows.length };
  }, [rows]);

  const anomaliCount = useMemo(
    () => rows.filter((r) => r.types.some((t) => ANOMALI_TYPES.includes(t))).length,
    [rows]
  );

  const paguTindakan = useMemo(
    () => rows.filter(hasActionableType).reduce((sum, r) => sum + (r.pagu ?? 0), 0),
    [rows]
  );

  const visibleRows = useMemo(() => {
    if (filter === 'semua') return rows;
    if (filter === 'tindakan') return rows.filter(hasActionableType);
    return rows.filter((r) => r.types.includes(filter));
  }, [rows, filter]);

  if (!ppkName) {
    return (
      <div className={styles.page}>
        <PageHeader />
        <div className={styles.stateCard}>
          <div className={`${styles.stateIcon} ${styles.warnIcon}`}>
            <AlertTriangle size={28} />
          </div>
          <h2 className={styles.stateTitle}>Profil belum tertaut</h2>
          <p className={styles.stateText}>
            Akun Anda belum tertaut ke nama PPK, sehingga notifikasi paket belum bisa
            ditampilkan. Hubungi administrator UKPBJ untuk melengkapi profil Anda.
          </p>
        </div>
      </div>
    );
  }

  const showLoading = rows.length === 0 && (state === 'idle' || refreshing);

  /** Hanya jenis yang benar-benar ada isinya yang jadi tombol saringan. */
  const activeTypeFilters = ALERT_TYPE_ORDER.filter((type) => counts.byType[type] > 0);

  return (
    <div className={styles.page}>
      <PageHeader
        action={
          <button type="button" className={styles.refreshBtn} onClick={refresh} disabled={refreshing}>
            <RefreshCw size={14} aria-hidden="true" className={refreshing ? styles.spin : undefined} />
            {refreshing ? 'Refresh Data...' : 'Refresh'}
          </button>
        }
      />

      {showLoading ? (
        <div className={styles.stateCard}>
          <Loader2 size={28} className={styles.spin} aria-hidden="true" />
          <p className={styles.stateText}>Memuat notifikasi...</p>
        </div>
      ) : state === 'error' ? (
        <div className={styles.stateCard}>
          <div className={`${styles.stateIcon} ${styles.errorIcon}`}>
            <AlertTriangle size={28} />
          </div>
          <h2 className={styles.stateTitle}>Gagal memuat notifikasi</h2>
          <p className={styles.stateText}>
            Data tidak dapat diambil dari server. Periksa koneksi Anda lalu coba lagi.
          </p>
          <button type="button" className={styles.refreshBtn} onClick={refresh} disabled={refreshing}>
            <RefreshCw size={14} aria-hidden="true" className={refreshing ? styles.spin : undefined} />
            Coba lagi
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.stateCard}>
          <div className={`${styles.stateIcon} ${styles.okIcon}`}>
            <CheckCircle2 size={28} />
          </div>
          <h2 className={styles.stateTitle}>Tidak ada notifikasi</h2>
          <p className={styles.stateText}>
            Belum ada paket di bawah pantauan Anda yang tercatat pada modul Risiko maupun
            Realisasi.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.statRow}>
            <StatCard icon={<Bell size={16} />} label="Total Paket" value={String(counts.semua)} />
            {/* "Perlu Tindakan" adalah gabungan lima jenis (risiko tinggi, dua
                anomali, belum dilaksanakan, kurasi tidak akurat) — kartu di
                sebelahnya adalah rinciannya, jadi angkanya memang tumpang tindih. */}
            <StatCard
              icon={<ShieldAlert size={16} />}
              label="Perlu Tindakan"
              value={String(counts.tindakan)}
              tone="danger"
            />
            <StatCard
              icon={<ShieldAlert size={16} />}
              label="Paket Risiko Tinggi"
              value={String(counts.byType.risiko_tinggi)}
              tone="danger"
            />
            <StatCard
              icon={<ScanSearch size={16} />}
              label="Anomali Realisasi"
              value={String(anomaliCount)}
              tone="danger"
            />
            <StatCard
              icon={<AlertTriangle size={16} />}
              label="Kurasi Tidak Akurat"
              value={String(counts.byType.tidak_akurat)}
              tone="warning"
            />
            <StatCard
              icon={<span aria-hidden="true">Rp</span>}
              label="Pagu Perlu Tindakan"
              value={fmtRupiah(paguTindakan)}
            />
          </div>

          <div className={styles.filters} role="group" aria-label="Saring notifikasi">
            <FilterChip
              label="Perlu Tindakan"
              count={counts.tindakan}
              active={filter === 'tindakan'}
              onClick={() => setFilter('tindakan')}
            />
            <FilterChip
              label="Semua"
              count={counts.semua}
              active={filter === 'semua'}
              onClick={() => setFilter('semua')}
            />
            <span className={styles.filterDivider} aria-hidden="true" />
            {activeTypeFilters.map((type) => (
              <FilterChip
                key={type}
                label={ALERT_TYPE_META[type].label}
                count={counts.byType[type]}
                active={filter === type}
                tone={ALERT_TYPE_META[type].tone}
                onClick={() => setFilter(type)}
              />
            ))}
          </div>

          {visibleRows.length === 0 ? (
            <div className={styles.stateCard}>
              <div className={`${styles.stateIcon} ${styles.okIcon}`}>
                <CheckCircle2 size={28} />
              </div>
              <p className={styles.stateText}>Tidak ada paket pada saringan ini.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {visibleRows.map((row) => (
                  <li key={row.kd_rup}>
                    <div className={styles.card}>
                      <div className={styles.cardMain}>
                        <div className={styles.cardTags}>
                          {row.types.map((type) => (
                            <span
                              key={type}
                              className={`${styles.tag} ${styles[`tone_${ALERT_TYPE_META[type].tone}`]}`}
                            >
                              {ALERT_TYPE_META[type].label}
                            </span>
                          ))}
                        </div>

                        <h3 className={styles.cardTitle}>{row.nama_paket || 'Tanpa Nama'}</h3>

                        <dl className={styles.meta}>
                          <div className={styles.metaItem}>
                            <dt>Kode RUP</dt>
                            <dd className={styles.mono}>{row.kd_rup}</dd>
                          </div>
                          <div className={styles.metaItem}>
                            <dt>Satker</dt>
                            <dd>{row.satker || '-'}</dd>
                          </div>
                          <div className={styles.metaItem}>
                            <dt>Metode</dt>
                            <dd>{row.metode_pengadaan || row.jenis_paket || '-'}</dd>
                          </div>
                          <div className={styles.metaItem}>
                            <dt>Pagu</dt>
                            <dd className={styles.strongValue}>{fmtRupiah(row.pagu ?? 0)}</dd>
                          </div>
                          {row.realisasi != null && (
                            <div className={styles.metaItem}>
                              <dt>Realisasi</dt>
                              <dd className={styles.strongValue}>{fmtRupiah(row.realisasi)}</dd>
                            </div>
                          )}
                        </dl>

                        {row.catatan_kurasi && row.types.includes('tidak_akurat') && (
                          <p className={styles.note}>
                            Catatan kurasi: <span>{row.catatan_kurasi}</span>
                          </p>
                        )}
                      </div>

                      <div className={styles.cardAction}>
                        <span className={styles.cardActionLabel}>Rincian paket</span>
                        {/* Tombol dibentangkan menutupi kartu lewat ::after, bukan
                            membungkusnya: <button> hanya boleh berisi phrasing
                            content, sedangkan kartu memuat <h3> dan <dl>. */}
                        <button
                          type="button"
                          className={styles.cardActionTarget}
                          aria-haspopup="dialog"
                          aria-label={`Lihat detail paket ${row.nama_paket || row.kd_rup}`}
                          onClick={() => setSelected(row)}
                        >
                          Lihat detail
                          <ChevronRight size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
              ))}
            </ul>
          )}
        </>
      )}

      <PaketDetailModal
        isOpen={selected != null}
        onClose={() => setSelected(null)}
        title="Detail Paket"
        historyData={historyData}
        loadingHistory={loadingHistory}
        kdRup={selected?.kd_rup}
        statusKurasi={selected?.status_kurasi ?? undefined}
        catatanKurasi={selected?.catatan_kurasi ?? undefined}
        rekomendasiKurasi={detail?.realisasi?.rekomendasi_kurasi ?? undefined}
        footer={
          selected ? (
            <PanelActions
              row={selected}
              ppkName={ppkName}
              showKlarifikasi={session.role === 'ppk'}
            />
          ) : undefined
        }
      >
        {selected && (
          <NotifikasiDetailBody item={selected} detail={detail} loading={loadingDetail} />
        )}
      </PaketDetailModal>
    </div>
  );
}

/**
 * Dua jalan keluar dari panel detail: memeriksa datanya sendiri di halaman
 * Realisasi, atau menjelaskan temuannya lewat formulir klarifikasi. Yang pertama
 * jadi aksi utama karena tetap di dalam aplikasi; yang kedua hanya muncul untuk
 * PPK dan ditandai sebagai tautan keluar.
 *
 * Tautan Realisasi sudah membawa filter PPK dan pencarian kode RUP-nya, jadi
 * paket langsung tersorot di sana. Sebagian metode (mis. Dikecualikan) tidak
 * punya halaman Realisasi sendiri; realisasiTargetFor mengembalikan Risiko
 * Pengadaan sebagai gantinya.
 */
function PanelActions({
  row,
  ppkName,
  showKlarifikasi,
}: {
  row: NotifikasiItem;
  ppkName: string;
  showKlarifikasi: boolean;
}) {
  const target = realisasiTargetFor(row, ppkName);
  return (
    <div className={styles.modalActions}>
      <Link href={target.href} className={styles.modalCta}>
        <span className={styles.modalCtaText}>
          {target.isFallback ? 'Belum ada halaman Realisasi — buka' : 'Buka di'}{' '}
          <strong>{target.label}</strong>
        </span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>

      {showKlarifikasi && (
        <a
          href={KLARIFIKASI_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.modalSecondary}
          aria-label="Ajukan klarifikasi paket — membuka formulir di tab baru"
        >
          Ajukan Klarifikasi
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function PageHeader({ action }: { action?: React.ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <h1 className={styles.title}>Notifikasi</h1>
        <p className={styles.subtitle}>
          Seluruh paket di bawah tanggung jawab Anda beserta hal yang perlu diperhatikan —
          kategori risiko, status pelaksanaan, anomali realisasi, dan hasil kurasi.
        </p>
      </div>
      {action}
    </header>
  );
}

function FilterChip({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
      onClick={onClick}
    >
      {tone && <span className={`${styles.chipDot} ${styles[`dot_${tone}`]}`} aria-hidden="true" />}
      {label}
      <span className={styles.chipCount}>{count}</span>
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'warning' | 'danger';
}) {
  const toneClass = tone === 'warning' ? styles.statWarning : tone === 'danger' ? styles.statDanger : '';
  return (
    <div className={styles.stat}>
      <span className={`${styles.statIcon} ${toneClass}`} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.statBody}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
      </div>
    </div>
  );
}
