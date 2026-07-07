/**
 * Additional handlers injected into the Workbox-generated service worker.
 * Configured via `workbox.importScripts` in vite.config.ts.
 * Handles web push notifications and click routing.
 */
/* eslint-disable no-undef */

self.addEventListener("push", (event) => {
  let data = { title: "GrowHub", body: "Nouvelle notification", url: "/app/dashboard" };
  try {
    if (event.data) {
      const raw = event.data.text();
      if (raw) data = { ...data, ...JSON.parse(raw) };
    }
  } catch (_e) {
    /* keep defaults */
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url ?? "/app/dashboard" },
    tag: data.tag,
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/app/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin && "focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        } catch (_) { /* ignore */ }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
