import { getMasterDataPN } from '@/features/prioritas-nasional/api/getMasterDataPN';
import { ProgramList } from '@/features/prioritas-nasional/components/ProgramList';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daftar Program Prioritas Nasional | Dashboard',
  description: 'Daftar dan pemantauan program prioritas nasional beserta capaian anggaran dan fisiknya',
};

// Revalidate occasionally if data changes somewhat frequently, or 0 to fetch fresh on load
export const revalidate = 60; 

export default async function ProgramPrioritasPage() {
  const data = await getMasterDataPN();

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '24px' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <ProgramList initialData={data} />
      </div>
    </div>
  );
}
