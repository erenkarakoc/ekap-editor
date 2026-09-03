'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  Code2,
  Diff,
  File,
  Folder,
  FolderCog,
  Loader2,
  RefreshCw,
  Save,
  Search,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import type { CalismaAlaniGirdisi } from '@shared/types/electron';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@shared/components/ui/alert-dialog';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@shared/components/ui/resizable';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { SectionHeader } from './admin-primitives';

const Editor = dynamic(() => import('@monaco-editor/react').then((module) => module.default), {
  ssr: false,
});
const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((module) => module.DiffEditor),
  { ssr: false },
);

interface OpenFile {
  path: string;
  original: string;
  content: string;
  sha256: string;
  language: string;
}

export function WorkspaceView() {
  const electron = useSyncExternalStore(
    () => () => undefined,
    () => Boolean(window.electronAPI),
    () => false,
  );
  const [entries, setEntries] = useState<CalismaAlaniGirdisi[]>([]);
  const [directory, setDirectory] = useState('');
  const [query, setQuery] = useState('');
  const [file, setFile] = useState<OpenFile | null>(null);
  const [mode, setMode] = useState('edit');
  const [isPending, startTransition] = useTransition();
  const { resolvedTheme } = useTheme();
  const load = useCallback(async (path = '') => {
    if (!window.electronAPI) return;
    try {
      setEntries(await window.electronAPI.listWorkspace(path));
      setDirectory(path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Çalışma alanı okunamadı.');
    }
  }, []);
  useEffect(() => {
    if (!window.electronAPI) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const filtered = useMemo(
    () =>
      entries.filter((item) =>
        item.ad.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')),
      ),
    [entries, query],
  );
  async function open(item: CalismaAlaniGirdisi) {
    if (!window.electronAPI) return;
    if (item.tur === 'klasor') return void load(item.yol);
    try {
      const value = await window.electronAPI.readWorkspaceFile(item.yol);
      setFile({ ...value, original: value.content });
      setMode('edit');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dosya açılamadı.');
    }
  }
  function choose() {
    startTransition(async () => {
      if (!window.electronAPI) return;
      await window.electronAPI.chooseWorkspace();
      await load();
    });
  }
  function save() {
    if (!file || !window.electronAPI) return;
    startTransition(async () => {
      try {
        const result = await window.electronAPI!.writeWorkspaceFile({
          path: file.path,
          content: file.content,
          expectedSha256: file.sha256,
        });
        setFile((current) =>
          current ? { ...current, original: current.content, sha256: result.sha256 } : null,
        );
        toast.success(`Değişiklik uygulandı. Snapshot: ${result.snapshot}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Dosya kaydedilemedi. Dış değişiklik varsa dosyayı yeniden açın.',
        );
      }
    });
  }
  if (!electron)
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-5 p-4 sm:p-6">
        <SectionHeader
          baslik="Çalışma alanı"
          aciklama="Kamu-poz dosya envanteri, salt-okunur önizleme ve onaylı diff uygulama alanı."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderCog className="text-primary size-5" />
              Masaüstü uygulaması gerekli
            </CardTitle>
            <CardDescription>
              Tarayıcı sürümü yerel dosya sistemine erişmez. Bu bölümü EKAP Editör Electron
              uygulamasında açın.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  return (
    <div className="flex h-full min-h-[calc(100dvh-7rem)] flex-col gap-4 p-4 sm:p-6">
      <SectionHeader
        baslik="Çalışma alanı"
        aciklama="Kod, SQL, prompt, test ve belge envanterini güvenli kök içinde inceleyin; her yazmayı diff ve SHA-256 kilidiyle onaylayın."
        actions={
          <>
            <Button variant="outline" onClick={choose} disabled={isPending}>
              <FolderCog /> Kök seç
            </Button>
            <Button variant="outline" onClick={() => load(directory)}>
              <RefreshCw /> Yenile
            </Button>
          </>
        }
      />
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertTitle>Eşzamanlı değişiklik koruması etkin</AlertTitle>
        <AlertDescription>
          Dosya okunduktan sonra Claude veya başka bir süreç değişiklik yaparsa kayıt reddedilir.
          Uygulanan her değişiklikten önce geri yüklenebilir snapshot alınır.
        </AlertDescription>
      </Alert>
      <Card className="min-h-[640px] flex-1 gap-0 overflow-hidden py-0">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={24} minSize={18}>
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 pl-9"
                    placeholder="Bu klasörde ara"
                    aria-label="Dosyalarda ara"
                  />
                </div>
                {directory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-start"
                    onClick={() => load(directory.split('/').slice(0, -1).join('/'))}
                  >
                    <ChevronLeft /> Üst klasör
                  </Button>
                )}
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-2">
                  {filtered.map((item) => (
                    <button
                      key={item.yol}
                      type="button"
                      onClick={() => open(item)}
                      className="hover:bg-muted focus-visible:ring-ring flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {item.tur === 'klasor' ? (
                        <Folder className="text-primary size-4 shrink-0" />
                      ) : (
                        <File className="text-muted-foreground size-4 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate" title={item.ad}>
                        {item.ad}
                      </span>
                      {item.boyut != null && (
                        <span className="text-muted-foreground text-[10px] tabular-nums">
                          {formatBytes(item.boyut)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={76} minSize={40}>
            {file ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-medium" title={file.path}>
                      {file.path}
                    </p>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      SHA {file.sha256.slice(0, 12)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={file.content === file.original ? 'secondary' : 'outline'}>
                      {file.content === file.original ? 'Değişmedi' : 'Taslak değişiklik'}
                    </Badge>
                    <Tabs value={mode} onValueChange={setMode}>
                      <TabsList>
                        <TabsTrigger value="edit">
                          <Code2 /> Editör
                        </TabsTrigger>
                        <TabsTrigger value="diff">
                          <Diff /> Diff
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  {mode === 'edit' ? (
                    <Editor
                      language={file.language}
                      value={file.content}
                      onChange={(value) =>
                        setFile((current) =>
                          current ? { ...current, content: value ?? '' } : null,
                        )
                      }
                      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: 'on',
                        automaticLayout: true,
                        accessibilitySupport: 'auto',
                        tabSize: 2,
                      }}
                    />
                  ) : (
                    <DiffEditor
                      language={file.language}
                      original={file.original}
                      modified={file.content}
                      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t p-3">
                  <p className="text-muted-foreground text-xs">
                    Panel commit, push veya merge yapmaz.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={isPending || file.content === file.original}>
                        {isPending ? <Loader2 className="animate-spin" /> : <Save />} Değişikliği
                        uygula
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Dosya değişikliği uygulansın mı?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Mevcut SHA-256 yeniden doğrulanacak, dosyanın önceki hali snapshot kaydına
                          alınacak ve yalnız bu dosya güncellenecek.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={save}>Doğrula ve uygula</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div>
                  <Code2 className="text-muted-foreground mx-auto size-10" />
                  <h2 className="mt-4 font-medium">Dosya seçin</h2>
                  <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                    Secret, binary, cache ve ortam klasörleri güvenlik nedeniyle listelenmez.
                  </p>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
