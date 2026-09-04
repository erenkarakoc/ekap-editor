import Link from 'next/link';
import { AlertTriangle, ArrowRight, DatabaseZap, FileClock, ShieldCheck } from 'lucide-react';

import type { AdminBolumVerisi, AktarimCalismasi, AktarimDetayi } from '@features/admin/types';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { InfrastructureAlert, SectionHeader, StatusBadge, formatDate } from './admin-primitives';
import { TransferStopButton } from './transfer-stop-button';

export function TransferRunsView({
  veri,
}: {
  veri: AdminBolumVerisi<{ aktarimlar: AktarimCalismasi[]; detay: AktarimDetayi | null }>;
}) {
  const detay = veri.data.detay;
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Aktarım koşuları"
        aciklama="Belge işleme koşularını, normalize sayılarını ve soykütüğü değiştirmeden tutarlılık sonuçlarını izleyin."
      />
      <InfrastructureAlert message={veri.uyari} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Son koşular</CardTitle>
            <CardDescription>En yeni aktarım koşuları ve soykütüğü durumları</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Belge / yayın</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Poz</TableHead>
                  <TableHead className="text-right">Fiyat</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead className="text-right">Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {veri.data.aktarimlar.map((aktarim) => (
                  <TableRow
                    key={aktarim.id}
                    data-state={detay?.aktarim.id === aktarim.id ? 'selected' : undefined}
                  >
                    <TableCell>
                      <p className="max-w-72 truncate font-medium">
                        {aktarim.belge ?? aktarim.yayin ?? 'Belge'}
                      </p>
                      <p className="text-muted-foreground max-w-72 truncate text-xs">
                        {[aktarim.kurum, aktarim.yayin].filter(Boolean).join(' · ') ||
                          aktarim.aktarim_turu}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge durum={aktarim.durum} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {aktarim.islenen_surum_sayisi.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {aktarim.islenen_fiyat_sayisi.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(aktarim.baslama_zamani ?? aktarim.olusturulma_zamani)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/aktarimlar?aktarim=${aktarim.id}`}>
                          İncele <ArrowRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {veri.data.aktarimlar.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                      Aktarım koşusu bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {detay ? <RunDetail detay={detay} /> : null}
        </div>
      </div>
    </div>
  );
}

function RunDetail({ detay }: { detay: AktarimDetayi }) {
  const { aktarim } = detay;
  const dondurulmus = aktarim.durum === 'complete' || aktarim.durum === 'needs_review';
  const yerineBirakti = aktarim.durum === 'stopped';
  const etkinGorunumde = !['stopped', 'failed', 'planned'].includes(aktarim.durum);
  const gerekce = aktarim.parametreler.superseded_reason ?? aktarim.parametreler.abandon_reason;
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {aktarim.belge ?? aktarim.yayin ?? 'Koşu detayı'}
              </CardTitle>
              <CardDescription className="mt-1 font-mono">{aktarim.id}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge durum={aktarim.durum} />
              {etkinGorunumde ? <Badge variant="secondary">Etkin veri görünümünde</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Ham satır" value={aktarim.gorulen_ham_satir_sayisi} />
            <Metric label="Poz sürümü" value={aktarim.islenen_surum_sayisi} />
            <Metric label="Fiyat" value={aktarim.islenen_fiyat_sayisi} />
            <Metric
              label="Uyarı / hata"
              value={`${aktarim.uyari_sayisi} / ${aktarim.hata_sayisi}`}
            />
          </dl>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{aktarim.ayristirici_adi}</Badge>
            <Badge variant="secondary">v{aktarim.ayristirici_surumu}</Badge>
            <Badge variant="outline">{aktarim.aktarim_turu}</Badge>
          </div>
          {aktarim.durum === 'needs_review' ? (
            <div className="border-t pt-4">
              <TransferStopButton aktarimId={aktarim.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {yerineBirakti && (
        <Alert>
          <FileClock />
          <AlertTitle>Yerini yeni aktarıma bıraktı</AlertTitle>
          <AlertDescription>
            Bu durum başarısızlık değildir.{' '}
            {typeof gerekce === 'string'
              ? gerekce
              : 'Ayrıştırıcı düzeltmesi sonrasında yeni bir koşu açılmış.'}
          </AlertDescription>
        </Alert>
      )}
      {dondurulmus && (
        <Alert>
          <ShieldCheck />
          <AlertTitle>Soykütüğü dondurulmuş koşu</AlertTitle>
          <AlertDescription>
            Tamamlanmış ve inceleme bekleyen koşulara veri yazılmaz. Yeniden aktarım ayrı bir koşu
            olarak başlatılmalıdır.
          </AlertDescription>
        </Alert>
      )}
      {detay.tutarlilikUyarisi && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Tutarlılık denetimi alınamadı</AlertTitle>
          <AlertDescription>{detay.tutarlilikUyarisi}</AlertDescription>
        </Alert>
      )}
      <SummaryCard title="Aktarım özeti" icon={DatabaseZap} value={detay.ozet} />
      <SummaryCard title="Tutarlılık" icon={ShieldCheck} value={detay.tutarlilik} />
      <SummaryCard title="Sayfa raporu" icon={FileClock} value={detay.sayfaRaporu} />
      <SummaryCard title="Hata raporu" icon={AlertTriangle} value={detay.hataRaporu} />
      <SummaryCard title="Normalize özeti" icon={DatabaseZap} value={detay.normalize} />
      <SummaryCard title="Ham satır örnekleri" icon={FileClock} value={detay.hamSatirOrnekleri} />
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-muted/60 rounded-lg p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </dd>
    </div>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  value,
}: {
  title: string;
  icon: typeof DatabaseZap;
  value: unknown;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-muted max-h-64 overflow-auto rounded-lg p-3 font-mono text-xs leading-5">
          {JSON.stringify(value ?? { durum: 'veri yok' }, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
