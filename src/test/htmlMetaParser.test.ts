import { describe, it, expect } from "vitest";
import {
  parseMetaTags,
  parseMetaTagsAll,
  parseCanonical,
  decodeHtmlEntities,
} from "../lib/htmlMetaParser";

describe("decodeHtmlEntities", () => {
  it("decodes named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("&quot;hi&quot;")).toBe('"hi"');
    expect(decodeHtmlEntities("a&nbsp;b")).toBe("a\u00a0b");
  });
  it("decodes decimal and hex numeric entities", () => {
    expect(decodeHtmlEntities("&#39;x&#39;")).toBe("'x'");
    expect(decodeHtmlEntities("&#x2F;path")).toBe("/path");
  });
  it("leaves unknown entities untouched", () => {
    expect(decodeHtmlEntities("&bogus;")).toBe("&bogus;");
  });
});

describe("parseMetaTags – attribute order", () => {
  it("handles property-then-content", () => {
    const html = `<meta property="og:title" content="Hello">`;
    expect(parseMetaTags(html)["og:title"]).toBe("Hello");
  });
  it("handles content-then-property", () => {
    const html = `<meta content="Hello" property="og:title">`;
    expect(parseMetaTags(html)["og:title"]).toBe("Hello");
  });
  it("handles unrelated attributes interleaved", () => {
    const html = `<meta data-rh="true" property="og:image" data-foo="x" content="https://x/y.jpg">`;
    expect(parseMetaTags(html)["og:image"]).toBe("https://x/y.jpg");
  });
  it("handles name= as well as property=", () => {
    const html = `<meta name="twitter:card" content="summary_large_image">`;
    expect(parseMetaTags(html)["twitter:card"]).toBe("summary_large_image");
  });
});

describe("parseMetaTags – quoting and whitespace", () => {
  it("supports single quotes", () => {
    const html = `<meta property='og:title' content='Hi'>`;
    expect(parseMetaTags(html)["og:title"]).toBe("Hi");
  });
  it("supports unquoted values", () => {
    const html = `<meta property=og:type content=website>`;
    expect(parseMetaTags(html)["og:type"]).toBe("website");
  });
  it("tolerates whitespace and newlines around = and between attrs", () => {
    const html = `<meta\n  property = "og:title"\n  content =\n  "Hello world"\n>`;
    expect(parseMetaTags(html)["og:title"]).toBe("Hello world");
  });
  it("tolerates self-closing slashes and uppercase tag names", () => {
    const html = `<META PROPERTY="og:type" CONTENT="article" />`;
    expect(parseMetaTags(html)["og:type"]).toBe("article");
  });
});

describe("parseMetaTags – duplicates", () => {
  it("keeps the first occurrence when a key is duplicated", () => {
    const html = `
      <meta property="og:image" content="https://a/first.jpg">
      <meta property="og:image" content="https://b/second.jpg">
    `;
    expect(parseMetaTags(html)["og:image"]).toBe("https://a/first.jpg");
  });
  it("parseMetaTagsAll exposes every occurrence in order", () => {
    const html = `
      <meta property="og:image" content="https://a.jpg">
      <meta property="og:image" content="https://b.jpg">
    `;
    expect(parseMetaTagsAll(html)["og:image"]).toEqual([
      "https://a.jpg",
      "https://b.jpg",
    ]);
  });
});

describe("parseMetaTags – entity decoding", () => {
  it("decodes entities in content", () => {
    const html = `<meta property="og:title" content="Tom &amp; Jerry &#39;run&#39;">`;
    expect(parseMetaTags(html)["og:title"]).toBe("Tom & Jerry 'run'");
  });
});

describe("parseMetaTags – ignored regions", () => {
  it("skips meta tags inside HTML comments", () => {
    const html = `
      <!-- <meta property="og:title" content="HIDDEN"> -->
      <meta property="og:title" content="VISIBLE">
    `;
    expect(parseMetaTags(html)["og:title"]).toBe("VISIBLE");
  });
  it("skips meta-looking strings inside <script>", () => {
    const html = `
      <script>const s = '<meta property="og:title" content="HIDDEN">';</script>
      <meta property="og:title" content="VISIBLE">
    `;
    expect(parseMetaTags(html)["og:title"]).toBe("VISIBLE");
  });
});

describe("parseCanonical", () => {
  it("finds canonical with rel-then-href", () => {
    expect(
      parseCanonical(`<link rel="canonical" href="https://x/y">`),
    ).toBe("https://x/y");
  });
  it("finds canonical with href-then-rel", () => {
    expect(
      parseCanonical(`<link href="https://x/y" rel="canonical">`),
    ).toBe("https://x/y");
  });
  it("finds canonical when rel has multiple tokens", () => {
    expect(
      parseCanonical(`<link rel="canonical alternate" href="https://x/y">`),
    ).toBe("https://x/y");
  });
  it("ignores non-canonical link tags", () => {
    expect(
      parseCanonical(`<link rel="stylesheet" href="/a.css">`),
    ).toBeNull();
  });
  it("decodes entities in href", () => {
    expect(
      parseCanonical(`<link rel="canonical" href="https://x/y?a=1&amp;b=2">`),
    ).toBe("https://x/y?a=1&b=2");
  });
});
