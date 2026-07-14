import { Suspense } from 'react';
import { PrioritasNasionalView } from '@/features/prioritas-nasional/components/PrioritasNasionalView';

export default function PrioritasNasionalPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrioritasNasionalView />
    </Suspense>
  );
}
