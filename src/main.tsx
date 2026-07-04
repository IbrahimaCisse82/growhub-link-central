import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "@/lib/pwa/registerSW";
import { initObservability } from "@/lib/observability/init";
import GlobalErrorBoundary from "@/components/shared/GlobalErrorBoundary";

initObservability();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

registerServiceWorker();
