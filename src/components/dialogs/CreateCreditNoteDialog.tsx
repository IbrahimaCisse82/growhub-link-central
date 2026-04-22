import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useCreateCreditNote, useInvoice } from "@/hooks/useCrm";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; sourceInvoiceId: string | null; }

export default function CreateCreditNoteDialog({ open, onOpenChange, sourceInvoiceId }: Props) {
  const { data: src } = useInvoice(sourceInvoiceId || undefined);
  const create = useCreateCreditNote();
  const [reason, setReason] = useState("");

  useEffect(() => { setReason(""); }, [sourceInvoiceId]);

  const submit = async () => {
    if (!sourceInvoiceId) return;
    await create.mutateAsync({ source_invoice_id: sourceInvoiceId, reason });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un avoir</DialogTitle>
        </DialogHeader>
        {!src ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="bg-secondary/40 rounded p-3 text-sm">
              <div className="text-xs text-muted-foreground uppercase mb-1">Facture d'origine</div>
              <div className="font-semibold">{src.invoice_number}</div>
              <div className="text-xs text-muted-foreground">{(src.contrepartie as any)?.name} · {Number(src.total).toLocaleString("fr-FR")} {src.currency}</div>
            </div>
            <div>
              <Label>Motif de l'avoir</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Remise commerciale, marchandise non conforme..." />
            </div>
            <p className="text-xs text-muted-foreground">
              Toutes les lignes seront recopiées avec des quantités négatives. Le total sera négatif et viendra en déduction du chiffre d'affaires.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!sourceInvoiceId || create.isPending}>
            {create.isPending && <Loader2 size={14} className="animate-spin mr-1" />} Créer l'avoir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
