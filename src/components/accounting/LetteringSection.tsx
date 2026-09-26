import { tr } from "@/lib/phrases";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " XOF";
const input = "bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-primary";
const th = "text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";

function nextCode(used: string[]): string {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < 26 * 26 * 26; i++) {
    const c = (i >= 676 ? A[Math.floor(i / 676) % 26] : "") + A[Math.floor(i / 26) % 26] + A[i % 26];
    if (!used.includes(c)) return c;
  }
  return String(Date.now());
}

export default function LetteringSection() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("411");
  const [show, setShow] = useState<"open" | "all">("open");
  const [sel, setSel] = useState<string[]>([]);
  const { data = [] } = useQuery({
    queryKey: ["acc-letter", code], enabled: code.length >= 3,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounting_entry_lines")
        .select("id, account_code, label, debit, credit, lettrage, accounting_entries!inner(entry_date, label, piece_ref, status)")
        .like("account_code", `${code}%`).eq("accounting_entries.status", "validee").limit(2000);
      if (error) throw error;
      return (data ?? []).sort((a, b) => a.accounting_entries.entry_date.localeCompare(b.accounting_entries.entry_date));
    },
  });
  const rows = useMemo(() => data.filter((l) => show === "all" || !l.lettrage), [data, show]);
  const picked = data.filter((l) => sel.includes(l.id));
  const sD = picked.reduce((s, l) => s + Number(l.debit), 0);
  const sC = picked.reduce((s, l) => s + Number(l.credit), 0);
  const sameAccount = new Set(picked.map((l) => l.account_code)).size <= 1;
  const ok = picked.length >= 2 && Math.abs(sD - sC) < 0.01 && sameAccount;
  const inv = () => { setSel([]); qc.invalidateQueries({ queryKey: ["acc-letter"] }); };
  const letter = useMutation({
    mutationFn: async () => {
      const c = nextCode(data.map((l) => l.lettrage).filter((x): x is string => !!x));
      const { error } = await supabase.from("accounting_entry_lines").update({ lettrage: c, lettered_at: new Date().toISOString() }).in("id", sel);
      if (error) throw error;
      return c;
    },
    onSuccess: (c) => { toast.success(`Lignes lettrées « ${c} »`); inv(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const unletter = useMutation({
    mutationFn: async (c: string) => {
      const ids = data.filter((l) => l.lettrage === c).map((l) => l.id);
      const { error } = await supabase.from("accounting_entry_lines").update({ lettrage: null, lettered_at: null }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lettrage supprimé"); inv(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const openBalance = data.filter((l) => !l.lettrage).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
  return (
    <GhCard title={tr("Lettrage des comptes de tiers")} badge={`Non lettré : ${fmt(openBalance)}`} noPadding
      action={<div className="flex gap-2">
        <input className={`${input} font-mono w-28`} placeholder={tr("Compte (ex. 411)")} value={code} onChange={(e) => { setCode(e.target.value); setSel([]); }} />
        <select className={input} value={show} onChange={(e) => setShow(e.target.value as "open" | "all")}>
          <option value="open">{tr("Non lettrées")}</option><option value="all">{tr("Toutes")}</option>
        </select></div>}>
      <p className="px-3 py-2 text-[11.5px] text-muted-foreground border-b border-border">
        {tr("Rapprochez factures et règlements d'un même compte : cochez des lignes dont le total débit égale le total crédit, puis lettrez-les.")}
      </p>
      {code.length < 3 ? <p className="p-5 text-sm text-muted-foreground">{tr("Saisissez un compte de tiers (3 chiffres minimum, ex. 401, 411, 421).")}</p> :
        rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{tr("Aucune ligne validée à lettrer.")}</p> : (
        <table className="w-full"><thead><tr><th className={th}></th><th className={th}>{tr("Date")}</th><th className={th}>{tr("Compte")}</th><th className={th}>{tr("Pièce")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Débit")}</th><th className={th}>{tr("Crédit")}</th><th className={th}>{tr("Lettre")}</th></tr></thead>
          <tbody>{rows.map((l) => (
            <tr key={l.id} className={sel.includes(l.id) ? "bg-primary/10" : ""}>
              <td className={td}>{!l.lettrage && isAdmin && <input type="checkbox" aria-label={tr("Sélectionner")} checked={sel.includes(l.id)} onChange={(e) => setSel(e.target.checked ? [...sel, l.id] : sel.filter((x) => x !== l.id))} />}</td>
              <td className={td}>{l.accounting_entries.entry_date}</td><td className={`${td} font-mono`}>{l.account_code}</td>
              <td className={td}>{l.accounting_entries.piece_ref ?? "—"}</td><td className={td}>{l.label ?? l.accounting_entries.label}</td>
              <td className={`${td} font-mono`}>{Number(l.debit) ? fmt(Number(l.debit)) : ""}</td><td className={`${td} font-mono`}>{Number(l.credit) ? fmt(Number(l.credit)) : ""}</td>
              <td className={`${td} font-mono`}>{l.lettrage ? <span className="flex items-center gap-1">{l.lettrage}{isAdmin && <button aria-label={tr("Délettrer")} onClick={() => unletter.mutate(l.lettrage!)} className="text-muted-foreground hover:text-destructive"><Unlink size={11} /></button>}</span> : ""}</td>
            </tr>))}</tbody></table>)}
      {isAdmin && sel.length > 0 && (
        <div className="flex items-center justify-between p-3 border-t border-border text-[12px]">
          <span className={ok ? "text-primary" : "text-destructive"}>
            Débit {fmt(sD)} · Crédit {fmt(sC)} {!sameAccount ? "· comptes différents" : !ok ? `· écart ${fmt(sD - sC)}` : "· équilibré"}
          </span>
          <GhButton onClick={() => ok && letter.mutate()}><Link2 size={13} /> {tr("Lettrer")}</GhButton>
        </div>)}
    </GhCard>
  );
}
