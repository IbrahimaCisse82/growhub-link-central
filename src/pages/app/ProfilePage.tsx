import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import GdprDataPanel from "@/components/profile/GdprDataPanel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin", coordinator: "Coordinateur", project_manager: "Chef de projet", mentor: "Mentor",
  entrepreneur: "Entrepreneur", evaluator: "Évaluateur", investor: "Investisseur", funder: "Bailleur",
};
function PasswordChangeForm() {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changing, setChanging] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) { toast({ title: "Le mot de passe doit faire au moins 6 caractères", variant: "destructive" }); return; }
    if (newPw !== confirmPw) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    setChanging(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "✓ Mot de passe modifié" }); setNewPw(""); setConfirmPw(""); }
    setChanging(false);
  };

  return (
    <form onSubmit={handleChange} className="space-y-3">
      <div className="text-sm font-semibold text-foreground mb-2">🔒 Changer le mot de passe</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nouveau mot de passe</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inputCls} required minLength={6} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Confirmer</label>
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} required />
        </div>
      </div>
      <GhButton type="submit" variant="secondary" size="sm" disabled={changing}>
        {changing ? "Modification…" : "Modifier le mot de passe"}
      </GhButton>
    </form>
  );
}

export default function ProfilePage() {
  const { profile, roles, refetchProfile, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [position, setPosition] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setOrganization(profile.organization || "");
      setPosition(profile.position || "");
      setBio(profile.bio || "");
      setLinkedinUrl(profile.linkedin_url || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast({ title: "Le nom est requis", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(), phone: phone || null, organization: organization || null,
      position: position || null, bio: bio || null, linkedin_url: linkedinUrl || null,
    }).eq("user_id", profile!.user_id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "✓ Profil mis à jour" }); await refetchProfile(); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast({ title: "Erreur upload", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    toast({ title: "✓ Avatar mis à jour" });
    await refetchProfile();
    setUploading(false);
  };

  const avatarUrl = profile?.avatar_url;
  const initials = fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Mon profil" subtitle="Gérez vos informations personnelles" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-foreground">Nom complet *</label><input value={fullName} onChange={e => setFullName(e.target.value)} required className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-foreground">Email</label><input value={profile?.email || ""} disabled className={inputCls + " opacity-50"} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-foreground">Téléphone</label><input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-foreground">Organisation</label><input value={organization} onChange={e => setOrganization(e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium text-foreground">Poste</label><input value={position} onChange={e => setPosition(e.target.value)} className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-foreground">LinkedIn</label><input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/..." /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} className={inputCls + " h-24 resize-none"} /></div>
              <GhButton type="submit" disabled={saving} variant="primary" size="md">
                {saving ? "⏳ Enregistrement…" : "✓ Enregistrer"}
              </GhButton>
            </form>

            {/* Password change */}
            <div className="mt-6 pt-6 border-t border-border">
              <PasswordChangeForm />
            </div>
          </div>
        </div>
        <div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="relative inline-block">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover mx-auto" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-primary-foreground mx-auto">
                    {initials}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs cursor-pointer hover:brightness-110">
                  📷
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              {uploading && <div className="text-xs text-muted-foreground mt-2">Upload en cours…</div>}
              <div className="mt-3 font-display font-bold text-foreground">{fullName || "—"}</div>
              <div className="text-xs text-muted-foreground">{profile?.email}</div>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Rôles</div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map(r => <Pill key={r} color="blue">{roleLabels[r] ?? r}</Pill>)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-display font-bold text-foreground mb-4">Mes données personnelles (RGPD)</h3>
        <GdprDataPanel />
      </div>
    </motion.div>
  );
}
