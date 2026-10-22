import webpush, { type PushSubscription, WebPushError } from "web-push";
import { createClient } from "@supabase/supabase-js";
import {
  buildNotificationContent,
  conversationHref,
  type NotifiableMessage,
} from "@/lib/notifications/browser-notify";

/**
 * Server side of Web Push. VAPID keys live in env (generate once with
 * `npx web-push generate-vapid-keys`); the public half is also served to
 * the browser by GET /api/push/subscriptions.
 */

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function configured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com",
    pub,
    priv,
  );
  return true;
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface InboundPushInput {
  accountId: string;
  conversationId: string;
  message: NotifiableMessage;
  contactName: string | null;
}

/**
 * Push "new customer message" to every active device of every member of
 * the account. Called once per genuinely-new inbound message (the webhook
 * insert is the idempotency boundary), so one message = one push per
 * device. Dead endpoints (404/410) are marked failed and skipped next time.
 */
export async function sendInboundPush(input: InboundPushInput): Promise<{
  sent: number;
  failed: number;
}> {
  if (!configured()) return { sent: 0, failed: 0 };
  const db = admin();
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("account_id", input.accountId)
    .is("failed_at", null);
  if (error || !subs?.length) return { sent: 0, failed: 0 };

  const content = buildNotificationContent(input.message, input.contactName);
  const payload = JSON.stringify({
    title: content.title,
    body: content.body,
    url: conversationHref(input.conversationId),
    conversationId: input.conversationId,
    messageId: input.message.id,
    // Same tag as the in-page notifier (conversation id): if both ever
    // fire, the OS replaces instead of stacking.
    tag: input.conversationId,
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      const sub: PushSubscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(sub, payload, { TTL: 60 * 60, urgency: "high" });
        sent += 1;
      } catch (err) {
        const code = err instanceof WebPushError ? err.statusCode : 0;
        if (code === 404 || code === 410) dead.push(s.id);
        else console.warn("[push] send failed", code, (err as Error).message);
      }
    }),
  );
  if (dead.length) {
    await db
      .from("push_subscriptions")
      .update({ failed_at: new Date().toISOString() })
      .in("id", dead);
  }
  return { sent, failed: subs.length - sent };
}
