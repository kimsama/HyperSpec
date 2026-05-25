import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../lib/config.js";
import { generateManifest } from "../lib/manifest.js";

export async function runIndex(projectRoot: string): Promise<void> {
  const config = loadConfig(
    join(projectRoot, "docs", "html", "hyperspec.config.json")
  );
  const outputDir = join(projectRoot, config.outputDir);
  const manifest = generateManifest(outputDir, {
    title: config.index.title,
    filters: config.index.filters,
  });
  writeFileSync(
    join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
  console.log(
    `✓ Indexed ${manifest.documents.length} document(s) → manifest.json`
  );
}
