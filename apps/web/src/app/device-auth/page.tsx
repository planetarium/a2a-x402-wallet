import { Suspense } from 'react';
import { DeviceAuthContent } from './content';
import { LoginSkeleton } from '@/components/ui';

export default function DeviceAuthPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <DeviceAuthContent />
    </Suspense>
  );
}
