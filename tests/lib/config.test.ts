import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, saveConfig, getDefaultConfig } from "../../src/lib/config.js";

describe("config", () => {
  let tempDir: string;
  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "hyperspec-test-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  describe("getDefaultConfig", () => {
    it("returns complete default config", () => {
      const config = getDefaultConfig();
      expect(config.outputDir).toBe("docs/html-spec");
      expect(config.locales).toEqual(["en", "ko"]);
      expect(config.assetMode).toBe("reference");
      expect(config.annotation.enabled).toBe(true);
      expect(config.annotation.exportFormat).toBe("structured-json");
      expect(config.components.css).toBeNull();
      expect(config.index.title).toBe("Project Documentation");
      expect(config.index.search).toBe(true);
      expect(config.index.filters).toEqual(["category", "tags", "locale"]);
    });
  });

  describe("saveConfig and loadConfig", () => {
    it("round-trips config to JSON file", () => {
      const config = getDefaultConfig();
      config.index.title = "My Docs";
      const configPath = join(tempDir, "hyperspec.config.json");
      saveConfig(configPath, config);
      const loaded = loadConfig(configPath);
      expect(loaded.index.title).toBe("My Docs");
      expect(loaded.outputDir).toBe("docs/html-spec");
    });

    it("returns default config when file does not exist", () => {
      const config = loadConfig(join(tempDir, "nonexistent.json"));
      expect(config).toEqual(getDefaultConfig());
    });

    it("merges partial config with defaults", () => {
      const configPath = join(tempDir, "hyperspec.config.json");
      writeFileSync(configPath, JSON.stringify({ outputDir: "custom/path" }));
      const loaded = loadConfig(configPath);
      expect(loaded.outputDir).toBe("custom/path");
      expect(loaded.locales).toEqual(["en", "ko"]);
      expect(loaded.annotation.enabled).toBe(true);
    });
  });
});
