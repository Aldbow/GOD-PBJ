"use client";

import React, { useEffect, useState } from 'react';
import { Package } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { motion } from 'framer-motion';

export function PaketDetail({ id }: { id: string }) {
  const [data, setData] = useState<Package & { satkerName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/paket?id=${id}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 24, width: '60%', background: 'var(--bg-page)', borderRadius: 4 }} />
        <div style={{ height: 16, width: '40%', background: 'var(--bg-page)', borderRadius: 4 }} />
        <div style={{ height: 100, width: '100%', background: 'var(--bg-page)', borderRadius: 8, marginTop: 20 }} />
      </div>
    );
  }

  if (!data) return <p>Data tidak ditemukan.</p>;

  const fmtRupiah = (m: number) => 'Rp ' + m.toFixed(2).replace('.', ',') + ' M';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Badge variant={data.risiko}>Risiko {data.risiko}</Badge>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>ID: {data.id}</span>
      </div>

      <h3 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-primary)' }}>{data.nama}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        Satker: {data.satkerName} · PIC: {data.pic}
      </p>

      {/* Grid Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28, background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
        <div>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Nilai Pagu</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>{fmtRupiah(data.nilai)}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Realisasi Saat Ini</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>{data.realisasi}%</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Status SPSE</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{data.spse}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Kesesuaian SIRUP</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: data.sirup ? 'var(--teal-600)' : 'var(--red-600)' }}>
            {data.sirup ? '✓ Sesuai' : '✗ Tidak Sesuai'}
          </span>
        </div>
      </div>

      {/* Deskripsi */}
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Deskripsi Proyek</h4>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {data.deskripsi || 'Tidak ada deskripsi.'}
        </p>
      </div>

      {/* Alasan Risiko */}
      {data.alasanRisiko && (
        <div style={{ marginBottom: 28, padding: 16, borderRadius: 'var(--radius-md)', background: data.risiko === 'tinggi' ? 'var(--red-100)' : data.risiko === 'sedang' ? 'var(--amber-100)' : 'var(--teal-100)' }}>
          <h4 style={{ fontSize: 13, margin: '0 0 6px', color: data.risiko === 'tinggi' ? 'var(--red-600)' : data.risiko === 'sedang' ? 'var(--amber-600)' : 'var(--teal-600)' }}>
            Catatan Risiko
          </h4>
          <p style={{ fontSize: 13, color: data.risiko === 'tinggi' ? 'var(--red-600)' : data.risiko === 'sedang' ? 'var(--amber-600)' : 'var(--teal-600)', margin: 0, lineHeight: 1.5 }}>
            {data.alasanRisiko}
          </p>
        </div>
      )}

      {/* Timeline */}
      {data.timeline && (
        <div>
          <h4 style={{ fontSize: 14, margin: '0 0 16px', color: 'var(--text-primary)' }}>Jadwal / Timeline Pengadaan</h4>
          <div style={{ position: 'relative', paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.timeline.map((item, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -17, top: 4, width: 8, height: 8, borderRadius: '50%', background: idx === data.timeline!.length - 1 ? 'var(--info-600)' : 'var(--border)' }} />
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 2px', fontFamily: 'var(--font-mono)' }}>{item.date}</p>
                <p style={{ fontSize: 13, color: idx === data.timeline!.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', margin: 0, fontWeight: idx === data.timeline!.length - 1 ? 500 : 400 }}>
                  {item.event}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </motion.div>
  );
}
