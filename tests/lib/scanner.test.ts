import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanComponents } from "../../src/lib/scanner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "..", "fixtures", "sample-components");
const cssPath = join(fixturesDir, "components.css");
const jsPath = join(fixturesDir, "components.js");

describe("scanComponents", () => {
  describe("CSS parsing", () => {
    it("extracts CSS class names from CSS file", () => {
      const result = scanComponents(cssPath, null);
      expect(result.cssClasses).toContain(".hs-card");
      expect(result.cssClasses).toContain(".hs-grid-2");
      expect(result.cssClasses).toContain(".hs-callout");
      expect(result.cssClasses).toContain(".hs-callout.warning");
      expect(result.cssClasses).toContain(".hs-callout.error");
      expect(result.cssClasses).toHaveLength(5);
    });
  });

  describe("JS parsing", () => {
    it("extracts custom element names from JS file", () => {
      const result = scanComponents(null, jsPath);
      expect(result.customElements).toContain("hs-accordion");
      expect(result.customElements).toContain("hs-copy-button");
      expect(result.customElements).toHaveLength(2);
    });
  });

  describe("toMarkdown", () => {
    it("generates markdown reference with project name, class names, and element names", () => {
      const result = scanComponents(cssPath, jsPath);
      const md = result.toMarkdown("MyProject");
      expect(md).toContain("Component Reference");
      expect(md).toContain("MyProject");
      expect(md).toContain(".hs-card");
      expect(md).toContain(".hs-callout.warning");
      expect(md).toContain("hs-accordion");
      expect(md).toContain("hs-copy-button");
    });
  });

  describe("graceful handling", () => {
    it("handles missing JS file gracefully — cssClasses populated, customElements empty", () => {
      const result = scanComponents(cssPath, null);
      expect(result.cssClasses.length).toBeGreaterThan(0);
      expect(result.customElements).toHaveLength(0);
    });

    it("handles missing CSS file gracefully — customElements populated, cssClasses empty", () => {
      const result = scanComponents(null, jsPath);
      expect(result.cssClasses).toHaveLength(0);
      expect(result.customElements.length).toBeGreaterThan(0);
    });

    it("handles both files missing without throwing", () => {
      const result = scanComponents(null, null);
      expect(result.cssClasses).toHaveLength(0);
      expect(result.customElements).toHaveLength(0);
    });
  });
});
