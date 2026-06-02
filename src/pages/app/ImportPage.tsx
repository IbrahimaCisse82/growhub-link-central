import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, Users, Wallet, Building2, History, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import CsvImportDialog from "@/components/shared/CsvImportDialog";
import { useImportLogs, type ImportType } from "@/hooks/useImportLogs";
import Pill from "@/components/shared/Pill";

interface TabConfig {
  type: ImportType;
  label: string;
  icon: typeof Users;
  tableName: string;
  columns: { key: string; label: string; required?: boolean }[];
  transform?: (row: Record<string, string>) => Record<string, any>;
  description: string;
}

const TABS: TabConfig[] = [
  {
    type: "startups",
    label: "Entreprises",
    icon: Building2,
    tableName: "startups",
    description: "Importer une liste d'entreprises accompagnées (nom, secteur, stade, contacts).",
    columns: [
      { key: "name", label: "Nom", required: true },
      { key: "sector", label: "Secteur" },
      { key: "stage", label: "Stade" },
      { key: "country", label: "Pays" },
      { key: "city", label: "Ville" },
      { key: "website", label: "Site web" },
      { key: "team_size", label: "Taille équipe" },
      { key: "description", label: "Description" },
    ],
    transform: (row) => ({
      ...row,
      team_size: row.team_size ? Number(row.team_size) : null,
    }),
  },
  {
    type: "employees",
    label: "Employés (RH)",
    icon: Users,
    tableName: "hr_employees",
    description: "Importer la liste du personnel pour la paie et le suivi RH.",
    columns: [
      { key: "matricule", label: "Matricule", required: true },
      { key: "prenom", label: "Prénom", required: true },
      { key: "nom", label: "Nom", required: true },
      { key: "sexe", label: "Sexe (M/F)", required: true },
      { key: "email", label: "Email" },
      { key: "telephone", label: "Téléphone" },
      { key: "fonction", label: "Fonction" },
      { key: "contrat", label: "Type contrat" },
      { key: "date_entree", label: "Date entrée" },
      { key: "salaire_base", label: "Salaire de base (XOF)", required: true },
    ],
    transform: (row) => ({
      ...row,
      salaire_base: row.salaire_base ? Number(row.salaire_base) : 0,
    }),
  },
  {
    type: "budgets",
    label: "Budgets",
    icon: Wallet,
    tableName: "budgets",
    description: "Importer des lignes budgétaires (catégorie, libellé, montants planifiés).",
    columns: [
      { key: "category", label: "Catégorie", required: true },
      { key: "label", label: "Libellé", required: true },
      { key: "amount_planned", label: "Montant prévu (XOF)" },
      { key: "amount_spent", label: "Montant consommé (XOF)" },
      { key: "currency", label: "Devise (XOF/EUR)" },
      { key: "nomenclature_code", label: "Code nomenclature" },
    ],
    transform: (row) => ({
      ...row,
      amount_planned: row.amount_planned ? Number(row.amount_planned) : 0,
      amount_spent: row.amount_spent ? Number(row.amount_spent) : 0,
      currency: row.currency || "XOF",
    }),
  },
  {
    type: "crm",
    label: "Contreparties CRM",
    icon: Database,
    tableName: "crm_contreparties",
    description: "Importer des clients, fournisseurs ou bailleurs (CRM).",
    columns: [
      { key: "name", label: "Nom", required: true },
      { key: "party_type", label: "Type (client/supplier/funder/mixed)", required: true },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "city", label: "Ville" },
      { key: "country", label: "Pays" },
      { key: "ninea", label: "NINEA" },
      { key: "contact_person", label: "Contact" },
    ],
    transform: (row) => ({
      ...row,
      is_client: row.party_type === "client",
      is_supplier: row.party_type === "supplier",
      is_funder: row.party_type === "funder",
      is_active: true,
    }),
  },
];

function StatusPill({ status }: { status: string }) {
  if (status === "completed") return <Pill color="green"><CheckCircle2 size={10} /> Réussi</Pill>;
  if (status === "partial") return <Pill color="amber"><AlertTriangle size={10} /> Partiel</Pill>;
  return <Pill color="rose"><XCircle size={10} /> Échec</Pill>;
}

export default function ImportPage() {
  const { logs, isLoading, log } = useImportLogs();

  const tabsContent = useMemo(() => TABS.map((cfg) => {
    const Icon = cfg.icon;
    const typeLogs = logs.filter((l) => l.import_type === cfg.type).slice(0, 10);
    return (
      <TabsContent key={cfg.type} value={cfg.type} className="space-y-4 mt-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon size={18} /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Import {cfg.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
              </div>
            </div>
            <CsvImportDialog
              tableName={cfg.tableName}
              label={cfg.label}
              requiredColumns={cfg.columns}
              transformRow={cfg.transform}
              onComplete={(r) => log({
                import_type: cfg.type,
                file_name: r.fileName,
                total: r.total,
                success: r.success,
                errors: r.errors,
              })}
            />
          </div>
          <div className="bg-surface-2 rounded-lg p-3 text-[11px] text-muted-foreground">
            <div className="font-mono uppercase tracking-wider text-[10px] mb-1.5 text-foreground">Colonnes attendues</div>
            <div className="flex flex-wrap gap-1.5">
              {cfg.columns.map((c) => (
                <span key={c.key} className="px-2 py-0.5 rounded bg-background border border-border">
                  {c.label}{c.required && <span className="text-destructive ml-0.5">*</span>}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <History size={14} className="text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Historique récent</h4>
          </div>
          {typeLogs.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Aucun import enregistré.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Fichier</th>
                    <th className="py-2 pr-3 font-medium text-right">Total</th>
                    <th className="py-2 pr-3 font-medium text-right">Succès</th>
                    <th className="py-2 pr-3 font-medium text-right">Erreurs</th>
                    <th className="py-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {typeLogs.map((l) => (
                    <tr key={l.id} className="border-b border-border/40">
                      <td className="py-2 pr-3 text-muted-foreground">{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                      <td className="py-2 pr-3 text-foreground truncate max-w-[200px]">{l.file_name}</td>
                      <td className="py-2 pr-3 text-right text-foreground">{l.total_rows}</td>
                      <td className="py-2 pr-3 text-right text-gh-green">{l.success_rows}</td>
                      <td className="py-2 pr-3 text-right text-destructive">{l.error_rows}</td>
                      <td className="py-2"><StatusPill status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>
    );
  }), [logs, log]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><Upload size={20} /></div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Assistant d'import</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Importez vos données depuis des fichiers CSV. Mapping automatique, validation et journalisation des imports.
          </p>
        </div>
      </div>

      <Tabs defaultValue="startups">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.type} value={t.type} className="gap-1.5">
                <Icon size={12} /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {tabsContent}
      </Tabs>

      {isLoading && <div className="text-xs text-muted-foreground">Chargement de l'historique…</div>}
    </div>
  );
}
