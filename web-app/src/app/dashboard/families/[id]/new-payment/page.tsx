'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function NewPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  useEffect(() => {
    // Redirect to family page - payment form is now inline
    router.replace(`/dashboard/families/${familyId}`);
  }, [familyId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirigiendo...</p>
      </div>
    </div>
  );
}
