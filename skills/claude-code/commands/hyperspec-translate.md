---
description: Translate an HTML document to another locale
allowed-tools: Read, Write, Edit, Bash(hyperspec:*), Glob, Grep
---

# Translate HyperSpec Document

Translate `$ARGUMENTS` to the specified target locale.

Parse arguments: `<file> --locale <code>` (e.g., `htmls/auth-spec.html --locale ko`)

## Workflow

1. Read the source HTML file from `docs/html-spec/`
2. Translate all human-readable text to the target locale
3. Preserve untouched:
   - HTML structure, CSS, JS
   - Annotation module code
   - Code blocks and variable names
   - Technical terms and CSS class names
4. DO translate:
   - Prose, headings, paragraph text
   - UI labels (Export Feedback → 피드백 내보내기)
   - Table headers, alt text, title attributes
5. Update hyperspec-meta: set `locale` to target code
6. Save to `docs/html-spec/htmls/<locale>/<filename>.html`
7. Run `hyperspec index` to update manifest with translation mapping
