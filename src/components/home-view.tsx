'use client';

import React, { useMemo } from 'react';
import { FileText, Plus, Clock, Search, Monitor, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { RecentFile, SessionSummary } from '@/types/home';

interface HomeViewProps {
  sessions: SessionSummary[]; // Typed interface instead of any
  activeTabId: string | null;
  recentFiles: RecentFile[];
  onOpenSession: (id: string) => void;
  onOpenFile: () => void;
  onClearRecent?: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export function HomeView({
  sessions,
  recentFiles,
  onOpenSession,
  onOpenFile,
  onClearRecent,
}: HomeViewProps) {
  const [search, setSearch] = React.useState('');

  const filteredRecent = useMemo(
    () => recentFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [recentFiles, search],
  );

  const filteredActive = useMemo(
    () => sessions.filter((s) => s.fileName.toLowerCase().includes(search.toLowerCase())),
    [sessions, search],
  );

  const formatDate = (ts: number) => {
    return dateFormatter.format(new Date(ts));
  };

  return (
    <div className="bg-background/50 flex h-full flex-col overflow-hidden">
      {/* Hero / Welcome Section */}
      <div className="flex-none p-8 pb-4">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Hoş geldin!</h1>
          <p className="text-muted-foreground mb-8">EKAP dosyalarını yönetmeye başla.</p>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Button
              size="lg"
              className="bg-card hover:bg-accent hover:text-accent-foreground text-card-foreground flex h-auto flex-col items-center justify-center gap-2 border py-6 shadow-sm"
              variant="outline"
              onClick={onOpenFile}
            >
              <Plus className="text-primary mb-1 size-8" />
              <div className="flex flex-col items-center">
                <span className="text-lg font-semibold">Yeni Dosya Yükle</span>
                <span className="text-muted-foreground text-xs font-normal">
                  Bilgisayarından .ekap dosyası seç
                </span>
              </div>
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Dosyalarda ara..."
              className="bg-background/50 border-muted-foreground/20 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Main Lists Area */}
      <div className="flex-1 overflow-y-auto p-8 pt-6">
        <div className="mx-auto w-full max-w-5xl space-y-10">
          {/* Active Sessions */}
          {sessions.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Monitor className="text-primary size-5" />
                <h2 className="text-xl font-semibold">Açık Dosyalar</h2>
                <Badge className="text-muted-foreground font-mono text-[10px]" variant="secondary">
                  {filteredActive.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredActive.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onOpenSession(session.id)}
                    className="group bg-card hover:bg-accent/30 relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-md"
                  >
                    <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium" title={session.fileName}>
                        {session.fileName}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {session.isDirty ? 'Kaydedilmemiş değişiklikler' : 'Düzenleniyor'}
                      </p>
                    </div>
                    {session.isDirty && <div className="mr-2 size-2 rounded-full bg-amber-500" />}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Files */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground size-5" />
                <h2 className="text-xl font-semibold">Son Dosyalar</h2>
              </div>
              {recentFiles.length > 0 && onClearRecent && (
                <Button variant="ghost" size="sm" onClick={onClearRecent} className="h-7 text-xs">
                  Geçmişi Temizle
                </Button>
              )}
            </div>

            {filteredRecent.length === 0 ? (
              <div className="text-muted-foreground bg-muted/20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12">
                <Calendar className="mb-3 size-10 opacity-20" />
                <p>Henüz geçmiş dosya yok</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="text-muted-foreground grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium tracking-wider uppercase">
                  <div className="col-span-6 sm:col-span-5">Dosya Adı</div>
                  <div className="col-span-6 text-right sm:col-span-4 sm:text-left">Son Erişim</div>
                  <div className="hidden text-right sm:col-span-3 sm:block">Boyut</div>
                </div>
                <div className="space-y-1">
                  {filteredRecent.map((file) => (
                    <div
                      key={file.id + file.lastOpened}
                      className="hover:bg-muted/50 hover:border-border group grid cursor-default grid-cols-12 items-center gap-4 rounded-lg border border-transparent px-4 py-3 transition-colors"
                    >
                      <div className="col-span-6 flex min-w-0 items-center gap-3 sm:col-span-5">
                        <div className="bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground flex size-8 items-center justify-center rounded transition-all group-hover:shadow-sm">
                          <FileText className="size-4" />
                        </div>
                        <span className="truncate font-medium">{file.name}</span>
                      </div>

                      <div className="text-muted-foreground col-span-6 text-right text-sm sm:col-span-4 sm:text-left">
                        {formatDate(file.lastOpened)}
                      </div>

                      <div className="text-muted-foreground hidden text-right font-mono text-sm sm:col-span-3 sm:block">
                        {file.size ? `${(file.size / 1024).toFixed(1)} KB` : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
