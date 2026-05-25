import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";

export interface DocumentMeta {
  title: string;
  category: string;
  tags: string[];
  created: string;
  updated: string;
  locale: string;
  source?: string;
  version: number;
}

export interface ManifestDocument extends DocumentMeta {
  path: string;
  translations: Record<string, string>;
}

export interface Manifest {
  generated: string;
  config: { title: string; filters: string[] };
  documents: ManifestDocument[];
}

export function extractMetadata(html: string): DocumentMeta | null {
  // Match <script ... id="hyperspec-meta" ...>JSON</script>
  const match = html.match(
    /<script[^>]*\bid="hyperspec-meta"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    const data = JSON.parse(match[1].trim());
    if (!data.title || !data.category) return null;
    return {
      title: data.title,
      category: data.category,
      tags: Array.isArray(data.tags) ? data.tags : [],
      created: data.created ?? "",
      updated: data.updated ?? "",
      locale: data.locale ?? "en",
      source: data.source,
      version: typeof data.version === "number" ? data.version : 1,
    };
  } catch {
    return null;
  }
}

function collectHtmlFiles(
  dir: string,
  baseDir: string
): Array<{ path: string; absPath: string }> {
  if (!existsSync(dir)) return [];

  const results: Array<{ path: string; absPath: string }> = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(absPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      // Use forward slashes for cross-platform consistency
      const rel = relative(baseDir, absPath).replace(/\\/g, "/");
      results.push({ path: rel, absPath });
    }
  }

  return results;
}

export function generateManifest(
  outputDir: string,
  config: { title: string; filters: string[] }
): Manifest {
  const htmlsDir = join(outputDir, "htmls");
  const files = collectHtmlFiles(htmlsDir, htmlsDir);

  // First pass: extract metadata for all files
  const docMap = new Map<
    string,
    { meta: DocumentMeta; path: string; absPath: string }
  >();
  for (const file of files) {
    const html = readFileSync(file.absPath, "utf-8");
    const meta = extractMetadata(html);
    if (!meta) continue;
    docMap.set(file.path, { meta, path: file.path, absPath: file.absPath });
  }

  // Second pass: build documents and link translations
  // Source documents are at the top level (no locale subdir prefix)
  // Translation documents are in locale subdirs (e.g. "ko/auth-spec.html")
  const sourceDocuments = new Map<string, ManifestDocument>();
  const translationEntries: Array<{
    locale: string;
    filename: string;
    path: string;
  }> = [];

  for (const [docPath, { meta, path }] of docMap) {
    // Detect if this is a locale subdirectory file (one level deep: locale/filename.html)
    const parts = docPath.split("/");
    if (parts.length === 2) {
      // This is a translation: parts[0] = locale, parts[1] = filename
      translationEntries.push({
        locale: parts[0],
        filename: parts[1],
        path: docPath,
      });
    } else if (parts.length === 1) {
      // Top-level source document
      const doc: ManifestDocument = {
        ...meta,
        path: docPath,
        translations: {},
      };
      sourceDocuments.set(docPath, doc);
    }
  }

  // Link translations to their source documents
  for (const { locale, filename, path: translPath } of translationEntries) {
    const sourcePath = filename; // source is at htmls/filename.html
    const sourceDoc = sourceDocuments.get(sourcePath);
    if (sourceDoc) {
      sourceDoc.translations[locale] = translPath;
    }
  }

  // Also include translation documents that have no matching source
  // (they appear as standalone documents)
  const standaloneTranslations: ManifestDocument[] = [];
  for (const { locale, filename, path: translPath } of translationEntries) {
    const sourcePath = filename;
    if (!sourceDocuments.has(sourcePath)) {
      const entry = docMap.get(translPath);
      if (entry) {
        standaloneTranslations.push({
          ...entry.meta,
          path: translPath,
          translations: {},
        });
      }
    }
  }

  const documents: ManifestDocument[] = [
    ...Array.from(sourceDocuments.values()),
    ...standaloneTranslations,
  ];

  return {
    generated: new Date().toISOString(),
    config,
    documents,
  };
}
