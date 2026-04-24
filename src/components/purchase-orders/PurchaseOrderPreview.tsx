import type { PurchaseOrder } from "@/hooks/usePurchaseOrders";

export const computePurchaseOrderPreview = (po: PurchaseOrder | null) => {
  const lines = po?.lines ?? [];
  const subtotal = lines.reduce((sum, line) => sum + Number(line.quantity ?? 0) * Number(line.unit_price ?? 0), 0);
  const tax = lines.reduce((sum, line) => sum + (Number(line.quantity ?? 0) * Number(line.unit_price ?? 0) * Number(line.tax_rate ?? 0)) / 100, 0);
  const computedTotal = subtotal + tax;
  const storedTotal = Number(po?.total ?? 0);
  const missingTaxRates = lines.some((line) => line.tax_rate === null || line.tax_rate === undefined || Number.isNaN(Number(line.tax_rate)));
  return {
    lines,
    subtotal,
    tax,
    computedTotal,
    storedTotal,
    missingCurrency: !!po && !po.currency,
    missingLines: !!po && lines.length === 0,
    missingTaxRates,
    totalsMismatch: !!po && Math.abs(computedTotal - storedTotal) > 1,
  };
};

interface Props {
  po: PurchaseOrder | null;
  mode: "invoice" | "pdf";
}

export default function PurchaseOrderPreview({ po, mode }: Props) {
  const summary = computePurchaseOrderPreview(po);
  const hasIssues = summary.missingCurrency || summary.missingLines || summary.missingTaxRates || summary.totalsMismatch;

  return (
    <div className="space-y-4 text-sm">
      <p>
        {mode === "invoice" ? "Cette action va créer une facture fournisseur depuis le BC " : "Cette action va générer le PDF avec les mêmes lignes et les mêmes totaux que le BC "}
        <span className="font-mono font-semibold text-foreground">{po?.po_number}</span>
        {mode === "pdf" ? ". Vous pouvez annuler avant le téléchargement." : "."}
      </p>
      {hasIssues && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
          {summary.missingCurrency && <div>Devise manquante.</div>}
          {summary.missingLines && <div>Aucune ligne détaillée disponible.</div>}
          {summary.missingTaxRates && <div>Chaque ligne doit avoir un taux de TVA.</div>}
          {summary.totalsMismatch && <div>Incohérence détectée : total lignes {summary.computedTotal.toLocaleString("fr-FR")} {po?.currency} vs total BC {summary.storedTotal.toLocaleString("fr-FR")} {po?.currency}.</div>}
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
          {summary.lines.length ? summary.lines.map((line, index) => {
            const ht = Number(line.quantity ?? 0) * Number(line.unit_price ?? 0);
            const hasTaxRate = line.tax_rate !== null && line.tax_rate !== undefined && !Number.isNaN(Number(line.tax_rate));
            const taxRate = hasTaxRate ? Number(line.tax_rate) : 0;
            const tax = (ht * taxRate) / 100;
            return (
              <div key={line.id ?? index} className="grid grid-cols-12 gap-2 px-3 py-2 text-[12px]">
                <span className="col-span-5 text-foreground">{line.description}</span>
                <span className="col-span-2 text-right font-mono">{Number(line.quantity ?? 0).toLocaleString("fr-FR")}</span>
                <span className="col-span-2 text-right font-mono">{Number(line.unit_price ?? 0).toLocaleString("fr-FR")}</span>
                <span className={hasTaxRate ? "col-span-1 text-right font-mono" : "col-span-1 text-right font-mono text-destructive"}>{hasTaxRate ? `${taxRate}%` : "—"}</span>
                <span className="col-span-2 text-right font-mono text-foreground">{(ht + tax).toLocaleString("fr-FR")}</span>
              </div>
            );
          }) : <div className="px-3 py-3 text-muted-foreground">Aucune ligne détaillée disponible.</div>}
        </div>
      </div>
      <div className="ml-auto w-full max-w-xs space-y-1 rounded-md bg-secondary/50 p-3">
        <div className="flex justify-between"><span>Total HT</span><span className="font-mono text-foreground">{summary.subtotal.toLocaleString("fr-FR")} {po?.currency}</span></div>
        <div className="flex justify-between"><span>TVA</span><span className="font-mono text-foreground">{summary.tax.toLocaleString("fr-FR")} {po?.currency}</span></div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total TTC calculé</span><span className="font-mono text-primary">{summary.computedTotal.toLocaleString("fr-FR")} {po?.currency}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Total BC</span><span className="font-mono">{summary.storedTotal.toLocaleString("fr-FR")} {po?.currency}</span></div>
        {!!po?.tax_amount && <div className="flex justify-between text-muted-foreground"><span>TVA BC</span><span className="font-mono">{Number(po.tax_amount).toLocaleString("fr-FR")} {po.currency}</span></div>}
      </div>
    </div>
  );
}