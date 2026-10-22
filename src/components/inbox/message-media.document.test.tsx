import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@app-messages";
import { MessageBubble } from "./message-bubble";
import { fileNameFromUrl } from "./message-media";

describe("fileNameFromUrl", () => {
  it("takes the decoded last path segment and drops the query", () => {
    expect(fileNameFromUrl("https://x.y/media/HouseOf3D-Invoice-HO3D%2F26-27%2F0001.pdf?token=1"))
      .toBe("HouseOf3D-Invoice-HO3D/26-27/0001.pdf");
  });
  it("returns null for empty input", () => {
    expect(fileNameFromUrl(undefined)).toBeNull();
  });
});

describe("document bubble", () => {
  const msg = {
    id: "m1", conversation_id: "c1", sender_type: "agent", content_type: "document",
    media_url: "https://files.example/invoices/HouseOf3D-Invoice-0001.pdf",
    media_type: "application/pdf",
    content_text: "Invoice HO3D/26-27/0001 · order #HO3D1011 https://invoice.houseof3d.store/x",
    status: "delivered", created_at: new Date().toISOString(), direction: "outbound",
  } as never;

  it("shows file name, kind, and the caption with links", () => {
    const html = renderToStaticMarkup(
      createElement(NextIntlClientProvider, { locale: "en", messages } as never,
        createElement(MessageBubble, { message: msg, isAgent: true } as never)),
    );
    expect(html).toContain("HouseOf3D-Invoice-0001.pdf");
    expect(html).toContain(">PDF<");
    expect(html).toContain("Invoice HO3D/26-27/0001");
    expect(html).toContain('href="https://invoice.houseof3d.store/x"');
  });
});
