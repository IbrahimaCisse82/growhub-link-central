import { useState } from "react";
import { motion } from "framer-motion";
import { usePurchaseOrders, useUpdatePurchaseOrderStatus, useDeletePurchaseOrder, usePurchaseOrder, PO_STATUS_LABELS, type POStatus } from "@/hooks/usePurchaseOrders";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import EmptyState from "@/components/shared/EmptyState";
import { Pill } from "@/components/shared/Pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, MoreHorizontal, Download, Send, CheckCircle2, Trash2, PackageCheck, XCircle } from "lucide-react";
import CreatePurchaseOrderDialog from "@/components/dialogs/CreatePurchaseOrderDialog";
import { exportGrowhubPdf } from "@/lib/growhubPdf";
import { toast } from "sonner";

const statusVariant = (s: POStatus): "neutral" | "warning" | "success" | "danger" | "primary" => {
  switch (s) {
    case "brouillon": return "neutral";
    case "envoye": return "primary";
    case "confirme": return "warning";
    case "recu_partiel": return "warning";
    case "recu": return "success";
    case "annule": return "danger";
  }
};

export default function PurchaseOrdersPage() {
  const [filter, setFilter] = useState<POStatus | "all">("all");
  const { data, isLoading } = usePurchaseOrders(filter);
  const { data: org } = useOrgSettings();
  const updateStatus = useUpdatePurchaseOrderStatus();
  const del = useDeletePurchaseOrder();
  const [createOpen, setCreateOpen] = useState(false);

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
        action={<GhButton variant="primary" onClick={() => setCreateOpen(true)}><Plus size={14} className="mr-1" /> Nouveau BC</GhButton>}
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="brouillon">Brouillons</TabsTrigger>
          <TabsTrigger value="envoye">Envoyés</TabsTrigger>
          <TabsTrigger value="confirme">Confirmés</TabsTrigger>
          <TabsTrigger value="recu">Reçus</TabsTrigger>
          <TabsTrigger value="annule">Annulés</TabsTrigger>
        </TabsList>
      </Tabs>

      <GhCard>
        {isLoading ? <div className="text-[12px] text-muted-foreground p-4">Chargement…</div> :
          !data?.length ? <EmptyState icon={FileText} title="Aucun bon de commande" description="Créez votre premier BC pour commencer." /> :
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
              {data.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-[12px]">{po.po_number}</TableCell>
                  <TableCell>{po.supplier?.name ?? "—"}</TableCell>
                  <TableCell className="text-[12px]">{new Date(po.issue_date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-[12px]">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(po.total ?? 0).toLocaleString("fr-FR")} {po.currency}</TableCell>
                  <TableCell><Pill variant={statusVariant(po.status)}>{PO_STATUS_LABELS[po.status]}</Pill></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="p-1 hover:bg-secondary rounded"><MoreHorizontal size={14}/></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadPdf(po.id)}><Download size={13} className="mr-2"/> Télécharger PDF</DropdownMenuItem>
                        {po.status === "brouillon" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "envoye" })}><Send size={13} className="mr-2"/> Marquer envoyé</DropdownMenuItem>}
                        {po.status === "envoye" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "confirme" })}><CheckCircle2 size={13} className="mr-2"/> Confirmé par fournisseur</DropdownMenuItem>}
                        {(po.status === "confirme" || po.status === "recu_partiel") && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "recu" })}><PackageCheck size={13} className="mr-2"/> Marquer reçu</DropdownMenuItem>}
                        {po.status !== "annule" && po.status !== "recu" && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: "annule" })}><XCircle size={13} className="mr-2"/> Annuler</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Supprimer ce BC ?")) del.mutate(po.id); }}><Trash2 size={13} className="mr-2"/> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      </GhCard>

      <CreatePurchaseOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </motion.div>
  );
}
