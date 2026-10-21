/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Modules optionnels à activer, séparés par des virgules, ou "all". Voir src/lib/featureFlags.ts. */
  readonly VITE_ENABLED_MODULES?: string;
}
