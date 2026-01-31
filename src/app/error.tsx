'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-bold">Bir hata oluştu</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="bg-primary rounded px-4 py-2 text-white">
        Tekrar Dene
      </button>
    </div>
  );
}
