"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchRupHistory, type RupHistoryEntry } from '@/lib/paket/rupHistory';
import { mapRiskRow } from '@/lib/risiko/mapRow';
import type { RiskDetail } from '@/lib/risiko/types';

/**
 * Modal "detail paket risiko" dipakai di lebih dari satu tempat (halaman Risiko
 * Pengadaan, panel insight Ringkasan) — hook ini menyatukan fetch detail lengkap
 * (termasuk kolom JSONB) + riwayat revisi RUP saat modal dibuka, supaya kedua
 * tempat itu tidak duplikat query/effect yang sama.
 */
export function useRisikoPaketDetail() {
  const [selectedKdRup, setSelectedKdRup] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<RiskDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [historyData, setHistoryData] = useState<RupHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const open = useCallback((kdRup: string) => {
    setSelectedKdRup(kdRup);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !selectedKdRup) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    supabase
      .from('risiko_pengadaan')
      .select('*')
      .eq('kd_rup', selectedKdRup)
      .maybeSingle()
      .then(({ data: raw, error }: { data: any; error: any }) => {
        if (cancelled) return;
        if (error || !raw) {
          setSelectedDetail(null);
        } else {
          setSelectedDetail({
            ...mapRiskRow(raw),
            components: raw.components_json || [],
            revision_chain: raw.revision_chain_json || [],
            transaction_refs: raw.transaction_refs_json || [],
          });
        }
        setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedKdRup]);

  useEffect(() => {
    if (!isOpen || !selectedKdRup) {
      setHistoryData([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    fetchRupHistory(selectedKdRup).then((result) => {
      if (!cancelled) {
        setHistoryData(result);
        setLoadingHistory(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedKdRup]);

  return { isOpen, open, close, selectedDetail, loadingDetail, historyData, loadingHistory };
}
