import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  class WebPushError extends Error {
    statusCode: number;
    constructor(code: number) { super("push"); this.statusCode = code; }
  }
  const state = { rows: [] as Array<{ id: string; endpoint: string; p256dh: string; auth: string }> };
  return {
    WebPushError,
    state,
    sendNotification: vi.fn(),
    setVapidDetails: vi.fn(),
    update: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({}) }),
  };
});
vi.mock("web-push", () => ({
  default: { sendNotification: (...a: unknown[]) => h.sendNotification(...a), setVapidDetails: h.setVapidDetails },
  WebPushError: h.WebPushError,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ is: async () => ({ data: h.state.rows, error: null }) }) }),
      update: h.update,
    }),
  }),
}));
const { sendNotification, update, WebPushError } = h;

import { sendInboundPush } from "./server";

const input = {
  accountId: "acc",
  conversationId: "conv-1",
  message: { id: "m1", conversation_id: "conv-1", sender_type: "customer" as const, content_type: "text" as const, content_text: "hello" },
  contactName: "Gaurang",
};

describe("sendInboundPush", () => {
  beforeEach(() => {
    sendNotification.mockReset(); update.mockClear();
    process.env.VAPID_PUBLIC_KEY = "pub"; process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    h.state.rows = [
      { id: "s1", endpoint: "https://push/a", p256dh: "p", auth: "a" },
      { id: "s2", endpoint: "https://push/b", p256dh: "p", auth: "a" },
    ];
  });

  it("is a no-op without VAPID keys", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    expect(await sendInboundPush(input)).toEqual({ sent: 0, failed: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("pushes one payload per device with title/body/url", async () => {
    sendNotification.mockResolvedValue({});
    const r = await sendInboundPush(input);
    expect(r).toEqual({ sent: 2, failed: 0 });
    const payload = JSON.parse(sendNotification.mock.calls[0][1] as string);
    expect(payload.title).toBe("Gaurang");
    expect(payload.body).toBe("hello");
    expect(payload.url).toContain("conv-1");
  });

  it("marks 410 endpoints failed and keeps going", async () => {
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("/a")) throw new WebPushError(410);
      return {};
    });
    const r = await sendInboundPush(input);
    expect(r).toEqual({ sent: 1, failed: 1 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ failed_at: expect.any(String) }));
  });
});
