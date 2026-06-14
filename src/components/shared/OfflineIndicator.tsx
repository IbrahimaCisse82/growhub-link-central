import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export default function OfflineIndicator() {
  const { online, pending, syncing, flush } = useOfflineSync();

  if (online && pending === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="hidden md:inline-flex items-center justify-center w-[34px] h-[34px] rounded-lg bg-secondary border border-border text-emerald-400">
            <Wifi className="w-4 h-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>En ligne — tout est synchronisé</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => online && flush()}
          className={`inline-flex items-center gap-1.5 px-2 h-[34px] rounded-lg border text-xs font-medium transition-colors ${
            online
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {online ? (
            syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          {pending > 0 && <Badge variant="outline" className="h-4 px-1 text-[10px] border-current">{pending}</Badge>}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {!online && "Hors-ligne — les actions seront synchronisées au retour du réseau"}
        {online && pending > 0 && `${pending} action(s) en attente — cliquez pour synchroniser`}
      </TooltipContent>
    </Tooltip>
  );
}
