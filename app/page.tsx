import Link from 'next/link';
import { FileText, Calculator } from 'lucide-react';

import { Header } from '@shared/components/header';
import { Card, CardHeader, CardTitle, CardDescription } from '@shared/components/ui/card';

const features = [
  {
    title: 'EKAP Editör',
    description: 'EKAP dosyalarını görüntüle ve düzenle',
    href: '/editor',
    icon: FileText,
  },
  {
    title: 'Yaklaşık Maliyet',
    description: 'Yaklaşık maliyet hesaplama',
    href: '/yaklasik-maliyet',
    icon: Calculator,
  },
];

export default function HomePage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <h1 className="mb-2 text-2xl font-bold">Hoş Geldiniz</h1>
          <p className="text-muted-foreground mb-8">Çalışmak istediğiniz aracı seçin.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Link key={feature.href} href={feature.href} className="group">
                <Card className="group-hover:border-primary/50 h-full transition-colors group-hover:shadow-md">
                  <CardHeader>
                    <div className="bg-primary text-primary-foreground mb-2 flex size-10 items-center justify-center rounded-lg">
                      <feature.icon className="size-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-4 text-center">
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} EKAP Editör
        </p>
      </footer>
    </div>
  );
}
