"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";
import {
  playNewMessageChime,
  readNotifySoundPref,
  readNotifySoundPreset,
  subscribeNotifySoundPref,
  unlockNotifySound,
  type SoundPreset,
} from "@/lib/notifications/sound";

const serverSnapshot = () => true;

export function useNotifySoundPref(): boolean {
  return useSyncExternalStore(subscribeNotifySoundPref, readNotifySoundPref, serverSnapshot);
}

const serverPreset = (): SoundPreset => "chime";

export function useNotifySoundPreset(): SoundPreset {
  return useSyncExternalStore(subscribeNotifySoundPref, readNotifySoundPreset, serverPreset);
}

/**
 * Audible chime for every new inbound customer message while a dashboard
 * tab is open (WhatsApp Web behaviour) — independent of OS notification
 * sound settings. Mount once per signed-in tab. Dedupes by message id
 * because the realtime INSERT and the service worker's push relay can
 * both announce the same message.
 */
export function useNewMessageSound(): void {
  const enabled = useNotifySoundPref();
  const seen = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    unlockNotifySound();

    const ring = (id: string) => {
      const now = Date.now();
      for (const [k, at] of seen.current) if (now - at > 10 * 60_000) seen.current.delete(k);
      if (seen.current.has(id)) return;
      seen.current.set(id, now);
      playNewMessageChime();
    };

    const supabase = createClient();
    const channel = supabase
      .channel("new-message-sound")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_type !== "customer") return;
          ring(msg.id);
        },
      )
      .subscribe();

    const onSwMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; messageId?: string } | null;
      if (d?.type === "push" && d.messageId) ring(d.messageId);
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      supabase.removeChannel(channel);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [enabled]);
}
