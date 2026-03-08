import { Suspense } from 'react';
import { CliLoginContent } from './content';
import { LoginSkeleton } from '@/components/ui';

export default function CliLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <CliLoginContent />
    </Suspense>
  );
}
