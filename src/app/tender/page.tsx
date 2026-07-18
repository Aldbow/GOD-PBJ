import { Metadata } from 'next';
import { TenderView } from '@/features/tender/components/TenderView';
import { PageTransition } from '@/components/layout/PageTransition';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Realisasi Tender - Dewa-PBJ',
  description: 'Ringkasan Realisasi Tender',
};

export default function TenderPage() {
  return (
    <PageTransition>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
        <TenderView />
      </Suspense>
    </PageTransition>
  );
}
