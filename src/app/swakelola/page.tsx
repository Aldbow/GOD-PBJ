"use client";

import { SwakelolaView } from '@/features/swakelola/components/SwakelolaView';
import { Suspense } from 'react';

export default function SwakelolaPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '32px' }}>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
        <SwakelolaView />
      </Suspense>
    </main>
  );
}
