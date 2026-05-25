import { readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";

export interface HyperSpecConfig {
  outputDir: string;
  locales: string[];
  components: {
    css: string | null;
    js: string | null;
    reference: string | null;
  };
  assetMode: "reference" | "inline";
  annotation: {
    enabled: boolean;
    exportFormat: "structured-json" | "plaintext";
  };
  index: {
    title: string;
    search: boolean;
    filters: string[];
  };
}

export function getDefaultConfig(): HyperSpecConfig {
  return {
    outputDir: "docs/html-spec",
    locales: ["en", "ko"],
    components: { css: null, js: null, reference: null },
    assetMode: "reference",
    annotation: { enabled: true, exportFormat: "structured-json" },
    index: { title: "Project Documentation", search: true, filters: ["category", "tags", "locale"] },
  };
}

export function loadConfig(configPath: string): HyperSpecConfig {
  const defaults = getDefaultConfig();
  if (!existsSync(configPath)) return defaults;
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  return {
    outputDir: raw.outputDir ?? defaults.outputDir,
    locales: raw.locales ?? defaults.locales,
    components: {
      css: raw.components?.css ?? defaults.components.css,
      js: raw.components?.js ?? defaults.components.js,
      reference: raw.components?.reference ?? defaults.components.reference,
    },
    assetMode: raw.assetMode ?? defaults.assetMode,
    annotation: {
      enabled: raw.annotation?.enabled ?? defaults.annotation.enabled,
      exportFormat: raw.annotation?.exportFormat ?? defaults.annotation.exportFormat,
    },
    index: {
      title: raw.index?.title ?? defaults.index.title,
      search: raw.index?.search ?? defaults.index.search,
      filters: raw.index?.filters ?? defaults.index.filters,
    },
  };
}

export function saveConfig(configPath: string, config: HyperSpecConfig): void {
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
