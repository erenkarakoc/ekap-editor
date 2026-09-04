'use client';

import { useState, useTransition } from 'react';
import { Loader2, OctagonX } from 'lucide-react';
import { toast } from 'sonner';

import { pozAktariminiDurdurAction } from '@features/admin/actions';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@shared/components/ui/alert-dialog';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';

export function TransferStopButton({ aktarimId }: { aktarimId: string }) {
  const [open, setOpen] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [isPending, startTransition] = useTransition();

  function durdur() {
    startTransition(async () => {
      const sonuc = await pozAktariminiDurdurAction({ aktarimId, gerekce });
      if (!sonuc.ok) {
        toast.error(sonuc.error);
        return;
      }
      toast.success('Aktarım yerini yeni bir koşuya bırakacak şekilde durduruldu.');
      setOpen(false);
      setGerekce('');
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <OctagonX data-icon="inline-start" /> Aktarımı durdur
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bu aktarımı durdur?</AlertDialogTitle>
          <AlertDialogDescription>
            Ham kayıtlar silinmez. Koşu `stopped` olur ve yeni aktarım ayrı bir soykütüğü kaydı
            olarak başlatılır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="aktarim-durdurma-gerekcesi">Durdurma gerekçesi</Label>
          <Textarea
            id="aktarim-durdurma-gerekcesi"
            value={gerekce}
            onChange={(event) => setGerekce(event.target.value)}
            placeholder="Hangi düzeltme veya yeni koşu nedeniyle yerini bıraktığını yazın."
            rows={4}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending || gerekce.trim().length < 5}
            onClick={durdur}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <OctagonX />}
            Durdurmayı onayla
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
