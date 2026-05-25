# HyperSpec — Codex Agent Instructions

You are an agent that generates rich, annotatable HTML documents for HyperSpec projects. These documents are designed to be reviewed and annotated by users in the browser, with structured feedback exported back to you for iterative revision.

---

## Core Behavior

When asked to generate, translate, or update an HTML document, follow the rules in this file. The primary workflow:

1. Generate HTML → user annotates in browser → user exports feedback JSON → you apply changes → repeat.

---

## HTML Generation Principles

**1. Information density**
Use the full power of HTML: tables, SVG diagrams, syntax-highlighted code blocks, tab groups, accordions, sliders, toggleable sections, and interactive JavaScript elements. Markdown-level output is not acceptable for complex documents.

**2. Visual clarity**
Break long content into navigable sections. Use tabs, collapsible regions, color-coded severity/priority indicators, and consistent visual hierarchy. Every section should be immediately scannable.

**3. Self-contained output**
Each HTML file must work standalone in a browser with no server, no build step, no CDN. Use local asset references (relative paths) or inline all CSS/JS directly in the file. Never reference external URLs.

**4. Export buttons**
Where appropriate, include utility buttons such as "Copy as JSON", "Copy as Prompt", or "Copy Diff". These help users extract structured information from the document.

**5. Metadata block (required)**
Every generated HTML must contain:

```html
<script type="application/json" id="hyperspec-meta">
{
  "title": "Document Title",
  "category": "spec",
  "tags": ["tag1", "tag2"],
  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD",
  "locale": "en",
  "source": "path/to/source.md",
  "version": 1
}
</script>
```

Valid categories: `spec`, `review`, `report`, `tutorial`, `prototype`

---

## Asset Mode

Read `docs/html-spec/hyperspec.config.json` before generating. Check the `assetMode` field:

- **`reference`** (default): inject assets as linked files
  ```html
  <link rel="stylesheet" href="../assets/base.css">
  <link rel="stylesheet" href="../assets/annotate.css">
  <script src="../assets/annotate.js"></script>
  ```
- **`inline`**: read `assets/base.css`, `assets/annotate.css`, and `assets/annotate.js` from the project, then embed their contents directly inside `<style>` and `<script>` tags in the HTML.

---

## Component Library

If `hyperspec.config.json` has `components.reference` set to a path, read that file before generating. It contains a catalog of available CSS classes and custom elements from the user's design system. Prefer those components when they fit the content. For anything not covered by the component library, create custom inline styles and scripts freely. Always `<link>` and `<script>` the component CSS/JS files when using registered components.

---

## Output Location

Save generated HTML to: `docs/html-spec/htmls/<filename>.html`

After saving, run: `hyperspec index`

This updates `manifest.json` with metadata extracted from the new file.

---

## Feedback Processing

When a user provides annotation feedback JSON, apply changes to the target HTML file.

### Expected feedback format

```json
{
  "document": "filename.html",
  "documentTitle": "...",
  "version": 1,
  "annotations": [
    {
      "type": "comment|modify|delete|insert",
      "selectedText": "...",
      "comment": "...",
      "suggestedChange": "...",
      "section": "..."
    }
  ]
}
```

### Annotation processing rules

| Type | Action |
|------|--------|
| `comment` | Re-read the section containing `selectedText`. Improve the content based on the feedback in `comment`. Preserve surrounding context and structure. |
| `modify` | Find `selectedText` in the HTML (use `section` to disambiguate if needed). Replace it with `suggestedChange`. Use `comment` for context on the intent. |
| `delete` | Find and remove the content identified by `selectedText` and `section`. Clean up surrounding layout (remove empty containers, fix spacing). |
| `insert` | Add new content immediately after the location of `selectedText`. Use `comment` as the specification for what to add. |

After applying all annotations:
- Increment `version` in the `hyperspec-meta` block
- Update `updated` to today's date (ISO format)
- Save the file
- Run `hyperspec index`
- Report a summary of all changes made

---

## Translation

When asked to translate a document, parse the request as: `<file> --locale <code>`

1. Read the source HTML file entirely
2. Translate all human-readable text to the target locale
3. Do NOT translate: HTML structure, CSS, JS, annotation module code, code blocks, variable names, technical terms, CSS class names
4. DO translate: prose, headings, paragraph text, UI labels (e.g., "Export Feedback" → "피드백 내보내기"), table headers, alt text, title attributes
5. Update `hyperspec-meta`: set `locale` to the target locale code
6. Save to `docs/html-spec/htmls/<locale>/<filename>.html`
7. Run `hyperspec index` to register the translation in the manifest

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `hyperspec init` | Initialize HyperSpec in the project |
| `hyperspec index` | Scan `htmls/` and regenerate `manifest.json` |
| `hyperspec serve` | Start local preview server |

---

## Version Tracking

Each feedback cycle increments `metadata.version`. The manifest tracks versions per document and per locale. If a source document's version exceeds a translation's version, the manifest marks that translation as outdated.
