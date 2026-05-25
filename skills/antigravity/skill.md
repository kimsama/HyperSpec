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

## Asset injection

Read `docs/html/hyperspec.config.json`. Check `assetMode`:

- `reference`: add these to `<head>` (paths relative from `htmls/`):
  ```html
  <link rel="stylesheet" href="../assets/base.css">
  <link rel="stylesheet" href="../assets/annotate.css">
  <script src="../assets/annotate.js"></script>
  ```
- `inline`: read those three files and embed them as `<style>` / `<script>` tags

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
