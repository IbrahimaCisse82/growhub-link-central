import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useCreateSupplierInvoiceFromPurchaseOrder, usePurchaseOrders, useUpdatePurchaseOrderStatus, useDeletePurchaseOrder, PO_STATUS_LABELS, type POStatus, type PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import EmptyState from "@/components/shared/EmptyState";
import Pill from "@/components/shared/Pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, MoreHorizontal, Download, Send, CheckCircle2, Trash2, PackageCheck, XCircle, Receipt, Search } from "lucide-react";
import CreatePurchaseOrderDialog from "@/components/dialogs/CreatePurchaseOrderDialog";
import { exportGrowhubPdf } from "@/lib/growhubPdf";
import { toast } from "sonner";

const statusColor = (s: POStatus): "gray" | "blue" | "amber" | "green" | "rose" | "purple" => {
  switch (s) {
    case "brouillon": return "gray";
    case "envoye": return "blue";
    case "confirme": return "amber";
    case "recu_partiel": return "amber";
    case "recu": return "green";
    case "annule": return "rose";
  }
};

export default function PurchaseOrdersPage() {
  const [filter, setFilter] = useState<POStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePurchaseOrders(filter);
  const { data: org } = useOrgSettings();
  const updateStatus = useUpdatePurchaseOrderStatus();
  const createSupplierInvoice = useCreateSupplierInvoiceFromPurchaseOrder();
  const del = useDeletePurchaseOrder();
  const [createOpen, setCreateOpen] = useState(false);
  const [invoicePo, setInvoicePo] = useState<PurchaseOrder | null>(null);
  const [pdfPo, setPdfPo] = useState<PurchaseOrder | null>(null);
  const previewPo = invoicePo ?? pdfPo;
  const pageSize = 10;
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((po) => !q || po.po_number.toLowerCase().includes(q) || po.supplier?.name?.toLowerCase().includes(q) || po.reference?.toLowerCase().includes(q));
  }, [data, search]);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);
  const previewSubtotal = previewPo?.lines?.reduce((sum, line) => sum + Number(line.quantity ?? 0) * Number(line.unit_price ?? 0), 0) ?? 0;
  const previewTax = previewPo?.lines?.reduce((sum, line) => sum + (Number(line.quantity ?? 0) * Number(line.unit_price ?? 0) * Number(line.tax_rate ?? 0)) / 100, 0) ?? Number(previewPo?.tax_amount ?? 0);
  const previewTotal = previewSubtotal + previewTax;
  const storedTotal = Number(previewPo?.total ?? 0);
  const totalsMismatch = !!previewPo && Math.abs(previewTotal - storedTotal) > 1;
  const canConvertPreview = !!invoicePo?.currency && !!invoicePo?.lines?.length && !totalsMismatch;

  const confirmSupplierInvoice = async () => {
    if (!invoicePo) return;
    if (!canConvertPreview) {
      toast.error("Conversion impossible : vérifiez les lignes, la devise et les totaux du BC");
      return;
    }
    await createSupplierInvoice.mutateAsync(invoicePo.id);
    setInvoicePo(null);
  };

  const exportPreviewPdf = async () => {
    if (!pdfPo) return;
    await downloadPdf(pdfPo.id);
    setPdfPo(null);
  };

  const downloadPdf = async (poId: string) => {
    const { data: po, error } = await import("@/integrations/supabase/client").then(m =>
      m.supabase.from("purchase_orders")
        .select("*, supplier:crm_contreparties!supplier_id(name,contact_person,email,phone,address,city,ninea), lines:purchase_order_lines(*)")
        .eq("id", poId).single()
    );
    if (error || !po) { toast.error("Impossible de charger le BC"); return; }
    await exportGrowhubPdf({
      kind: "BON DE COMMANDE",
      number: (po as any).po_number,
      issue_date: (po as any).issue_date,
      due_date: (po as any).expected_delivery_date,
      reference: (po as any).reference,
      currency: (po as any).currency,
      party: {
        name: (po as any).supplier?.name ?? "Fournisseur",
        contact_person: (po as any).supplier?.contact_person,
        address: (po as any).supplier?.address,
        city: (po as any).supplier?.city,
        email: (po as any).supplier?.email,
        phone: (po as any).supplier?.phone,
        ninea: (po as any).supplier?.ninea,
      },
      lines: ((po as any).lines ?? []).map((l: any) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        tax_rate: l.tax_rate,
        line_total: Number(l.line_total ?? l.quantity * l.unit_price),
      })),
      subtotal: Number((po as any).subtotal ?? 0),
      tax_amount: Number((po as any).tax_amount ?? 0),
      total: Number((po as any).total ?? 0),
      notes: (po as any).notes,
      payment_terms: (po as any).payment_terms,
    }, org ?? null);
    toast.success("PDF généré");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Bons de commande"
        subtitle="Commandes émises auprès des fournisseurs"
        actions={<GhButton variant="primary" onClick={() => setCreateOpen(true)}><Plus size={14} className="mr-1" /> Nouveau BC</GhButton>}
      />

      <Tabs value={filter} onValueChange={(v) => { setFilter(v as any); setPage(1); }} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="brouillon">Brouillons</TabsTrigger>
          <TabsTrigger value="envoye">Envoyés</TabsTrigger>
          <TabsTrigger value="confirme">Confirmés</TabsTrigger>
          <TabsTrigger value="recu">Reçus</TabsTrigger>
          <TabsTrigger value="annule">Annulés</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher par N°, fournisseur, référence…" />
        </div>
        <div className="text-[12px] text-muted-foreground">{filteredOrders.length} BC trouvé(s)</div>
      </div>

      <GhCard title="Liste des bons de commande" noPadding>
        {isLoading ? <div className="text-[12px] text-muted-foreground p-4">Chargement…</div> :
          !data?.length ? <EmptyState icon="📦" title="Aucun bon de commande" description="Créez votre premier BC pour commencer." /> :
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Livraison prévue</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-[12px]">{po.po_number}</TableCell>
                    <TableCell>{po.supplier?.name ?? "—"}</TableCell>
                    <TableCell className="text-[12px]">{new Date(po.issue_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-[12px]">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(po.total ?? 0).toLocaleString("fr-FR")} {po.currency}</TableCell>
                    <TableCell><Pill color={statusColor(po.status)}>{PO_STATUS_LABELS[po.status]}</Pill></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="p-1 hover:bg-secondary rounded"><MoreHorizontal size={14}/></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPdfPo(po)}><Download size={13} className="mr-2"/> Télécharger PDF</DropdownMenuItem>
                          {po.status === "brouillon" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "envoye" })}><Send size={13} className="mr-2"/> Marquer envoyé</DropdownMenuItem>}
                          {po.status === "envoye" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "confirme" })}><CheckCircle2 size={13} className="mr-2"/> Confirmé par fournisseur</DropdownMenuItem>}
                          {(po.status === "confirme" || po.status === "recu_partiel") && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "recu" })}><PackageCheck size={13} className="mr-2"/> Marquer reçu</DropdownMenuItem>}
                          {!po.invoice_id && ["envoye", "confirme", "recu_partiel", "recu"].includes(po.status) && <DropdownMenuItem onClick={() => setInvoicePo(po)}><Receipt size={13} className="mr-2"/> Créer facture fournisseur</DropdownMenuItem>}
                          {po.status !== "annule" && po.status !== "recu" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "annule" })}><XCircle size={13} className="mr-2"/> Annuler</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Supprimer ce BC ?")) del.mutate(po.id); }}><Trash2 size={13} className="mr-2"/> Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!paginatedOrders.length && <div className="p-4 text-sm text-muted-foreground">Aucun BC ne correspond à la recherche.</div>}
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
              <span>Page {page} sur {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
              </div>
            </div>
          </>
        }
      </GhCard>

      <CreatePurchaseOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AlertDialog open={!!previewPo} onOpenChange={(open) => { if (!open) { setInvoicePo(null); setPdfPo(null); } }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{invoicePo ? "Créer la facture fournisseur ?" : "Exporter le BC en PDF ?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm">
                <p>
                  {invoicePo ? "Cette action va créer une facture fournisseur depuis le BC " : "Cette action va générer le PDF du BC "}<span className="font-mono font-semibold text-foreground">{previewPo?.po_number}</span>.
                </p>
                {(!previewPo?.currency || !previewPo?.lines?.length || totalsMismatch) && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                    {!previewPo?.currency && <div>Devise manquante.</div>}
                    {!previewPo?.lines?.length && <div>Aucune ligne détaillée disponible.</div>}
                    {totalsMismatch && <div>Incohérence détectée : total lignes {previewTotal.toLocaleString("fr-FR")} {previewPo?.currency} vs total BC {storedTotal.toLocaleString("fr-FR")} {previewPo?.currency}.</div>}
                  </div>
                )}
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 bg-secondary/70 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                    <span className="col-span-5">Désignation</span>
                    <span className="col-span-2 text-right">Qté</span>
                    <span className="col-span-2 text-right">PU</span>
                    <span className="col-span-1 text-right">TVA</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-border">
                    {previewPo?.lines?.length ? previewPo.lines.map((line, index) => {
                      const ht = Number(line.quantity ?? 0) * Number(line.unit_price ?? 0);
                      const tax = (ht * Number(line.tax_rate ?? 0)) / 100;
                      return (
                        <div key={line.id ?? index} className="grid grid-cols-12 gap-2 px-3 py-2 text-[12px]">
                          <span className="col-span-5 text-foreground">{line.description}</span>
                          <span className="col-span-2 text-right font-mono">{Number(line.quantity ?? 0).toLocaleString("fr-FR")}</span>
                          <span className="col-span-2 text-right font-mono">{Number(line.unit_price ?? 0).toLocaleString("fr-FR")}</span>
                          <span className="col-span-1 text-right font-mono">{Number(line.tax_rate ?? 0)}%</span>
                          <span className="col-span-2 text-right font-mono text-foreground">{(ht + tax).toLocaleString("fr-FR")}</span>
                        </div>
                      );
                    }) : <div className="px-3 py-3 text-muted-foreground">Aucune ligne détaillée disponible.</div>}
                  </div>
                </div>
                <div className="ml-auto w-full max-w-xs space-y-1 rounded-md bg-secondary/50 p-3">
                  <div className="flex justify-between"><span>Total HT</span><span className="font-mono text-foreground">{previewSubtotal.toLocaleString("fr-FR")} {previewPo?.currency}</span></div>
                  <div className="flex justify-between"><span>TVA</span><span className="font-mono text-foreground">{previewTax.toLocaleString("fr-FR")} {previewPo?.currency}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total TTC calculé</span><span className="font-mono text-primary">{previewTotal.toLocaleString("fr-FR")} {previewPo?.currency}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Total BC</span><span className="font-mono">{storedTotal.toLocaleString("fr-FR")} {previewPo?.currency}</span></div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={invoicePo ? confirmSupplierInvoice : exportPreviewPdf} disabled={invoicePo ? createSupplierInvoice.isPending || !canConvertPreview : !previewPo?.lines?.length || !previewPo?.currency}>
              {invoicePo ? "Créer la facture" : "Exporter PDF"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
