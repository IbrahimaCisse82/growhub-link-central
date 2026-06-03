import { Link } from "react-router-dom";

export default function LegalNoticePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Mentions légales</h1>

      <section className="space-y-4 text-muted-foreground">
        <div>
          <h2 className="text-foreground font-display font-bold mt-4">Éditeur</h2>
          <p>GrowHub Accelerator — Plateforme SaaS de gestion d'incubateurs.</p>
        </div>
        <div>
          <h2 className="text-foreground font-display font-bold mt-4">Hébergement</h2>
          <p>Lovable Cloud (infrastructure managée), datacenters européens.</p>
        </div>
        <div>
          <h2 className="text-foreground font-display font-bold mt-4">Propriété intellectuelle</h2>
          <p>L'ensemble du contenu (textes, images, code) est protégé par le droit d'auteur. Toute reproduction non autorisée est interdite.</p>
        </div>
        <div>
          <h2 className="text-foreground font-display font-bold mt-4">Délégué à la protection des données</h2>
          <p>contact@growhub.app</p>
        </div>
        <div>
          <h2 className="text-foreground font-display font-bold mt-4">Autorité de contrôle</h2>
          <p>Commission de Protection des Données Personnelles (CDP) du Sénégal — www.cdp.sn</p>
        </div>
      </section>

      <p className="mt-8"><Link to="/login" className="text-primary underline">← Retour</Link></p>
    </main>
  );
}
