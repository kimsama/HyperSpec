import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "../../src/cli/init.js";
import { runIndex } from "../../src/cli/index-cmd.js";

describe("full flow", () => {
  let tempDir: string;
  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "hyperspec-e2e-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("init → add HTML → index → manifest has document", async () => {
    await runInit(tempDir);

    const htmlContent = `<!DOCTYPE html><html><body>
<script type="application/json" id="hyperspec-meta">
{"title":"E2E Integration Test","category":"spec","tags":["e2e","test"],"created":"2026-05-25","updated":"2026-05-25","locale":"en","version":1}
</script>
<link rel="stylesheet" href="../assets/base.css">
<link rel="stylesheet" href="../assets/annotate.css">
<h1>E2E Test</h1>
<script src="../assets/annotate.js"></script>
</body></html>`;

    writeFileSync(join(tempDir, "docs", "html-spec", "htmls", "e2e-test.html"), htmlContent);
    await runIndex(tempDir);

    const manifest = JSON.parse(readFileSync(join(tempDir, "docs", "html-spec", "manifest.json"), "utf-8"));
    expect(manifest.documents).toHaveLength(1);
    expect(manifest.documents[0].title).toBe("E2E Integration Test");
    expect(manifest.documents[0].category).toBe("spec");
    expect(manifest.documents[0].tags).toEqual(["e2e", "test"]);
    expect(manifest.documents[0].path).toBe("e2e-test.html");
  });

  it("translation linking works across locales", async () => {
    await runInit(tempDir);

    const enHtml = `<!DOCTYPE html><html><body>
<script type="application/json" id="hyperspec-meta">
{"title":"Test Doc","category":"spec","tags":["test"],"created":"2026-05-25","updated":"2026-05-25","locale":"en","version":1}
</script></body></html>`;

    const koHtml = enHtml.replace('"locale":"en"', '"locale":"ko"');

    writeFileSync(join(tempDir, "docs", "html-spec", "htmls", "test-doc.html"), enHtml);
    writeFileSync(join(tempDir, "docs", "html-spec", "htmls", "ko", "test-doc.html"), koHtml);

    await runIndex(tempDir);

    const manifest = JSON.parse(readFileSync(join(tempDir, "docs", "html-spec", "manifest.json"), "utf-8"));
    const enDoc = manifest.documents.find((d: any) => d.locale === "en");
    expect(enDoc.translations).toEqual({ ko: "ko/test-doc.html" });
  });

  it("annotation assets are present after init", async () => {
    await runInit(tempDir);
    const assetsDir = join(tempDir, "docs", "html-spec", "assets");
    expect(existsSync(join(assetsDir, "annotate.js"))).toBe(true);
    expect(existsSync(join(assetsDir, "annotate.css"))).toBe(true);
    expect(existsSync(join(assetsDir, "base.css"))).toBe(true);
    expect(existsSync(join(assetsDir, "portal.js"))).toBe(true);
    expect(existsSync(join(assetsDir, "portal.css"))).toBe(true);
  });
});
