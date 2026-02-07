'use client';

import { Button } from '@shared/components/ui/button';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-bold">Bir hata oluştu!</h2>
      <p className="text-muted-foreground">
        Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
      </p>
      <Button onClick={reset}>Tekrar Dene</Button>
    </div>
  );
}
