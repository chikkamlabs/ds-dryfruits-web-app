'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#fbf9f8] text-[#2b211c]">
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
          <h2 className="text-2xl font-bold mb-2">Application Error</h2>
          <p className="text-sm text-gray-600 mb-6">
            {error.message || 'A critical error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-[#5d4037] text-white rounded-md text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
