# hyperspec

Generate and revise rich, annotatable HTML documents. Users review documents in the browser, annotate them, export structured JSON feedback, and paste it back for you to apply.

---

## Output structure

```
docs/html/
├── index.html        ← Left nav sidebar + iframe content
├── assets/           ← base.css, annotate.css, annotate.js
├── htmls/            ← Generated documents
│   └── <locale>/     ← Translations
└── hyperspec.config.json
```

## Generation rules

- Use tables, SVG, code blocks, tabs, accordions, and interactive JS — not flat prose
- Break content into navigable sections with clear visual hierarchy
- No CDN. No external URLs. All assets are local or inline
- Every HTML must contain a `hyperspec-meta` JSON block (see below)
- No emoji characters (Unicode emoji). Use HTML entities (`&#9679;`, `&#10003;`, `&#9888;`), CSS shapes, or SVG icons instead

## Diagram handling

When source content contains diagrams (ASCII art, flowcharts, architecture descriptions, data-flow narratives), ask the user which rendering method to use before generating:

- **Inline SVG** — Best quality, self-contained, theme-aware (recommended)
- **Mermaid** — `<pre class="mermaid">` with library embedded inline
- **ASCII** — Styled `<pre>` with box-drawing characters
- **Excalidraw** — `.excalidraw` JSON files in `diagrams/` subdirectory
- **Skip** — Omit diagrams

## Theme

If a `theme.css` exists in this skill directory, read it before generating HTML. It defines CSS custom properties (design tokens) for colors, fonts, spacing, plus component classes (`hs-card`, `hs-badge`, `hs-callout`, `hs-table`, etc.) with `hs-` prefix. Embed the theme CSS as a `<style>` block in every generated HTML. Use `hsl(var(--primary))` patterns for colors.

## Asset injection

Read `docs/html/hyperspec.config.json`. Check `assetMode`:

- `reference`: add annotation assets to `<head>` (paths relative from `htmls/`):
  ```html
  <link rel="stylesheet" href="../assets/annotate.css">
  <script src="../assets/annotate.js"></script>
  ```
- `inline`: read those files and embed them as `<style>` / `<script>` tags

Note: `assets/base.css` is no longer required — the embedded theme CSS replaces it.

## Metadata block (required in every HTML)

```html
<script type="application/json" id="hyperspec-meta">
{
  "title": "...",
  "category": "spec|review|report|tutorial|prototype",
  "tags": ["..."],
  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD",
  "locale": "en",
  "source": "optional/source.md",
  "version": 1
}
</script>
```

## Component library

If `components.reference` is set in config, read that file first. Use those CSS classes and custom elements when they fit. For anything else, write custom styles freely.

## Dual Navigation Mode

Each generated HTML has its own `hs-sidebar` with a section-level table of contents. The annotation module (`annotate.js`) auto-detects iframe embedding:

- **Standalone** — per-page `hs-sidebar` TOC is visible for section navigation.
- **Embedded** (inside `index.html` iframe) — `hs-sidebar` is hidden; portal sidebar handles navigation.

Always generate pages with `hs-sidebar` TOC. The iframe detection is automatic.

## Output

1. Save to `docs/html/htmls/<filename>.html`
2. Add nav link in `docs/html/index.html` sidebar
3. Run `hyperspec index`

---

## Feedback processing

When the user pastes annotation JSON:

```json
{
  "document": "filename.html",
  "version": 1,
  "annotations": [
    { "type": "comment|modify|delete|insert", "selectedText": "...", "comment": "...", "suggestedChange": "...", "section": "..." }
  ]
}
```

Apply each annotation to the target file in `docs/html/htmls/`:

| Type | Action |
|------|--------|
| `comment` | Improve the content near `selectedText` based on the feedback |
| `modify` | Replace `selectedText` with `suggestedChange` (use `comment` for context) |
| `delete` | Remove content identified by `selectedText` + `section` |
| `insert` | Add new content after `selectedText` per the `comment` spec |

Then: increment `version`, update `updated` date, save, run `hyperspec index`, summarize changes.

---

## Translation

Parse: `<file> --locale <code>`

- Translate prose, headings, UI labels, table headers, alt text
- Preserve HTML structure, CSS, JS, code blocks, variable names, class names
- Set `locale` in metadata to the target code
- Save to `docs/html/htmls/<locale>/<filename>.html`
- Add translation link in `docs/html/index.html` sidebar
- Run `hyperspec index`
