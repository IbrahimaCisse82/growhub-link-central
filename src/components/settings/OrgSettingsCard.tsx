import { useEffect, useState } from "react";
import { useOrgSettings, useUpdateOrgSettings, type OrgSettings } from "@/hooks/useOrgSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Image as ImageIcon, Stamp, Palette, FileText, Banknote } from "lucide-react";

export default function OrgSettingsCard() {
  const { isAdmin, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin" as any);
  const { data: org, isLoading } = useOrgSettings();
  const update = useUpdateOrgSettings();
  const [draft, setDraft] = useState<OrgSettings | null>(null);
  const [uploading, setUploading] = useState<"logo" | "stamp" | null>(null);

  useEffect(() => { if (org) setDraft(org); }, [org]);

  if (!isSuperAdmin) return null;
  if (isLoading || !draft) return null;

  const set = (k: keyof OrgSettings, v: any) => setDraft({ ...draft, [k]: v });

  const upload = async (file: File, kind: "logo" | "stamp") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `org/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
      set(kind === "logo" ? "logo_url" : "stamp_url", pub.publicUrl);
      toast.success(`${kind === "logo" ? "Logo" : "Cachet"} téléversé`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <GhCard title="🏢 Paramètres organisation (PDF & marque)" className="mt-4">
      <p className="text-[11px] text-muted-foreground mb-4">
        Ces informations apparaissent en en-tête, signature et pied de page de tous les documents PDF (devis, factures, bons de commande, avoirs).
      </p>

      {/* Identité */}
      <div className="space-y-4">
        <div>
          <h4 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-2"><Building2 size={13}/> Identité société</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">Raison sociale *</Label><Input value={draft.company_name} onChange={e=>set("company_name", e.target.value)} /></div>
            <div><Label className="text-[11px]">Forme juridique</Label><Input value={draft.legal_form ?? ""} onChange={e=>set("legal_form", e.target.value)} placeholder="SARL, SA…" /></div>
            <div><Label className="text-[11px]">NINEA</Label><Input value={draft.ninea ?? ""} onChange={e=>set("ninea", e.target.value)} /></div>
            <div><Label className="text-[11px]">RCCM</Label><Input value={draft.rccm ?? ""} onChange={e=>set("rccm", e.target.value)} /></div>
            <div><Label className="text-[11px]">NIF / Tax ID</Label><Input value={draft.tax_id ?? ""} onChange={e=>set("tax_id", e.target.value)} /></div>
          </div>
        </div>

        {/* Logo + cachet */}
        <div>
          <h4 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-2"><ImageIcon size={13}/> Logo & cachet</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[11px]">Logo (PNG transparent recommandé)</Label>
              <div className="flex items-center gap-2">
                {draft.logo_url && <img src={draft.logo_url} alt="logo" className="h-12 bg-white rounded p-1" />}
                <Input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && upload(e.target.files[0],"logo")} disabled={uploading==="logo"} className="text-[11px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] flex items-center gap-1"><Stamp size={11}/> Cachet / signature scan</Label>
              <div className="flex items-center gap-2">
                {draft.stamp_url && <img src={draft.stamp_url} alt="cachet" className="h-12 bg-white rounded p-1" />}
                <Input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && upload(e.target.files[0],"stamp")} disabled={uploading==="stamp"} className="text-[11px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div>
          <h4 className="text-[12px] font-semibold text-foreground mb-2">Coordonnées</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-[11px]">Adresse</Label><Input value={draft.address ?? ""} onChange={e=>set("address", e.target.value)} /></div>
            <div><Label className="text-[11px]">Boîte postale</Label><Input value={draft.postal_box ?? ""} onChange={e=>set("postal_box", e.target.value)} placeholder="BP: 11837 DAKAR" /></div>
            <div><Label className="text-[11px]">Ville</Label><Input value={draft.city ?? ""} onChange={e=>set("city", e.target.value)} /></div>
            <div><Label className="text-[11px]">Pays</Label><Input value={draft.country ?? ""} onChange={e=>set("country", e.target.value)} /></div>
            <div><Label className="text-[11px]">Téléphone</Label><Input value={draft.phone ?? ""} onChange={e=>set("phone", e.target.value)} /></div>
            <div><Label className="text-[11px]">Email</Label><Input type="email" value={draft.email ?? ""} onChange={e=>set("email", e.target.value)} /></div>
            <div className="col-span-2"><Label className="text-[11px]">Site web</Label><Input value={draft.website ?? ""} onChange={e=>set("website", e.target.value)} /></div>
          </div>
        </div>

        {/* Mentions par défaut */}
        <div>
          <h4 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-2"><FileText size={13}/> Mentions & conditions par défaut</h4>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-[11px]">Devise</Label><Input value={draft.default_currency ?? "XOF"} onChange={e=>set("default_currency", e.target.value)} /></div>
            <div><Label className="text-[11px]">TVA % défaut</Label><Input type="number" step="0.1" value={draft.default_tax_rate ?? 18} onChange={e=>set("default_tax_rate", Number(e.target.value))} /></div>
            <div><Label className="text-[11px]">Ville signature</Label><Input value={draft.signatory_city ?? "Dakar"} onChange={e=>set("signatory_city", e.target.value)} /></div>
            <div><Label className="text-[11px]">Conditions facture</Label><Input value={draft.default_payment_terms ?? ""} onChange={e=>set("default_payment_terms", e.target.value)} /></div>
            <div><Label className="text-[11px]">Conditions devis</Label><Input value={draft.default_quote_terms ?? ""} onChange={e=>set("default_quote_terms", e.target.value)} /></div>
            <div><Label className="text-[11px]">Conditions BC</Label><Input value={draft.default_po_terms ?? ""} onChange={e=>set("default_po_terms", e.target.value)} /></div>
          </div>
          <div className="mt-3"><Label className="text-[11px]">Mentions légales (bas de page)</Label><Textarea rows={2} value={draft.legal_mentions ?? ""} onChange={e=>set("legal_mentions", e.target.value)} placeholder="TVA non applicable selon art. ..." /></div>
        </div>

        {/* Banque + signataire */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] flex items-center gap-1"><Banknote size={11}/> Coordonnées bancaires</Label>
            <Textarea rows={3} value={draft.bank_details ?? ""} onChange={e=>set("bank_details", e.target.value)} placeholder="Banque: …  RIB: …  IBAN: …" />
          </div>
          <div className="space-y-2">
            <div><Label className="text-[11px]">Signataire (nom)</Label><Input value={draft.signatory_name ?? ""} onChange={e=>set("signatory_name", e.target.value)} placeholder="La Direction" /></div>
            <div><Label className="text-[11px]">Fonction</Label><Input value={draft.signatory_role ?? ""} onChange={e=>set("signatory_role", e.target.value)} placeholder="Directeur Général" /></div>
          </div>
        </div>

        {/* Footer + couleurs */}
        <div>
          <h4 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-2"><Palette size={13}/> Pied de page PDF & marque</h4>
          <div>
            <Label className="text-[11px]">Pied de page personnalisé (s'affiche en bas de chaque PDF)</Label>
            <Textarea rows={2} value={draft.pdf_footer ?? ""} onChange={e=>set("pdf_footer", e.target.value)} placeholder="Adresse : ... • BP: ... • Tel : ... • Email : ..." />
            <p className="text-[10px] text-muted-foreground mt-1">Si vide, généré automatiquement à partir des coordonnées.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-[11px]">Couleur principale (hex)</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={draft.brand_primary_hex ?? "#0D1F2E"} onChange={e=>set("brand_primary_hex", e.target.value)} className="w-14 h-9 p-1" />
                <Input value={draft.brand_primary_hex ?? ""} onChange={e=>set("brand_primary_hex", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">Couleur accent (hex)</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={draft.brand_accent_hex ?? "#2563EB"} onChange={e=>set("brand_accent_hex", e.target.value)} className="w-14 h-9 p-1" />
                <Input value={draft.brand_accent_hex ?? ""} onChange={e=>set("brand_accent_hex", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <GhButton variant="primary" onClick={() => update.mutate(draft)} disabled={update.isPending}>
          {update.isPending ? "Enregistrement…" : "Enregistrer les paramètres"}
        </GhButton>
      </div>
    </GhCard>
  );
}
