import { Suspense } from 'react';
import { DeviceLoginContent } from './content';
import { LoginSkeleton } from '@/components/ui';

export default function DeviceLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <DeviceLoginContent />
    </Suspense>
  );
}
