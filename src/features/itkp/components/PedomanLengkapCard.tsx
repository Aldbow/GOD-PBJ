"use client";

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Info, MonitorSmartphone, Users, Building2, ShieldCheck } from 'lucide-react';
import { computeItkpA, emptyItkpAInput } from '@/lib/itkp/calcA';
import { PENUGASAN_OPTIONS, RENAKSI_OPTIONS, KEMATANGAN_OPTIONS, BAND_FORMASI, BAND_INTEGRITAS, CATATAN_INKONSISTENSI_FORMASI } from '@/lib/itkp/calcBCD';
import { fmtDec } from '@/lib/format';
import styles from './PedomanLengkapCard.module.css';

interface PedomanBlock {
  code: string;
  title: string;
  maxScore: number;
  formula?: string;
  rows: { label: string; skor: number }[];
  catatan?: string;
}

interface PedomanGroup {
  // Kosong = tidak ada sub-judul indikator terpisah (dipakai B/C/D yang tidak
  // punya pengelompokan dua tingkat seperti Komponen A).
  label: string;
  maxScore: number;
  blocks: PedomanBlock[];
  footNote?: string;
}

export interface PedomanComponentDef {
  code: 'A' | 'B' | 'C' | 'D';
  name: string;
  weight: number;
  icon: React.ReactNode;
  groups: PedomanGroup[];
  footNote?: string;
}

// Metadata statis (label/formula/skorMax/rentang) Komponen A diambil langsung
// dari computeItkpA dengan input nol — bukan diketik ulang — supaya pedoman
// ini tidak pernah berbeda dari logika kalkulasi yang sesungguhnya dipakai.
const REF_ROWS_A = computeItkpA(emptyItkpAInput()).rows;

function blockForA(key: string): PedomanBlock {
  const idx = REF_ROWS_A.findIndex((r) => r.key === key);
  const row = REF_ROWS_A[idx];
  return {
    code: `A${idx + 1}`,
    title: row.label,
    maxScore: row.skorMax,
    formula: row.formula,
    rows: row.rentang.map((b) => ({ label: b.label, skor: b.skor })),
  };
}

export const PEDOMAN: PedomanComponentDef[] = [
  {
    code: 'A',
    name: 'Pemanfaatan Sistem Pengadaan',
    weight: 30,
    icon: <MonitorSmartphone size={16} />,
    groups: [
      {
        label: 'Indikator 1 — Rencana Pengadaan',
        maxScore: 10,
        blocks: [
          blockForA('pengumumanRup'),
          blockForA('rupPenyedia'),
          blockForA('rupTenderPurchasing'),
        ],
        footNote: 'Jumlahkan ketiga komponen menjadi Nilai Rencana Pengadaan (maksimal 10).',
      },
      {
        label: 'Indikator 2 — Realisasi Pengadaan',
        maxScore: 20,
        blocks: [
          blockForA('realisasiTenderPurchasing'),
          blockForA('realisasiPL'),
          blockForA('realisasiPnL'),
          blockForA('realisasiDigitalisasi'),
        ],
        footNote: 'Jumlahkan seluruh komponen menjadi Nilai Realisasi Pengadaan (maksimal 20).',
      },
    ],
  },
  {
    code: 'B',
    name: 'Kualifikasi & Kompetensi SDM PBJ',
    weight: 30,
    icon: <Users size={16} />,
    groups: [
      {
        label: '',
        maxScore: 30,
        blocks: [
          {
            code: 'B1',
            title: 'Keterisian Formasi JF PPBJ / Personel Lainnya',
            maxScore: 15,
            formula: 'Persentase Pemenuhan = (Formasi Terisi / Kebutuhan Formasi) × 100%',
            rows: BAND_FORMASI.map((b) => ({ label: b.label, skor: b.skor })),
            catatan: CATATAN_INKONSISTENSI_FORMASI,
          },
          {
            code: 'B2',
            title: 'Penugasan JF PPBJ / Personel Lainnya',
            maxScore: 9,
            rows: PENUGASAN_OPTIONS.map((o) => ({ label: o.label, skor: o.skor })),
          },
          {
            code: 'B3',
            title: 'Penyusunan Rencana Aksi (Renaksi)',
            maxScore: 6,
            rows: RENAKSI_OPTIONS.map((o) => ({ label: o.label, skor: o.skor })),
            catatan:
              'Renaksi JF/Personel Lainnya dianggap terpenuhi apabila telah terverifikasi minimal UK 4 untuk JF PPBJ atau UK 2 untuk Personel Lainnya. Renaksi PPK dianggap terpenuhi apabila telah terverifikasi minimal UK 2.',
          },
        ],
      },
    ],
    footNote: 'Nilai B = Keterisian Formasi + Penugasan + Renaksi (maksimal 30).',
  },
  {
    code: 'C',
    name: 'Tingkat Kematangan UKPBJ',
    weight: 30,
    icon: <Building2 size={16} />,
    groups: [
      {
        label: '',
        maxScore: 30,
        blocks: [
          {
            code: 'C1',
            title: 'Tingkat Kematangan UKPBJ',
            maxScore: 30,
            rows: KEMATANGAN_OPTIONS.map((o) => ({ label: o.label, skor: o.skor })),
            catatan: 'Tidak ada perhitungan persentase — nilai mengikuti level kematangan yang dipilih/diverifikasi.',
          },
        ],
      },
    ],
  },
  {
    code: 'D',
    name: 'Integritas Pengadaan',
    weight: 10,
    icon: <ShieldCheck size={16} />,
    groups: [
      {
        label: '',
        maxScore: 10,
        blocks: [
          {
            code: 'D1',
            title: 'Integritas Pengadaan (SPI)',
            maxScore: 10,
            rows: BAND_INTEGRITAS.map((b) => ({ label: b.label, skor: b.skor })),
            catatan:
              'Gunakan skor SPI KPK. Apabila tahun berjalan belum dilakukan penilaian SPI, gunakan nilai SPI tahun terakhir sebagaimana ketentuan Kepka.',
          },
        ],
      },
    ],
  },
];

export function PedomanComponentDetail({ comp }: { comp: PedomanComponentDef }) {
  return (
    <div className={styles.compBody}>
      {comp.groups.map((group, gi) => (
        <div key={gi} className={styles.group}>
          {group.label && (
            <div className={styles.groupHead}>
              <span>{group.label}</span>
              <span className={styles.groupMax}>Bobot Maks {fmtDec(group.maxScore, 0)}</span>
            </div>
          )}

          <div className={styles.blocksGrid}>
            {group.blocks.map((block) => (
              <div key={block.code} className={styles.indBlock}>
                <div className={styles.indBlockHead}>
                  <span className={styles.indBlockCode}>{block.code}</span>
                  <span className={styles.indBlockTitle}>{block.title}</span>
                  <span className={styles.indBlockMax}>
                    Maks {fmtDec(block.maxScore, block.maxScore % 1 === 0 ? 0 : 1)}
                  </span>
                </div>
                {block.formula && <div className={styles.indFormula}>{block.formula}</div>}
                <div className={styles.indTable}>
                  {block.rows.map((r) => (
                    <div key={r.label} className={styles.indRow}>
                      <span className={styles.indRowLabel}>{r.label}</span>
                      <span className={styles.indRowSkor}>
                        {fmtDec(r.skor, r.skor % 1 === 0 ? 0 : 1)}
                      </span>
                    </div>
                  ))}
                </div>
                {block.catatan && (
                  <div className={styles.indCatatan}>
                    <Info size={12} />
                    <span>{block.catatan}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {group.footNote && <p className={styles.groupFootNote}>{group.footNote}</p>}
        </div>
      ))}

      {comp.footNote && <p className={styles.compFootNote}>{comp.footNote}</p>}
    </div>
  );
}

export function PedomanLengkapCard() {
  const [openCode, setOpenCode] = useState<string | null>(null);

  const activeComp = PEDOMAN.find((c) => c.code === openCode);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <span className={styles.headerIcon}>
            <BookOpen size={18} />
          </span>
          <div>
            <h2 className={styles.title}>Pedoman Lengkap Penilaian ITKP</h2>
            <p className={styles.subtitle}>
              Keputusan Kepala LKPP Nomor 74 Tahun 2026 — formula & rentang nilai tiap komponen (A–D) sesuai regulasi.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.compList}>
        {PEDOMAN.map((comp) => {
          const isOpen = openCode === comp.code;
          return (
            <div
              key={comp.code}
              className={[styles.compBlock, styles[`comp${comp.code}`], isOpen ? styles.activeBlock : ''].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                className={styles.compToggle}
                onClick={() => setOpenCode(isOpen ? null : comp.code)}
                aria-expanded={isOpen}
              >
                <span className={styles.compToggleLeft}>
                  <span className={styles.compToggleIcon}>{comp.icon}</span>
                  <span className={styles.compToggleText}>
                    <strong>
                      {comp.code}. {comp.name}
                    </strong>
                    <span className={styles.compToggleWeight}>Bobot Maks {comp.weight}</span>
                  </span>
                </span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          );
        })}
      </div>

      {activeComp && (
        <div className={`${styles.activePanel} ${styles[`comp${activeComp.code}`]}`}>
          <PedomanComponentDetail comp={activeComp} />
        </div>
      )}
    </section>
  );
}
