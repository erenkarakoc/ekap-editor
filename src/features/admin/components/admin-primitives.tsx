import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Info,
  Loader2,
  XCircle,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Badge } from '@shared/components/ui/badge';
import { cn } from '@shared/lib/utils';

export function SectionHeader({
  baslik,
  aciklama,
  actions,
}: {
  baslik: string;
  aciklama: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{baslik}</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">{aciklama}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function InfrastructureAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert>
      <Info className="size-4" />
      <AlertTitle>Kontrol düzlemi bekleniyor</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

const DURUMLAR: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  tamamlandi: {
    label: 'Tamamlandı',
    icon: CheckCircle2,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  onaylandi: {
    label: 'Onaylandı',
    icon: CheckCircle2,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  calisiyor: {
    label: 'Çalışıyor',
    icon: Loader2,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  cevrimici: {
    label: 'Çevrimiçi',
    icon: CheckCircle2,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  bekliyor: {
    label: 'Bekliyor',
    icon: Clock3,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  tekrar_bekliyor: {
    label: 'Tekrar bekliyor',
    icon: Clock3,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  insan_bekliyor: {
    label: 'İnsan bekliyor',
    icon: AlertCircle,
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  basarisiz: {
    label: 'Başarısız',
    icon: XCircle,
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  reddedildi: {
    label: 'Reddedildi',
    icon: XCircle,
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  iptal: {
    label: 'İptal',
    icon: XCircle,
    className: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  },
  cevrimdisi: {
    label: 'Çevrimdışı',
    icon: CircleDashed,
    className: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  },
  taslak: {
    label: 'Taslak',
    icon: CircleDashed,
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  },
  inceleme_bekliyor: {
    label: 'İnceleme',
    icon: Clock3,
    className: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
};

export function StatusBadge({ durum, className }: { durum: string; className?: string }) {
  const ayar = DURUMLAR[durum] ?? {
    label: durum,
    icon: CircleDashed,
    className: 'border-border bg-muted text-muted-foreground',
  };
  const Icon = ayar.icon;
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium whitespace-nowrap', ayar.className, className)}
    >
      <Icon className={cn('size-3', durum === 'calisiyor' && 'animate-spin')} aria-hidden="true" />
      {ayar.label}
    </Badge>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'medium' }).format(
    new Date(value),
  );
}
