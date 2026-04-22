import { useInvoiceReminders } from "@/hooks/useReminders";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, AlertOctagon, FileWarning } from "lucide-react";

const TYPE_META: Record<string, { label: string; cls: string; Icon: any }> = {
  standard: { label: "Rappel", cls: "bg-blue-500/10 text-blue-600", Icon: Mail },
  ferme: { label: "Ferme", cls: "bg-amber-500/10 text-amber-600", Icon: FileWarning },
  mise_en_demeure: { label: "Mise en demeure", cls: "bg-red-500/10 text-red-600", Icon: AlertOctagon },
};

export default function RemindersHistoryPanel({ invoiceId }: { invoiceId: string }) {
  const { data: reminders, isLoading } = useInvoiceReminders(invoiceId);

  if (isLoading) return <div className="text-xs text-muted-foreground">Chargement…</div>;
  if (!reminders?.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Aucune relance envoyée pour cette facture.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((r: any) => {
        const meta = TYPE_META[r.reminder_type] ?? TYPE_META.standard;
        const Icon = meta.Icon;
        return (
          <div key={r.id} className="flex items-start gap-3 p-3 rounded bg-secondary/40 text-sm">
            <Icon size={16} className="mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={meta.cls}>{meta.label}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  {r.channel === "email" ? <><Mail size={10} className="mr-1" /> Email</> : <><MessageSquare size={10} className="mr-1" /> Manuel</>}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.sent_at).toLocaleString("fr-FR")}
                </span>
              </div>
              {r.subject && <div className="font-medium mt-1 text-xs">{r.subject}</div>}
              {r.recipient_email && <div className="text-xs text-muted-foreground">→ {r.recipient_email}</div>}
              {r.message && <div className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{r.message}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
