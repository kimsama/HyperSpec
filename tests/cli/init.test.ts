import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "../../src/cli/init.js";

describe("init", () => {
  let tempDir: string;
  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "hyperspec-init-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("creates the full directory structure", async () => {
    await runInit(tempDir);
    const base = join(tempDir, "docs", "html-spec");
    expect(existsSync(join(base, "index.html"))).toBe(true);
    expect(existsSync(join(base, "manifest.json"))).toBe(true);
    expect(existsSync(join(base, "hyperspec.config.json"))).toBe(true);
    expect(existsSync(join(base, "assets", "base.css"))).toBe(true);
    expect(existsSync(join(base, "assets", "annotate.js"))).toBe(true);
    expect(existsSync(join(base, "assets", "annotate.css"))).toBe(true);
    expect(existsSync(join(base, "htmls"))).toBe(true);
    expect(existsSync(join(base, "htmls", "ko"))).toBe(true);
    expect(existsSync(join(base, "components"))).toBe(true);
  });

  it("creates valid config file with defaults", async () => {
    await runInit(tempDir);
    const configPath = join(tempDir, "docs", "html-spec", "hyperspec.config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.outputDir).toBe("docs/html-spec");
    expect(config.annotation.enabled).toBe(true);
  });

  it("creates empty manifest with documents array", async () => {
    await runInit(tempDir);
    const manifestPath = join(tempDir, "docs", "html-spec", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.documents).toEqual([]);
  });

  it("does not overwrite existing config", async () => {
    await runInit(tempDir);
    const configPath = join(tempDir, "docs", "html-spec", "hyperspec.config.json");
    const original = readFileSync(configPath, "utf-8");
    await runInit(tempDir);
    expect(readFileSync(configPath, "utf-8")).toBe(original);
  });
});
