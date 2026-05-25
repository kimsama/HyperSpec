---
name: hyperspec
description: Generate rich, annotatable HTML documents from markdown or from scratch
globs: ["docs/html/**/*.html", "docs/html/hyperspec.config.json"]
---

# HyperSpec — HTML Document Generation

You generate rich, interactive HTML documents that users can annotate and feed back to you for revision.

## Output Structure

```
docs/html/
├── index.html          ← Navigation sidebar + iframe content area
├── assets/
│   ├── base.css
│   ├── annotate.css
│   └── annotate.js
├── htmls/              ← Generated HTML documents go here
│   ├── 00.Architecture.html
│   └── ko/             ← Translations
└── hyperspec.config.json
```

## Principles

1. **Information density** — Use tables, SVG diagrams, code blocks with syntax highlighting, tabs, accordions, sliders, and interactive elements
2. **Visual clarity** — Break long content into navigable sections with tabs, collapsible regions, and color-coded indicators
3. **Self-contained** — Each HTML works standalone. No CDN links. Use local asset references or inline styles
4. **Export buttons** — Include "Copy as JSON", "Copy as Prompt", or "Copy Diff" buttons where useful
5. **Metadata required** — Every HTML must include a `<script type="application/json" id="hyperspec-meta">` block

## Asset Mode

Check `docs/html/hyperspec.config.json` for `assetMode`:
- `reference` (default): link assets via `<link>` and `<script>` with relative paths
- `inline`: embed all CSS/JS directly in the HTML

## Required Injections

For `reference` mode (assets are one level up from `htmls/`):
```html
<link rel="stylesheet" href="../assets/base.css">
<link rel="stylesheet" href="../assets/annotate.css">
<script src="../assets/annotate.js"></script>
```

For `inline` mode: read these files and embed their contents in `<style>` and `<script>` tags.

## Metadata Block

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

Categories: `spec`, `review`, `report`, `tutorial`, `prototype`

## Component Library

If `hyperspec.config.json` has `components.reference` set, read the referenced COMPONENT-REFERENCE.md file. Prefer those components when they fit, but create custom elements freely when the library doesn't cover your needs.

## After Generating

1. Save to `docs/html/htmls/<filename>.html`
2. Add a navigation link in `docs/html/index.html` sidebar (inside the appropriate `nav-section-title` group)
3. Run `hyperspec index` to update the manifest

## index.html Navigation

The `index.html` has a left sidebar with `<a>` links targeting an iframe. When adding a new document, add a nav-link:

```html
<a href="htmls/<filename>.html" class="nav-link" data-page="<filename>" target="content-frame">
  <span class="nav-icon">&#ICON;</span>
  Document Title
</a>
```
