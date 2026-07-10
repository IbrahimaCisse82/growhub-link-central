import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { toast } from "@/hooks/use-toast";
import { Copy, KeyRound, Trash2, ShieldCheck, Activity } from "lucide-react";

type ApiKey = {
  id: string; name: string; key_prefix: string; scopes: string[];
  last_used_at: string | null; expires_at: string | null; revoked_at: string | null; created_at: string;
};

type Delivery = {
  id: string; webhook_config_id: string | null; event_name: string; attempt: number;
  status: string; http_status: number | null; duration_ms: number | null; delivered_at: string; error: string | null;
};

function randomToken(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [revealed, setRevealed] = useState<string | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_keys" as never).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ApiKey[];
    },
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["webhook-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("webhook_deliveries" as never)
        .select("*").order("delivered_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as unknown as Delivery[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nom requis");
      const prefix = randomToken(6);
      const secret = randomToken(24);
      const key_hash = await sha256Hex(secret);
      const { error } = await supabase.from("api_keys" as never).insert({
        user_id: user!.id, name, key_prefix: prefix, key_hash, scopes,
      } as never);
      if (error) throw error;
      const full = `lv_${prefix}_${secret}`;
      setRevealed(full);
      return full;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setName("");
      toast({ title: "✓ Clé créée — copie-la maintenant, elle ne sera plus affichée" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys" as never)
        .update({ revoked_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "Clé révoquée" });
    },
  });

  const apiBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="API publique & Webhooks" subtitle="Clés API scopées, endpoints REST et journal de livraison webhooks" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GhCard title="🔑 Créer une clé API">
          <div className="space-y-3">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="ex: Intégration Zapier"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12px] text-foreground"
            />
            <div className="flex items-center gap-3 text-[12px]">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={scopes.includes("read")}
                  onChange={e => setScopes(s => e.target.checked ? [...new Set([...s, "read"])] : s.filter(x => x !== "read"))} />
                read
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={scopes.includes("write")}
                  onChange={e => setScopes(s => e.target.checked ? [...new Set([...s, "write"])] : s.filter(x => x !== "write"))} />
                write
              </label>
            </div>
            <GhButton variant="primary" onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Création…" : "Générer la clé"}
            </GhButton>

            {revealed && (
              <div className="mt-3 p-3 rounded-lg bg-gh-green/10 border border-gh-green/30">
                <div className="text-[11px] text-muted-foreground mb-1">Copie cette clé maintenant — elle ne sera plus jamais affichée :</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] font-mono break-all text-foreground">{revealed}</code>
                  <button onClick={() => { navigator.clipboard.writeText(revealed); toast({ title: "Copié" }); }}
                    className="p-1.5 rounded hover:bg-surface-2"><Copy size={14} /></button>
                </div>
                <button onClick={() => setRevealed(null)} className="mt-2 text-[10px] text-muted-foreground underline">J'ai copié, masquer</button>
              </div>
            )}
          </div>
        </GhCard>

        <GhCard title="📖 Utilisation">
          <div className="text-[12px] text-muted-foreground space-y-2">
            <p>Base URL :</p>
            <code className="block bg-surface-2 rounded p-2 text-[11px] break-all">{apiBase}</code>
            <p>Auth header : <code>Authorization: Bearer lv_&lt;prefix&gt;_&lt;secret&gt;</code></p>
            <p>Endpoints GET :</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li><code>/v1/me</code> — profil du propriétaire de la clé</li>
              <li><code>/v1/projects</code> — projets accessibles</li>
              <li><code>/v1/grants</code> — subventions</li>
              <li><code>/v1/startups</code> — entreprises</li>
            </ul>
            <p>Webhooks : signature HMAC-SHA256 dans <code>X-GrowHub-Signature</code>.</p>
          </div>
        </GhCard>
      </div>

      <GhCard title="🗝 Clés existantes" className="mt-4">
        <div className="space-y-2">
          {keys.length === 0 && <div className="text-[12px] text-muted-foreground">Aucune clé pour le moment.</div>}
          {keys.map(k => {
            const revoked = !!k.revoked_at;
            return (
              <div key={k.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <KeyRound size={12} className="text-muted-foreground" />
                    <span className="text-[13px] font-medium text-foreground">{k.name}</span>
                    {revoked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">révoquée</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">lv_{k.key_prefix}_••••••••</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1"><ShieldCheck size={10} />{k.scopes.join(", ")}</span>
                    <span>créée {new Date(k.created_at).toLocaleDateString("fr-FR")}</span>
                    {k.last_used_at && <span>utilisée {new Date(k.last_used_at).toLocaleDateString("fr-FR")}</span>}
                  </div>
                </div>
                {!revoked && (
                  <button onClick={() => revoke.mutate(k.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </GhCard>

      <GhCard title="📡 Journal de livraison webhooks (50 dernières)" className="mt-4">
        <div className="space-y-1.5">
          {deliveries.length === 0 && <div className="text-[12px] text-muted-foreground">Aucune livraison enregistrée.</div>}
          {deliveries.map(d => (
            <div key={d.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0 text-[11px]">
              <Activity size={11} className={d.status === "success" ? "text-gh-green" : "text-destructive"} />
              <span className="font-mono text-foreground">{d.event_name}</span>
              <span className="text-muted-foreground">tentative {d.attempt}</span>
              {d.http_status && <span className="text-muted-foreground">HTTP {d.http_status}</span>}
              {d.duration_ms !== null && <span className="text-muted-foreground">{d.duration_ms}ms</span>}
              <span className="ml-auto text-muted-foreground">{new Date(d.delivered_at).toLocaleString("fr-FR")}</span>
              {d.error && <span className="text-destructive truncate max-w-[200px]" title={d.error}>{d.error}</span>}
            </div>
          ))}
        </div>
      </GhCard>
    </motion.div>
  );
}
