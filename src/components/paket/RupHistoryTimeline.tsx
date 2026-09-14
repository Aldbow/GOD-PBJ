"use client";

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import type { RupHistoryEntry } from '@/lib/paket/rupHistory';
import styles from './RupHistoryTimeline.module.css';

interface RupHistoryTimelineProps {
  data: RupHistoryEntry[];
  loading: boolean;
}

export function RupHistoryTimeline({ data, loading }: RupHistoryTimelineProps) {
  return (
    <div className={styles.wrap}>
      <h4 className={styles.heading}>
        Riwayat Kaji Ulang RUP
        {loading && <span className={styles.loading}>Memuat...</span>}
      </h4>

      {!loading && data.length === 0 ? (
        <p className={styles.empty}>Tidak ada riwayat kaji ulang (perubahan) untuk RUP ini.</p>
      ) : (
        <div className={styles.timeline}>
          {data.map((hist, index) => {
            const isLast = index === data.length - 1;
            return (
              <div key={index} className={styles.item}>
                <div className={styles.graphic}>
                  <div className={styles.dot} />
                  {!isLast && <div className={styles.line} />}
                </div>
                <div className={styles.content} style={{ paddingBottom: isLast ? 0 : 20 }}>
                  <div className={styles.card}>
                    <div className={styles.cardHead}>
                      <Badge variant="default">{hist.jenis_revisi}</Badge>
                      <span className={styles.date}>{new Date(hist.tgl_kaji_ulang).toLocaleString('id-ID')}</span>
                    </div>
                    <p className={styles.rupChange}>
                      RUP {hist.kd_rup_lama} ➔ <span className={styles.rupNew}>RUP {hist.kd_rup_baru}</span>
                    </p>
                    {hist.alasan_kajiulang && <p className={styles.reason}>&ldquo;{hist.alasan_kajiulang}&rdquo;</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
