import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Plus, UserPlus, ExternalLink } from "lucide-react";
import { useStartupCrmSummary } from "@/hooks/useCrm";
import CreateQuoteDialog from "@/components/dialogs/CreateQuoteDialog";
import CreateContrepartieDialog from "@/components/dialogs/CreateContrepartieDialog";
import QuoteDetailDialog from "@/components/dialogs/QuoteDetailDialog";
import InvoiceDetailDialog from "@/components/dialogs/InvoiceDetailDialog";

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

const invoiceStatusBadge: Record<string, string> = {
  brouillon: "bg-gray-500/10 text-gray-600",
  envoyee: "bg-blue-500/10 text-blue-600",
  payee_partiel: "bg-amber-500/10 text-amber-600",
  payee: "bg-emerald-500/10 text-emerald-600",
  en_retard: "bg-red-500/10 text-red-600",
  annulee: "bg-gray-500/10 text-gray-500",
};
const quoteStatusBadge: Record<string, string> = {
  brouillon: "bg-gray-500/10 text-gray-600",
  envoye: "bg-blue-500/10 text-blue-600",
  accepte: "bg-emerald-500/10 text-emerald-600",
  refuse: "bg-red-500/10 text-red-600",
  expire: "bg-amber-500/10 text-amber-600",
  converti: "bg-purple-500/10 text-purple-600",
};

interface Props {
  startupId: string;
  startupName: string;
}

export default function StartupBillingTab({ startupId, startupName }: Props) {
  const { data, isLoading } = useStartupCrmSummary(startupId);
  const [openQuote, setOpenQuote] = useState(false);
  const [openParty, setOpenParty] = useState(false);
  const [detailQuoteId, setDetailQuoteId] = useState<string | null>(null);
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null);

  const invoices = data?.invoices ?? [];
  const quotes = data?.quotes ?? [];
  const partyId = data?.partyIds?.[0];

  const totalInvoiced = invoices.filter((i: any) => !i.is_credit_note).reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);
  const totalOutstanding = invoices
    .filter((i: any) => !["payee", "annulee"].includes(i.status))
    .reduce((s: number, i: any) => s + (Number(i.total || 0) - Number(i.amount_paid || 0)), 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Facturé</div><div className="text-lg font-bold mt-1">{fmt(totalInvoiced)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Encaissé</div><div className="text-lg font-bold mt-1 text-emerald-600">{fmt(totalPaid)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">En instance</div><div className="text-lg font-bold mt-1 text-amber-600">{fmt(totalOutstanding)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Devis</div><div className="text-lg font-bold mt-1">{quotes.length}</div></Card>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2">
        {!partyId ? (
          <Button onClick={() => setOpenParty(true)}>
            <UserPlus size={14} className="mr-1" /> Créer la contrepartie client pour {startupName}
          </Button>
        ) : (
          <>
            <Button onClick={() => setOpenQuote(true)}>
              <Plus size={14} className="mr-1" /> Nouveau devis
            </Button>
            <Button variant="outline" onClick={() => setOpenParty(true)}>
              <UserPlus size={14} className="mr-1" /> Ajouter une contrepartie
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Chargement...</Card>
      ) : !partyId ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Aucune contrepartie CRM liée à cette entreprise. Créez-en une pour générer des devis et factures.
        </Card>
      ) : (
        <>
          {/* Devis */}
          <Card>
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><FileText size={14} /> Devis ({quotes.length})</h3>
            </div>
            {quotes.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Aucun devis</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">N°</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q: any) => (
                    <tr key={q.id} className="border-t hover:bg-secondary/30 cursor-pointer" onClick={() => setDetailQuoteId(q.id)}>
                      <td className="p-2 font-mono text-xs">{q.quote_number}</td>
                      <td className="p-2 text-xs">{new Date(q.issue_date).toLocaleDateString("fr-FR")}</td>
                      <td className="p-2 text-right font-mono">{fmt(Number(q.total), q.currency)}</td>
                      <td className="p-2"><Badge className={quoteStatusBadge[q.status]}>{q.status}</Badge></td>
                      <td className="p-2"><ExternalLink size={12} className="text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Factures */}
          <Card>
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Receipt size={14} /> Factures ({invoices.length})</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Aucune facture</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">N°</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Reste dû</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i: any) => {
                    const remaining = Number(i.total) - Number(i.amount_paid || 0);
                    return (
                      <tr key={i.id} className="border-t hover:bg-secondary/30 cursor-pointer" onClick={() => setDetailInvoiceId(i.id)}>
                        <td className="p-2 font-mono text-xs flex items-center gap-1">
                          {i.invoice_number}
                          {i.is_credit_note && <Badge variant="outline" className="text-[9px] h-4">Avoir</Badge>}
                        </td>
                        <td className="p-2 text-xs">{new Date(i.issue_date).toLocaleDateString("fr-FR")}</td>
                        <td className="p-2 text-right font-mono">{fmt(Number(i.total), i.currency)}</td>
                        <td className="p-2 text-right font-mono">{remaining > 0 ? fmt(remaining, i.currency) : "—"}</td>
                        <td className="p-2"><Badge className={invoiceStatusBadge[i.status]}>{i.status}</Badge></td>
                        <td className="p-2"><ExternalLink size={12} className="text-muted-foreground" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      <CreateQuoteDialog open={openQuote} onOpenChange={setOpenQuote} defaultContrepartieId={partyId} />
      <CreateContrepartieDialog open={openParty} onOpenChange={setOpenParty} />
      <QuoteDetailDialog open={!!detailQuoteId} onOpenChange={(v) => !v && setDetailQuoteId(null)} quoteId={detailQuoteId} />
      <InvoiceDetailDialog open={!!detailInvoiceId} onOpenChange={(v) => !v && setDetailInvoiceId(null)} invoiceId={detailInvoiceId} />
    </div>
  );
}
