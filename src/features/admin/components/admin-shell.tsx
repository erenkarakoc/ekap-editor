'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bot,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileCode2,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
} from 'lucide-react';

import { Button } from '@shared/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/components/ui/breadcrumb';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@shared/components/ui/sheet';
import { cn } from '@shared/lib/utils';

const BOLUMLER = [
  {
    href: '/admin/genel',
    ad: 'Genel bakış',
    kisa: 'Sistem ve kalite özeti',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/operasyonlar',
    ad: 'Operasyonlar',
    kisa: 'Görev kuyruğu ve canlı akış',
    icon: Activity,
  },
  { href: '/admin/ajanlar', ad: 'Ajan stüdyosu', kisa: 'Ollama modelleri ve promptlar', icon: Bot },
  {
    href: '/admin/inceleme',
    ad: 'İnceleme merkezi',
    kisa: 'Taslak, örneklem ve onay',
    icon: ClipboardCheck,
  },
  {
    href: '/admin/pozlar',
    ad: 'Poz yönetimi',
    kisa: 'Sürüm, fiyat ve kaynak kanıtı',
    icon: Search,
  },
  {
    href: '/admin/kaynaklar',
    ad: 'Kaynaklar',
    kisa: 'Kurum, yayın ve aktarımlar',
    icon: Building2,
  },
  {
    href: '/admin/calisma-alani',
    ad: 'Çalışma alanı',
    kisa: 'Kod, prompt ve diff',
    icon: FileCode2,
  },
  {
    href: '/admin/ticaret',
    ad: 'Kullanıcı ve ticaret',
    kisa: 'Paket, kota, ödeme ve erişim',
    icon: Boxes,
  },
] as const;

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 p-2" aria-label="Yönetim merkezi bölümleri">
      {BOLUMLER.map((bolum) => {
        const Icon = bolum.icon;
        const etkin = pathname === bolum.href || pathname.startsWith(`${bolum.href}/`);
        return (
          <Link
            key={bolum.href}
            href={bolum.href}
            onClick={onNavigate}
            aria-current={etkin ? 'page' : undefined}
            className={cn(
              'group focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors outline-none focus-visible:ring-2',
              etkin
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{bolum.ad}</span>
              <span
                className={cn(
                  'block truncate text-[11px]',
                  etkin ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                {bolum.kisa}
              </span>
            </span>
            <ChevronRight
              className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </nav>
  );
}

function CurrentBreadcrumb() {
  const pathname = usePathname();
  const bolum = BOLUMLER.find((item) => pathname.startsWith(item.href));
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin/genel">Yönetim merkezi</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {bolum && bolum.href !== '/admin/genel' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{bolum.ad}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/15 flex min-h-0 flex-1 overflow-hidden">
      <aside className="bg-background/95 hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Database className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Kamu Poz Yönetimi</p>
            <p className="text-muted-foreground truncate text-[11px]">
              Operasyon ve veri kontrol düzlemi
            </p>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <AdminNav />
        </ScrollArea>
        <div className="border-t p-3">
          <div className="bg-muted/70 text-muted-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
            <Settings2 className="size-3.5" aria-hidden="true" />
            <span>Admin işlemleri audit kaydına alınır</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/90 flex h-12 shrink-0 items-center gap-3 border-b px-3 backdrop-blur lg:px-5">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Yönetim menüsünü aç"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="border-b px-4 py-4 text-left">Kamu Poz Yönetimi</SheetTitle>
              <ScrollArea className="h-[calc(100vh-57px)]">
                <AdminNav />
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <CurrentBreadcrumb />
        </header>
        <main id="admin-icerik" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
