/* House of 3D CRM service worker: Web Push only (no offline caching). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "House of 3D", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "House of 3D";
  const url = data.url || "/inbox";

  event.waitUntil(
    (async () => {
      // If this device already has the app open, visible and focused, the
      // in-page inbox is showing the message — don't double-notify.
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = wins.some((w) => w.visibilityState === "visible" && w.focused);
      if (focused) return;
      await self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icon-192",
        badge: "/icon-192",
        tag: data.tag || "house-of-3d",
        renotify: true,
        data: { url, conversationId: data.conversationId, messageId: data.messageId },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/inbox";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if ("focus" in w) {
          await w.focus();
          if ("navigate" in w) {
            try { await w.navigate(url); } catch {}
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
