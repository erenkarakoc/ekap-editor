import { Calculator } from 'lucide-react';
import { Header } from '@shared/components/header';

export default function YaklasikMaliyetPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl">
            <Calculator className="size-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Yaklaşık Maliyet</h1>
          <p className="text-muted-foreground">Yakında</p>
        </div>
      </main>
    </div>
  );
}
