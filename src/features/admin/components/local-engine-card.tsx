'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  Cpu,
  FileText,
  FolderCog,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import { Skeleton } from '@shared/components/ui/skeleton';
import type { YerelMotorDurumu } from '@shared/types/electron';

export function LocalEngineCard() {
  const [status, setStatus] = useState<YerelMotorDurumu | null>(null);
  const [loglar, setLoglar] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);

  const yenile = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      setStatus(await window.electronAPI.localEngineStatus());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Yerel motor durumu okunamadı.');
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const first = window.setTimeout(() => void yenile(), 0);
    const timer = window.setInterval(() => void yenile(), 5000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [yenile]);

  function calistir(islem: 'sec' | 'ollama_dogrula' | 'ollama_baslat' | 'baslat' | 'durdur') {
    if (!window.electronAPI) return;
    startTransition(async () => {
      try {
        const api = window.electronAPI!;
        const yeni =
          islem === 'sec'
            ? await api.chooseWorkspace()
            : islem === 'ollama_dogrula'
              ? await api.verifyOllama()
              : islem === 'ollama_baslat'
                ? await api.startOllama()
                : islem === 'baslat'
                  ? await api.startLocalEngine()
                  : await api.stopLocalEngine();
        setStatus(yeni);
        toast.success(islem === 'durdur' ? 'Yerel worker durduruldu.' : 'Yerel motor güncellendi.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Yerel motor işlemi başarısız.');
      }
    });
  }

  function loglariAc() {
    if (!window.electronAPI) return;
    startTransition(async () => {
      try {
        setLoglar(await window.electronAPI!.readEngineLogs());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Süreç logları okunamadı.');
      }
    });
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="text-primary size-4" /> Yerel çalışma motoru
            </CardTitle>
            <CardDescription>Electron, Python worker ve Ollama sağlık durumu</CardDescription>
          </div>
          <Badge variant={isElectron ? 'outline' : 'secondary'}>
            {isElectron ? 'Masaüstü' : 'Web — salt izleme'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isElectron ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
            Yerel süreç yalnız EKAP Editör masaüstü uygulamasından başlatılabilir. Web paneli
            çalışan worker sürecini Supabase üzerinden yönetir.
          </p>
        ) : !status ? (
          <div className="space-y-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Worker</dt>
              <dd className="font-medium">
                {status.worker.calisiyor ? `Çalışıyor · PID ${status.worker.pid}` : 'Kapalı'}
              </dd>
              <dt className="text-muted-foreground">Ollama</dt>
              <dd className="font-medium">
                {status.ollama.hazir ? 'Hazır' : (status.ollama.hata ?? 'Ulaşılamıyor')}
              </dd>
              <dt className="text-muted-foreground">Çalışma kökü</dt>
              <dd className="truncate font-mono text-xs" title={status.calismaKoku ?? undefined}>
                {status.calismaKoku ?? 'Seçilmedi'}
              </dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => calistir('sec')}
                disabled={isPending}
              >
                <FolderCog /> Kök seç
              </Button>
              {status.worker.calisiyor ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => calistir('durdur')}
                  disabled={isPending}
                >
                  <Square /> Durdur
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => calistir('baslat')}
                  disabled={isPending || !status.calismaKoku}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : <Play />} Başlat
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => calistir('ollama_dogrula')}
                disabled={isPending}
              >
                <ShieldCheck />
                Ollama doğrula
              </Button>
              {!status.ollama.hazir && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => calistir('ollama_baslat')}
                  disabled={isPending || !status.calismaKoku}
                >
                  <Play /> Ollama başlat
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loglariAc} disabled={isPending}>
                <FileText /> Loglar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void yenile()}
                aria-label="Yerel motor durumunu yenile"
              >
                <RefreshCw />
              </Button>
            </div>
          </>
        )}
      </CardContent>
      <Dialog open={loglar !== null} onOpenChange={(open) => !open && setLoglar(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Yerel süreç logları</DialogTitle>
            <DialogDescription>
              Yalnız panelin yönettiği Ollama ve worker süreçlerinin son 1.000 satırı.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[55vh] rounded-lg border">
            <pre className="p-4 font-mono text-xs leading-5 whitespace-pre-wrap">
              {loglar?.join('\n') || 'Henüz süreç logu yok.'}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
