import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HrLeaveType = "annuel" | "maladie" | "maternite" | "paternite" | "permission" | "sans_solde" | "autre";
export type HrLeaveStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

export interface HrLeaveRequest {
  id?: string;
  employee_id: string;
  leave_type: HrLeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string | null;
  status: HrLeaveStatus;
  requested_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  attachment_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrLeaveBalance {
  id?: string;
  employee_id: string;
  annee: number;
  leave_type: HrLeaveType;
  initial_days: number;
  carried_over: number;
  used_days: number;
  notes?: string | null;
}

export const LEAVE_TYPE_LABELS: Record<HrLeaveType, string> = {
  annuel: "Congé annuel",
  maladie: "Maladie",
  maternite: "Maternité",
  paternite: "Paternité",
  permission: "Permission",
  sans_solde: "Sans solde",
  autre: "Autre",
};

export const LEAVE_STATUS_LABELS: Record<HrLeaveStatus, string> = {
  draft: "Brouillon",
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
  cancelled: "Annulé",
};

export function calcLeaveDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++; // jours ouvrés
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function useHrLeaveRequests(filters?: { employee_id?: string; status?: HrLeaveStatus; year?: number }) {
  const qc = useQueryClient();
  const key = ["hr_leave_requests", filters];

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from("hr_leave_requests" as any).select("*").order("start_date", { ascending: false });
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.year) {
        q = q.gte("start_date", `${filters.year}-01-01`).lte("start_date", `${filters.year}-12-31`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HrLeaveRequest[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (l: Partial<HrLeaveRequest>) => {
      const payload: any = { ...l };
      if (payload.start_date && payload.end_date && !payload.days_count) {
        payload.days_count = calcLeaveDays(payload.start_date, payload.end_date);
      }
      if (l.id) {
        const { error } = await supabase.from("hr_leave_requests" as any).update(payload).eq("id", l.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_leave_requests" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_leave_requests"] });
      qc.invalidateQueries({ queryKey: ["hr_leave_balances"] });
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: HrLeaveStatus; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const upd: any = { status };
      if (status === "approved") {
        upd.approved_by = user?.id;
        upd.approved_at = new Date().toISOString();
      }
      if (status === "rejected") upd.rejection_reason = reason ?? null;
      const { error } = await supabase.from("hr_leave_requests" as any).update(upd).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_leave_requests"] });
      qc.invalidateQueries({ queryKey: ["hr_leave_balances"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_leave_requests" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_leave_requests"] }),
  });

  return { leaves, isLoading, upsert, decide, remove };
}

export function useHrLeaveBalances(year?: number) {
  const qc = useQueryClient();
  const key = ["hr_leave_balances", year];

  const { data: balances = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from("hr_leave_balances" as any).select("*");
      if (year) q = q.eq("annee", year);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HrLeaveBalance[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (b: Partial<HrLeaveBalance>) => {
      const { error } = await supabase.from("hr_leave_balances" as any).upsert(b as any, { onConflict: "employee_id,annee,leave_type" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_leave_balances"] }),
  });

  return { balances, isLoading, upsert };
}

// ───────────── Contrats ─────────────
export type HrContractType = "CDI" | "CDD" | "stage" | "consultance" | "apprentissage" | "autre";

export interface HrContract {
  id?: string;
  employee_id: string;
  contract_type: HrContractType;
  reference?: string | null;
  start_date: string;
  end_date?: string | null;
  trial_end_date?: string | null;
  fonction?: string | null;
  salaire_base: number;
  sursalaire: number;
  is_active: boolean;
  signed_at?: string | null;
  document_url?: string | null;
  notes?: string | null;
  renewal_of?: string | null;
}

export interface HrContractAlert {
  contract_id: string;
  employee_id: string;
  matricule: string;
  prenom: string;
  nom: string;
  contract_type: HrContractType;
  end_date: string | null;
  trial_end_date: string | null;
  alert_level: "expired" | "critical" | "warning" | "trial_ending" | "ok";
  days_remaining: number | null;
}

export function useHrContracts(employee_id?: string) {
  const qc = useQueryClient();
  const key = ["hr_contracts", employee_id];

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from("hr_contracts" as any).select("*").order("start_date", { ascending: false });
      if (employee_id) q = q.eq("employee_id", employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HrContract[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (c: Partial<HrContract>) => {
      if (c.id) {
        const { error } = await supabase.from("hr_contracts" as any).update(c as any).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_contracts" as any).insert(c as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_contracts"] });
      qc.invalidateQueries({ queryKey: ["hr_contract_alerts"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_contracts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_contracts"] });
      qc.invalidateQueries({ queryKey: ["hr_contract_alerts"] });
    },
  });

  return { contracts, isLoading, upsert, remove };
}

export function useHrContractAlerts() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["hr_contract_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_contract_alerts" as any)
        .select("*")
        .neq("alert_level", "ok")
        .order("days_remaining", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as HrContractAlert[];
    },
  });
  return { alerts, isLoading };
}
