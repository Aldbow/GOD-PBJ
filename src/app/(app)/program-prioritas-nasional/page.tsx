import { Metadata } from 'next';
import { ProgramPrioritasNasionalView } from '@/features/prioritas-nasional/components/ProgramPrioritasNasionalView';
import { PageTransition } from '@/components/layout/PageTransition';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Program Prioritas Nasional - Dewa-PBJ',
  description: 'Dashboard insight, filter, dan tabel paket Program Prioritas Nasional (master_data_ro) beserta kecocokannya ke data realisasi Tender/Swakelola SPSE.',
};

export default function ProgramPrioritasNasionalPage() {
  return (
    <PageTransition>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
        <ProgramPrioritasNasionalView />
      </Suspense>
    </PageTransition>
  );
}
