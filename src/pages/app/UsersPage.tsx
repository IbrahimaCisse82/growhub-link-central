import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminUsers, useApproveUser, useRevokeUser, useChangeUserRole, useInvitations,
  useResendInvitation, useRevokeInvitation, useSuspendUser, useReactivateUser,
} from "@/hooks/useAdminUsers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Copy, Mail, Trash2, UserX, UserCheck, Search } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin", coordinator: "Coordinateur", project_manager: "Chef de projet",
  mentor: "Mentor", consultant_expert: "Expert", consultant_coach: "Coach",
  entrepreneur: "Entrepreneur", evaluator: "Évaluateur", investor: "Investisseur",
  funder: "Bailleur", staff: "Staff Grow Hub",
};
const roleColors: Record<string, "green" | "blue" | "purple" | "amber" | "rose" | "gray"> = {
  super_admin: "rose", coordinator: "purple", project_manager: "blue",
  mentor: "blue", consultant_expert: "purple", consultant_coach: "purple",
  entrepreneur: "green", evaluator: "amber", investor: "blue",
  funder: "amber", staff: "gray",
};
const allRoles = [
  "super_admin", "coordinator", "project_manager",
  "mentor", "consultant_expert", "consultant_coach",
  "entrepreneur", "evaluator", "investor", "funder", "staff",
];

export default function UsersPage() {
  const { user } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const { data: invitations, isLoading: isLoadingInvitations } = useInvitations();
  const approve = useApproveUser();
  const revoke = useRevokeUser();
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const changeRole = useChangeUserRole();
  const resendInvitation = useResendInvitation();
  const revokeInvitation = useRevokeInvitation();

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "revoke-inv" | "delete-inv"; id: string; name?: string } | null>(null);

  const pending = users?.filter((u) => !u.is_approved && !u.is_suspended) ?? [];
  const approved = users?.filter((u) => u.is_approved && !u.is_suspended) ?? [];
  const suspended = users?.filter((u) => u.is_suspended) ?? [];
  const pendingInvitations = invitations?.filter(i => i.status === "pending") ?? [];
  const expiredInvitations = invitations?.filter(i => i.status === "pending" && new Date(i.expires_at) < new Date()) ?? [];

  const filterUsers = (list: typeof approved) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(u => (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q));
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/login?invitation=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "✓ Lien copié dans le presse-papier" });
  };

  const handleResend = (invId: string, extend: boolean) => {
    resendInvitation.mutate({ invitationId: invId, extendExpiry: extend }, {
      onSuccess: () => toast({ title: "✉️ Email de relance envoyé" }),
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <SectionHeader title="Gestion des utilisateurs" subtitle="Approuver, suspendre, relancer les invitations" />
        <GhButton onClick={() => setIsInviteOpen(true)}>+ Inviter un membre</GhButton>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-5">
        <StatCard label="À valider" value={String(pending.length)} note="" color="amber" />
        <StatCard label="Actifs" value={String(approved.length)} note="" color="green" />
        <StatCard label="Suspendus" value={String(suspended.length)} note="" color="rose" />
        <StatCard label="Invitations" value={String(pendingInvitations.length)} note={expiredInvitations.length > 0 ? `${expiredInvitations.length} expirée(s)` : ""} color="purple" />
        <StatCard label="Total" value={String(users?.length ?? 0)} note="" color="blue" />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="utilisateurs" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="utilisateurs">Utilisateurs ({approved.length + pending.length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspendus ({suspended.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({pendingInvitations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="utilisateurs" className="space-y-5 mt-0">
          {pending.length > 0 && (
            <GhCard title="🔔 Inscriptions en attente" badge={String(pending.length)} noPadding>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead><tr className="bg-secondary">{["Nom", "Email", "Rôle", "Inscrit le", "Actions"].map((h) => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>)}</tr></thead>
                  <tbody>
                    {filterUsers(pending).map((u) => (
                      <tr key={u.id} className="hover:bg-secondary transition-colors">
                        <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{u.full_name || "—"}</td>
                        <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{u.email}</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><div className="flex gap-1 flex-wrap">{u.roles.map((r) => <Pill key={r} color={roleColors[r] ?? "gray"}>{roleLabels[r] ?? r}</Pill>)}</div></td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                        <td className="px-3.5 py-2.5 border-b border-border">
                          <GhButton onClick={() => approve.mutate(u.user_id, { onSuccess: () => toast({ title: `✓ ${u.full_name} approuvé` }) })} disabled={approve.isPending}>✓ Approuver</GhButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GhCard>
          )}

          <GhCard title="Utilisateurs actifs" badge={String(approved.length)} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-secondary">{["Nom", "Email", "Rôles", "Inscrit le", "Actions"].map((h) => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {isLoading ? Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-3.5 py-2.5 border-b border-border"><Skeleton className="h-4 w-20" /></td>)}</tr>) : filterUsers(approved).length === 0 ? (
                    <tr><td colSpan={5}><EmptyState icon="👥" title="Aucun utilisateur" /></td></tr>
                  ) : filterUsers(approved).map((u) => (
                    <tr key={u.id} className="hover:bg-secondary transition-colors">
                      <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{u.full_name || "—"}</td>
                      <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{u.email}</td>
                      <td className="px-3.5 py-2.5 border-b border-border">
                        {editingRole === u.user_id ? (
                          <select defaultValue={u.roles[0] || "entrepreneur"} onChange={e => {
                            changeRole.mutate({ userId: u.user_id, newRole: e.target.value }, { onSuccess: () => { toast({ title: `✓ Rôle mis à jour` }); setEditingRole(null); } });
                          }} className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground">
                            {allRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
                          </select>
                        ) : (
                          <div className="flex gap-1 flex-wrap cursor-pointer" onClick={() => u.user_id !== user?.id && setEditingRole(u.user_id)}>
                            {u.roles.map((r) => <Pill key={r} color={roleColors[r] ?? "gray"}>{roleLabels[r] ?? r}</Pill>)}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 border-b border-border font-mono text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3.5 py-2.5 border-b border-border">
                        {u.user_id !== user?.id ? (
                          <div className="flex gap-1.5">
                            <button onClick={() => setConfirmAction({ type: "suspend", id: u.user_id, name: u.full_name })}
                              className="text-[11px] px-2 py-1 rounded border border-border hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-700 transition flex items-center gap-1"
                              title="Suspendre">
                              <UserX className="w-3 h-3" /> Suspendre
                            </button>
                            <button onClick={() => revoke.mutate(u.user_id, { onSuccess: () => toast({ title: `Accès révoqué pour ${u.full_name}` }) })}
                              className="text-[11px] px-2 py-1 rounded border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition">
                              Révoquer
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Vous</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GhCard>
        </TabsContent>

        <TabsContent value="suspended" className="mt-0">
          <GhCard title="Utilisateurs suspendus" badge={String(suspended.length)} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-secondary">{["Nom", "Email", "Suspendu le", "Raison", "Actions"].map((h) => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {filterUsers(suspended).length === 0 ? (
                    <tr><td colSpan={5}><EmptyState icon="🚫" title="Aucun utilisateur suspendu" /></td></tr>
                  ) : filterUsers(suspended).map((u) => (
                    <tr key={u.id} className="hover:bg-secondary transition-colors">
                      <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{u.full_name || "—"}</td>
                      <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{u.email}</td>
                      <td className="px-3.5 py-2.5 border-b border-border font-mono text-muted-foreground">{u.suspended_at ? new Date(u.suspended_at).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground italic">{u.suspension_reason || "—"}</td>
                      <td className="px-3.5 py-2.5 border-b border-border">
                        <button onClick={() => reactivate.mutate(u.user_id, { onSuccess: () => toast({ title: `✓ ${u.full_name} réactivé` }) })}
                          className="text-[11px] px-2 py-1 rounded border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Réactiver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GhCard>
        </TabsContent>

        <TabsContent value="invitations" className="mt-0">
          <GhCard title="Invitations en attente" badge={String(pendingInvitations.length)} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-secondary">{["Email", "Rôle prévu", "Envoyée le", "Expire le", "Statut", "Actions"].map((h) => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {isLoadingInvitations ? Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-3.5 py-2.5 border-b border-border"><Skeleton className="h-4 w-20" /></td>)}</tr>) : pendingInvitations.length === 0 ? (
                    <tr><td colSpan={6}><EmptyState icon="✉️" title="Aucune invitation en attente" /></td></tr>
                  ) : pendingInvitations.map((inv) => {
                    const isExpired = new Date(inv.expires_at) < new Date();
                    return (
                      <tr key={inv.id} className="hover:bg-secondary transition-colors">
                        <td className="px-3.5 py-2.5 border-b border-border font-medium text-foreground">{inv.email}</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={roleColors[inv.role] ?? "gray"}>{roleLabels[inv.role] ?? inv.role}</Pill></td>
                        <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("fr-FR")}</td>
                        <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{new Date(inv.expires_at).toLocaleDateString("fr-FR")}</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={isExpired ? "rose" : "amber"}>{isExpired ? "Expirée" : "En attente"}</Pill></td>
                        <td className="px-3.5 py-2.5 border-b border-border">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => handleResend(inv.id, isExpired)} disabled={resendInvitation.isPending}
                              className="text-[11px] px-2 py-1 rounded border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition flex items-center gap-1 disabled:opacity-50"
                              title={isExpired ? "Renvoyer + prolonger 7 jours" : "Renvoyer email"}>
                              <Mail className="w-3 h-3" /> {isExpired ? "Relancer + prolonger" : "Relancer"}
                            </button>
                            <button onClick={() => copyInviteLink(inv.token)}
                              className="text-[11px] px-2 py-1 rounded border border-border hover:bg-secondary transition flex items-center gap-1" title="Copier le lien">
                              <Copy className="w-3 h-3" /> Copier
                            </button>
                            <button onClick={() => setConfirmAction({ type: "revoke-inv", id: inv.id, name: inv.email })}
                              className="text-[11px] px-2 py-1 rounded border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition flex items-center gap-1" title="Annuler invitation">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GhCard>
        </TabsContent>
      </Tabs>

      <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "suspend" && "Suspendre cet utilisateur ?"}
              {confirmAction?.type === "revoke-inv" && "Annuler cette invitation ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "suspend" && `${confirmAction.name} ne pourra plus se connecter jusqu'à réactivation.`}
              {confirmAction?.type === "revoke-inv" && `L'invitation envoyée à ${confirmAction.name} sera annulée et le lien deviendra invalide.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!confirmAction) return;
              if (confirmAction.type === "suspend") {
                suspend.mutate({ userId: confirmAction.id }, { onSuccess: () => toast({ title: `✓ ${confirmAction.name} suspendu` }) });
              } else if (confirmAction.type === "revoke-inv") {
                revokeInvitation.mutate(confirmAction.id, { onSuccess: () => toast({ title: "Invitation annulée" }) });
              }
              setConfirmAction(null);
            }}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
