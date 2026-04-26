// Edge function : envoie quotidiennement les rappels RH aux administrateurs
// - Fin de contrat (J-30, J-15, J-7)
// - Fin de période d'essai (J-15, J-7)
// - Anniversaires du jour
// - Anniversaires de service du jour (1, 5, 10, 15, 20+ ans)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface Employee {
  id: string;
  matricule: string;
  prenom: string;
  nom: string;
  date_naissance: string | null;
  date_entree: string | null;
  is_active: boolean;
  user_id: string | null;
}

interface Contract {
  id: string;
  employee_id: string;
  end_date: string | null;
  trial_end_date: string | null;
  is_active: boolean;
  contract_type: string;
}

interface AdminUser {
  user_id: string;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 3600 * 1000));
}

function isSameDayMonth(dateStr: string, today: Date): boolean {
  const d = new Date(dateStr);
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // 1) Recharger employés actifs
    const { data: employees, error: empErr } = await supabase
      .from("hr_employees")
      .select("id, matricule, prenom, nom, date_naissance, date_entree, is_active, user_id")
      .eq("is_active", true)
      .is("archived_at", null);
    if (empErr) throw empErr;

    // 2) Contrats actifs
    const { data: contracts, error: ctrErr } = await supabase
      .from("hr_contracts")
      .select("id, employee_id, end_date, trial_end_date, is_active, contract_type")
      .eq("is_active", true);
    if (ctrErr) throw ctrErr;

    // 3) Admins/coordinateurs (destinataires)
    const { data: admins, error: admErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["super_admin", "coordinator"]);
    if (admErr) throw admErr;

    const adminIds = Array.from(new Set((admins as AdminUser[] | null)?.map((a) => a.user_id) ?? []));
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const empIndex = new Map<string, Employee>(
      (employees as Employee[] | null)?.map((e) => [e.id, e]) ?? [],
    );

    type Reminder = {
      employee_id: string;
      reminder_type: "contract_expiry" | "trial_end" | "birthday" | "work_anniversary";
      reference_date: string;
      title: string;
      content: string;
    };

    const reminders: Reminder[] = [];

    // --- Contrats expirant ---
    for (const c of (contracts as Contract[] | null) ?? []) {
      const emp = empIndex.get(c.employee_id);
      if (!emp || !c.end_date) continue;
      const days = daysUntil(c.end_date);
      if ([7, 15, 30].includes(days)) {
        reminders.push({
          employee_id: emp.id,
          reminder_type: "contract_expiry",
          reference_date: c.end_date,
          title: `📋 Contrat ${c.contract_type} de ${emp.prenom} ${emp.nom} expire dans ${days} jour${days > 1 ? "s" : ""}`,
          content: `Date de fin : ${c.end_date}. Pensez à initier le renouvellement ou la sortie.`,
        });
      }
    }

    // --- Fin de période d'essai ---
    for (const c of (contracts as Contract[] | null) ?? []) {
      const emp = empIndex.get(c.employee_id);
      if (!emp || !c.trial_end_date) continue;
      const days = daysUntil(c.trial_end_date);
      if ([7, 15].includes(days)) {
        reminders.push({
          employee_id: emp.id,
          reminder_type: "trial_end",
          reference_date: c.trial_end_date,
          title: `⏰ Fin de période d'essai de ${emp.prenom} ${emp.nom} dans ${days} jour${days > 1 ? "s" : ""}`,
          content: `Date : ${c.trial_end_date}. Décision à prendre : confirmation, prolongation ou rupture.`,
        });
      }
    }

    // --- Anniversaires du jour ---
    for (const emp of (employees as Employee[] | null) ?? []) {
      if (emp.date_naissance && isSameDayMonth(emp.date_naissance, today)) {
        const age = today.getFullYear() - new Date(emp.date_naissance).getFullYear();
        reminders.push({
          employee_id: emp.id,
          reminder_type: "birthday",
          reference_date: todayStr,
          title: `🎂 Anniversaire de ${emp.prenom} ${emp.nom}`,
          content: `${emp.prenom} ${emp.nom} fête ses ${age} ans aujourd'hui !`,
        });
      }
    }

    // --- Anniversaires de service ---
    for (const emp of (employees as Employee[] | null) ?? []) {
      if (emp.date_entree && isSameDayMonth(emp.date_entree, today)) {
        const years = today.getFullYear() - new Date(emp.date_entree).getFullYear();
        if (years >= 1 && [1, 5, 10, 15, 20, 25, 30].includes(years)) {
          reminders.push({
            employee_id: emp.id,
            reminder_type: "work_anniversary",
            reference_date: todayStr,
            title: `🏆 ${years} an${years > 1 ? "s" : ""} d'ancienneté pour ${emp.prenom} ${emp.nom}`,
            content: `${emp.prenom} ${emp.nom} célèbre ${years} année${years > 1 ? "s" : ""} dans l'entreprise.`,
          });
        }
      }
    }

    // 4) Filtrer ceux déjà envoyés (via hr_reminder_log)
    let sent = 0;
    for (const r of reminders) {
      // check
      const { data: existing } = await supabase
        .from("hr_reminder_log")
        .select("id")
        .eq("employee_id", r.employee_id)
        .eq("reminder_type", r.reminder_type)
        .eq("reference_date", r.reference_date)
        .maybeSingle();
      if (existing) continue;

      // log
      await supabase.from("hr_reminder_log").insert({
        employee_id: r.employee_id,
        reminder_type: r.reminder_type,
        reference_date: r.reference_date,
      });

      // notifications individuelles aux admins
      const notifications = adminIds.map((uid) => ({
        user_id: uid,
        title: r.title,
        content: r.content,
        type: "info",
        link: "/app/rh",
      }));
      await supabase.from("notifications").insert(notifications);
      sent += 1;
    }

    return new Response(
      JSON.stringify({ ok: true, sent, reminders: reminders.length, admins: adminIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
