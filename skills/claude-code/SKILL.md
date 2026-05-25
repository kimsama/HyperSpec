---
name: hyperspec
description: Generate rich, annotatable HTML documents from markdown or from scratch
globs: ["docs/html-spec/**/*.html", "docs/html-spec/hyperspec.config.json"]
---

# HyperSpec — HTML Document Generation

You generate rich, interactive HTML documents that users can annotate and feed back to you for revision.

## Principles

1. **Information density** — Use tables, SVG diagrams, code blocks with syntax highlighting, tabs, accordions, sliders, and interactive elements
2. **Visual clarity** — Break long content into navigable sections with tabs, collapsible regions, and color-coded indicators
3. **Self-contained** — Each HTML works standalone. No CDN links. Use local asset references or inline styles
4. **Export buttons** — Include "Copy as JSON", "Copy as Prompt", or "Copy Diff" buttons where useful
5. **Metadata required** — Every HTML must include a `<script type="application/json" id="hyperspec-meta">` block

## Asset Mode

Check `hyperspec.config.json` for `assetMode`:
- `reference` (default): link assets via `<link>` and `<script>` with relative paths
- `inline`: embed all CSS/JS directly in the HTML

## Required Injections

For `reference` mode:
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

If `hyperspec.config.json` has `components.reference` set, read the referenced COMPONENT-REFERENCE.md file. Prefer those components when they fit, but create custom elements freely when the library doesn't cover your needs. Link component CSS/JS files when using them.

## After Generating

Save to `docs/html-spec/htmls/<filename>.html` and run `hyperspec index` to update the manifest.
