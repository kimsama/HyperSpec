import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { loadConfig } from "../lib/config.js";
import { extractMetadata } from "../lib/manifest.js";

export async function runTranslate(
  projectRoot: string,
  file: string,
  options: { locale: string }
): Promise<void> {
  const config = loadConfig(
    join(projectRoot, "docs", "html-spec", "hyperspec.config.json")
  );
  const outputDir = join(projectRoot, config.outputDir);
  const filePath = join(outputDir, file);

  if (!existsSync(filePath)) {
    console.error(`✗ File not found: ${filePath}`);
    process.exit(1);
  }

  const html = readFileSync(filePath, "utf-8");
  const meta = extractMetadata(html);
  const locale = options.locale;
  const targetPath = `htmls/${locale}/${basename(file)}`;
  const targetAbsPath = join(outputDir, targetPath);

  const title = meta?.title ?? basename(file);
  const sourceLocale = meta?.locale ?? "en";
  const category = meta?.category ?? "unknown";
  const tags = meta?.tags?.join(", ") ?? "";

  const prompt = `
# HyperSpec Translation Task

## Source Document
- File: ${file}
- Title: ${title}
- Category: ${category}
- Tags: ${tags}
- Source locale: ${sourceLocale}

## Target
- Locale: ${locale}
- Save path: ${targetAbsPath}

## Translation Rules

### Translate:
- All visible text content (headings, paragraphs, lists, table cells, labels)
- The \`title\` field in the \`<title>\` tag
- The \`locale\` field inside the \`<script id="hyperspec-meta">\` JSON block — change it to "${locale}"
- Alt text for images (\`alt="..."\`)
- \`placeholder\` and \`aria-label\` attributes when they contain natural language text

### Preserve exactly (do not translate):
- HTML structure, tags, and attributes (except the ones listed above)
- CSS class names and IDs
- Code blocks (\`<code>\`, \`<pre>\`), inline code, and technical identifiers
- URLs, file paths, and import statements
- JSON keys inside \`<script id="hyperspec-meta">\` (only translate the \`title\` value and change \`locale\`)
- JavaScript and any \`<script>\` content other than \`hyperspec-meta\`
- Annotation data attributes (\`data-hs-*\`)

## Steps
1. Read the source file at: ${join(outputDir, file)}
2. Translate the content following the rules above into ${locale}
3. Save the translated file to: ${targetAbsPath}
4. Run \`hyperspec index\` in the project root to update manifest.json

## Notes
- Maintain the same HTML formatting and indentation
- Do not add or remove structural elements
- Ensure the translated document reads naturally in ${locale}
`.trimStart();

  process.stdout.write(prompt);
}
