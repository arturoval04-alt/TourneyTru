'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background text-foreground px-4">
      <h2 className="text-xl font-bold">Algo salió mal</h2>
      <p className="text-muted-foreground text-sm">Ocurrió un error inesperado.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
