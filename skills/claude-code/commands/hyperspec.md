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
4. Generate HTML following the SKILL.md principles:
   - Rich structure: tables, code blocks, diagrams, interactive elements
   - Inject annotation module and base styles (per `assetMode`)
   - Asset paths relative from `htmls/`: `href="../assets/base.css"`
   - Include `hyperspec-meta` block with title, category, tags, dates, locale, version
5. Save to `docs/html/htmls/<filename>.html`
6. Add a navigation link to `docs/html/index.html` sidebar
7. Run `hyperspec index` to update manifest
8. Report the file path and suggest opening in browser
