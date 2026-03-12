import { Suspense } from 'react';
import { A2ALoginContent } from './content';
import { LoginSkeleton } from '@/components/ui';

export default function A2ALoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <A2ALoginContent />
    </Suspense>
  );
}
