import { PPKView } from '@/features/ppk/components/PPKView';
import { PageTransition } from '@/components/layout/PageTransition';

export default function PPKPage() {
  return (
    <PageTransition>
      <PPKView />
    </PageTransition>
  );
}
