import {
  Activity,
  Building2,
  CircleAlert,
  ClipboardCheck,
  Database,
  ReceiptText,
  Waypoints,
} from 'lucide-react';

import type { AdminBolumVerisi, AdminOzet, WorkerDurumu } from '@features/admin/types';
import { InfrastructureAlert, SectionHeader, StatusBadge, formatDate } from './admin-primitives';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import { Progress } from '@shared/components/ui/progress';

const metric = (label: string, value: number, icon: typeof Database, detail: string) => ({
  label,
  value,
  icon,
  detail,
});

export function OverviewView({
  ozet,
  workerlar,
}: {
  ozet: AdminBolumVerisi<AdminOzet>;
  workerlar: AdminBolumVerisi<WorkerDurumu[]>;
}) {
  const metrics = [
    metric('Poz', ozet.data.poz_sayisi, Database, 'Etkin katalog kaydı'),
    metric('Yayın', ozet.data.yayin_sayisi, Building2, 'Kurum ve kitap dönemleri'),
    metric('Aktarım', ozet.data.aktarim_sayisi, Waypoints, 'Belge işleme çalışmaları'),
    metric('İnceleme', ozet.data.inceleme_bekleyen, ClipboardCheck, 'Admin kararı bekliyor'),
    metric(
      'Aktif görev',
      ozet.data.aktif_gorev_sayisi,
      Activity,
      `${ozet.data.gorev_toplami.toLocaleString('tr-TR')} toplam görev`,
    ),
    metric('Bekleyen ödeme', ozet.data.bekleyen_odeme, ReceiptText, 'Manuel karar gerekiyor'),
  ];
  const basarisiz = ozet.data.basarisiz_gorev_sayisi;
  const tamamlanan = ozet.data.tamamlanan_gorev_sayisi;
  const basari = ozet.data.gorev_basari_orani;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Operasyon genel bakışı"
        aciklama="Worker, veri kalitesi ve ticari işlemlerin tek ekrandaki güncel görünümü."
      />
      <InfrastructureAlert message={ozet.uyari ?? workerlar.uyari} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Sistem metrikleri">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="gap-2 py-4">
              <CardContent className="px-4">
                <div className="flex items-center justify-between">
                  <Icon className="text-primary size-4" />
                  <span className="text-2xl font-semibold tabular-nums">
                    {item.value.toLocaleString('tr-TR')}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium">{item.label}</p>
                <p className="text-muted-foreground text-xs">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="text-primary size-4" />
              Worker ağı
            </CardTitle>
            <CardDescription>Son heartbeat verisine göre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workerlar.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Henüz worker heartbeat kaydı alınmadı.
              </p>
            ) : (
              workerlar.data.slice(0, 5).map((worker) => (
                <div
                  key={worker.worker_id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{worker.ana_makine}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatDate(worker.son_kalp_atisi)}
                    </p>
                  </div>
                  <StatusBadge durum={worker.durum} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleAlert className="text-primary size-4" />
              Görev sağlığı
            </CardTitle>
            <CardDescription>Terminal görevlerin başarı oranı</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold tabular-nums">%{basari}</span>
              <span className="text-muted-foreground text-xs">
                {tamamlanan} başarılı · {basarisiz} hatalı
              </span>
            </div>
            <Progress value={basari} aria-label={`Görev başarı oranı yüzde ${basari}`} />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(ozet.data.gorevler)
                .slice(0, 6)
                .map(([durum, sayi]) => (
                  <div
                    key={durum}
                    className="bg-muted/60 flex items-center justify-between rounded-md px-2 py-1.5"
                  >
                    <span>{durum.replaceAll('_', ' ')}</span>
                    <strong>{sayi}</strong>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
