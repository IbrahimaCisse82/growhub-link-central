import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Handshake, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnerOutreach, useUpdatePartnerOutreach } from "@/hooks/useProjectPlan";
import { useAuth } from "@/hooks/useAuth";

const STATUSES = ["À envoyer", "Envoyé", "Relancé", "Entretien obtenu", "Réponse reçue", "Engagement", "Refus", "Sans suite"];

const statusColor: Record<string, string> = {
  "À envoyer": "bg-muted text-muted-foreground",
  "Envoyé": "bg-gh-blue/15 text-gh-blue border-gh-blue/30",
  "Relancé": "bg-gh-blue/15 text-gh-blue border-gh-blue/30",
  "Entretien obtenu": "bg-gh-green/15 text-gh-green border-gh-green/30",
  "Réponse reçue": "bg-gh-green/15 text-gh-green border-gh-green/30",
  "Engagement": "bg-gh-green/15 text-gh-green border-gh-green/30",
  "Refus": "bg-gh-rose/15 text-gh-rose border-gh-rose/30",
  "Sans suite": "bg-muted text-muted-foreground",
};

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy", { locale: fr });
  } catch {
    return d;
  }
}

export default function PartnerOutreachTab({ projectId }: { projectId: string }) {
  const { data: partners, isLoading } = usePartnerOutreach(projectId);
  const updatePartner = useUpdatePartnerOutreach(projectId);
  const { isAdmin, persona } = useAuth();
  const canEdit = isAdmin || persona === "project_manager";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!partners) return [];
    return partners.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search && !(`${p.institution} ${p.category ?? ""} ${p.contact_person ?? ""}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [partners, search, statusFilter]);

  const stats = useMemo(() => {
    const all = partners ?? [];
    const count = (s: string[]) => all.filter((p) => p.status && s.includes(p.status)).length;
    return {
      total: all.length,
      sent: count(["Envoyé", "Relancé", "Entretien obtenu", "Réponse reçue", "Engagement"]),
      meetings: count(["Entretien obtenu", "Réponse reçue", "Engagement"]),
      high: all.filter((p) => p.priority === "Haute").length,
    };
  }, [partners]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Institutions ciblées</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Dossiers envoyés</p><p className="text-2xl font-bold text-gh-blue">{stats.sent}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Entretiens / réponses</p><p className="text-2xl font-bold text-gh-green">{stats.meetings}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Priorité haute</p><p className="text-2xl font-bold text-gh-rose">{stats.high}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une institution, un contact…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm flex items-center gap-2"><Handshake className="h-4 w-4 text-gh-blue" /> Matrice de suivi des partenaires</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">N°</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Envoi</TableHead>
                <TableHead>Relance</TableHead>
                <TableHead>Prochaine étape</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.num}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{p.institution}</p>
                    <p className="text-xs text-muted-foreground">{p.partnership_type}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-40 truncate" title={p.category ?? ""}>{p.category}</TableCell>
                  <TableCell>
                    <p className="text-xs">{p.contact_person ?? "—"}</p>
                    {p.contact_info && <p className="text-xs text-muted-foreground truncate max-w-44" title={p.contact_info}>{p.contact_info}</p>}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmt(p.sent_date)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmt(p.followup_date)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-52 truncate" title={p.next_step ?? ""}>{p.next_step ?? "—"}</TableCell>
                  <TableCell>
                    {p.priority && (
                      <Badge variant="outline" className={p.priority === "Haute" ? "bg-gh-rose/15 text-gh-rose border-gh-rose/30" : "bg-muted text-muted-foreground"}>
                        {p.priority}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={p.status ?? "À envoyer"} onValueChange={(v) => updatePartner.mutate({ id: p.id, status: v })}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={statusColor[p.status ?? ""] ?? ""}>{p.status ?? "—"}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Aucun partenaire trouvé.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
