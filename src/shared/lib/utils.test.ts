import { describe, expect, it } from "vitest";
import { formatBytes, stripHtml } from "./utils";

describe("utils", () => {
  it("strips html from note content", () => {
    expect(stripHtml("<h1>Hello</h1><p>vault&nbsp;world</p>")).toContain("Hello");
  });

  it("formats file sizes", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});
