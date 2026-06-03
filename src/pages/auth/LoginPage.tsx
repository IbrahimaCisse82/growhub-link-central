import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo-growhublink.png";

export default function LoginPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/app/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[400px] space-y-8 bg-card/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-border">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="Grow Hub Management System" className="h-10 w-auto" />
          <div className="text-center">
            <h1 className="text-xl font-display font-bold text-foreground">Connexion</h1>
            <p className="text-sm text-muted-foreground mt-1">Accédez à votre espace Grow Hub Management System</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              placeholder="vous@exemple.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <a href="/forgot-password" className="text-xs text-primary hover:underline">
                Mot de passe oublié ?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex h-10 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          L'accès se fait sur invitation ou via un{" "}
          <Link to="/postuler" className="text-primary hover:underline font-medium">appel à candidature →</Link>
        </p>

        <div className="text-center text-[10px] text-muted-foreground space-x-3 pt-2 border-t border-border">
          <Link to="/politique-confidentialite" className="hover:text-foreground">Politique de confidentialité</Link>
          <span>·</span>
          <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
        </div>
      </div>
    </div>
  );
}
