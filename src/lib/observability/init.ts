import { logClientError } from "@/hooks/useSystemHealth";

let initialized = false;

/** Wire window-level error and unhandled rejection handlers to the client error log. */
export function initObservability() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("error", (e) => {
    void logClientError({
      message: e.message || "Uncaught error",
      stack: e.error?.stack,
      severity: "error",
      context: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const message = typeof reason === "string" ? reason : reason?.message ?? "Unhandled promise rejection";
    void logClientError({
      message,
      stack: reason?.stack,
      severity: "error",
      context: { type: "unhandledrejection" },
    });
  });
}
