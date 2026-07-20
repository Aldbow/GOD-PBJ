import { DrilldownView } from '@/features/satker/components/DrilldownView';
import { PageTransition } from '@/components/layout/PageTransition';

export default function DrilldownPage() {
  return (
    <PageTransition>
      <DrilldownView />
    </PageTransition>
  );
}
