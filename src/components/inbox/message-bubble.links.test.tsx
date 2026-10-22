import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@app-messages";
import { MessageBubble } from "./message-bubble";

const msg = {
  id: "m1", conversation_id: "c1", sender_type: "customer", content_type: "text",
  content_text: "Quote here https://quote.houseof3d.store/q/123. Thanks!",
  status: "delivered", created_at: new Date().toISOString(), direction: "inbound",
} as never;

describe("MessageBubble links", () => {
  it("renders URLs as safe anchors", () => {
    const html = renderToStaticMarkup(
      createElement(NextIntlClientProvider, { locale: "en", messages } as never,
        createElement(MessageBubble, { message: msg, isAgent: false } as never)),
    );
    expect(html).toContain('href="https://quote.houseof3d.store/q/123"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain(". Thanks!");
  });
});
