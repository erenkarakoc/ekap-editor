'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateInfo: { version: string; releaseNotes: string | null } | null;
  downloadPercent: number;
  updateReady: boolean;
  onDownload: () => void;
  onInstall: () => void;
}

export function UpdateDialog({
  open,
  onOpenChange,
  updateInfo,
  downloadPercent,
  updateReady,
  onDownload,
  onInstall,
}: UpdateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Güncelleme{updateInfo ? `: v${updateInfo.version}` : ''}</DialogTitle>
        </DialogHeader>

        {updateInfo?.releaseNotes && (
          <div
            className="release-notes bg-muted/40 max-h-48 overflow-y-auto rounded border p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
          />
        )}

        {updateReady ? (
          <p className="text-muted-foreground text-sm">İndirme tamamlandı.</p>
        ) : downloadPercent >= 0 ? (
          <div className="space-y-1">
            <div className="bg-muted h-1.5 w-full rounded-full">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${Math.max(0, downloadPercent)}%` }}
              />
            </div>
            <p className="text-muted-foreground text-right text-xs">{downloadPercent}%</p>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Daha Sonra
          </Button>
          {updateReady ? (
            <Button onClick={onInstall}>Güncelle ve Yeniden Başlat</Button>
          ) : downloadPercent >= 0 ? (
            <Button disabled>İndiriliyor...</Button>
          ) : (
            <Button onClick={onDownload}>İndir</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
