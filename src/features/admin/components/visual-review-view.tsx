import Image from 'next/image';
import Link from 'next/link';
import { Eye, FileWarning, ScanSearch } from 'lucide-react';

import type {
  AdminBolumVerisi,
  GorselDogrulamaSatiri,
  GorselDogrulamaVerisi,
} from '@features/admin/types';
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
import { ScrollArea } from '@shared/components/ui/scroll-area';
import { InfrastructureAlert, SectionHeader } from './admin-primitives';
import { VisualAutoRefresh } from './visual-auto-refresh';

export function VisualReviewView({ veri }: { veri: AdminBolumVerisi<GorselDogrulamaVerisi> }) {
  const secili = veri.data.seciliAktarim;
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Görsel doğrulama"
        aciklama="Sistematik uyuşmazlık kümelerini, PDF render'ı, sistemdeki kayıt ve sayfada okunan değerlerle yan yana inceleyin. Bu ekran yalnızca teşhis üretir."
      />
      <InfrastructureAlert message={veri.uyari} />
      <Alert>
        <Eye />
        <AlertTitle>Kanıt görünümü</AlertTitle>
        <AlertDescription>
          Burada düzeltme yapılmaz. Ayrıştırıcı değişikliği tüm belge kümesinde yeniden ölçülmeden
          uygulanamaz. Yerel görsel okuma sayfa başına yaklaşık 80–95 saniye; 40 sayfalık örneklem
          yaklaşık bir saat sürer ve sonuçlar koşu sürerken birikir.
        </AlertDescription>
      </Alert>
      {veri.data.kanitUyarisi ? (
        <Alert>
          <FileWarning />
          <AlertTitle>Kanıt ayrıntıları alınamadı</AlertTitle>
          <AlertDescription>{veri.data.kanitUyarisi}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Doğrulama koşusu</CardTitle>
          <CardDescription>Render ve sonuçları görmek için aktarımı seçin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {veri.data.aktarimlar.slice(0, 40).map((aktarim) => (
            <Button
              key={aktarim.id}
              variant={aktarim.id === secili?.id ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/admin/gorsel-dogrulama?aktarim=${aktarim.id}`}>
                <span className="max-w-60 truncate">
                  {aktarim.belge ?? aktarim.yayin ?? aktarim.id.slice(0, 8)}
                </span>
              </Link>
            </Button>
          ))}
          {veri.data.aktarimlar.length === 0 && (
            <p className="text-muted-foreground text-sm">Aktarım bulunamadı.</p>
          )}
        </CardContent>
      </Card>

      {secili && veri.data.ozet ? (
        <>
          <VisualAutoRefresh />
          <section
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            aria-label="Görsel doğrulama özeti"
          >
            <Summary label="Kontrol" value={veri.data.ozet.toplam} />
            <Summary label="Uyuşuyor" value={veri.data.ozet.uyusuyor} />
            <Summary label="Uyuşmuyor" value={veri.data.ozet.uyusmuyor} />
            <Summary label="Okunamadı" value={veri.data.ozet.okunamadi} />
            <Summary label="Hata" value={veri.data.ozet.hata} />
            <Summary label="Sayfa" value={veri.data.ozet.sayfa} />
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-semibold">Uyuşmazlık kümeleri</h2>
              <p className="text-muted-foreground text-sm">
                Alan, yoğunluk ve sayfa aralığı sistematik hata desenini daraltır.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {veri.data.kumeler.map((kume) => (
                <Link
                  key={kume.alan}
                  href={`/admin/gorsel-dogrulama?aktarim=${secili.id}&alan=${encodeURIComponent(kume.alan)}`}
                  className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
                >
                  <Card
                    className={
                      veri.data.seciliAlan === kume.alan
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50 transition-colors'
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{alanEtiketi(kume.alan)}</CardTitle>
                          <CardDescription>
                            Sayfa {kume.ilk_sayfa}–{kume.son_sayfa}
                          </CardDescription>
                        </div>
                        <Badge variant={kume.adet > 10 ? 'destructive' : 'secondary'}>
                          {kume.adet.toLocaleString('tr-TR')} fark
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Etkilenen sayfa:</span> {kume.sayfa}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {kume.ornek_poz.filter(Boolean).map((poz) => (
                          <Badge key={poz} variant="outline" className="font-mono">
                            {poz}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {veri.data.kumeler.length === 0 && (
                <Card className="md:col-span-2 xl:col-span-3">
                  <CardContent className="text-muted-foreground flex min-h-32 items-center justify-center">
                    Bu koşuda kümelenmiş uyuşmazlık yok.
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {veri.data.sayfalar.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-base font-semibold">Kaynak karşılaştırması</h2>
                <p className="text-muted-foreground text-sm">
                  Örnek sayfalar birinci sayfadan başlayan gerçek kaynak numarasıyla gösterilir.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {veri.data.sayfalar.map((sayfa) => (
                  <Card key={sayfa.sayfa} className="overflow-hidden">
                    <CardHeader className="border-b py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Sayfa {sayfa.sayfa}</CardTitle>
                        <Badge variant="outline">{sonucEtiketi(sayfa.sonuc)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(240px,.9fr)_minmax(240px,.9fr)]">
                      <div className="bg-muted relative aspect-[1266/1790] overflow-hidden border-b lg:aspect-auto lg:h-[560px] lg:border-r lg:border-b-0">
                        <Image
                          src={sayfa.gorselUrl}
                          alt={`Aktarımın ${sayfa.sayfa}. sayfa render'ı`}
                          fill
                          sizes="(min-width: 1536px) 30vw, (min-width: 1024px) 50vw, 100vw"
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <EvidenceColumn title="Sistemdeki kayıt" rows={sayfa.bizimSatirlar} />
                      <EvidenceColumn
                        title="Sayfada okunan"
                        subtitle={[sayfa.gorunurluk, sayfa.model].filter(Boolean).join(' · ')}
                        rows={sayfa.gorulenSatirlar}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      ) : !veri.uyari ? (
        <Card>
          <CardContent className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <ScanSearch className="size-8" />
            <p>Görsel doğrulama sonucu olan bir aktarım seçin.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString('tr-TR')}</p>
        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
          <FileWarning className="size-3" />
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

function alanEtiketi(alan: string) {
  return ({ birim: 'Birim', fiyat: 'Fiyat' } as Record<string, string>)[alan] ?? alan;
}

function EvidenceColumn({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: GorselDogrulamaSatiri[];
}) {
  return (
    <div className="border-b last:border-0 lg:border-r lg:border-b-0">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle ? <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p> : null}
      </div>
      <ScrollArea className="h-60 lg:h-[510px]">
        <div className="flex flex-col gap-2 p-3">
          {rows.map((satir, index) => (
            <article key={`${satir.poz_no}-${index}`} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="font-mono text-sm">{satir.poz_no}</strong>
                <Badge variant="secondary">{satir.birim ?? 'birim yok'}</Badge>
              </div>
              {satir.fiyatlar.length > 0 && (
                <p className="text-muted-foreground mt-2 font-mono text-xs">
                  {satir.fiyatlar.join(' · ')}
                </p>
              )}
            </article>
          ))}
          {rows.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
              Bu sütun için kayıt yok.
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

function sonucEtiketi(sonuc: GorselDogrulamaVerisi['sayfalar'][number]['sonuc']) {
  const etiketler: Record<string, string> = {
    uyusuyor: 'Uyuşuyor',
    uyusmuyor: 'Uyuşmuyor',
    okunamadi: 'Okunamadı',
    hata: 'Hata',
  };
  return etiketler[sonuc ?? ''] ?? 'Sonuç yok';
}
