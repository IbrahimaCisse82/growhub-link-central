import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGrantTransactions, useDeleteTransaction, type GrantTransaction } from "@/hooks/useGrantDetail";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GhButton from "@/components/shared/GhButton";
import NomenclatureSelect from "@/components/budgets/NomenclatureSelect";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SignedDownloadLink from "@/components/shared/SignedDownloadLink";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
const inputCls = "flex h-10 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

export { useGrantTransactions };

const APPROVAL_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-secondary text-muted-foreground" },
  submitted: { label: "Soumis", cls: "bg-amber-500/10 text-amber-600" },
  approved: { label: "Approuvé", cls: "bg-green-500/10 text-green-600" },
  rejected: { label: "Rejeté", cls: "bg-destructive/10 text-destructive" },
};

function ApprovalBadge({ status }: { status: string }) {
  const s = APPROVAL_MAP[status] ?? APPROVAL_MAP.draft;
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${s.cls}`}>{s.label}</span>;
}

function ApprovalActions({ tx, grantId }: { tx: GrantTransaction; grantId: string }) {
  const qc = useQueryClient();
  const status = (tx as any).approval_status ?? "draft";

  const update = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("grant_transactions").update({ approval_status: newStatus, approved_at: newStatus === "approved" ? new Date().toISOString() : null } as any).eq("id", tx.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_transactions", grantId] }); toast({ title: "✓ Statut mis à jour" }); },
  });

  if (status === "draft") return <button onClick={() => update.mutate("submitted")} className="text-[10px] text-amber-600 hover:underline">Soumettre</button>;
  if (status === "submitted") return (
    <>
      <button onClick={() => update.mutate("approved")} className="text-[10px] text-green-600 hover:underline">✓</button>
      <button onClick={() => update.mutate("rejected")} className="text-[10px] text-destructive hover:underline">✗</button>
    </>
  );
  return null;
}

interface GrantTransactionsTabProps {
  grantId: string;
  grantCode: string;
}

export default function GrantTransactionsTab({ grantId, grantCode }: GrantTransactionsTabProps) {
  const { user } = useAuth();
  const { data: transactions, isLoading } = useGrantTransactions(grantId);
  const deleteMutation = useDeleteTransaction(grantId);
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<GrantTransaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<GrantTransaction | null>(null);

  const totalAmount = transactions?.reduce((s, t) => s + (t.amount ?? 0), 0) ?? 0;
  const pendingCount = transactions?.filter(t => (t as any).approval_status === "submitted").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-foreground">Transactions</span>
          <span className="font-mono text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{transactions?.length ?? 0} saisies</span>
          <span className="font-mono text-[11px] font-semibold text-primary">{fmt(totalAmount)} €</span>
          {pendingCount > 0 && <span className="font-mono text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">{pendingCount} en attente</span>}
        </div>
        <GhButton onClick={() => { setEditTx(null); setShowForm(true); }}>+ Nouvelle transaction</GhButton>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-secondary rounded-xl animate-pulse" />)}</div>
      ) : !transactions || transactions.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">💳</div>
          <div className="text-sm text-muted-foreground mb-3">Aucune transaction enregistrée</div>
          <GhButton onClick={() => { setEditTx(null); setShowForm(true); }}>+ Première transaction</GhButton>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-secondary">
                  {["Date", "Libellé", "Code budget", "Fournisseur", "Réf.", "Local", "Taux", "EUR", "Statut", "Pièce", ""].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-mono uppercase text-muted-foreground tracking-wider border-b border-border whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-secondary/50 transition-colors group">
                    <td className="px-3 py-2.5 border-b border-border font-mono text-foreground whitespace-nowrap">{tx.transaction_date}</td>
                    <td className="px-3 py-2.5 border-b border-border font-semibold text-foreground max-w-[200px] truncate">{tx.label}</td>
                    <td className="px-3 py-2.5 border-b border-border">
                      {tx.budget_code ? <span className="font-mono text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{tx.budget_code}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 border-b border-border text-muted-foreground">{tx.vendor ?? "—"}</td>
                    <td className="px-3 py-2.5 border-b border-border text-muted-foreground font-mono text-[11px]">{tx.reference ?? "—"}</td>
                    <td className="px-3 py-2.5 border-b border-border font-mono text-muted-foreground whitespace-nowrap">{(tx as any).amount_local ? fmt((tx as any).amount_local) : "—"}</td>
                    <td className="px-3 py-2.5 border-b border-border font-mono text-muted-foreground text-[11px]">{(tx as any).exchange_rate && (tx as any).exchange_rate !== 1 ? (tx as any).exchange_rate : "—"}</td>
                    <td className="px-3 py-2.5 border-b border-border font-mono font-semibold text-foreground whitespace-nowrap">{fmt(tx.amount)} €</td>
                    <td className="px-3 py-2.5 border-b border-border">
                      <ApprovalBadge status={(tx as any).approval_status ?? "draft"} />
                    </td>
                    <td className="px-3 py-2.5 border-b border-border">
                      {tx.receipt_url ? (
                        <SignedDownloadLink bucket="receipts" pathOrUrl={tx.receipt_url} className="text-primary hover:underline text-[11px]">📎 Voir</SignedDownloadLink>
                      ) : <span className="text-muted-foreground text-[11px]">—</span>}
                    </td>
                    <td className="px-3 py-2.5 border-b border-border">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ApprovalActions tx={tx} grantId={grantId} />
                        <button onClick={() => { setEditTx(tx); setShowForm(true); }} className="text-[11px] text-muted-foreground hover:text-foreground">✏️</button>
                        <button onClick={() => setDeleteTx(tx)} className="text-[11px] text-muted-foreground hover:text-destructive">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-foreground/5">
                  <td colSpan={8} className="px-3 py-2.5 text-right text-[11px] font-bold text-foreground uppercase">Total</td>
                  <td className="px-3 py-2.5 font-mono text-sm font-bold text-primary">{fmt(totalAmount)} €</td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TransactionFormDialog open={showForm} onOpenChange={setShowForm} grantId={grantId} grantCode={grantCode} editData={editTx} userId={user?.id} />

      <AlertDialog open={!!deleteTx} onOpenChange={(o) => { if (!o) setDeleteTx(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette transaction ?</AlertDialogTitle>
            <AlertDialogDescription>La transaction « {deleteTx?.label} » de {fmt(deleteTx?.amount ?? 0)} € sera définitivement supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTx && deleteMutation.mutate(deleteTx.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TransactionFormDialog({ open, onOpenChange, grantId, grantCode, editData, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; grantId: string; grantCode: string; editData: GrantTransaction | null; userId?: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [budgetCode, setBudgetCode] = useState("");
  const [vendor, setVendor] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState("1");
  const [amountLocal, setAmountLocal] = useState("");
  const isEdit = !!editData;

  const handleOpenChange = (o: boolean) => {
    if (o && editData) {
      setLabel(editData.label ?? ""); setAmount(String(editData.amount ?? ""));
      setDate(editData.transaction_date ?? new Date().toISOString().slice(0, 10));
      setBudgetCode(editData.budget_code ?? ""); setVendor(editData.vendor ?? "");
      setReference(editData.reference ?? ""); setDescription(editData.description ?? "");
      setCategory(editData.category ?? ""); setReceiptUrl(editData.receipt_url ?? null);
      setExchangeRate(String((editData as any).exchange_rate ?? "1"));
      setAmountLocal(String((editData as any).amount_local ?? ""));
    } else if (o) {
      setLabel(""); setAmount(""); setDate(new Date().toISOString().slice(0, 10));
      setBudgetCode(""); setVendor(""); setReference(""); setDescription(""); setCategory(""); setReceiptUrl(null);
      setExchangeRate("1"); setAmountLocal("");
    }
    onOpenChange(o);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${grantId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
      if (error) throw error;
      setReceiptUrl(path);
      toast({ title: "Pièce jointe uploadée" });
    } catch (err) {
      toast({ title: "Erreur upload", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        grant_id: grantId, label, amount: parseFloat(amount) || 0, transaction_date: date,
        budget_code: budgetCode || null, vendor: vendor || null, reference: reference || null,
        description: description || null, category: category || null, receipt_url: receiptUrl, created_by: userId ?? null,
        exchange_rate: parseFloat(exchangeRate) || 1, amount_local: parseFloat(amountLocal) || 0,
        nomenclature_code: budgetCode || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("grant_transactions").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grant_transactions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_transactions", grantId] }); onOpenChange(false); toast({ title: isEdit ? "Transaction modifiée" : "Transaction créée" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? "Modifier la transaction" : "Nouvelle transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Libellé *</label><input value={label} onChange={e => setLabel(e.target.value)} required className={inputCls} placeholder="Ex: Achat matériel informatique" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Montant local</label><input type="number" step="0.01" value={amountLocal} onChange={e => { setAmountLocal(e.target.value); const loc = parseFloat(e.target.value) || 0; const rate = parseFloat(exchangeRate) || 1; setAmount(String(Math.round((loc / rate) * 100) / 100)); }} className={inputCls} placeholder="Devise locale" /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Taux change</label><input type="number" step="0.0001" value={exchangeRate} onChange={e => { setExchangeRate(e.target.value); const loc = parseFloat(amountLocal) || 0; const rate = parseFloat(e.target.value) || 1; setAmount(String(Math.round((loc / rate) * 100) / 100)); }} className={inputCls} placeholder="1 EUR =" /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Montant EUR *</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className={inputCls} /></div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Code budgétaire Enabel</label>
              <NomenclatureSelect value={budgetCode} onValueChange={(v) => setBudgetCode(v === "__none__" ? "" : v)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Catégorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                <option value="">— Sélectionner —</option>
                <option value="personnel">Personnel</option><option value="equipement">Équipement</option><option value="deplacement">Déplacement</option>
                <option value="formation">Formation</option><option value="services">Services externes</option><option value="fonctionnement">Fonctionnement</option><option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Fournisseur</label><input value={vendor} onChange={e => setVendor(e.target.value)} className={inputCls} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Référence</label><input value={reference} onChange={e => setReference(e.target.value)} className={inputCls} placeholder="N° facture" /></div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls + " h-auto"} /></div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Pièce justificative</label>
            {receiptUrl ? (
              <div className="flex items-center gap-2 text-sm">
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">📎 {receiptUrl.split("/").pop()}</a>
                <button type="button" onClick={() => setReceiptUrl(null)} className="text-destructive text-xs hover:underline">Retirer</button>
              </div>
            ) : (
              <div>
                <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${inputCls} justify-center items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground`}>
                  {uploading ? "Upload en cours…" : "📎 Joindre un fichier"}
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={saveMutation.isPending} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {saveMutation.isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la transaction"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
