import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { runIndex } from "../../src/cli/index-cmd.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "..", "fixtures");
const sampleDocPath = join(fixturesDir, "sample-doc.html");

describe("index-cmd", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hyperspec-index-cmd-"));
    // Set up the expected directory structure: docs/html-spec/htmls/
    mkdirSync(join(tempDir, "docs", "html-spec", "htmls"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("generates manifest.json from HTML files", async () => {
    // Place a sample HTML doc in htmls/
    const htmlsDir = join(tempDir, "docs", "html-spec", "htmls");
    copyFileSync(sampleDocPath, join(htmlsDir, "auth-spec.html"));

    await runIndex(tempDir);

    const manifestPath = join(tempDir, "docs", "html-spec", "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.documents).toHaveLength(1);
    expect(manifest.documents[0].title).toBe("Authentication System Spec");
    expect(manifest.documents[0].path).toBe("auth-spec.html");
    expect(manifest.config).toBeDefined();
  });

  it("creates empty manifest when no HTML files exist", async () => {
    // htmls/ dir exists but is empty
    await runIndex(tempDir);

    const manifestPath = join(tempDir, "docs", "html-spec", "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.documents).toEqual([]);
    expect(manifest.config).toBeDefined();
  });
});
