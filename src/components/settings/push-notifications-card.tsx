"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Smartphone, CircleAlert, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  currentSubscription,
  disablePush,
  enablePush,
  pushSupport,
  type PushSupport,
} from "@/lib/push/client";
import { useNotifySoundPref } from "@/hooks/use-new-message-sound";
import { playNewMessageChime, writeNotifySoundPref } from "@/lib/notifications/sound";

/**
 * Per-device Web Push opt-in. Unlike the desktop card above it, this
 * works when the app is closed — and is the only kind of notification an
 * iPhone Home-Screen web app can show.
 */
export function PushNotificationsCard({ className }: { className?: string }) {
  const t = useTranslations("Settings.pushNotifications");
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const soundOn = useNotifySoundPref();

  useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    if (s !== "ok") {
      setReady(true);
      return;
    }
    void currentSubscription()
      .then((sub) => setEnabled(!!sub && Notification.permission === "granted"))
      .finally(() => setReady(true));
  }, []);

  const onToggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const r = await enablePush();
        if (r === "granted") {
          setEnabled(true);
          toast.success(t("enabledToast"));
        } else if (r === "denied") {
          toast.error(t("deniedToast"), { description: t("deniedHint") });
        } else {
          toast.error(t("unconfigured"));
        }
      } else {
        await disablePush();
        setEnabled(false);
      }
    } catch (err) {
      toast.error(t("failed"), { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Smartphone className="size-4 text-muted-foreground" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Volume2 className="size-4 text-muted-foreground" />
              {t("soundLabel")}
            </p>
            <p className="text-xs text-muted-foreground">{t("soundDesc")}</p>
          </div>
          <Switch
            checked={soundOn}
            onCheckedChange={(next) => {
              writeNotifySoundPref(next);
              if (next) playNewMessageChime();
            }}
            aria-label={t("soundLabel")}
          />
        </div>
        {support === "needs-install" ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{t("needsInstall")}</span>
          </p>
        ) : support === "unsupported" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleAlert className="size-4 shrink-0" />
            {t("unsupported")}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t("toggleLabel")}</p>
              <p className="text-xs text-muted-foreground">{t("toggleDesc")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(busy || !ready) && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={enabled}
                onCheckedChange={(next) => void onToggle(next)}
                disabled={busy || !ready}
                aria-label={t("toggleLabel")}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
