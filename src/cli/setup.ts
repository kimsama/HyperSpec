import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { loadConfig, saveConfig } from "../lib/config.js";
import { scanComponents } from "../lib/scanner.js";

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function runSetup(projectRoot: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    // 1. Output directory
    const outputDirAnswer = await prompt(rl, "Output directory [docs/html]: ");
    const outputDir = outputDirAnswer || "docs/html";

    // 2. Locales
    const localesAnswer = await prompt(rl, "Locales (comma-separated) [en, ko]: ");
    const locales = localesAnswer
      ? localesAnswer.split(",").map((l) => l.trim()).filter(Boolean)
      : ["en", "ko"];

    // 3. Component library path (optional)
    const componentPathAnswer = await prompt(rl, "Component library path (optional, press Enter to skip): ");
    const componentPath = componentPathAnswer || null;

    // 4. Annotations enabled
    const annotationAnswer = await prompt(rl, "Enable annotations? [yes]: ");
    const annotationEnabled = annotationAnswer === "" || annotationAnswer.toLowerCase() === "yes" || annotationAnswer.toLowerCase() === "y";

    // Resolve config path and load/merge with defaults
    const configPath = join(projectRoot, outputDir, "hyperspec.config.json");
    const config = loadConfig(configPath);

    config.outputDir = outputDir;
    config.locales = locales;
    config.annotation.enabled = annotationEnabled;

    // Handle component library if provided
    if (componentPath) {
      const resolvedComponentPath = resolve(projectRoot, componentPath);
      const cssSource = join(resolvedComponentPath, "components.css");
      const jsSource = join(resolvedComponentPath, "components.js");

      const hasCss = existsSync(cssSource);
      const hasJs = existsSync(jsSource);

      if (hasCss || hasJs) {
        // Scan components
        const scanResult = scanComponents(
          hasCss ? cssSource : null,
          hasJs ? jsSource : null
        );

        // Ensure components output dir exists
        const componentsDest = join(projectRoot, outputDir, "components");
        mkdirSync(componentsDest, { recursive: true });

        // Copy component files
        if (hasCss) {
          copyFileSync(cssSource, join(componentsDest, "components.css"));
          config.components.css = `${outputDir}/components/components.css`;
        }
        if (hasJs) {
          copyFileSync(jsSource, join(componentsDest, "components.js"));
          config.components.js = `${outputDir}/components/components.js`;
        }

        // Generate COMPONENT-REFERENCE.md
        const referencePath = join(componentsDest, "COMPONENT-REFERENCE.md");
        const projectName = projectRoot.split(/[\\/]/).pop() ?? "Project";
        writeFileSync(referencePath, scanResult.toMarkdown(projectName), "utf-8");
        config.components.reference = `${outputDir}/components/COMPONENT-REFERENCE.md`;

        console.log(`[HyperSpec] Scanned ${scanResult.cssClasses.length} CSS classes and ${scanResult.customElements.length} custom elements.`);
      } else {
        console.log(`[HyperSpec] No components.css or components.js found at ${resolvedComponentPath}`);
      }
    }

    // Ensure output dir exists before saving config
    mkdirSync(join(projectRoot, outputDir), { recursive: true });
    saveConfig(configPath, config);

    console.log(`[HyperSpec] Setup complete. Config saved to ${configPath}`);
  } finally {
    rl.close();
  }
}
