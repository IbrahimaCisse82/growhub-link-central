import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Mail, Phone, MapPin, FileText, Receipt, Repeat,
  TrendingUp, AlertCircle, CheckCircle2, Activity, BellRing,
} from "lucide-react";
import { fmtCurrency } from "@/lib/crmFormatters";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrepartieId: string | null;
}

export default function ContrepartieDetailPanel({ open, onOpenChange, contrepartieId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["contrepartie-detail-360", contrepartieId],
    enabled: !!contrepartieId && open,
    queryFn: async () => {
      const [partyRes, invRes, qRes, subRes, remRes] = await Promise.all([
        supabase.from("crm_contreparties").select("*").eq("id", contrepartieId!).single(),
        supabase
          .from("crm_invoices")
          .select("id, invoice_number, issue_date, due_date, status, total, amount_paid, currency, direction, is_credit_note, reminder_count")
          .eq("contrepartie_id", contrepartieId!)
          .order("issue_date", { ascending: false }),
        supabase
          .from("crm_quotes")
          .select("id, quote_number, issue_date, valid_until, status, total, currency, converted_invoice_id")
          .eq("contrepartie_id", contrepartieId!)
          .order("issue_date", { ascending: false }),
        supabase
          .from("crm_subscriptions")
          .select("id, name, amount, currency, frequency, status, next_due_date")
          .eq("contrepartie_id", contrepartieId!)
          .order("next_due_date"),
        supabase
          .from("invoice_reminders")
          .select("id, sent_at, template, recipient_email, invoice_id")
          .in(
            "invoice_id",
            (
              await supabase.from("crm_invoices").select("id").eq("contrepartie_id", contrepartieId!)
            ).data?.map((x) => x.id) ?? ["00000000-0000-0000-0000-000000000000"],
          )
          .order("sent_at", { ascending: false })
          .limit(20),
      ]);
      return {
        party: partyRes.data,
        invoices: invRes.data ?? [],
        quotes: qRes.data ?? [],
        subscriptions: subRes.data ?? [],
        reminders: remRes.data ?? [],
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const emises = data.invoices.filter((i: any) => i.direction === "emise" && !i.is_credit_note);
    const totalInvoiced = emises.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
    const totalPaid = emises.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);
    const outstanding = emises
      .filter((i: any) => !["payee", "annulee", "brouillon"].includes(i.status))
      .reduce((s: number, i: any) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);
    const overdue = emises
      .filter((i: any) => i.status === "en_retard")
      .reduce((s: number, i: any) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);
    return { totalInvoiced, totalPaid, outstanding, overdue, count: emises.length };
  }, [data]);

  const timeline = useMemo(() => {
    if (!data) return [];
    const events: Array<{ at: string; kind: string; label: string; meta?: string; icon: any; color: string }> = [];
    for (const i of data.invoices) {
      events.push({
        at: i.issue_date,
        kind: "invoice",
        label: `Facture ${i.invoice_number} émise`,
        meta: fmtCurrency(Number(i.total), i.currency),
        icon: Receipt,
        color: "text-emerald-600",
      });
    }
    for (const q of data.quotes) {
      events.push({
        at: q.issue_date,
        kind: "quote",
        label: `Devis ${q.quote_number} ${q.status}`,
        meta: fmtCurrency(Number(q.total), q.currency),
        icon: FileText,
        color: "text-violet-600",
      });
    }
    for (const r of data.reminders) {
      events.push({
        at: r.sent_at,
        kind: "reminder",
        label: `Relance envoyée (${r.template})`,
        meta: r.recipient_email,
        icon: BellRing,
        color: "text-amber-600",
      });
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 30);
  }, [data]);

  const p = data?.party as any;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 size={18} />
            {isLoading ? "Chargement..." : p?.name ?? "Contrepartie"}
          </SheetTitle>
        </SheetHeader>

        {p && (
          <div className="space-y-4 mt-4">
            {/* Identité */}
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{p.party_type}</Badge>
                {p.is_active === false && <Badge variant="destructive">Inactive</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                {p.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail size={14} /> {p.email}
                  </div>
                )}
                {p.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={14} /> {p.phone}
                  </div>
                )}
                {(p.city || p.country) && (
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                    <MapPin size={14} /> {[p.address, p.city, p.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {p.ninea && (
                  <div className="text-muted-foreground">
                    <span className="text-xs">NINEA: </span>
                    <span className="font-mono text-xs">{p.ninea}</span>
                  </div>
                )}
                {p.tax_id && (
                  <div className="text-muted-foreground">
                    <span className="text-xs">Tax ID: </span>
                    <span className="font-mono text-xs">{p.tax_id}</span>
                  </div>
                )}
                {p.contact_person && (
                  <div className="col-span-2 text-muted-foreground">
                    <span className="text-xs">Contact: </span>
                    {p.contact_person}
                  </div>
                )}
              </div>
            </Card>

            {/* KPIs financiers */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card className="p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><FileText size={12} /> Facturé</div>
                  <div className="text-sm font-bold mt-1">{fmtCurrency(stats.totalInvoiced)}</div>
                  <div className="text-[10px] text-muted-foreground">{stats.count} factures</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 size={12} /> Payé</div>
                  <div className="text-sm font-bold mt-1 text-emerald-600">{fmtCurrency(stats.totalPaid)}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp size={12} /> En instance</div>
                  <div className="text-sm font-bold mt-1 text-amber-600">{fmtCurrency(stats.outstanding)}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><AlertCircle size={12} /> En retard</div>
                  <div className="text-sm font-bold mt-1 text-red-600">{fmtCurrency(stats.overdue)}</div>
                </Card>
              </div>
            )}

            {/* Onglets */}
            <Tabs defaultValue="timeline">
              <TabsList className="w-full">
                <TabsTrigger value="timeline" className="flex-1"><Activity size={12} className="mr-1" /> Timeline</TabsTrigger>
                <TabsTrigger value="invoices" className="flex-1">Factures ({data?.invoices.length ?? 0})</TabsTrigger>
                <TabsTrigger value="quotes" className="flex-1">Devis ({data?.quotes.length ?? 0})</TabsTrigger>
                <TabsTrigger value="subs" className="flex-1">Abos ({data?.subscriptions.length ?? 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-3">
                <Card className="p-3">
                  {timeline.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-6">Aucune activité</div>
                  ) : (
                    <div className="space-y-2">
                      {timeline.map((e, idx) => {
                        const Icon = e.icon;
                        return (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <Icon size={14} className={`mt-0.5 ${e.color}`} />
                            <div className="flex-1">
                              <div>{e.label}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(e.at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                                {e.meta && ` · ${e.meta}`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="invoices" className="mt-3">
                <Card className="p-3">
                  {data?.invoices.length ? (
                    <div className="space-y-1">
                      {data.invoices.map((i: any) => (
                        <div key={i.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{i.invoice_number}</span>
                            <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                            {i.is_credit_note && <Badge variant="secondary" className="text-[10px]">Avoir</Badge>}
                          </div>
                          <div className="text-xs">
                            <span className="font-mono">{fmtCurrency(Number(i.total), i.currency)}</span>
                            {Number(i.amount_paid) > 0 && (
                              <span className="text-emerald-600 ml-2">payé {fmtCurrency(Number(i.amount_paid), i.currency)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-6">Aucune facture</div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="quotes" className="mt-3">
                <Card className="p-3">
                  {data?.quotes.length ? (
                    <div className="space-y-1">
                      {data.quotes.map((q: any) => (
                        <div key={q.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{q.quote_number}</span>
                            <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                          </div>
                          <span className="font-mono text-xs">{fmtCurrency(Number(q.total), q.currency)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-6">Aucun devis</div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="subs" className="mt-3">
                <Card className="p-3">
                  {data?.subscriptions.length ? (
                    <div className="space-y-1">
                      {data.subscriptions.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <Repeat size={12} className="text-amber-600" />
                            <span>{s.name}</span>
                            <Badge variant="outline" className="text-[10px]">{s.frequency}</Badge>
                          </div>
                          <div className="text-xs">
                            <span className="font-mono">{fmtCurrency(Number(s.amount), s.currency)}</span>
                            <span className="text-muted-foreground ml-2">{new Date(s.next_due_date).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-6">Aucun abonnement</div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
