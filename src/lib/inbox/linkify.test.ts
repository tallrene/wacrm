import { describe, expect, it } from "vitest";
import { splitLinks } from "./linkify";

describe("splitLinks", () => {
  it("returns plain text untouched", () => {
    expect(splitLinks("hello there")).toEqual([{ type: "text", value: "hello there" }]);
  });

  it("detects http(s) URLs and keeps surrounding text", () => {
    expect(splitLinks("see https://houseof3d.store/quote now")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://houseof3d.store/quote", href: "https://houseof3d.store/quote" },
      { type: "text", value: " now" },
    ]);
  });

  it("detects www. links and prefixes https", () => {
    expect(splitLinks("www.makerworld.com/x")).toEqual([
      { type: "link", value: "www.makerworld.com/x", href: "https://www.makerworld.com/x" },
    ]);
  });

  it("leaves trailing punctuation out of the link", () => {
    expect(splitLinks("Link: https://a.b/c, ok (https://d.e/f).")).toEqual([
      { type: "text", value: "Link: " },
      { type: "link", value: "https://a.b/c", href: "https://a.b/c" },
      { type: "text", value: ", ok (" },
      { type: "link", value: "https://d.e/f", href: "https://d.e/f" },
      { type: "text", value: ")." },
    ]);
  });

  it("keeps balanced parentheses inside a URL", () => {
    expect(splitLinks("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([
      {
        type: "link",
        value: "https://en.wikipedia.org/wiki/Foo_(bar)",
        href: "https://en.wikipedia.org/wiki/Foo_(bar)",
      },
    ]);
  });

  it("never links javascript: or other schemes", () => {
    expect(splitLinks("javascript:alert(1) ftp://x.y")).toEqual([
      { type: "text", value: "javascript:alert(1) ftp://x.y" },
    ]);
  });

  it("handles empty / null input", () => {
    expect(splitLinks("")).toEqual([]);
    expect(splitLinks(null)).toEqual([]);
  });
});
