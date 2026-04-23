import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Building2, FileText, Receipt, Repeat } from "lucide-react";
import { useContreparties, useInvoices, useQuotes, useSubscriptions } from "@/hooks/useCrm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectContrepartie?: (id: string) => void;
}

export default function CrmGlobalSearch({ open, onOpenChange, onSelectContrepartie }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: parties } = useContreparties("all");
  const { data: invoices } = useInvoices();
  const { data: quotes } = useQuotes();
  const { data: subs } = useSubscriptions("all");

  // Cmd+K / Ctrl+K shortcut
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

  const matchedParties = useMemo(
    () => (parties ?? []).filter((p: any) => !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)).slice(0, 6),
    [parties, q],
  );
  const matchedInvoices = useMemo(
    () =>
      (invoices ?? [])
        .filter(
          (i: any) =>
            !q ||
            i.invoice_number?.toLowerCase().includes(q) ||
            (i.contrepartie as any)?.name?.toLowerCase().includes(q),
        )
        .slice(0, 6),
    [invoices, q],
  );
  const matchedQuotes = useMemo(
    () =>
      (quotes ?? [])
        .filter(
          (qq: any) =>
            !q ||
            qq.quote_number?.toLowerCase().includes(q) ||
            (qq.contrepartie as any)?.name?.toLowerCase().includes(q),
        )
        .slice(0, 6),
    [quotes, q],
  );
  const matchedSubs = useMemo(
    () =>
      (subs ?? [])
        .filter(
          (s: any) => !q || s.name?.toLowerCase().includes(q) || (s.contrepartie as any)?.name?.toLowerCase().includes(q),
        )
        .slice(0, 4),
    [subs, q],
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
            placeholder="Rechercher contrepartie, facture, devis, abonnement..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[420px]">
            <CommandEmpty>Aucun résultat</CommandEmpty>

            {matchedParties.length > 0 && (
              <CommandGroup heading="Contreparties">
                {matchedParties.map((p: any) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() =>
                      handlePick(() => {
                        if (onSelectContrepartie) onSelectContrepartie(p.id);
                        else navigate(`/app/crm?contrepartie=${p.id}`);
                      })
                    }
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
                {matchedInvoices.map((i: any) => (
                  <CommandItem
                    key={i.id}
                    onSelect={() =>
                      handlePick(() => navigate(`/app/crm?invoice=${i.id}`))
                    }
                  >
                    <Receipt size={14} className="mr-2 text-emerald-600" />
                    <span className="font-mono text-xs">{i.invoice_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">{(i.contrepartie as any)?.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{i.status}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedQuotes.length > 0 && (
              <CommandGroup heading="Devis">
                {matchedQuotes.map((qq: any) => (
                  <CommandItem
                    key={qq.id}
                    onSelect={() =>
                      handlePick(() => navigate(`/app/crm?quote=${qq.id}`))
                    }
                  >
                    <FileText size={14} className="mr-2 text-violet-600" />
                    <span className="font-mono text-xs">{qq.quote_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">{(qq.contrepartie as any)?.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{qq.status}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedSubs.length > 0 && (
              <CommandGroup heading="Abonnements">
                {matchedSubs.map((s: any) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => handlePick(() => navigate(`/app/crm?subscription=${s.id}`))}
                  >
                    <Repeat size={14} className="mr-2 text-amber-600" />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{(s.contrepartie as any)?.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex justify-between">
            <span>↑↓ naviguer · ↵ ouvrir</span>
            <span><kbd className="px-1.5 py-0.5 bg-secondary rounded">⌘K</kbd> raccourci</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
