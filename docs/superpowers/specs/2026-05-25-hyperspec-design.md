# HyperSpec — Design Specification

> Annotatable HTML document generation plugin for AI coding agents

**Date**: 2026-05-25
**Status**: Draft
**Author**: Brainstormed with Claude

---

## 1. Overview

HyperSpec is an npm/bun plugin that enables AI coding agents (Claude Code, Codex, Antigravity) to generate rich, interactive HTML documents from markdown files or from scratch. Every generated HTML includes a built-in annotation system that lets users review, comment, and export structured feedback — which agents then consume to iteratively refine the document.

### Core Value Proposition

Markdown becomes limiting as agent-produced documents grow in complexity. HTML provides information density (tables, SVG, interactive JS), visual clarity (tabs, collapsible sections, color coding), browser-native sharing, and — critically — two-way interaction where users can annotate and feed changes back to agents. HyperSpec packages this workflow into a reusable, zero-build-tool plugin.

### Design Principles

1. **Agent freedom first** — Agents generate HTML directly, leveraging the full expressiveness of HTML/CSS/JS. No rigid templates.
2. **Optional consistency** — Users may register a CSS/JS component library via `hyperspec setup`. When present, agents prefer those components but are not restricted to them.
3. **Self-contained output** — Each HTML file works standalone in a browser. No CDN, no build step, no server required.
4. **Annotation is native** — Every generated HTML includes the annotation module. It is not an afterthought.
5. **Feedback closes the loop** — Structured annotation export → paste into agent → agent applies changes. This is the central workflow.

---

## 2. Package Structure

```
hyperspec/
├── package.json
├── bin/
│   └── hyperspec.js                  # CLI entry point
├── cli/
│   ├── init.js                       # Project initialization
│   ├── index.js                      # Manifest + index.html generation
│   ├── translate.js                  # Translation trigger
│   ├── serve.js                      # Local preview server
│   └── setup.js                      # Component library registration
├── assets/
│   ├── annotate.js                   # Annotation module (injected into each HTML)
│   ├── annotate.css                  # Annotation styles
│   ├── base.css                      # Minimal base styles (typography, layout)
│   └── portal/                       # Index portal assets
│       ├── portal.js
│       └── portal.css
├── skills/
│   ├── claude-code/
│   │   ├── SKILL.md                  # Main skill: HTML generation instructions
│   │   └── commands/
│   │       ├── hyperspec.md          # /hyperspec — generate HTML
│   │       ├── hyperspec-translate.md # /hyperspec-translate — translate HTML
│   │       └── hyperspec-feedback.md # /hyperspec-feedback — process annotations
│   ├── codex/                        # Codex agent skill
│   └── antigravity/                  # Antigravity agent skill
└── docs/                             # Dogfood: HyperSpec's own docs as HTML
```

---

## 3. CLI Commands

### 3.1 `hyperspec init`

Initializes HyperSpec in the current project.

**Actions:**
- Creates `docs/html-spec/` directory structure
- Creates `docs/html-spec/hyperspec.config.json` with defaults
- Copies annotation assets to `docs/html-spec/assets/`
- Generates placeholder `docs/html-spec/index.html`

**Output structure:**
```
project/
└── docs/html-spec/
    ├── index.html              # Portal page
    ├── manifest.json           # Document metadata index
    ├── assets/                 # HyperSpec assets (annotate.js, base.css, etc.)
    ├── components/             # User-registered component library (empty initially)
    ├── htmls/                  # Generated HTML documents
    │   └── ko/                 # Korean translations
    └── hyperspec.config.json   # Project configuration
```

### 3.2 `hyperspec setup`

Interactive configuration wizard.

**Prompts:**
1. Output directory (default: `docs/html-spec`)
2. Supported locales (default: `en, ko`)
3. Component library path (optional) — if provided, scans CSS/JS and generates `COMPONENT-REFERENCE.md`
4. Annotation enabled (default: yes)
5. Export format (default: `structured-json`)

**Component scanning:**
When a component library path is provided, `setup` parses the CSS/JS files to extract class names, custom element definitions, and exported functions. It generates `components/COMPONENT-REFERENCE.md` which is included in the agent's skill context so the agent knows what components are available.

### 3.3 `hyperspec index`

Scans `htmls/` for HTML files, extracts metadata from `<script id="hyperspec-meta">` tags, and generates:
- `manifest.json` — structured index of all documents
- Updates `index.html` portal data

### 3.4 `hyperspec translate <file> --locale <code>`

Triggers translation workflow. This command does NOT translate directly — it prepares context and instructs the agent to perform translation when used within a slash command. When used standalone, it outputs a prompt that can be pasted into an agent.

### 3.5 `hyperspec serve`

Starts a local HTTP server pointing at `docs/html-spec/` with live reload. For preview and annotation testing.

---

## 4. Configuration

### hyperspec.config.json

```json
{
  "outputDir": "docs/html-spec",
  "locales": ["en", "ko"],
  "components": {
    "css": null,
    "js": null,
    "reference": null
  },
  "assetMode": "reference",
  "annotation": {
    "enabled": true,
    "exportFormat": "structured-json"
  },
  "index": {
    "title": "Project Documentation",
    "search": true,
    "filters": ["category", "tags", "locale"]
  }
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `outputDir` | string | Root output directory for generated HTML |
| `locales` | string[] | Supported locale codes |
| `components.css` | string \| null | Path to user's component CSS file |
| `components.js` | string \| null | Path to user's component JS file |
| `components.reference` | string \| null | Path to generated component reference doc |
| `assetMode` | string | `reference` (link local files) or `inline` (embed in HTML) |
| `annotation.enabled` | boolean | Whether to inject annotation module |
| `annotation.exportFormat` | string | Export format: `structured-json` or `plaintext` |
| `index.title` | string | Portal page title |
| `index.search` | boolean | Enable search functionality |
| `index.filters` | string[] | Filter dimensions for the portal |

---

## 5. Skill System

### 5.1 SKILL.md — HTML Generation Instructions

The skill file instructs agents how to generate HyperSpec-compliant HTML. Key sections:

**HTML Generation Principles:**
1. Maximize information density — use tables, SVG diagrams, code blocks with syntax highlighting, interactive elements (tabs, accordions, sliders)
2. Prioritize visual clarity — break long content into navigable sections with tabs, collapsible regions, color-coded severity/priority indicators
3. Each HTML must be self-contained — inline styles/scripts OR reference local assets only (no CDN)
4. Include export buttons where appropriate — "Copy as JSON", "Copy as Prompt", "Copy Diff"
5. Embed metadata in `<script type="application/json" id="hyperspec-meta">`

**Component library awareness:**
- If `hyperspec.config.json` has `components.reference` set, read the component reference file
- Prefer registered components when they fit, but create custom elements freely when needed
- Always `<link>` and `<script>` the component files when using them

**Asset mode:**

Each HTML supports two asset modes, determined by the `assetMode` config field:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `reference` (default) | `<link>` and `<script>` reference local asset files via relative paths | Project use, GitHub Pages, local dev |
| `inline` | All CSS/JS embedded directly in the HTML file | Sharing via email, S3 upload, standalone distribution |

**Required injections (both modes):**
- Annotation module (`annotate.js` + `annotate.css`)
- Base styles (`base.css`)
- Metadata block (`<script id="hyperspec-meta">`)

### 5.2 Metadata Convention

Every generated HTML must include:

```html
<script type="application/json" id="hyperspec-meta">
{
  "title": "Document Title",
  "category": "spec | review | report | tutorial | prototype",
  "tags": ["tag1", "tag2"],
  "created": "2026-05-25",
  "updated": "2026-05-25",
  "locale": "en",
  "source": "path/to/source.md",
  "version": 1
}
</script>
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | Document title |
| `category` | yes | One of: spec, review, report, tutorial, prototype |
| `tags` | yes | Array of topic tags |
| `created` | yes | ISO date of creation |
| `updated` | yes | ISO date of last update |
| `locale` | yes | Language code (en, ko, etc.) |
| `source` | no | Path to source markdown file (if converted from md) |
| `version` | yes | Integer, incremented on each feedback-driven update |

### 5.3 Slash Commands

#### `/hyperspec [source]`

Primary generation command.

**Behavior by argument:**
- No argument → interactive: agent asks what document to create, generates HTML
- Markdown file path → converts that file to HTML
- Folder path → batch converts all `.md` files in folder

**Agent workflow:**
1. Read source content (or gather requirements interactively)
2. Read `hyperspec.config.json` for settings
3. If `components.reference` exists, read it for available components
4. Generate HTML following skill principles
5. Inject annotation module and metadata
6. Save to `htmls/<filename>.html`
7. Run `hyperspec index` to update manifest

#### `/hyperspec-feedback`

Processes annotation feedback pasted by the user.

**Agent workflow:**
1. Parse the pasted JSON feedback
2. Identify source HTML via `document` field
3. Read the source HTML file
4. Apply each annotation:
   - `comment` → improve the referenced content based on feedback
   - `modify` → replace selected text with `suggestedChange`, informed by `comment`
   - `delete` → remove the referenced section
   - `insert` → add new content after the referenced location
5. Increment `metadata.version`
6. Save updated HTML
7. Run `hyperspec index`
8. Report changes summary to user

#### `/hyperspec-translate <file> --locale <code>`

**Agent workflow:**
1. Read source HTML file
2. Translate all text content to target locale
3. Preserve HTML structure, CSS, JS, annotation system untouched
4. Do NOT translate: code blocks, variable names, technical terms, CSS class names
5. DO translate: UI labels (Export Feedback → 피드백 내보내기, Comment → 코멘트, etc.)
6. Update metadata: set `locale` to target code
7. Save to `htmls/<locale>/<filename>.html`
8. Run `hyperspec index` → manifest gains `translations` mapping

---

## 6. Annotation System

### 6.1 Architecture

The annotation system is a self-contained JavaScript module (`annotate.js` + `annotate.css`) injected into every generated HTML. No server, no external dependencies.

### 6.2 User Interaction Flow

```
User selects text in the document
        ↓
Floating toolbar appears near selection:
  [💬 Comment] [✏️ Modify] [🗑️ Delete] [➕ Insert After]
        ↓
User picks action → popover with text input appears
        ↓
User writes comment/suggestion → clicks Save
        ↓
Selected text gets highlight color + side marker
Annotation added to side panel list
        ↓
Stored in localStorage (persists across sessions)
```

### 6.3 UI Components

**Floating toolbar:**
- Appears on text selection
- Positioned near the selection, avoids viewport overflow
- Four action buttons with icons

**Annotation popover:**
- Text area for comment/suggestion
- For "Modify" type: additional field for suggested replacement text
- Save / Cancel buttons

**Side panel (toggleable):**
- Right-side drawer, toggled via floating button
- Lists all annotations chronologically
- Each entry shows: type icon, selected text excerpt, comment preview
- Click to scroll to annotation location
- Delete individual annotations

**Export Feedback button:**
- Fixed position, top-right corner
- Shows annotation count badge
- Click → copies structured JSON to clipboard
- Visual confirmation toast: "Feedback copied! Paste into your agent."

**Clear All button:**
- In side panel footer
- Clears all annotations + localStorage

### 6.4 Annotation Data Model

Each annotation stored in localStorage:

```typescript
interface Annotation {
  id: string;                    // UUID
  type: "comment" | "modify" | "delete" | "insert";
  selectedText: string;          // The text that was selected
  comment: string;               // User's feedback
  suggestedChange?: string;      // For "modify" type only
  section?: string;              // Nearest heading text (auto-detected)
  xpath: string;                 // XPath to the annotated element (for re-highlighting)
  rangeStart: number;            // Character offset start
  rangeEnd: number;              // Character offset end
  createdAt: string;             // ISO timestamp
}
```

### 6.5 Export Format

**Structured JSON (default):**

```json
{
  "document": "auth-system-spec.html",
  "documentTitle": "Authentication System Spec",
  "timestamp": "2026-05-25T10:30:00Z",
  "version": 1,
  "summary": "3 annotations: 1 comment, 1 modify, 1 delete",
  "annotations": [
    {
      "id": "a1b2c3",
      "type": "comment",
      "selectedText": "Use JWT for authentication",
      "comment": "세션 토큰 방식이 더 적합할 수 있음",
      "section": "Authentication Architecture"
    },
    {
      "id": "d4e5f6",
      "type": "modify",
      "selectedText": "Redis cache layer",
      "suggestedChange": "PostgreSQL materialized views",
      "comment": "지난 회의에서 Redis 제외로 결정",
      "section": "Caching Strategy"
    },
    {
      "id": "g7h8i9",
      "type": "delete",
      "selectedText": "Legacy auth 섹션 전체",
      "comment": "더 이상 관련 없음",
      "section": "Legacy Auth"
    }
  ]
}
```

The export intentionally omits `xpath` and offset details — agents should locate content by `selectedText` + `section`, not by fragile DOM positions.

---

## 7. Feedback Loop

The complete cycle from generation to annotation to revision.

### 7.1 Full Workflow

```
                    ┌──────────────────────────────┐
                    │  [1] Agent generates HTML     │
                    │  via /hyperspec               │
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │  [2] User opens HTML in       │
                    │  browser, reviews content     │
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │  [3] User annotates:          │
                    │  select text → comment/modify │
                    │  /delete/insert               │
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │  [4] Export Feedback →         │
                    │  JSON copied to clipboard     │
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │  [5] Paste into Claude Code   │
                    │  or /hyperspec-feedback       │
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │  [6] Agent parses feedback,   │
                    │  reads source HTML, applies   │
                    │  each annotation              │
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │  [7] Updated HTML saved,      │
                    │  version incremented,         │
                    │  manifest updated             │
                    └──────────────┬───────────────┘
                                   ↓
                           (Back to [2])
```

### 7.2 Feedback Processing Rules

When the agent receives annotation feedback:

| Annotation Type | Agent Action |
|-----------------|-------------|
| `comment` | Re-read the section, improve content based on feedback. Preserve surrounding context. |
| `modify` | Replace `selectedText` with `suggestedChange`. Use `comment` for context on why. |
| `delete` | Remove the content identified by `selectedText` + `section`. Clean up surrounding layout. |
| `insert` | Add new content after the location of `selectedText`. Use `comment` as specification for what to add. |

### 7.3 Version Tracking

- Each feedback cycle increments `metadata.version`
- The manifest tracks the latest version of each document
- Translation outdatedness: if source version > translation version, the translation is flagged as outdated in the manifest

---

## 8. Setup & Component Library

### 8.1 Component Registration

Users register their design system via `hyperspec setup`:

```
$ hyperspec setup
? Component library path: ./my-design-system/
  → Scanning ./my-design-system/components.css...
  → Scanning ./my-design-system/components.js...
  → Found: .hs-card, .hs-tab-group, .hs-code-block, .hs-callout, ...
  → Found: <hs-accordion>, <hs-diagram>, <hs-copy-button>, <hs-toggle-panel>
  → Generated: components/COMPONENT-REFERENCE.md

✓ Config updated: components.css → ./my-design-system/components.css
✓ Config updated: components.js → ./my-design-system/components.js
✓ Config updated: components.reference → components/COMPONENT-REFERENCE.md
```

### 8.2 COMPONENT-REFERENCE.md

Auto-generated file that the skill reads to inform agents:

```markdown
# Component Reference — [Project Name]

## CSS Classes

### Layout
- `.hs-card` — Card container with shadow and border-radius
- `.hs-grid-2` / `.hs-grid-3` — 2/3-column grid layout
- `.hs-sidebar-layout` — Main content + sidebar

### Typography
- `.hs-heading-decorated` — Heading with underline accent
- `.hs-label` — Small uppercase label

### Components
- `.hs-callout` — Info/warning/error callout box (variants: .info, .warning, .error)
- `.hs-code-block` — Code block with line numbers
- `.hs-tab-group` — Tab navigation container

## Custom Elements (JS)

### <hs-accordion>
Collapsible section.
Attributes: `title` (string), `open` (boolean)

### <hs-diagram>
SVG diagram wrapper with zoom/pan.
Attributes: `src` (string, SVG path or inline)

### <hs-copy-button>
Clipboard copy button.
Attributes: `data-target` (CSS selector of content to copy)

### <hs-toggle-panel>
Show/hide panel.
Attributes: `label` (string), `default-open` (boolean)

## Usage
Link in HTML:
  <link rel="stylesheet" href="../components/components.css">
  <script src="../components/components.js"></script>
```

### 8.3 Skill Behavior With/Without Components

| Config State | Agent Behavior |
|-------------|---------------|
| `components.*` all null | Agent generates fully custom HTML/CSS/JS inline. Maximum creative freedom. |
| `components` configured | Agent reads COMPONENT-REFERENCE.md. Prefers registered components where they fit. Creates custom elements for anything not covered. Links component CSS/JS files. |

---

## 9. Index Portal

### 9.1 manifest.json

Generated by `hyperspec index`. The portal reads this file at load time.

```json
{
  "generated": "2026-05-25T12:00:00Z",
  "config": {
    "title": "Project Documentation",
    "filters": ["category", "tags", "locale"]
  },
  "documents": [
    {
      "path": "htmls/auth-system-spec.html",
      "title": "Authentication System Spec",
      "category": "spec",
      "tags": ["auth", "security", "backend"],
      "created": "2026-05-25",
      "updated": "2026-05-25",
      "locale": "en",
      "version": 2,
      "translations": {
        "ko": "htmls/ko/auth-system-spec.html"
      }
    },
    {
      "path": "htmls/api-review-q2.html",
      "title": "Q2 API Code Review",
      "category": "review",
      "tags": ["api", "performance"],
      "created": "2026-05-20",
      "updated": "2026-05-23",
      "locale": "en",
      "version": 1,
      "translations": {}
    }
  ]
}
```

### 9.2 Portal Features

**Search bar:**
- Real-time filtering over `title` + `tags`
- Debounced keystroke filtering

**Category filter:**
- Chip/pill buttons for each category
- Multi-select: show documents matching ANY selected category
- Categories auto-derived from documents

**Tag filter:**
- Tag cloud or chip list
- Click to toggle tag filter

**Locale switcher:**
- Toggle between available locales (EN / KO)
- When switching to a locale, shows translated documents where available
- Documents without translation show a "translation unavailable" badge

**Sort controls:**
- Updated date (newest first) — default
- Title (A-Z)
- Category

**Document cards:**
- Title as link to HTML file
- Category badge (color-coded)
- Tag pills
- Date and version number
- Outdated translation warning if applicable

### 9.3 Implementation

- Pure HTML + vanilla JS (no framework)
- Fetches `manifest.json` via fetch API
- No build step required
- GitHub Pages compatible
- Responsive: works on mobile

---

## 10. Translation System

### 10.1 Translation Flow

```
/hyperspec-translate htmls/auth-spec.html --locale ko
```

**Agent performs:**
1. Read source HTML file entirely
2. Translate all human-readable text content to target locale
3. Preserve untouched: HTML structure, CSS, JS, annotation module, metadata structure, code blocks, variable names, technical terms
4. Translate: prose, headings, UI labels (including annotation UI labels), table headers, alt text
5. Update metadata: `locale` → target code
6. Save to `htmls/<locale>/<filename>.html`
7. Run `hyperspec index` → adds translation mapping to manifest

### 10.2 Outdated Translation Detection

The manifest tracks versions independently per locale. When `hyperspec index` runs:

- If source document `version` > translation `version`, the translation is marked outdated
- Portal shows a visual indicator on outdated translations
- Agent can be asked to update outdated translations selectively

---

## 11. Multi-Agent Support

### 11.1 Claude Code

Primary target. Full integration via:
- `.claude-plugin/` directory or global skill installation
- `hooks/hooks.json` — optional hook to auto-trigger annotation review on plan completion
- `commands/` — slash commands for all operations
- `SKILL.md` — generation instructions

### 11.2 Codex

v1 scope: Codex skill file with the same HTML generation principles adapted to Codex's AGENTS.md convention. Same annotation module, same CLI commands. Slash command equivalents will use Codex's native instruction format.

### 11.3 Antigravity

v1 scope: Antigravity skill file adapted to its agent conventions. Same core behavior. Detailed integration to be refined once Antigravity's plugin API stabilizes.

### 11.4 Cross-Agent Compatibility

The HTML output is agent-agnostic. Any agent can:
- Read the annotation feedback JSON (it's plain structured text)
- Apply changes to HTML files (standard file editing)
- Run CLI commands (`hyperspec index`, `hyperspec serve`)

The only agent-specific parts are the skill files and slash command definitions.

---

## 12. Distribution

### 12.1 npm Package

```json
{
  "name": "hyperspec",
  "bin": {
    "hyperspec": "./bin/hyperspec.js"
  },
  "files": [
    "bin/",
    "cli/",
    "assets/",
    "skills/"
  ]
}
```

**Installation:**
```bash
npm install -g hyperspec
# or
npx hyperspec init
```

### 12.2 Plugin Installation for Claude Code

```bash
hyperspec install claude-code
```

This copies skill files and commands to the appropriate Claude Code plugin directory, or configures global skills.

### 12.3 Self-Update

Since agents evolve, the skill files may need updates. `hyperspec update` pulls the latest skill definitions from the package.

---

## 13. Success Criteria

1. **Generation works**: Agent can produce rich, interactive HTML from markdown or from scratch via `/hyperspec`
2. **Annotation works**: Users can select text, add comments, and see annotations persisted in localStorage
3. **Feedback loop works**: Exported annotation JSON, when pasted into an agent, results in targeted document updates
4. **Portal works**: `index.html` displays all documents with working search, filter, and locale switching
5. **Translation works**: `/hyperspec-translate` produces faithful translations preserving structure
6. **Component library works**: `hyperspec setup` registers components; agents use them when available
7. **Zero build tools**: All output is static HTML — works with `file://`, `hyperspec serve`, or GitHub Pages
8. **Cross-agent**: At minimum Claude Code fully supported; Codex and Antigravity skill files present

---

## 14. Out of Scope (v1)

- Server-side annotation storage or real-time collaboration
- Authentication or access control on portal
- Automated CI/CD integration for HTML generation
- WYSIWYG HTML editing in browser
- Annotation sharing between users (each user's annotations are local)
- PDF or other non-HTML export formats
