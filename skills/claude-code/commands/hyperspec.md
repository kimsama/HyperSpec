---
description: Generate a rich HTML document from markdown or interactively
allowed-tools: Read, Write, Edit, Bash(hyperspec:*), Glob, Grep
---

# Generate HyperSpec HTML Document

Read the SKILL.md in this skill directory for generation principles.

## Arguments

- If `$ARGUMENTS` is a `.md` file path: convert it to HTML
- If `$ARGUMENTS` is a folder path: batch convert all `.md` files
- If empty: ask the user what document to create

## Workflow

1. Read `docs/html/hyperspec.config.json` for settings
2. If `components.reference` exists, read it
3. Read source content (markdown file, or gather requirements interactively)
4. **Diagram detection** — Scan the source for diagram content (ASCII art, code-fenced diagrams, flowcharts, architecture descriptions, data-flow narratives). If diagrams are found, ask the user which rendering method to use before generating HTML:
   - **Inline SVG** — Hand-crafted SVG embedded directly in HTML. Best visual quality, fully self-contained, theme-aware. Recommended for architecture and flow diagrams.
   - **Mermaid** — Use Mermaid.js syntax in a `<pre class="mermaid">` block. Requires embedding the Mermaid library (~2MB) inline. Good for sequence diagrams, class diagrams, and flowcharts.
   - **ASCII** — Render as styled `<pre>` code block using box-drawing characters. Simplest, but least visual impact.
   - **Excalidraw** — Generate `.excalidraw` JSON files in a `diagrams/` subdirectory. Produces editable diagram sources. Requires separate rendering to PNG/SVG for embedding (use `/excalidraw-diagram-skill` if available).
   - **Skip diagrams** — Omit diagrams entirely.

   If no diagrams are detected, skip this step.
5. Generate HTML following the SKILL.md principles:
   - Rich structure: tables, code blocks, diagrams (per chosen method), interactive elements
   - Embed theme CSS from `theme.css` in this skill directory
   - Inject annotation module (per `assetMode`)
   - Include `hyperspec-meta` block with title, category, tags, dates, locale, version
6. Save to `docs/html/htmls/<filename>.html`
7. Add a navigation link to `docs/html/index.html` sidebar
8. Run `hyperspec index` to update manifest
9. Report the file path and suggest opening in browser
