import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-invert">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Politique de confidentialité</h1>
      <p className="text-muted-foreground">Dernière mise à jour : 3 juin 2026</p>

      <h2 className="text-foreground mt-8">1. Responsable du traitement</h2>
      <p className="text-muted-foreground">GrowHub Accelerator, plateforme SaaS de gestion d'incubateurs et accélérateurs en Afrique.</p>

      <h2 className="text-foreground mt-6">2. Données collectées</h2>
      <ul className="text-muted-foreground">
        <li>Identité : nom, prénom, email, téléphone</li>
        <li>Profil professionnel : organisation, poste, bio, LinkedIn</li>
        <li>Candidatures, KPIs entreprise, données RH (employés)</li>
        <li>Communications : messages, notifications</li>
        <li>Logs techniques (IP hashée, navigateur) à des fins de sécurité</li>
      </ul>

      <h2 className="text-foreground mt-6">3. Bases légales (article 6 RGPD)</h2>
      <p className="text-muted-foreground">Exécution du contrat, obligation légale (paie, comptabilité), intérêt légitime (sécurité), consentement (cookies analytics/marketing).</p>

      <h2 className="text-foreground mt-6">4. Durées de conservation</h2>
      <p className="text-muted-foreground">Données RH : 10 ans (obligation légale). Candidatures : 2 ans. Logs : 6 mois. Voir le registre complet via l'application.</p>

      <h2 className="text-foreground mt-6">5. Vos droits</h2>
      <p className="text-muted-foreground">Conformément aux articles 15 à 22 du RGPD et à la loi sénégalaise n°2008-12 :</p>
      <ul className="text-muted-foreground">
        <li>Droit d'accès et de portabilité (export complet via votre profil)</li>
        <li>Droit de rectification (modifiable dans votre profil)</li>
        <li>Droit à l'effacement (suppression avec délai 30 jours)</li>
        <li>Droit d'opposition au traitement</li>
        <li>Réclamation auprès de la CDP du Sénégal</li>
      </ul>

      <h2 className="text-foreground mt-6">6. Sécurité</h2>
      <p className="text-muted-foreground">Chiffrement TLS, authentification à deux facteurs pour les administrateurs, RLS (Row-Level Security), audit des consultations PII, vérification HIBP des mots de passe.</p>

      <h2 className="text-foreground mt-6">7. Contact</h2>
      <p className="text-muted-foreground">Pour toute question relative à vos données : contact@growhub.app</p>

      <p className="mt-8"><Link to="/login" className="text-primary underline">← Retour</Link></p>
    </main>
  );
}
