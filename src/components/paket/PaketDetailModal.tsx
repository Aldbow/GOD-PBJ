"use client";

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { RupHistoryTimeline } from './RupHistoryTimeline';
import type { RupHistoryEntry } from '@/lib/paket/rupHistory';
import styles from './PaketDetailModal.module.css';

interface PaketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  historyData: RupHistoryEntry[];
  loadingHistory: boolean;
}

export function PaketDetailModal({ isOpen, onClose, title, children, historyData, loadingHistory }: PaketDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.body}>
        {children}
        <RupHistoryTimeline data={historyData} loading={loadingHistory} />
      </div>
    </Modal>
  );
}
