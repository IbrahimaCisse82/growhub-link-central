// Recherche globale étendue : startups, projets, employés, contrats, bulletins, contreparties, factures
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Building2,
  FolderKanban,
  Users,
  FileSignature,
  Receipt,
  Triangle,
} from "lucide-react";
import { useStartups } from "@/hooks/useStartups";
import { useProjects } from "@/hooks/useProjects";
import { useHrEmployees } from "@/hooks/useHrEmployees";
import { useHrContracts } from "@/hooks/useHrLeaves";
import { useContreparties, useInvoices } from "@/hooks/useCrm";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { roles } = useAuth();
  const canHr = roles.includes("super_admin") || roles.includes("coordinator");

  const { data: startups } = useStartups();
  const { data: projects } = useProjects();
  const { employees } = useHrEmployees();
  const { contracts } = useHrContracts();
  const { data: parties } = useContreparties("all");
  const { data: invoices } = useInvoices();

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const q = query.toLowerCase().trim();

  const matchedStartups = useMemo(
    () =>
      (startups ?? [])
        .filter((s) => !q || s.name?.toLowerCase().includes(q))
        .slice(0, 5),
    [startups, q],
  );
  const matchedProjects = useMemo(
    () => (projects ?? []).filter((p) => !q || p.name?.toLowerCase().includes(q)).slice(0, 5),
    [projects, q],
  );
  const matchedEmployees = useMemo(() => {
    if (!canHr) return [];
    return employees
      .filter(
        (e) =>
          !q ||
          `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
          e.matricule?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [employees, q, canHr]);
  const matchedContracts = useMemo(() => {
    if (!canHr) return [];
    const empById = new Map(employees.map((e) => [e.id, e]));
    return (contracts ?? [])
      .filter((c) => {
        const emp = empById.get(c.employee_id);
        return (
          !q ||
          c.reference?.toLowerCase().includes(q) ||
          (emp && `${emp.prenom} ${emp.nom}`.toLowerCase().includes(q))
        );
      })
      .slice(0, 4)
      .map((c) => ({ ...c, employee: empById.get(c.employee_id) }));
  }, [contracts, employees, q, canHr]);
  const matchedParties = useMemo(
    () =>
      (parties ?? [])
        .filter((p) => !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
        .slice(0, 4),
    [parties, q],
  );
  const matchedInvoices = useMemo(
    () =>
      (invoices ?? [])
        .filter(
          (i) =>
            !q ||
            i.invoice_number?.toLowerCase().includes(q) ||
            (i.contrepartie as { name?: string } | null)?.name?.toLowerCase().includes(q),
        )
        .slice(0, 4),
    [invoices, q],
  );

  const handlePick = (action: () => void) => {
    action();
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher startup, projet, employé, contrat, facture..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[480px]">
            <CommandEmpty>Aucun résultat</CommandEmpty>

            {matchedStartups.length > 0 && (
              <CommandGroup heading="Startups">
                {matchedStartups.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => handlePick(() => navigate(`/app/entreprises/${s.id}`))}
                  >
                    <Triangle size={14} className="mr-2 text-emerald-600" />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{s.stage ?? ""}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedProjects.length > 0 && (
              <CommandGroup heading="Projets">
                {matchedProjects.map((p) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => handlePick(() => navigate(`/app/projets/${p.id}`))}
                  >
                    <FolderKanban size={14} className="mr-2 text-blue-600" />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.status}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedEmployees.length > 0 && (
              <CommandGroup heading="Employés (RH)">
                {matchedEmployees.map((e) => (
                  <CommandItem
                    key={e.id}
                    onSelect={() => handlePick(() => navigate("/app/rh"))}
                  >
                    <Users size={14} className="mr-2 text-violet-600" />
                    <span className="font-medium">
                      {e.prenom} {e.nom}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {e.matricule} · {e.fonction || "—"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedContracts.length > 0 && (
              <CommandGroup heading="Contrats RH">
                {matchedContracts.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => handlePick(() => navigate("/app/rh"))}
                  >
                    <FileSignature size={14} className="mr-2 text-amber-600" />
                    <span className="font-medium">{c.reference || c.contract_type}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {c.employee
                        ? `${c.employee.prenom} ${c.employee.nom}`
                        : c.employee_id}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedParties.length > 0 && (
              <CommandGroup heading="Contreparties (CRM)">
                {matchedParties.map((p) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => handlePick(() => navigate(`/app/crm?contrepartie=${p.id}`))}
                  >
                    <Building2 size={14} className="mr-2 text-blue-600" />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.party_type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedInvoices.length > 0 && (
              <CommandGroup heading="Factures">
                {matchedInvoices.map((i) => (
                  <CommandItem
                    key={i.id}
                    onSelect={() => handlePick(() => navigate(`/app/crm?invoice=${i.id}`))}
                  >
                    <Receipt size={14} className="mr-2 text-emerald-600" />
                    <span className="font-mono text-xs">{i.invoice_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {(i.contrepartie as { name?: string } | null)?.name ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">{i.status}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex justify-between">
            <span>↑↓ naviguer · ↵ ouvrir</span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-secondary rounded">⌘K</kbd> raccourci
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
