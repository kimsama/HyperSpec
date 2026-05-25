import { mkdirSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultConfig, saveConfig } from "../lib/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the assets directory. In the compiled output (dist/), __dirname is
 * dist/ so ../assets points to the project root assets/. In tests running
 * source directly, __dirname is src/cli/ so we walk up until we find assets/.
 */
function resolveAssetsDir(): string {
  // Try the compiled path first: dist/ -> ../assets
  const compiled = resolve(__dirname, "..", "assets");
  if (existsSync(join(compiled, "base.css"))) return compiled;

  // Walk up from __dirname to find the assets/ directory (test / dev scenario)
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, "assets");
    if (existsSync(join(candidate, "base.css"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback to the expected compiled path
  return compiled;
}

/**
 * Resolve the portal assets directory (assets/portal/).
 */
function resolvePortalDir(): string {
  const assetsDir = resolveAssetsDir();
  return join(assetsDir, "portal");
}

export async function runInit(projectRoot: string): Promise<void> {
  const outputDir = join(projectRoot, "docs", "html");

  // Create directory structure
  const dirs = [
    outputDir,
    join(outputDir, "assets"),
    join(outputDir, "htmls"),
    join(outputDir, "htmls", "ko"),
    join(outputDir, "components"),
  ];

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  // Copy assets from package's assets/ dir
  const assetSrc = resolveAssetsDir();
  const assetDest = join(outputDir, "assets");

  for (const file of ["base.css", "annotate.js", "annotate.css"]) {
    copyFileSync(join(assetSrc, file), join(assetDest, file));
  }

  // Copy portal assets (portal.js, portal.css)
  const portalSrc = resolvePortalDir();
  for (const file of ["portal.js", "portal.css"]) {
    copyFileSync(join(portalSrc, file), join(assetDest, file));
  }

  // Create hyperspec.config.json (only if not exists)
  const configPath = join(outputDir, "hyperspec.config.json");
  if (!existsSync(configPath)) {
    saveConfig(configPath, getDefaultConfig());
  }

  // Create manifest.json (only if not exists)
  const manifestPath = join(outputDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    writeFileSync(manifestPath, JSON.stringify({ documents: [] }, null, 2) + "\n", "utf-8");
  }

  // Copy portal index.html (only if not exists)
  const indexPath = join(outputDir, "index.html");
  if (!existsSync(indexPath)) {
    copyFileSync(join(portalSrc, "index.html"), indexPath);
  }

  console.log(`[HyperSpec] Initialized at ${outputDir}`);
}
