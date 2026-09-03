'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Bot,
  BrainCircuit,
  Braces,
  Loader2,
  Play,
  Save,
  Settings2,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

import { ajanCalistirAction, ajanTanimiKaydetAction } from '@features/admin/actions';
import type { AdminBolumVerisi, AjanTanimi, WorkerDurumu } from '@features/admin/types';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Label } from '@shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { Slider } from '@shared/components/ui/slider';
import { Switch } from '@shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Textarea } from '@shared/components/ui/textarea';
import { InfrastructureAlert, SectionHeader } from './admin-primitives';

const FALLBACK_AJANLAR = [
  ['orkestrator', 'Orkestratör', 'İş planı, bağımlılık ve alt görev yönetimi'],
  ['kaynak_tarama', 'Kaynak tarama', 'Kayıtlı resmî alanlarda belge keşfi'],
  ['belge_ayristirma', 'Belge ayrıştırma', 'PDF tablo ve satır çıkarımı'],
  ['gorsel_dogrulama', 'Görsel doğrulama', 'Sayfa görüntüsü ile OCR kıyaslama'],
  ['normalizasyon', 'Normalizasyon', 'Poz, birim ve tutar standardizasyonu'],
  ['degerlendirici', 'Değerlendirici', 'Kalite puanı ve hata sınıflandırma'],
  ['poz_eslestirme', 'Poz eşleştirme', 'Kataloglar arası anlamlı eşleştirme'],
] as const;

export function AgentsView({
  ajanlar,
  workerlar,
}: {
  ajanlar: AdminBolumVerisi<AjanTanimi[]>;
  workerlar: AdminBolumVerisi<WorkerDurumu[]>;
}) {
  const [duzenlenen, setDuzenlenen] = useState<AjanTanimi | null>(null);
  const modeller = useMemo(
    () =>
      Array.from(
        new Set(workerlar.data.flatMap((worker) => worker.modeller.map((model) => model.ad))),
      ),
    [workerlar.data],
  );
  const tanimlar: AjanTanimi[] = ajanlar.data.length
    ? ajanlar.data
    : FALLBACK_AJANLAR.map(([kod, ad, aciklama]) => ({
        kod,
        ad,
        aciklama,
        rol: kod,
        model: modeller[0] ?? 'qwen3:8b',
        fallback_model: null,
        prompt_adi: kod,
        prompt_surumu: 'v1',
        parametreler: { temperature: 0.2 },
        araclar: [],
        cikti_semasi: {},
        aktif_mi: true,
      }));
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Ajan stüdyosu"
        aciklama="Yedi uzman ajanı sürümlü tanımlarıyla çalıştırın veya Ollama üzerinde serbest, denetlenebilir bir çalışma başlatın."
      />
      <InfrastructureAlert message={ajanlar.uyari ?? workerlar.uyari} />
      <Tabs defaultValue="ajanlar">
        <TabsList>
          <TabsTrigger value="ajanlar">Ajan presetleri</TabsTrigger>
          <TabsTrigger value="konsol">Serbest model konsolu</TabsTrigger>
        </TabsList>
        <TabsContent value="ajanlar">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tanimlar.map((ajan) => (
              <AgentCard key={ajan.kod} ajan={ajan} modeller={modeller} onEdit={setDuzenlenen} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="konsol">
          <ConsoleCard modeller={modeller} />
        </TabsContent>
      </Tabs>
      {duzenlenen && (
        <AgentDefinitionDialog
          key={`${duzenlenen.kod}-${duzenlenen.surum ?? 1}`}
          value={duzenlenen}
          modeller={modeller}
          onOpenChange={(open) => !open && setDuzenlenen(null)}
        />
      )}
    </div>
  );
}

function AgentCard({
  ajan,
  modeller,
  onEdit,
}: {
  ajan: AjanTanimi;
  modeller: string[];
  onEdit: (value: AjanTanimi) => void;
}) {
  const [isPending, startTransition] = useTransition();
  function calistir() {
    startTransition(async () => {
      const sonuc = await ajanCalistirAction({
        ajanKodu: ajan.kod,
        model: ajan.model,
        prompt: '',
        baglam: {},
        parametreler: ajan.parametreler,
        araclar: ajan.araclar,
        ciktiSemasi: ajan.cikti_semasi,
      });
      if (sonuc.ok) toast.success(`${ajan.ad} görevi kuyruğa alındı.`);
      else toast.error(sonuc.error);
    });
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
            <Bot className="size-4" />
          </div>
          <Badge variant={ajan.aktif_mi ? 'outline' : 'secondary'}>
            {ajan.aktif_mi ? 'Etkin' : 'Kapalı'}
          </Badge>
        </div>
        <CardTitle className="text-base">{ajan.ad}</CardTitle>
        <CardDescription>{ajan.aciklama}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
          <dt className="text-muted-foreground">Model</dt>
          <dd className="truncate font-mono" title={ajan.model}>
            {ajan.model}
          </dd>
          <dt className="text-muted-foreground">Prompt</dt>
          <dd>
            {ajan.prompt_adi} · {ajan.prompt_surumu}
          </dd>
          <dt className="text-muted-foreground">Araç</dt>
          <dd>{ajan.araclar.length}</dd>
        </dl>
        <div className="flex flex-wrap gap-1">
          {ajan.araclar.slice(0, 4).map((arac) => (
            <Badge key={arac} variant="secondary">
              <Wrench />
              {arac}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-[44px_1fr] gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={`${ajan.ad} tanımını düzenle`}
            onClick={() => onEdit(ajan)}
          >
            <Settings2 />
          </Button>
          <Button className="h-11" onClick={calistir} disabled={isPending || !ajan.aktif_mi}>
            {isPending ? <Loader2 className="animate-spin" /> : <Play />} Ajanı çalıştır
          </Button>
        </div>
        {modeller.length === 0 && (
          <p className="text-muted-foreground text-xs">
            Model envanteri worker heartbeat kaydıyla görünür.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AgentDefinitionDialog({
  value,
  modeller,
  onOpenChange,
}: {
  value: AjanTanimi;
  modeller: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<AjanTanimi>({ ...value });
  const [parametreler, setParametreler] = useState(JSON.stringify(value.parametreler, null, 2));
  const [sema, setSema] = useState(JSON.stringify(value.cikti_semasi, null, 2));
  const [araclar, setAraclar] = useState(value.araclar.join(', '));
  const [isPending, startTransition] = useTransition();

  function aciklikDegisti(open: boolean) {
    onOpenChange(open);
  }

  function kaydet() {
    startTransition(async () => {
      try {
        const sonuc = await ajanTanimiKaydetAction({
          kod: draft.kod,
          ad: draft.ad,
          aciklama: draft.aciklama,
          rol: draft.rol,
          model: draft.model,
          fallbackModel: draft.fallback_model,
          promptAdi: draft.prompt_adi,
          promptSurumu: draft.prompt_surumu,
          parametreler: JSON.parse(parametreler),
          araclar: araclar
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          ciktiSemasi: JSON.parse(sema),
          aktifMi: draft.aktif_mi,
        });
        if (!sonuc.ok) {
          toast.error(sonuc.error);
          return;
        }
        toast.success(`${draft.ad} için yeni sürüm oluşturuldu.`);
        onOpenChange(false);
      } catch {
        toast.error('Parametreler ve çıktı şeması geçerli JSON olmalı.');
      }
    });
  }

  return (
    <Dialog open onOpenChange={aciklikDegisti}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ajan tanımının yeni sürümü</DialogTitle>
          <DialogDescription>
            Mevcut sürüm korunur; kaydetme yeni ve denetlenebilir bir tanım sürümü oluşturur.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ajan adı">
            <Input
              value={draft.ad}
              onChange={(event) => setDraft({ ...draft, ad: event.target.value })}
            />
          </Field>
          <Field label={`Rol · mevcut sürüm ${draft.surum ?? 1}`}>
            <Input
              value={draft.rol}
              onChange={(event) => setDraft({ ...draft, rol: event.target.value })}
            />
          </Field>
          <Field label="Model">
            <Input
              list="ajan-model-envanteri"
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
            />
          </Field>
          <Field label="Fallback model">
            <Input
              value={draft.fallback_model ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, fallback_model: event.target.value || null })
              }
            />
          </Field>
          <Field label="Prompt adı">
            <Input
              value={draft.prompt_adi}
              onChange={(event) => setDraft({ ...draft, prompt_adi: event.target.value })}
            />
          </Field>
          <Field label="Prompt sürümü">
            <Input
              value={draft.prompt_surumu}
              onChange={(event) => setDraft({ ...draft, prompt_surumu: event.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Açıklama">
              <Textarea
                value={draft.aciklama}
                onChange={(event) => setDraft({ ...draft, aciklama: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Parametreler JSON">
            <Textarea
              className="min-h-40 font-mono text-xs"
              value={parametreler}
              onChange={(event) => setParametreler(event.target.value)}
              spellCheck={false}
            />
          </Field>
          <Field label="Çıktı şeması JSON">
            <Textarea
              className="min-h-40 font-mono text-xs"
              value={sema}
              onChange={(event) => setSema(event.target.value)}
              spellCheck={false}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Araç allowlist · virgülle ayırın">
              <Input value={araclar} onChange={(event) => setAraclar(event.target.value)} />
            </Field>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 md:col-span-2">
            <span className="text-sm font-medium">Yeni sürüm etkin olsun</span>
            <Switch
              checked={draft.aktif_mi}
              onCheckedChange={(aktif_mi) => setDraft({ ...draft, aktif_mi })}
            />
          </label>
          <datalist id="ajan-model-envanteri">
            {modeller.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={kaydet} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Save />} Yeni sürümü kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ConsoleCard({ modeller }: { modeller: string[] }) {
  const [model, setModel] = useState(modeller[0] ?? 'qwen3:8b');
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [topP, setTopP] = useState(0.9);
  const [thinking, setThinking] = useState(true);
  const [baglam, setBaglam] = useState('{}');
  const [sema, setSema] = useState('{}');
  const [isPending, startTransition] = useTransition();
  function calistir() {
    startTransition(async () => {
      try {
        const sonuc = await ajanCalistirAction({
          ajanKodu: 'model_konsolu',
          model,
          prompt,
          baglam: JSON.parse(baglam),
          parametreler: { temperature, top_p: topP, think: thinking },
          araclar: ['dosya_oku', 'dosya_ara', 'poz_ara'],
          ciktiSemasi: JSON.parse(sema),
        });
        if (sonuc.ok) toast.success('Model çalışması kuyruğa alındı.');
        else toast.error(sonuc.error);
      } catch {
        toast.error('Bağlam ve çıktı şeması geçerli JSON olmalı.');
      }
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="text-primary size-4" />
          Serbest model konsolu
        </CardTitle>
        <CardDescription>
          Prompt serbesttir; okuma araçları allowlist ile sınırlıdır. Yazma isteği doğrudan
          uygulanmaz, inceleme taslağı üretir.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="console-prompt">Prompt</Label>
            <Textarea
              id="console-prompt"
              className="min-h-56 text-sm"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Modelin görevini, beklenen kanıtları ve kabul ölçütlerini yazın…"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <JsonField
              id="console-context"
              label="Bağlam JSON"
              value={baglam}
              onChange={setBaglam}
            />
            <JsonField
              id="console-schema"
              label="Çıktı şeması JSON"
              value={sema}
              onChange={setSema}
            />
          </div>
        </div>
        <aside className="bg-muted/20 space-y-5 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="console-model">Model</Label>
            {modeller.length ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="console-model" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modeller.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="console-model"
                className="h-10"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            )}
          </div>
          <RangeField
            label={`Temperature · ${temperature.toFixed(2)}`}
            value={temperature}
            max={2}
            step={0.05}
            onChange={setTemperature}
          />
          <RangeField
            label={`Top-p · ${topP.toFixed(2)}`}
            value={topP}
            max={1}
            step={0.05}
            onChange={setTopP}
          />
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label htmlFor="thinking">Thinking</Label>
            <Switch id="thinking" checked={thinking} onCheckedChange={setThinking} />
          </div>
          <div className="text-muted-foreground rounded-lg border p-3 text-xs">
            <p className="text-foreground flex items-center gap-2 font-medium">
              <ShieldCheck className="text-primary size-4" />
              Güvenli araç ilkesi
            </p>
            <p className="mt-2">
              Dosya ve veritabanı yazma çağrıları ayrı bir admin onayına düşer.
            </p>
          </div>
          <Button className="h-11 w-full" onClick={calistir} disabled={isPending || !prompt.trim()}>
            {isPending ? <Loader2 className="animate-spin" /> : <Play />} Çalışmayı başlat
          </Button>
        </aside>
      </CardContent>
    </Card>
  );
}

function JsonField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        <Braces className="size-3.5" />
        {label}
      </Label>
      <Textarea
        id={id}
        rows={7}
        className="font-mono text-xs"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
function RangeField({
  label,
  value,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <Slider
        value={[value]}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0] ?? value)}
      />
    </div>
  );
}
