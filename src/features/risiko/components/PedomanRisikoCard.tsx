"use client";

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Info, ShieldAlert, Banknote, Clock, Tag, Briefcase, Building } from 'lucide-react';
import styles from './PedomanRisikoCard.module.css';

interface PedomanRow {
  label: string;
  skor: number;
}

interface PedomanBlock {
  code: string;
  title: string;
  maxScore: number;
  formula?: string;
  rows: PedomanRow[];
  catatan?: string;
}

interface PedomanGroup {
  label: string;
  maxScore: number;
  blocks: PedomanBlock[];
  footNote?: string;
}

export interface PedomanComponentDef {
  code: string;
  name: string;
  weight?: number;
  icon: React.ReactNode;
  cssClass: string;
  groups: PedomanGroup[];
  footNote?: string;
}

export const PEDOMAN_RISIKO: PedomanComponentDef[] = [
  {
    code: '1',
    name: 'Aturan Pagu & Waktu',
    icon: <Banknote size={16} />,
    cssClass: styles.compUmum,
    groups: [
      {
        label: 'Nilai Pagu (Berlaku untuk Penyedia & Swakelola)',
        maxScore: 3,
        blocks: [
          {
            code: 'PAGU',
            title: 'Risiko Nilai Pagu',
            maxScore: 3,
            rows: [
              { label: '>= Rp 5 Miliar', skor: 3 },
              { label: 'Rp 1 Miliar - < Rp 5 Miliar', skor: 2 },
              { label: 'Rp 200 Juta - < Rp 1 Miliar', skor: 1 },
              { label: '< Rp 200 Juta', skor: 0 },
            ],
            catatan: 'Paket dengan pagu besar memiliki eksposur risiko finansial yang lebih tinggi.',
          }
        ],
      },
      {
        label: 'Sisa Waktu Pelaksanaan & Kaji Ulang',
        maxScore: 3,
        blocks: [
          {
            code: 'WAKTU',
            title: 'Risiko Keterlambatan Perencanaan',
            maxScore: 3,
            formula: 'Target (Tgl Akhir Pemilihan / Awal Kontrak) dikurangi Hari Ini',
            rows: [
              { label: '< 1 bulan atau target sudah terlewati', skor: 3 },
              { label: '1 s.d. < 2 bulan', skor: 2 },
              { label: '2 s.d. 3 bulan', skor: 1 },
              { label: '> 3 bulan', skor: 0 },
            ],
            catatan: 'Dihitung secara dinamis berdasarkan sisa bulan kalender.',
          },
          {
            code: 'REVISI',
            title: 'Risiko Revisi Berulang',
            maxScore: 3,
            formula: 'Jumlah riwayat perubahan Kode RUP',
            rows: [
              { label: 'Revisi >= 3 kali', skor: 3 },
              { label: 'Revisi 2 kali', skor: 2 },
              { label: 'Revisi 1 kali', skor: 1 },
              { label: 'Tidak pernah direvisi', skor: 0 },
            ],
            catatan: 'Revisi RUP yang berulang mengindikasikan inkonsistensi perencanaan.',
          }
        ]
      }
    ],
  },
  {
    code: '2',
    name: 'Karakteristik Penyedia',
    icon: <Briefcase size={16} />,
    cssClass: styles.compPenyedia,
    groups: [
      {
        label: 'Metode, Jenis, & Sumber Dana',
        maxScore: 3,
        blocks: [
          {
            code: 'METODE',
            title: 'Metode Pemilihan',
            maxScore: 3,
            rows: [
              { label: 'Tender / Seleksi / Tender Cepat / Kontrak Jamak', skor: 3 },
              { label: 'Penunjukan Langsung', skor: 2 },
              { label: 'E-Purchasing', skor: 1 },
              { label: 'Pengadaan Langsung / Dikecualikan', skor: 0 },
            ],
          },
          {
            code: 'JENIS',
            title: 'Jenis Pengadaan',
            maxScore: 3,
            rows: [
              { label: 'Pekerjaan Konstruksi', skor: 3 },
              { label: 'Jasa Konsultansi', skor: 2 },
              { label: 'Jasa Lainnya / Kombinasi Barang & Jasa', skor: 1 },
              { label: 'Barang', skor: 0 },
            ],
            catatan: 'Jika paket terdiri atas lebih dari satu jenis (Kombinasi), skor tertinggi akan diambil.',
          },
          {
            code: 'DANA',
            title: 'Sumber Dana',
            maxScore: 3,
            rows: [
              { label: 'Pinjaman Luar Negeri (PHLN)', skor: 3 },
              { label: 'Pinjaman Dalam Negeri', skor: 2 },
              { label: 'PNBP', skor: 1 },
              { label: 'Rupiah Murni / APBD', skor: 0 },
            ],
            catatan: 'Jika paket multi-sumber dana, skor tertinggi akan diambil.',
          }
        ],
      }
    ]
  },
  {
    code: '3',
    name: 'Karakteristik Swakelola',
    icon: <Building size={16} />,
    cssClass: styles.compSwakelola,
    groups: [
      {
        label: 'Tipe Swakelola',
        maxScore: 3,
        blocks: [
          {
            code: 'TIPE',
            title: 'Risiko Tipe Swakelola',
            maxScore: 3,
            rows: [
              { label: 'Tipe III & IV', skor: 3 },
              { label: 'Tipe II', skor: 2 },
              { label: 'Tipe I', skor: 1 },
            ],
            catatan: 'Swakelola Tipe III/IV memiliki risiko hukum dan pengawasan eksternal lebih tinggi dibandingkan Tipe I.',
          }
        ]
      }
    ]
  },
  {
    code: '4',
    name: 'Konversi Skor Keseluruhan',
    icon: <ShieldAlert size={16} />,
    cssClass: styles.compKategori,
    groups: [
      {
        label: 'Kategori Risiko Akhir Paket (Maks. Total Keseluruhan)',
        maxScore: 0,
        blocks: [
          {
            code: 'KAT-P',
            title: 'Kategori Penyedia',
            maxScore: 18,
            rows: [
              { label: 'TINGGI (Total Skor > 12)', skor: 3 },
              { label: 'SEDANG (Total Skor 7 - 12)', skor: 2 },
              { label: 'RENDAH (Total Skor <= 6)', skor: 1 },
            ],
            formula: 'Total Skor = Pagu + Waktu + Revisi + Metode + Jenis + Dana',
          },
          {
            code: 'KAT-S',
            title: 'Kategori Swakelola',
            maxScore: 12,
            rows: [
              { label: 'TINGGI (Total Skor > 8)', skor: 3 },
              { label: 'SEDANG (Total Skor 5 - 8)', skor: 2 },
              { label: 'RENDAH (Total Skor <= 4)', skor: 1 },
            ],
            formula: 'Total Skor = Pagu + Waktu + Revisi + Tipe',
          }
        ]
      }
    ]
  }
];

export function PedomanComponentContent({ comp }: { comp: PedomanComponentDef }) {
  const allBlocks = comp.groups.flatMap((g) => 
    g.blocks.map((b) => ({ ...b, groupLabel: g.label, groupFootNote: g.footNote }))
  );

  return (
    <div className={styles.compContent}>
      <div className={styles.blocksGrid}>
        {allBlocks.map((block) => (
          <div key={block.code} className={styles.blockCard}>
            {block.groupLabel && <div className={styles.blockCardEyebrow}>{block.groupLabel}</div>}
            
            <div className={styles.blockHeader}>
              <div className={styles.blockTitle}>
                {block.code}. {block.title}
              </div>
              {block.maxScore > 0 && (
                <div className={styles.blockScore}>Max: {block.maxScore}</div>
              )}
            </div>
            
            {block.formula && (
              <div className={styles.formulaBox}>{block.formula}</div>
            )}
            
            <table className={styles.rowTable}>
              <tbody>
                {block.rows.map((r, ri) => (
                  <tr key={ri}>
                    <td>{r.label}</td>
                    <td className={styles.rowSkor}>{r.skor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {block.catatan && (
              <div className={styles.catatan}>
                <Info size={14} className={styles.catatanIcon} />
                <span>{block.catatan}</span>
              </div>
            )}

            {block.groupFootNote && (
              <div className={styles.footNote}>* {block.groupFootNote}</div>
            )}
          </div>
        ))}
      </div>
      
      {comp.footNote && (
        <div className={styles.footNote}>* {comp.footNote}</div>
      )}
    </div>
  );
}

export function PedomanRisikoCard() {
  const [openCode, setOpenCode] = useState<string | null>(null);
  const activeComp = PEDOMAN_RISIKO.find((c) => c.code === openCode);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <div className={styles.headerIcon}>
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className={styles.title}>Pedoman Penilaian Risiko Pengadaan</h3>
            <p className={styles.subtitle}>
              Rincian bobot skor (1-3) untuk masing-masing parameter penyebab risiko, 
              serta perhitungan penetapan Kategori Risiko Keseluruhan.
            </p>
          </div>
        </div>
      </div>
      
      <div className={styles.compList}>
        {PEDOMAN_RISIKO.map((comp) => {
          const isOpen = openCode === comp.code;
          return (
            <div key={comp.code} className={`${styles.compBlock} ${comp.cssClass} ${isOpen ? styles.activeBlock : ''}`}>
              <button 
                className={styles.compToggle} 
                onClick={() => setOpenCode(isOpen ? null : comp.code)}
                aria-expanded={isOpen}
              >
                <div className={styles.compInfo}>
                  <span className={styles.compName}>{comp.name}</span>
                </div>
                <div className={styles.toggleIcon}>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {activeComp && (
        <div className={`${styles.activePanel} ${activeComp.cssClass}`}>
          <PedomanComponentContent comp={activeComp} />
        </div>
      )}
    </div>
  );
}
