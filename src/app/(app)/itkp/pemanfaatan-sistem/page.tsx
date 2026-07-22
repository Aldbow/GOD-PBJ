import { PemanfaatanSistemDetailView } from '@/features/itkp/components/PemanfaatanSistemDetailView';
import { PageTransition } from '@/components/layout/PageTransition';
import { Suspense } from 'react';

export const metadata = {
  title: 'Detail Pemanfaatan Sistem - ITKP - Dewa-PBJ',
  description: 'Rincian Subindikator Pemanfaatan Sistem Pengadaan per satuan kerja sesuai Kepka LKPP Nomor 74 Tahun 2026',
};

export default function PemanfaatanSistemPage() {
  return (
    <PageTransition>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
        <PemanfaatanSistemDetailView />
      </Suspense>
    </PageTransition>
  );
}
