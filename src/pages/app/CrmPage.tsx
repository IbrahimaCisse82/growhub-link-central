import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, FileText, Repeat, TrendingUp, AlertCircle, Wallet, Plus, Search,
  Download, CheckCircle2, MoreHorizontal, Trash2, FileDown, CreditCard, BarChart3,
  ArrowRightCircle, Receipt, Mail, BellRing, FileBarChart,
} from "lucide-react";
import {
  useContreparties, useInvoices, useSubscriptions, useCrmStats,
  useDeleteContrepartie, useDeleteInvoice, useUpdateInvoiceStatus,
  useMarkOccurrencePaid, useSubscriptionOccurrences, useDeleteSubscription,
  useQuotes, useDeleteQuote, useConvertQuoteToInvoice, useUpdateQuoteStatus,
  type PartyType, type InvoiceStatus, type QuoteStatus,
} from "@/hooks/useCrm";
import CreateContrepartieDialog from "@/components/dialogs/CreateContrepartieDialog";
import CreateInvoiceDialog from "@/components/dialogs/CreateInvoiceDialog";
import CreateSubscriptionDialog from "@/components/dialogs/CreateSubscriptionDialog";
import CreateQuoteDialog from "@/components/dialogs/CreateQuoteDialog";
import CreateCreditNoteDialog from "@/components/dialogs/CreateCreditNoteDialog";
import QuoteDetailDialog from "@/components/dialogs/QuoteDetailDialog";
import RecordPaymentDialog from "@/components/dialogs/RecordPaymentDialog";
import EditContrepartieDialog from "@/components/dialogs/EditContrepartieDialog";
import EditSubscriptionDialog from "@/components/dialogs/EditSubscriptionDialog";
import InvoiceDetailDialog from "@/components/dialogs/InvoiceDetailDialog";
import CrmAnalyticsTab from "@/components/crm/CrmAnalyticsTab";
import RecouvrementTab from "@/components/crm/RecouvrementTab";
import CrmReportsTab from "@/components/crm/CrmReportsTab";
import CrmGlobalSearch from "@/components/crm/CrmGlobalSearch";
import ContrepartieDetailPanel from "@/components/crm/ContrepartieDetailPanel";
import { Edit2, Eye } from "lucide-react";
import { exportInvoicePdf } from "@/lib/invoicePdfExport";
import { exportToCSV } from "@/lib/exportUtils";
import { exportToExcel } from "@/lib/excelExport";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

const partyBadge: Record<PartyType, string> = {
  client: "bg-blue-500/10 text-blue-600",
  bailleur: "bg-purple-500/10 text-purple-600",
  fournisseur: "bg-orange-500/10 text-orange-600",
  partenaire: "bg-emerald-500/10 text-emerald-600",
};

const statusBadge: Record<InvoiceStatus, string> = {
  brouillon: "bg-gray-500/10 text-gray-600",
  envoyee: "bg-blue-500/10 text-blue-600",
  payee_partiel: "bg-amber-500/10 text-amber-600",
  payee: "bg-emerald-500/10 text-emerald-600",
  en_retard: "bg-red-500/10 text-red-600",
  annulee: "bg-gray-500/10 text-gray-500",
};

const statusLabel: Record<InvoiceStatus, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee_partiel: "Payée partiel",
  payee: "Payée",
  en_retard: "En retard",
  annulee: "Annulée",
};

const quoteBadge: Record<QuoteStatus, string> = {
  brouillon: "bg-gray-500/10 text-gray-600",
  envoye: "bg-blue-500/10 text-blue-600",
  accepte: "bg-emerald-500/10 text-emerald-600",
  refuse: "bg-red-500/10 text-red-600",
  expire: "bg-amber-500/10 text-amber-600",
  converti: "bg-purple-500/10 text-purple-600",
};

const quoteLabel: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
  converti: "Converti",
};

export default function CrmPage() {
  const [tab, setTab] = useState("dashboard");
  const [partyFilter, setPartyFilter] = useState<PartyType | "all">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | "emise" | "recue">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<QuoteStatus | "all">("all");
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteDateFrom, setQuoteDateFrom] = useState("");
  const [quoteDateTo, setQuoteDateTo] = useState("");
  const [quoteMinAmount, setQuoteMinAmount] = useState("");

  const [openContrepartie, setOpenContrepartie] = useState(false);
  const [openInvoice, setOpenInvoice] = useState(false);
  const [openSub, setOpenSub] = useState(false);
  const [openQuote, setOpenQuote] = useState(false);
  const [creditNoteFor, setCreditNoteFor] = useState<string | null>(null);
  const [detailQuoteId, setDetailQuoteId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [openOccurrencesFor, setOpenOccurrencesFor] = useState<string | null>(null);
  const [editingParty, setEditingParty] = useState<any | null>(null);
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [detailPartyId, setDetailPartyId] = useState<string | null>(null);

  const { data: stats } = useCrmStats();
  const { data: parties } = useContreparties(partyFilter);
  const { data: invoices } = useInvoices({ direction: directionFilter, status: statusFilter });
  const { data: subscriptions } = useSubscriptions("all");
  const { data: quotes } = useQuotes({ status: quoteStatusFilter });

  const deleteParty = useDeleteContrepartie();
  const deleteInv = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteSub = useDeleteSubscription();
  const deleteQuote = useDeleteQuote();
  const convertQuote = useConvertQuoteToInvoice();
  const updateQuoteStatus = useUpdateQuoteStatus();

  const filteredParties = parties?.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInvoices = useMemo(() => {
    return invoices?.filter((i: any) => {
      if (search) {
        const q = search.toLowerCase();
        const match = i.invoice_number.toLowerCase().includes(q) || (i.contrepartie as any)?.name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom && i.issue_date < dateFrom) return false;
      if (dateTo && i.issue_date > dateTo) return false;
      if (minAmount && Number(i.total) < Number(minAmount)) return false;
      return true;
    });
  }, [invoices, search, dateFrom, dateTo, minAmount]);

  const filteredQuotes = useMemo(() => {
    return quotes?.filter((q: any) => {
      if (quoteSearch) {
        const t = quoteSearch.toLowerCase();
        const m = q.quote_number.toLowerCase().includes(t) || (q.contrepartie as any)?.name?.toLowerCase().includes(t);
        if (!m) return false;
      }
      if (quoteDateFrom && q.issue_date < quoteDateFrom) return false;
      if (quoteDateTo && q.issue_date > quoteDateTo) return false;
      if (quoteMinAmount && Number(q.total) < Number(quoteMinAmount)) return false;
      return true;
    });
  }, [quotes, quoteSearch, quoteDateFrom, quoteDateTo, quoteMinAmount]);

  const downloadPdf = async (invId: string) => {
    const { data } = await import("@/integrations/supabase/client").then((m) =>
      m.supabase.from("crm_invoices").select("*, contrepartie:crm_contreparties(*), lines:crm_invoice_lines(*)").eq("id", invId).single()
    );
    if (data) exportInvoicePdf(data as any);
  };

  const exportPartiesCsv = () => {
    if (!filteredParties?.length) return;
    exportToCSV(
      filteredParties.map((p: any) => ({
        name: p.name, type: p.party_type, email: p.email, phone: p.phone,
        city: p.city, country: p.country, ninea: p.ninea, contact: p.contact_person,
      })),
      "contreparties",
      [
        { key: "name", label: "Nom" }, { key: "type", label: "Type" },
        { key: "email", label: "Email" }, { key: "phone", label: "Téléphone" },
        { key: "city", label: "Ville" }, { key: "country", label: "Pays" },
        { key: "ninea", label: "NINEA" }, { key: "contact", label: "Contact" },
      ]
    );
  };

  const exportInvoicesXlsx = () => {
    if (!filteredInvoices?.length) return;
    exportToExcel(
      [{
        name: "Factures",
        rows: filteredInvoices.map((i: any) => ({
          number: i.invoice_number,
          date: i.issue_date,
          due_date: i.due_date || "",
          contrepartie: (i.contrepartie as any)?.name || "",
          direction: i.direction === "emise" ? "Vente" : "Achat",
          status: statusLabel[i.status as InvoiceStatus],
          subtotal: Number(i.subtotal || 0),
          tax: Number(i.tax_amount || 0),
          total: Number(i.total || 0),
          paid: Number(i.amount_paid || 0),
          remaining: Number(i.total || 0) - Number(i.amount_paid || 0),
          currency: i.currency,
        })),
        columns: [
          { key: "number", label: "N°" }, { key: "date", label: "Date" },
          { key: "due_date", label: "Échéance" }, { key: "contrepartie", label: "Contrepartie" },
          { key: "direction", label: "Type" }, { key: "status", label: "Statut" },
          { key: "subtotal", label: "Sous-total" }, { key: "tax", label: "TVA" },
          { key: "total", label: "Total" }, { key: "paid", label: "Payé" },
          { key: "remaining", label: "Reste dû" }, { key: "currency", label: "Devise" },
        ],
      }],
      "factures-crm"
    );
  };

  const exportSubsCsv = () => {
    if (!subscriptions?.length) return;
    exportToCSV(
      subscriptions.map((s: any) => ({
        name: s.name,
        contrepartie: (s.contrepartie as any)?.name || "",
        amount: Number(s.amount),
        currency: s.currency,
        frequency: s.frequency,
        status: s.status,
        start: s.start_date,
        next: s.next_due_date,
        auto: s.auto_invoice ? "Oui" : "Non",
      })),
      "abonnements",
      [
        { key: "name", label: "Nom" }, { key: "contrepartie", label: "Contrepartie" },
        { key: "amount", label: "Montant" }, { key: "currency", label: "Devise" },
        { key: "frequency", label: "Fréquence" }, { key: "status", label: "Statut" },
        { key: "start", label: "Début" }, { key: "next", label: "Prochaine échéance" },
        { key: "auto", label: "Auto-facturation" },
      ]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM & Facturation</h1>
          <p className="text-sm text-muted-foreground">Gestion des clients, bailleurs, fournisseurs, factures et abonnements</p>
        </div>
        <Button variant="outline" onClick={() => setGlobalSearchOpen(true)}>
          <Search size={14} className="mr-2" /> Recherche globale
          <kbd className="ml-2 px-1.5 py-0.5 bg-secondary rounded text-[10px]">⌘K</kbd>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building2 size={14} /> Contreparties</div>
          <div className="text-2xl font-bold mt-1">{stats?.partiesCount ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText size={14} /> Factures</div>
          <div className="text-2xl font-bold mt-1">{stats?.invoicesCount ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp size={14} /> En instance</div>
          <div className="text-lg font-bold mt-1 text-amber-600">{fmt(stats?.outstanding ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle size={14} /> En retard</div>
          <div className="text-lg font-bold mt-1 text-red-600">{fmt(stats?.overdue ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet size={14} /> Dettes fournisseurs</div>
          <div className="text-lg font-bold mt-1 text-orange-600">{fmt(stats?.payables ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Repeat size={14} /> Abonnements actifs</div>
          <div className="text-2xl font-bold mt-1">{stats?.activeSubs ?? 0}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 size={14} className="mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="contreparties">Contreparties</TabsTrigger>
          <TabsTrigger value="quotes">Devis</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="recouvrement"><BellRing size={14} className="mr-1" /> Recouvrement</TabsTrigger>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          <TabsTrigger value="reports"><FileBarChart size={14} className="mr-1" /> Rapports</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Factures à surveiller</h3>
            <div className="space-y-2">
              {invoices?.filter((i) => i.status === "en_retard" || i.status === "envoyee").slice(0, 5).map((i) => (
                <div key={i.id} onClick={() => setDetailInvoiceId(i.id)} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/40 hover:bg-secondary cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <Badge className={statusBadge[i.status as InvoiceStatus]}>{statusLabel[i.status as InvoiceStatus]}</Badge>
                    <span className="font-mono text-xs">{i.invoice_number}</span>
                    <span className="text-muted-foreground">{(i.contrepartie as any)?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{fmt(Number(i.total) - Number(i.amount_paid || 0), i.currency)}</span>
                    {i.due_date && <span className="text-xs text-muted-foreground">échéance {new Date(i.due_date).toLocaleDateString("fr-FR")}</span>}
                  </div>
                </div>
              ))}
              {!invoices?.length && <div className="text-sm text-muted-foreground text-center py-6">Aucune facture</div>}
            </div>
          </Card>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-4">
          <CrmAnalyticsTab />
        </TabsContent>

        {/* CONTREPARTIES */}
        <TabsContent value="contreparties" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={partyFilter} onValueChange={(v) => setPartyFilter(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="client">Clients</SelectItem>
                  <SelectItem value="bailleur">Bailleurs</SelectItem>
                  <SelectItem value="fournisseur">Fournisseurs</SelectItem>
                  <SelectItem value="partenaire">Partenaires</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportPartiesCsv}><Download size={14} className="mr-1" /> Export CSV</Button>
              <Button onClick={() => setOpenContrepartie(true)}><Plus size={14} className="mr-1" /> Nouvelle contrepartie</Button>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Nom</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Ville</th>
                    <th className="text-left p-3">NINEA</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties?.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3"><Badge className={partyBadge[p.party_type as PartyType]}>{p.party_type}</Badge></td>
                      <td className="p-3 text-muted-foreground">{p.email || p.phone || "—"}</td>
                      <td className="p-3 text-muted-foreground">{p.city || "—"}</td>
                      <td className="p-3 font-mono text-xs">{p.ninea || "—"}</td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setDetailPartyId(p.id)}>
                              <Eye size={14} className="mr-2" /> Voir détail 360°
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingParty(p)}>
                              <Edit2 size={14} className="mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => confirm("Supprimer ?") && deleteParty.mutate(p.id)}>
                              <Trash2 size={14} className="mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {!filteredParties?.length && (
                    <tr><td colSpan={6} className="text-center p-8 text-sm text-muted-foreground">Aucune contrepartie</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* QUOTES (DEVIS) */}
        <TabsContent value="quotes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[280px] flex-wrap">
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="N° ou client..." value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} />
              </div>
              <Select value={quoteStatusFilter} onValueChange={(v) => setQuoteStatusFilter(v as any)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="envoye">Envoyé</SelectItem>
                  <SelectItem value="accepte">Accepté</SelectItem>
                  <SelectItem value="refuse">Refusé</SelectItem>
                  <SelectItem value="expire">Expiré</SelectItem>
                  <SelectItem value="converti">Converti</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="w-[150px]" value={quoteDateFrom} onChange={(e) => setQuoteDateFrom(e.target.value)} title="Date émission ≥" />
              <Input type="date" className="w-[150px]" value={quoteDateTo} onChange={(e) => setQuoteDateTo(e.target.value)} title="Date émission ≤" />
              <Input type="number" className="w-[130px]" placeholder="Montant min" value={quoteMinAmount} onChange={(e) => setQuoteMinAmount(e.target.value)} />
              {(quoteDateFrom || quoteDateTo || quoteMinAmount || quoteSearch) && (
                <Button variant="ghost" size="sm" onClick={() => { setQuoteDateFrom(""); setQuoteDateTo(""); setQuoteMinAmount(""); setQuoteSearch(""); }}>Réinitialiser</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setOpenQuote(true)}><Plus size={14} className="mr-1" /> Nouveau devis</Button>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Client</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Statut</th>
                    <th className="text-left p-3">Validité</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes?.map((q: any) => (
                    <tr key={q.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setDetailQuoteId(q.id)}>
                      <td className="p-3 font-mono text-xs">{q.quote_number}</td>
                      <td className="p-3 text-xs">{new Date(q.issue_date).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3">{(q.contrepartie as any)?.name || "—"}</td>
                      <td className="p-3 text-right font-mono">{fmt(Number(q.total), q.currency)}</td>
                      <td className="p-3"><Badge className={quoteBadge[q.status as QuoteStatus]}>{quoteLabel[q.status as QuoteStatus]}</Badge></td>
                      <td className="p-3 text-xs text-muted-foreground">{q.valid_until ? new Date(q.valid_until).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setDetailQuoteId(q.id)}>
                              <FileText size={14} className="mr-2" /> Voir détail
                            </DropdownMenuItem>
                            {q.status === "brouillon" && (
                              <DropdownMenuItem onClick={() => updateQuoteStatus.mutate({ id: q.id, status: "envoye" })}>
                                <Mail size={14} className="mr-2" /> Marquer envoyé
                              </DropdownMenuItem>
                            )}
                            {(q.status === "envoye" || q.status === "accepte" || q.status === "brouillon") && q.status !== "converti" && (
                              <DropdownMenuItem onClick={() => convertQuote.mutate(q.id)}>
                                <ArrowRightCircle size={14} className="mr-2" /> Convertir en facture
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600" onClick={() => confirm("Supprimer ?") && deleteQuote.mutate(q.id)}>
                              <Trash2 size={14} className="mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {!filteredQuotes?.length && (
                    <tr><td colSpan={7} className="text-center p-8 text-sm text-muted-foreground">Aucun devis</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[280px] flex-wrap">
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="N° ou contrepartie..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as any)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="emise">Émises</SelectItem>
                  <SelectItem value="recue">Reçues</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="payee_partiel">Payée partiel</SelectItem>
                  <SelectItem value="payee">Payée</SelectItem>
                  <SelectItem value="en_retard">En retard</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="w-[150px]" placeholder="Du" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Date émission ≥" />
              <Input type="date" className="w-[150px]" placeholder="Au" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Date émission ≤" />
              <Input type="number" className="w-[130px]" placeholder="Montant min" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
              {(dateFrom || dateTo || minAmount) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setMinAmount(""); }}>Réinitialiser</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportInvoicesXlsx}><Download size={14} className="mr-1" /> Export Excel</Button>
              <Button onClick={() => setOpenInvoice(true)}><Plus size={14} className="mr-1" /> Nouvelle facture</Button>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Contrepartie</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-right p-3">Reste dû</th>
                    <th className="text-left p-3">Statut</th>
                    <th className="text-left p-3">Échéance</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices?.map((i) => {
                    const remaining = Number(i.total) - Number(i.amount_paid || 0);
                    return (
                      <tr key={i.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setDetailInvoiceId(i.id)}>
                        <td className="p-3 font-mono text-xs">{i.invoice_number}</td>
                        <td className="p-3 text-xs">{new Date(i.issue_date).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3">{(i.contrepartie as any)?.name || "—"}</td>
                        <td className="p-3"><Badge variant="outline" className="text-xs">{i.direction === "emise" ? "Vente" : "Achat"}</Badge></td>
                        <td className="p-3 text-right font-mono">{fmt(Number(i.total), i.currency)}</td>
                        <td className="p-3 text-right font-mono font-semibold">{remaining > 0 ? fmt(remaining, i.currency) : "—"}</td>
                        <td className="p-3"><Badge className={statusBadge[i.status as InvoiceStatus]}>{statusLabel[i.status as InvoiceStatus]}</Badge></td>
                        <td className="p-3 text-xs text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setDetailInvoiceId(i.id)}>
                                <FileText size={14} className="mr-2" /> Voir détail
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadPdf(i.id)}><FileDown size={14} className="mr-2" /> Télécharger PDF</DropdownMenuItem>
                              {remaining > 0 && i.status !== "annulee" && (
                                <DropdownMenuItem onClick={() => setPaymentInvoice({ id: i.id, remaining, currency: i.currency })}>
                                  <CreditCard size={14} className="mr-2" /> Enregistrer paiement
                                </DropdownMenuItem>
                              )}
                              {i.status === "brouillon" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: i.id, status: "envoyee" })}>
                                  <CheckCircle2 size={14} className="mr-2" /> Marquer envoyée
                                </DropdownMenuItem>
                              )}
                              {i.direction === "emise" && !i.is_credit_note && (
                                <DropdownMenuItem onClick={() => setCreditNoteFor(i.id)}>
                                  <Receipt size={14} className="mr-2" /> Créer un avoir
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600" onClick={() => confirm("Supprimer ?") && deleteInv.mutate(i.id)}>
                                <Trash2 size={14} className="mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredInvoices?.length && (
                    <tr><td colSpan={9} className="text-center p-8 text-sm text-muted-foreground">Aucune facture</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTIONS */}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Suivez vos abonnements récurrents et leurs échéances</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportSubsCsv}><Download size={14} className="mr-1" /> Export CSV</Button>
              <Button onClick={() => setOpenSub(true)}><Plus size={14} className="mr-1" /> Nouvel abonnement</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subscriptions?.map((s) => (
              <SubscriptionCard
                key={s.id}
                sub={s}
                expanded={openOccurrencesFor === s.id}
                onToggle={() => setOpenOccurrencesFor(openOccurrencesFor === s.id ? null : s.id)}
                onEdit={() => setEditingSub(s)}
                onDelete={() => confirm("Supprimer cet abonnement et ses échéances ?") && deleteSub.mutate(s.id)}
              />
            ))}
            {!subscriptions?.length && (
              <Card className="p-8 text-center text-sm text-muted-foreground col-span-full">Aucun abonnement</Card>
            )}
          </div>
        </TabsContent>

        {/* RECOUVREMENT */}
        <TabsContent value="recouvrement" className="mt-4">
          <RecouvrementTab />
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-4">
          <CrmReportsTab />
        </TabsContent>
      </Tabs>

      <CreateContrepartieDialog open={openContrepartie} onOpenChange={setOpenContrepartie} />
      <CreateInvoiceDialog open={openInvoice} onOpenChange={setOpenInvoice} />
      <CreateSubscriptionDialog open={openSub} onOpenChange={setOpenSub} />
      <CreateQuoteDialog open={openQuote} onOpenChange={setOpenQuote} />
      <QuoteDetailDialog open={!!detailQuoteId} onOpenChange={(v) => !v && setDetailQuoteId(null)} quoteId={detailQuoteId} />
      <CreateCreditNoteDialog open={!!creditNoteFor} onOpenChange={(v) => !v && setCreditNoteFor(null)} sourceInvoiceId={creditNoteFor} />
      <EditContrepartieDialog open={!!editingParty} onOpenChange={(v) => !v && setEditingParty(null)} contrepartie={editingParty} />
      <EditSubscriptionDialog open={!!editingSub} onOpenChange={(v) => !v && setEditingSub(null)} subscription={editingSub} />
      <InvoiceDetailDialog open={!!detailInvoiceId} onOpenChange={(v) => !v && setDetailInvoiceId(null)} invoiceId={detailInvoiceId} />
      {paymentInvoice && (
        <RecordPaymentDialog
          open={!!paymentInvoice}
          onOpenChange={(v) => !v && setPaymentInvoice(null)}
          invoiceId={paymentInvoice.id}
          remaining={paymentInvoice.remaining}
          currency={paymentInvoice.currency}
        />
      )}
    </div>
  );
}

function SubscriptionCard({ sub, expanded, onToggle, onEdit, onDelete }: { sub: any; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { data: occurrences } = useSubscriptionOccurrences(expanded ? sub.id : undefined);
  const markPaid = useMarkOccurrencePaid();
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold truncate">{sub.name}</h4>
            <Badge variant={sub.status === "actif" ? "default" : "secondary"} className="text-xs">{sub.status}</Badge>
            {sub.auto_invoice && <Badge variant="outline" className="text-[10px]">Auto-facturation</Badge>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{(sub.contrepartie as any)?.name}</div>
          {sub.category && <Badge variant="outline" className="text-xs mt-1">{sub.category}</Badge>}
        </div>
        <div className="text-right">
          <div className="font-mono font-bold">{fmt(Number(sub.amount), sub.currency)}</div>
          <div className="text-xs text-muted-foreground">{sub.frequency}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs">
        <span className="text-muted-foreground">Prochaine : <span className="font-medium text-foreground">{new Date(sub.next_due_date).toLocaleDateString("fr-FR")}</span></span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onToggle}>{expanded ? "Masquer" : "Échéances"}</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit2 size={12} /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={onDelete}><Trash2 size={12} /></Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-1 max-h-60 overflow-y-auto">
          {occurrences?.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-xs py-1">
              <span className={o.is_paid ? "text-muted-foreground line-through" : ""}>{new Date(o.due_date).toLocaleDateString("fr-FR")}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{fmt(Number(o.amount), o.currency)}</span>
                <Button size="sm" variant={o.is_paid ? "ghost" : "outline"} className="h-6 text-[10px]" onClick={() => markPaid.mutate({ id: o.id, paid: !o.is_paid })}>
                  {o.is_paid ? "✓ Payé" : "Marquer payé"}
                </Button>
              </div>
            </div>
          ))}
          {!occurrences?.length && <div className="text-xs text-muted-foreground text-center py-2">—</div>}
        </div>
      )}
    </Card>
  );
}
