import { NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { vapidPublicKey } from "@/lib/push/server";

// GET  → { publicKey }            (null when push is not configured)
// POST → { subscription }         upsert this device's subscription
// DELETE → { endpoint }           remove this device's subscription

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, userId } = await getCurrentAccount();
    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("failed_at", null);
    return NextResponse.json({ publicKey: vapidPublicKey(), devices: count ?? 0 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

interface SubBody {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await getCurrentAccount();
  } catch (err) {
    return toErrorResponse(err);
  }
  if (!vapidPublicKey()) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as SubBody | null;
  const sub = body?.subscription;
  const endpoint = sub?.endpoint?.trim();
  const p256dh = sub?.keys?.p256dh?.trim();
  const auth = sub?.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint)) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }
  const { error } = await ctx.supabase.from("push_subscriptions").upsert(
    {
      user_id: ctx.userId,
      account_id: ctx.accountId,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      last_seen_at: new Date().toISOString(),
      failed_at: null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  let ctx;
  try {
    ctx = await getCurrentAccount();
  } catch (err) {
    return toErrorResponse(err);
  }
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = body?.endpoint?.trim();
  if (!endpoint) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { error } = await ctx.supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("endpoint", endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
