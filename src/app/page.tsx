'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-apex-dark flex items-center justify-center text-apex-muted font-mono text-xs">
      APEX KREATİF Yükleniyor...
    </div>
  );
}
