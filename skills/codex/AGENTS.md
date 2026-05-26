# HyperSpec — Codex Agent Instructions

You are an agent that generates rich, annotatable HTML documents for HyperSpec projects. These documents are designed to be reviewed and annotated by users in the browser, with structured feedback exported back to you for iterative revision.

---

## Output Structure

```
docs/html/
├── index.html          ← Left sidebar navigation + iframe content area
├── assets/             ← base.css, annotate.css, annotate.js
├── htmls/              ← Generated HTML documents
│   └── ko/             ← Translations
└── hyperspec.config.json
```

---

## HTML Generation Principles

**1. Information density**
Use the full power of HTML: tables, SVG diagrams, syntax-highlighted code blocks, tab groups, accordions, sliders, toggleable sections, and interactive JavaScript elements.

**2. Visual clarity**
Break long content into navigable sections. Use tabs, collapsible regions, color-coded severity/priority indicators, and consistent visual hierarchy.

**3. Self-contained output**
Each HTML file must work standalone in a browser. No CDN, no external URLs. Use local asset references (relative paths) or inline all CSS/JS directly.

**4. Export buttons**
Where appropriate, include "Copy as JSON", "Copy as Prompt", or "Copy Diff" buttons.

**5. No emoji**
Do not use emoji characters (Unicode emoji) in generated HTML. Use HTML entities (`&#9679;`, `&#10003;`, `&#9888;`), CSS shapes, or SVG icons instead for visual indicators.

**6. Diagram handling**
When source content contains diagrams (ASCII art, flowcharts, architecture descriptions, data-flow narratives), ask the user which rendering method to use before generating:
- **Inline SVG** — Best quality, self-contained, theme-aware (recommended)
- **Mermaid** — `<pre class="mermaid">` with library embedded inline
- **ASCII** — Styled `<pre>` with box-drawing characters
- **Excalidraw** — `.excalidraw` JSON files in `diagrams/` subdirectory
- **Skip** — Omit diagrams

**7. Metadata block (required)**
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

## Theme

Every generated HTML must embed a theme CSS `<style>` block defining:
- CSS custom properties for colors, fonts, spacing (light + dark mode via `.dark` class)
- Component classes with `hs-` prefix: `hs-card`, `hs-badge`, `hs-callout`, `hs-table`, `hs-code-block`, `hs-accordion`, `hs-header`, `hs-sidebar`, etc.
- Use `hsl(var(--primary))` patterns for all colors. Key tokens: `--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--card`, plus `-foreground` variants.
- Fonts: Montserrat (sans, light mode), Inter (sans, dark mode), Fira Code (mono).

If a `theme.css` reference file exists in the skill directory, read it for the full token and class definitions.

## Asset Mode

Read `docs/html/hyperspec.config.json` before generating. Check the `assetMode` field:

- **`reference`** (default): inject annotation assets as linked files (relative to `htmls/`)
  ```html
  <link rel="stylesheet" href="../assets/annotate.css">
  <script src="../assets/annotate.js"></script>
  ```
- **`inline`**: read annotation asset files and embed their contents directly inside `<style>` and `<script>` tags.

Note: `assets/base.css` is no longer required — the embedded theme CSS replaces it.

---

## Component Library

If `hyperspec.config.json` has `components.reference` set to a path, read that file before generating. Prefer those components when they fit. For anything else, create custom styles and scripts freely.

---

## Output Location

1. Save generated HTML to: `docs/html/htmls/<filename>.html`
2. Add a navigation link in `docs/html/index.html` sidebar
3. Run: `hyperspec index`

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
    { "type": "comment|modify|delete|insert", "selectedText": "...", "comment": "...", "suggestedChange": "...", "section": "..." }
  ]
}
```

### Annotation processing rules

| Type | Action |
|------|--------|
| `comment` | Improve the content near `selectedText` based on the feedback |
| `modify` | Replace `selectedText` with `suggestedChange` (use `comment` for context) |
| `delete` | Remove content identified by `selectedText` + `section` |
| `insert` | Add new content after `selectedText` per the `comment` spec |

After applying: increment `version`, update `updated` date, save, run `hyperspec index`, summarize changes.

---

## Translation

Parse: `<file> --locale <code>`

1. Translate prose, headings, UI labels, table headers, alt text
2. Preserve HTML structure, CSS, JS, code blocks, variable names, class names
3. Set `locale` in metadata to the target code
4. Save to `docs/html/htmls/<locale>/<filename>.html`
5. Add translation link in `docs/html/index.html` sidebar
6. Run `hyperspec index`
