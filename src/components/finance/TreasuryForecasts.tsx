import { tr } from "@/lib/phrases";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import RecordActions from "@/components/shared/RecordActions";
import { toast } from "sonner";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";

export default function TreasuryForecasts() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["treasury_forecasts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("treasury_forecasts").select("*").order("expected_on");
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState({ label: "", direction: "in", amount_xof: "", expected_on: "" });

  const add = async () => {
    const amount = Number(f.amount_xof);
    if (!f.label.trim() || !f.expected_on || !(amount >= 0) || f.amount_xof === "") { toast.error("Libellé, montant et date sont obligatoires"); return; }
    const { error } = await supabase.from("treasury_forecasts").insert({
      label: f.label.trim().slice(0, 200), direction: f.direction, amount_xof: amount, expected_on: f.expected_on,
    });
    if (error) { toast.error("Ajout impossible : " + error.message); return; }
    toast.success("Prévision ajoutée");
    setF({ label: "", direction: "in", amount_xof: "", expected_on: "" });
    qc.invalidateQueries({ queryKey: ["treasury_forecasts"] });
  };

  const totalIn = data.filter((d) => d.direction === "in").reduce((s, d) => s + Number(d.amount_xof), 0);
  const totalOut = data.filter((d) => d.direction === "out").reduce((s, d) => s + Number(d.amount_xof), 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="font-display font-bold text-foreground">{tr("Prévisions de trésorerie")}</h3>
        <div className="text-xs font-mono text-muted-foreground">
          {tr("Entrées")} <span className="text-gh-green">{fmt(totalIn)}</span> · Sorties <span className="text-gh-rose">{fmt(totalOut)}</span> · Net <span className="text-foreground">{fmt(totalIn - totalOut)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
        <Input className="md:col-span-2" placeholder={tr("Libellé (ex. 2e tranche bailleur)")} value={f.label} maxLength={200} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>
          <option value="in">{tr("Entrée")}</option><option value="out">{tr("Sortie")}</option>
        </select>
        <Input type="number" min={0} placeholder={tr("Montant XOF")} value={f.amount_xof} onChange={(e) => setF({ ...f, amount_xof: e.target.value })} />
        <div className="flex gap-2">
          <Input type="date" value={f.expected_on} onChange={(e) => setF({ ...f, expected_on: e.target.value })} />
          <GhButton onClick={add}>{tr("Ajouter")}</GhButton>
        </div>
      </div>
      {data.length === 0 ? <div className="text-sm text-muted-foreground">{tr("Aucune prévision saisie.")}</div> : (
        <div className="divide-y divide-border">
          {data.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground w-24">{d.expected_on}</span>
              <Pill color={d.direction === "in" ? "green" : "rose"}>{d.direction === "in" ? "Entrée" : "Sortie"}</Pill>
              <span className="flex-1 text-foreground truncate">{d.label}</span>
              <span className={`font-mono ${d.direction === "in" ? "text-gh-green" : "text-gh-rose"}`}>{fmt(Number(d.amount_xof))}</span>
              <RecordActions table="treasury_forecasts" id={d.id} record={d} entityLabel="Prévision" queryKeys={["treasury_forecasts"]}
                fields={[{ key: "label", label: "Libellé", required: true }, { key: "direction", label: "Sens", type: "select", options: [{ value: "in", label: "Entrée" }, { value: "out", label: "Sortie" }] },
                  { key: "amount_xof", label: "Montant (XOF)", type: "number", required: true }, { key: "expected_on", label: "Date prévue", type: "date", required: true }, { key: "notes", label: "Notes", type: "textarea" }]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
