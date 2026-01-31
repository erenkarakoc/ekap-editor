'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, FileText, Loader2, Upload, LockKeyhole, Plus, X, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  EkapDocument,
  decryptEkap,
  encryptEkap,
  parseEkapDocument,
  createEkapZip,
} from '@/lib/ekap-crypto';

import { EditorView, SortConfig } from '@/components/editor-view';
import { ModeToggle } from '@/components/mode-toggle';
import { HomeView, RecentFile } from '@/components/home-view';

interface TabSession {
  id: string;
  document: EkapDocument;
  fileName: string;
  isDirty: boolean;
  password: string; // Stored to allow saving without re-prompt
  // View state persistence
  searchQuery: string;
  sortConfig: SortConfig;
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<TabSession[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [tabToClose, setTabToClose] = useState<string | null>(null);

  // Load recent files on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ekap-recent-files');
      if (stored) {
        setRecentFiles(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent files', e);
    }
  }, []);

  const addToRecent = (file: { name: string; size?: number }) => {
    const newFile: RecentFile = {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      lastOpened: Date.now(),
      size: file.size,
    };

    setRecentFiles((prev) => {
      // Remove duplicates by name, keep most recent
      const others = prev.filter((f) => f.name !== file.name);
      const updated = [newFile, ...others].slice(0, 20); // Keep last 20
      localStorage.setItem('ekap-recent-files', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecent = () => {
    setRecentFiles([]);
    localStorage.removeItem('ekap-recent-files');
  };

  // Import Flow State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find((s) => s.id === activeTabId);
  const closingSession = sessions.find((s) => s.id === tabToClose);

  // --- Handlers ---

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setPendingFile(file);
      setPassword('');
    }
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPassword('');
    event.target.value = '';
  }, []);

  const createSession = (doc: EkapDocument, file: File, pwd: string) => {
    const newSession: TabSession = {
      id: crypto.randomUUID(),
      document: doc,
      fileName: file.name,
      password: pwd,
      isDirty: false,
      searchQuery: '',
      sortConfig: { key: 'index', direction: 'asc' },
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveTabId(newSession.id);
  };

  const handleDecrypt = async () => {
    if (!password || !pendingFile) {
      toast.error('Lütfen şifre girin');
      return;
    }

    setIsLoading(true);

    try {
      const fileData = await pendingFile.arrayBuffer();
      const decryptedData = await decryptEkap(fileData, password);

      if (!decryptedData) {
        toast.error('Dosya şifresi çözülemedi. Şifrenizi kontrol edin.');
        setIsLoading(false);
        return;
      }

      const doc = await parseEkapDocument(decryptedData);
      if (!doc) {
        toast.error('EKAP belgesi okunamadı');
        setIsLoading(false);
        return;
      }

      createSession(doc, pendingFile, password);
      addToRecent(pendingFile);

      setPendingFile(null);
      setPassword('');
      toast.success(`${pendingFile.name} yüklendi`);
    } catch (error) {
      console.error(error);
      toast.error('Hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Internal helper to actually remove the tab
  const executeCloseTab = (id: string) => {
    // If closing active tab, switch to another
    if (activeTabId === id) {
      const index = sessions.findIndex((s) => s.id === id);
      const nextSession = sessions[index - 1] || sessions[index + 1];
      setActiveTabId(nextSession ? nextSession.id : null);
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCloseTab = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    const session = sessions.find((s) => s.id === id);
    if (session?.isDirty) {
      setTabToClose(id);
    } else {
      executeCloseTab(id);
    }
  };

  const updateSession = (id: string, updates: Partial<TabSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleDocumentUpdate = (doc: EkapDocument) => {
    if (!activeTabId) return;
    updateSession(activeTabId, { document: doc, isDirty: true });
  };

  const saveSession = async (session: TabSession) => {
    setIsLoading(true);
    try {
      const zipData = await createEkapZip(session.document);
      const encryptedData = encryptEkap(zipData, session.password);

      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = session.fileName.replace('.ekap', '_modified.ekap') || 'doc.ekap';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      updateSession(session.id, { isDirty: false });

      addToRecent({
        name: session.fileName,
        size: encryptedData.byteLength,
      });

      toast.success('Kaydedildi');
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Kaydetme hatası');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeSession) return;
    await saveSession(activeSession);
  };

  const handleSaveAndClose = async () => {
    if (!closingSession) return;
    const success = await saveSession(closingSession);
    if (success) {
      executeCloseTab(closingSession.id);
      setTabToClose(null);
    }
  };

  const handleDiscard = () => {
    if (closingSession) {
      executeCloseTab(closingSession.id);
      setTabToClose(null);
    }
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        // Go to "home" / empty state to add new file
        // Simply unsetting active tab could show empty state, or strictly we want a way to "Add Tab"
        // For now, let's just trigger file input if we are in empty state,
        // OR if we are in active state, maybe show a "New Tab" dialog?
        // Simplest: Click the hidden file input
        fileInputRef.current?.click();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (activeSession) handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession]); // eslint-disable-line

  return (
    <div className="bg-background selection:bg-primary/10 flex h-screen flex-col">
      {/* --- App Toolbar --- */}
      <header className="bg-background/95 z-20 flex h-12 shrink-0 items-center justify-between overflow-hidden border-b px-2 backdrop-blur">
        {/* Left: Tabs Area */}
        <div className="flex h-full items-center overflow-hidden">
          {/* Branding - Fixed */}
          <div className="text-primary flex h-8 shrink-0 items-center gap-2 px-2">
            <div className="bg-primary text-primary-foreground flex aspect-square size-6 items-center justify-center rounded-sm">
              <FileText className="size-3.5" />
            </div>
            <span className="hidden text-sm font-semibold lg:inline-block">EKAP Editör</span>
          </div>

          <Button
            variant={activeTabId === null ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="mx-1 size-8 shrink-0"
            onClick={() => setActiveTabId(null)}
            title="Ana Sayfa"
          >
            <Home className="size-4" />
          </Button>

          {/* Tabs List - Scrollable */}
          <div className="relative flex flex-1 items-center overflow-hidden">
            <div
              className="no-scrollbar flex h-full items-center gap-1 overflow-x-auto overflow-y-hidden px-[10px]"
              style={{
                maskImage:
                  'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)',
              }}
            >
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setActiveTabId(session.id)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      handleCloseTab(e, session.id);
                    }
                  }}
                  className={cn(
                    'group relative flex h-[34px] max-w-[160px] min-w-[100px] shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all select-none',
                    activeTabId === session.id
                      ? 'bg-muted border-border text-foreground z-10'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent bg-transparent',
                  )}
                >
                  <FileText className="size-3 shrink-0" />
                  <span className="flex-1 truncate" title={session.fileName}>
                    {session.fileName}
                  </span>
                  {session.isDirty && (
                    <div className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                  )}
                  <div
                    className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
                    onClick={(e) => handleCloseTab(e, session.id)}
                  >
                    <X className="size-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Tab Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground mx-1 size-8 shrink-0 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Separator orientation="vertical" className="mx-1 h-4" />

          <ModeToggle />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="hidden h-8 cursor-pointer gap-2 sm:inline-flex"
          >
            <Upload className="size-4" />
            <kbd className="bg-muted text-muted-foreground hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
              <span className="text-xs">Ctrl O</span>
            </kbd>
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={!activeSession || isLoading}
            onClick={handleSave}
            className="ml-1 h-8 cursor-pointer gap-2"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span className="hidden sm:inline">Kaydet</span>
          </Button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {pendingFile && (
          <div className="bg-background/80 absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card animate-in fade-in slide-in-from-bottom-4 w-full max-w-sm rounded-xl border p-6 shadow-sm duration-300">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
                  <FileText className="size-6" />
                </div>
                <h3 className="text-lg font-semibold">{pendingFile.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {(pendingFile.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password-input">Şifre Girin</Label>
                  <Input
                    id="password-input"
                    type="password"
                    placeholder="******"
                    className="text-center text-lg tracking-widest"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !!password && handleDecrypt()}
                  />
                </div>
                <Button
                  className="w-full cursor-pointer"
                  size="lg"
                  onClick={handleDecrypt}
                  disabled={!password || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="mr-2 size-4" />
                  )}
                  Aç
                </Button>
                <Button
                  variant="ghost"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    setPendingFile(null);
                    setPassword('');
                  }}
                >
                  İptal
                </Button>
              </div>
            </div>
          </div>
        )}

        {!activeSession ? (
          <div
            className="flex h-full flex-1 flex-col overflow-hidden"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <HomeView
              sessions={sessions}
              activeTabId={activeTabId}
              recentFiles={recentFiles}
              onOpenFile={() => fileInputRef.current?.click()}
              onOpenSession={setActiveTabId}
              onClearRecent={clearRecent}
            />

            {/* Overlay for drag drop global on home screen */}
            {isDragOver && (
              <div className="bg-background/80 border-primary absolute inset-0 z-50 m-4 flex items-center justify-center rounded-xl border-4 border-dashed backdrop-blur-sm">
                <div className="text-center">
                  <Upload className="text-primary mx-auto mb-4 size-12 animate-bounce" />
                  <h3 className="text-primary text-2xl font-bold">Dosyayı Bırakın</h3>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="relative flex h-full flex-1 flex-col overflow-hidden"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {sessions.map((session) => (
              <EditorView
                key={session.id}
                document={session.document}
                onUpdate={handleDocumentUpdate}
                isActive={session.id === activeTabId}
                searchQuery={session.searchQuery}
                onSearchChange={(q) => updateSession(session.id, { searchQuery: q })}
                sortConfig={session.sortConfig}
                onSortChange={(c) => updateSession(session.id, { sortConfig: c })}
              />
            ))}

            <div
              className={cn(
                'bg-background/60 absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm transition-opacity duration-200',
                isDragOver ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <div className="border-primary bg-primary/5 rounded-xl border-4 border-dashed p-10 text-center">
                <Plus className="text-primary mx-auto mb-4 size-12" />
                <h3 className="text-primary text-2xl font-bold">Yeni Sekmede Aç</h3>
                <p className="text-muted-foreground">Dosyayı buraya bırakın</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <input ref={fileInputRef} type="file" accept=".ekap" hidden onChange={handleFileUpload} />

      <Dialog open={!!tabToClose} onOpenChange={(open) => !open && setTabToClose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaydedilmemiş değişiklikler var.</DialogTitle>
            <DialogDescription>
              &quot;{closingSession?.fileName}&quot; dosyasında kaydedilmemiş değişiklikler var.
              Kapatmadan önce kaydetmek ister misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="space-x-2">
            <Button variant="ghost" onClick={() => setTabToClose(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Kaydetme
            </Button>
            <Button onClick={handleSaveAndClose}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
