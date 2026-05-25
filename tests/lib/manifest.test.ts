import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { extractMetadata, generateManifest } from "../../src/lib/manifest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, "..", "fixtures");

const sampleDocPath = join(fixturesDir, "sample-doc.html");
const sampleNoMetaPath = join(fixturesDir, "sample-no-meta.html");

const koHtml = `<!DOCTYPE html>
<html lang="ko">
<head><title>인증 스펙</title></head>
<body>
<script type="application/json" id="hyperspec-meta">
{"title":"인증 시스템 스펙","category":"spec","tags":["auth","security"],"created":"2026-05-25","updated":"2026-05-25","locale":"ko","version":2}
</script>
<h1>인증 스펙</h1>
</body>
</html>
`;

describe("manifest", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hyperspec-manifest-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("extractMetadata", () => {
    it("extracts metadata from hyperspec-meta script tag", () => {
      const html = readFileSync(sampleDocPath, "utf-8");
      const meta = extractMetadata(html);
      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("Authentication System Spec");
      expect(meta!.category).toBe("spec");
      expect(meta!.tags).toEqual(["auth", "security"]);
      expect(meta!.created).toBe("2026-05-25");
      expect(meta!.updated).toBe("2026-05-25");
      expect(meta!.locale).toBe("en");
      expect(meta!.version).toBe(2);
    });

    it("returns null for HTML without metadata", () => {
      const html = readFileSync(sampleNoMetaPath, "utf-8");
      const meta = extractMetadata(html);
      expect(meta).toBeNull();
    });
  });

  describe("generateManifest", () => {
    it("scans htmls/ directory and builds manifest", () => {
      const htmlsDir = join(tempDir, "htmls");
      mkdirSync(htmlsDir, { recursive: true });
      copyFileSync(sampleDocPath, join(htmlsDir, "auth-spec.html"));

      const manifest = generateManifest(tempDir, {
        title: "Test Docs",
        filters: ["category"],
      });

      expect(manifest.config.title).toBe("Test Docs");
      expect(manifest.documents).toHaveLength(1);
      expect(manifest.documents[0].title).toBe("Authentication System Spec");
      expect(manifest.documents[0].path).toBe("auth-spec.html");
      expect(manifest.documents[0].category).toBe("spec");
      expect(typeof manifest.generated).toBe("string");
    });

    it("links translations to source documents", () => {
      const htmlsDir = join(tempDir, "htmls");
      const koDir = join(htmlsDir, "ko");
      mkdirSync(koDir, { recursive: true });
      copyFileSync(sampleDocPath, join(htmlsDir, "auth-spec.html"));
      writeFileSync(join(koDir, "auth-spec.html"), koHtml, "utf-8");

      const manifest = generateManifest(tempDir, {
        title: "Test Docs",
        filters: [],
      });

      const sourceDoc = manifest.documents.find(
        (d) => d.path === "auth-spec.html"
      );
      expect(sourceDoc).toBeDefined();
      expect(sourceDoc!.translations).toHaveProperty("ko");
      expect(sourceDoc!.translations["ko"]).toBe("ko/auth-spec.html");
    });

    it("skips HTML files without metadata", () => {
      const htmlsDir = join(tempDir, "htmls");
      mkdirSync(htmlsDir, { recursive: true });
      copyFileSync(sampleDocPath, join(htmlsDir, "auth-spec.html"));
      copyFileSync(sampleNoMetaPath, join(htmlsDir, "plain.html"));

      const manifest = generateManifest(tempDir, {
        title: "Test Docs",
        filters: [],
      });

      expect(manifest.documents).toHaveLength(1);
      expect(manifest.documents[0].path).toBe("auth-spec.html");
    });
  });
});
