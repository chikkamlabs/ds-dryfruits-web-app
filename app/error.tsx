'use client';

import React from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="layout-page-container flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <h2 className="text-page-title font-bold text-text-primary mb-2">Something went wrong</h2>
      <p className="text-body text-text-muted mb-6">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-4">
        <button type="button" onClick={() => reset()} className="btn-base btn-primary">
          Try again
        </button>
        <Link href="/admin/dashboard" className="btn-base btn-secondary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
