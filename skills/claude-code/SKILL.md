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
6. **No emoji** — Do not use emoji characters (Unicode emoji) in generated HTML. Use HTML entities (`&#9679;`, `&#10003;`, `&#9888;`), CSS shapes, or SVG icons instead for visual indicators

## Theme

Read `theme.css` in this skill directory before generating any HTML. It defines:
- **Design tokens** — CSS custom properties for colors, fonts, spacing (light + dark mode)
- **Component classes** — `hs-card`, `hs-badge`, `hs-callout`, `hs-table`, `hs-code-block`, `hs-accordion`, etc.
- **Layout classes** — `hs-page`, `hs-header`, `hs-sidebar`, `hs-main`
- **Utility classes** — `hs-flex`, `hs-mb-*`, `hs-text-*`, `hs-border`, etc.

All classes use the `hs-` prefix. Use these classes and CSS variables (`hsl(var(--primary))`) when styling generated HTML. You may create additional custom styles as needed, but reference the theme tokens for colors, fonts, and spacing.

The theme CSS must be embedded in every generated HTML as a `<style>` block. Do NOT link to the theme.css file (it is a skill-internal reference, not a deployable asset).

## Asset Mode

Check `docs/html/hyperspec.config.json` for `assetMode`:
- `reference` (default): link assets via `<link>` and `<script>` with relative paths
- `inline`: embed all CSS/JS directly in the HTML

## Required Injections

Every generated HTML must include the theme CSS (from `theme.css` in this skill directory) as an embedded `<style>` block.

Additionally, inject the annotation module:

For `reference` mode (assets are one level up from `htmls/`):
```html
<link rel="stylesheet" href="../assets/annotate.css">
<script src="../assets/annotate.js"></script>
```

For `inline` mode: read these asset files and embed their contents in `<style>` and `<script>` tags.

Note: `assets/base.css` is no longer required — the theme CSS replaces it.

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

## Dual Navigation Mode

Each generated HTML has its own `hs-sidebar` with a section-level table of contents ("On this page"). The annotation module (`annotate.js`) automatically detects whether the page is loaded inside an iframe:

- **Standalone** (`00.Architecture.html` opened directly) — the per-page `hs-sidebar` TOC is visible, providing section navigation within the document.
- **Embedded** (loaded inside `index.html`'s iframe) — the per-page `hs-sidebar` is automatically hidden. The portal's page-level sidebar handles navigation instead.

This is automatic — no extra markup or config needed. Always generate pages with the `hs-sidebar` TOC; `annotate.js` handles the rest.

## index.html Navigation

The `index.html` has a left sidebar with `<a>` links targeting an iframe. When adding a new document, add a nav-link:

```html
<a href="htmls/<filename>.html?embedded" class="nav-link" data-page="<filename>" target="content-frame">
  <span class="nav-icon">&#ICON;</span>
  Document Title
</a>
```

The `?embedded` query parameter tells `annotate.js` to hide the per-page sidebar. Always include it in `index.html` nav links.
