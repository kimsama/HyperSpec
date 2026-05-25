# HyperSpec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an npm plugin that enables AI coding agents to generate rich, annotatable HTML documents with a feedback loop for iterative refinement.

**Architecture:** TypeScript CLI (`commander`) compiled with `tsup`, paired with vanilla JS/CSS browser assets (annotation module, index portal). The CLI manages project scaffolding, manifest generation, component registration, and dev serving. Browser assets are plain JS/CSS — no build step needed for output. Agent skill files (markdown) instruct Claude Code, Codex, and Antigravity how to generate HyperSpec-compliant HTML.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Commander.js (CLI), Vitest (testing), tsup (CLI build), vanilla JS/CSS (browser assets), chokidar (file watching)

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `bin/hyperspec.js`
- Create: `src/cli/index.ts`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "hyperspec",
  "version": "0.1.0",
  "description": "Annotatable HTML document generation plugin for AI coding agents",
  "type": "module",
  "bin": {
    "hyperspec": "./bin/hyperspec.js"
  },
  "files": [
    "bin/",
    "dist/",
    "assets/",
    "skills/"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["html", "annotation", "spec", "claude-code", "codex", "ai-agent"],
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install commander chokidar
npm install -D typescript tsup vitest @types/node
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
});
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

- [ ] **Step 7: Create bin/hyperspec.js**

```javascript
#!/usr/bin/env node
import "../dist/index.js";
```

- [ ] **Step 8: Create minimal CLI entry point**

Create `src/cli/index.ts`:

```typescript
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("hyperspec")
  .description("Annotatable HTML document generation for AI coding agents")
  .version(pkg.version);

program.parse();
```

- [ ] **Step 9: Verify build**

Run: `npm run build`
Expected: `dist/index.js` generated without errors.

Run: `node bin/hyperspec.js --version`
Expected: `0.1.0`

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore bin/ src/
git commit -m "feat: project scaffold with CLI entry point"
```

---

### Task 2: Config System

**Files:**
- Create: `src/lib/config.ts`
- Create: `tests/lib/config.test.ts`

- [ ] **Step 1: Write failing tests for config**

Create `tests/lib/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  type HyperSpecConfig,
} from "../../src/lib/config.js";

describe("config", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hyperspec-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("getDefaultConfig", () => {
    it("returns complete default config", () => {
      const config = getDefaultConfig();
      expect(config.outputDir).toBe("docs/html-spec");
      expect(config.locales).toEqual(["en", "ko"]);
      expect(config.assetMode).toBe("reference");
      expect(config.annotation.enabled).toBe(true);
      expect(config.annotation.exportFormat).toBe("structured-json");
      expect(config.components.css).toBeNull();
      expect(config.components.js).toBeNull();
      expect(config.components.reference).toBeNull();
      expect(config.index.title).toBe("Project Documentation");
      expect(config.index.search).toBe(true);
      expect(config.index.filters).toEqual(["category", "tags", "locale"]);
    });
  });

  describe("saveConfig and loadConfig", () => {
    it("round-trips config to JSON file", () => {
      const config = getDefaultConfig();
      config.index.title = "My Docs";
      const configPath = join(tempDir, "hyperspec.config.json");

      saveConfig(configPath, config);
      const loaded = loadConfig(configPath);

      expect(loaded.index.title).toBe("My Docs");
      expect(loaded.outputDir).toBe("docs/html-spec");
    });

    it("returns default config when file does not exist", () => {
      const config = loadConfig(join(tempDir, "nonexistent.json"));
      expect(config).toEqual(getDefaultConfig());
    });

    it("merges partial config with defaults", () => {
      const configPath = join(tempDir, "hyperspec.config.json");
      writeFileSync(configPath, JSON.stringify({ outputDir: "custom/path" }));

      const loaded = loadConfig(configPath);
      expect(loaded.outputDir).toBe("custom/path");
      expect(loaded.locales).toEqual(["en", "ko"]);
      expect(loaded.annotation.enabled).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/config.test.ts`
Expected: FAIL — module `../../src/lib/config.js` not found.

- [ ] **Step 3: Implement config module**

Create `src/lib/config.ts`:

```typescript
import { readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";

export interface HyperSpecConfig {
  outputDir: string;
  locales: string[];
  components: {
    css: string | null;
    js: string | null;
    reference: string | null;
  };
  assetMode: "reference" | "inline";
  annotation: {
    enabled: boolean;
    exportFormat: "structured-json" | "plaintext";
  };
  index: {
    title: string;
    search: boolean;
    filters: string[];
  };
}

export function getDefaultConfig(): HyperSpecConfig {
  return {
    outputDir: "docs/html-spec",
    locales: ["en", "ko"],
    components: {
      css: null,
      js: null,
      reference: null,
    },
    assetMode: "reference",
    annotation: {
      enabled: true,
      exportFormat: "structured-json",
    },
    index: {
      title: "Project Documentation",
      search: true,
      filters: ["category", "tags", "locale"],
    },
  };
}

export function loadConfig(configPath: string): HyperSpecConfig {
  const defaults = getDefaultConfig();
  if (!existsSync(configPath)) {
    return defaults;
  }

  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  return {
    outputDir: raw.outputDir ?? defaults.outputDir,
    locales: raw.locales ?? defaults.locales,
    components: {
      css: raw.components?.css ?? defaults.components.css,
      js: raw.components?.js ?? defaults.components.js,
      reference: raw.components?.reference ?? defaults.components.reference,
    },
    assetMode: raw.assetMode ?? defaults.assetMode,
    annotation: {
      enabled: raw.annotation?.enabled ?? defaults.annotation.enabled,
      exportFormat:
        raw.annotation?.exportFormat ?? defaults.annotation.exportFormat,
    },
    index: {
      title: raw.index?.title ?? defaults.index.title,
      search: raw.index?.search ?? defaults.index.search,
      filters: raw.index?.filters ?? defaults.index.filters,
    },
  };
}

export function saveConfig(
  configPath: string,
  config: HyperSpecConfig
): void {
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/config.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts tests/lib/config.test.ts
git commit -m "feat: config system with load/save/defaults"
```

---

### Task 3: CLI Init Command

**Files:**
- Create: `src/cli/init.ts`
- Create: `tests/cli/init.test.ts`
- Create: `assets/base.css`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Create base.css asset**

Create `assets/base.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  --hs-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --hs-font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  --hs-color-bg: #ffffff;
  --hs-color-text: #1a1a2e;
  --hs-color-text-secondary: #64748b;
  --hs-color-border: #e2e8f0;
  --hs-color-accent: #3b82f6;
  --hs-color-accent-light: #eff6ff;
  --hs-color-success: #22c55e;
  --hs-color-warning: #f59e0b;
  --hs-color-error: #ef4444;
  --hs-radius: 8px;
  --hs-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --hs-max-width: 960px;
}

html {
  font-size: 16px;
  line-height: 1.6;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  padding: 2rem;
  font-family: var(--hs-font-sans);
  color: var(--hs-color-text);
  background: var(--hs-color-bg);
  max-width: var(--hs-max-width);
  margin-inline: auto;
}

h1, h2, h3, h4, h5, h6 {
  margin-top: 2em;
  margin-bottom: 0.5em;
  line-height: 1.3;
  font-weight: 600;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; border-bottom: 1px solid var(--hs-color-border); padding-bottom: 0.3em; }
h3 { font-size: 1.25rem; }

a { color: var(--hs-color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }

code {
  font-family: var(--hs-font-mono);
  font-size: 0.9em;
  background: var(--hs-color-accent-light);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: var(--hs-radius);
  overflow-x: auto;
  line-height: 1.5;
}

pre code {
  background: none;
  padding: 0;
  color: inherit;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--hs-color-border);
}

th {
  font-weight: 600;
  background: var(--hs-color-accent-light);
}

blockquote {
  margin: 1.5em 0;
  padding: 0.75rem 1.25rem;
  border-left: 4px solid var(--hs-color-accent);
  background: var(--hs-color-accent-light);
  color: var(--hs-color-text-secondary);
}

img {
  max-width: 100%;
  height: auto;
}

@media (max-width: 768px) {
  body { padding: 1rem; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }
  table { font-size: 0.875rem; }
}
```

- [ ] **Step 2: Write failing tests for init**

Create `tests/cli/init.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "../../src/cli/init.js";

describe("init", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hyperspec-init-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates the full directory structure", async () => {
    await runInit(tempDir);

    const base = join(tempDir, "docs", "html-spec");
    expect(existsSync(join(base, "index.html"))).toBe(true);
    expect(existsSync(join(base, "manifest.json"))).toBe(true);
    expect(existsSync(join(base, "hyperspec.config.json"))).toBe(true);
    expect(existsSync(join(base, "assets", "base.css"))).toBe(true);
    expect(existsSync(join(base, "assets", "annotate.js"))).toBe(true);
    expect(existsSync(join(base, "assets", "annotate.css"))).toBe(true);
    expect(existsSync(join(base, "htmls"))).toBe(true);
    expect(existsSync(join(base, "htmls", "ko"))).toBe(true);
    expect(existsSync(join(base, "components"))).toBe(true);
  });

  it("creates valid config file with defaults", async () => {
    await runInit(tempDir);

    const configPath = join(tempDir, "docs", "html-spec", "hyperspec.config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.outputDir).toBe("docs/html-spec");
    expect(config.annotation.enabled).toBe(true);
  });

  it("creates empty manifest with documents array", async () => {
    await runInit(tempDir);

    const manifestPath = join(tempDir, "docs", "html-spec", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.documents).toEqual([]);
    expect(manifest.generated).toBeDefined();
  });

  it("does not overwrite existing config", async () => {
    await runInit(tempDir);
    const configPath = join(tempDir, "docs", "html-spec", "hyperspec.config.json");
    const original = readFileSync(configPath, "utf-8");

    await runInit(tempDir);
    const after = readFileSync(configPath, "utf-8");
    expect(after).toBe(original);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/cli/init.test.ts`
Expected: FAIL — module `../../src/cli/init.js` not found.

- [ ] **Step 4: Implement init command**

Create `src/cli/init.ts`:

```typescript
import {
  mkdirSync,
  copyFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultConfig, saveConfig } from "../lib/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getAssetsDir(): string {
  return join(__dirname, "..", "..", "assets");
}

export async function runInit(projectRoot: string): Promise<void> {
  const outputDir = join(projectRoot, "docs", "html-spec");

  const dirs = [
    outputDir,
    join(outputDir, "assets"),
    join(outputDir, "htmls"),
    join(outputDir, "htmls", "ko"),
    join(outputDir, "components"),
  ];

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  const assetsDir = getAssetsDir();
  const assetFiles = ["base.css", "annotate.js", "annotate.css"];
  for (const file of assetFiles) {
    const src = join(assetsDir, file);
    const dest = join(outputDir, "assets", file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    } else {
      writeFileSync(dest, `/* ${file} — placeholder */\n`);
    }
  }

  const configPath = join(outputDir, "hyperspec.config.json");
  if (!existsSync(configPath)) {
    saveConfig(configPath, getDefaultConfig());
  }

  const manifestPath = join(outputDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          generated: new Date().toISOString(),
          config: { title: "Project Documentation", filters: ["category", "tags", "locale"] },
          documents: [],
        },
        null,
        2
      ) + "\n"
    );
  }

  const indexPath = join(outputDir, "index.html");
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, generatePlaceholderIndex());
  }

  console.log(`✓ HyperSpec initialized at ${outputDir}`);
}

function generatePlaceholderIndex(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HyperSpec — Project Documentation</title>
  <link rel="stylesheet" href="assets/base.css">
  <style>
    .hs-portal-placeholder {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--hs-color-text-secondary);
    }
    .hs-portal-placeholder h1 {
      border: none;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="hs-portal-placeholder">
    <h1>HyperSpec</h1>
    <p>No documents yet. Generate HTML documents with <code>/hyperspec</code> and run <code>hyperspec index</code> to populate this portal.</p>
  </div>
</body>
</html>
`;
}
```

- [ ] **Step 5: Register init command in CLI**

Replace `src/cli/index.ts`:

```typescript
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInit } from "./init.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("hyperspec")
  .description("Annotatable HTML document generation for AI coding agents")
  .version(pkg.version);

program
  .command("init")
  .description("Initialize HyperSpec in the current project")
  .action(async () => {
    await runInit(process.cwd());
  });

program.parse();
```

- [ ] **Step 6: Create placeholder asset files so init can copy them**

Create `assets/annotate.js`:
```javascript
// HyperSpec Annotation Module — placeholder
// Full implementation in Task 4-6
(function() {
  "use strict";
  console.log("[HyperSpec] Annotation module loaded");
})();
```

Create `assets/annotate.css`:
```css
/* HyperSpec Annotation Styles — placeholder */
/* Full implementation in Task 4-6 */
```

- [ ] **Step 7: Build and run tests**

Run: `npm run build && npx vitest run tests/cli/init.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 8: Integration test — run init from CLI**

Run:
```bash
mkdir /tmp/test-project && cd /tmp/test-project
node /path/to/hyperspec/bin/hyperspec.js init
ls docs/html-spec/
```
Expected: `assets/ components/ htmls/ hyperspec.config.json index.html manifest.json`

- [ ] **Step 9: Commit**

```bash
git add src/cli/init.ts src/cli/index.ts tests/cli/init.test.ts assets/
git commit -m "feat: CLI init command with directory scaffolding"
```

---

### Task 4: Annotation Module — Selection + Toolbar

**Files:**
- Create: `assets/annotate.js` (replace placeholder)
- Create: `assets/annotate.css` (replace placeholder)

This task builds the core text selection detection and floating toolbar. The annotation module is a single vanilla JS IIFE — no build step, no dependencies.

- [ ] **Step 1: Write annotate.js — module structure + selection detection**

Replace `assets/annotate.js`:

```javascript
(function () {
  "use strict";

  const STORAGE_KEY_PREFIX = "hyperspec-annotations-";
  let annotations = [];
  let toolbar = null;
  let popover = null;
  let panel = null;
  let currentSelection = null;

  function getDocumentId() {
    const meta = document.getElementById("hyperspec-meta");
    if (meta) {
      try {
        const data = JSON.parse(meta.textContent);
        return data.title || document.location.pathname;
      } catch (e) {
        return document.location.pathname;
      }
    }
    return document.location.pathname;
  }

  function getStorageKey() {
    return STORAGE_KEY_PREFIX + getDocumentId();
  }

  // --- Storage ---
  function loadAnnotations() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      annotations = raw ? JSON.parse(raw) : [];
    } catch (e) {
      annotations = [];
    }
  }

  function saveAnnotations() {
    localStorage.setItem(getStorageKey(), JSON.stringify(annotations));
  }

  function clearAnnotations() {
    annotations = [];
    localStorage.removeItem(getStorageKey());
    removeAllHighlights();
    renderPanel();
    updateBadge();
  }

  // --- UUID ---
  function uuid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxx-xxxx".replace(/x/g, () =>
          ((Math.random() * 16) | 0).toString(16)
        );
  }

  // --- Section detection ---
  function findNearestSection(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== document.body) {
      let prev = el.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName)) return prev.textContent.trim();
        prev = prev.previousElementSibling;
      }
      el = el.parentElement;
    }
    return null;
  }

  // --- Toolbar ---
  function createToolbar() {
    const el = document.createElement("div");
    el.id = "hs-toolbar";
    el.innerHTML = `
      <button data-action="comment" title="Comment">💬</button>
      <button data-action="modify" title="Modify">✏️</button>
      <button data-action="delete" title="Delete">🗑️</button>
      <button data-action="insert" title="Insert After">➕</button>
    `;
    el.addEventListener("mousedown", (e) => e.preventDefault());
    el.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      showPopover(action);
    });
    document.body.appendChild(el);
    return el;
  }

  function positionToolbar(range) {
    const rect = range.getBoundingClientRect();
    toolbar.style.top = `${window.scrollY + rect.top - toolbar.offsetHeight - 8}px`;
    toolbar.style.left = `${window.scrollX + rect.left + rect.width / 2 - toolbar.offsetWidth / 2}px`;
    const tbRect = toolbar.getBoundingClientRect();
    if (tbRect.left < 8) toolbar.style.left = "8px";
    if (tbRect.right > window.innerWidth - 8)
      toolbar.style.left = `${window.innerWidth - toolbar.offsetWidth - 8}px`;
    if (tbRect.top < 8)
      toolbar.style.top = `${window.scrollY + rect.bottom + 8}px`;
  }

  function showToolbar(range) {
    if (!toolbar) toolbar = createToolbar();
    toolbar.classList.add("hs-visible");
    positionToolbar(range);
  }

  function hideToolbar() {
    if (toolbar) toolbar.classList.remove("hs-visible");
  }

  // --- Popover ---
  function createPopover() {
    const el = document.createElement("div");
    el.id = "hs-popover";
    el.innerHTML = `
      <div class="hs-popover-header">
        <span class="hs-popover-title"></span>
        <button class="hs-popover-close">✕</button>
      </div>
      <textarea class="hs-popover-comment" placeholder="Your feedback..." rows="3"></textarea>
      <div class="hs-popover-modify-row" style="display:none">
        <textarea class="hs-popover-suggestion" placeholder="Suggested replacement text..." rows="2"></textarea>
      </div>
      <div class="hs-popover-actions">
        <button class="hs-popover-cancel">Cancel</button>
        <button class="hs-popover-save">Save</button>
      </div>
    `;
    el.querySelector(".hs-popover-close").addEventListener("click", hidePopover);
    el.querySelector(".hs-popover-cancel").addEventListener("click", hidePopover);
    el.querySelector(".hs-popover-save").addEventListener("click", saveFromPopover);
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    document.body.appendChild(el);
    return el;
  }

  function showPopover(actionType) {
    if (!popover) popover = createPopover();
    hideToolbar();

    popover.dataset.action = actionType;
    const titles = { comment: "💬 Comment", modify: "✏️ Modify", delete: "🗑️ Delete", insert: "➕ Insert After" };
    popover.querySelector(".hs-popover-title").textContent = titles[actionType] || actionType;
    popover.querySelector(".hs-popover-modify-row").style.display =
      actionType === "modify" ? "block" : "none";
    popover.querySelector(".hs-popover-comment").value = "";
    const suggestion = popover.querySelector(".hs-popover-suggestion");
    if (suggestion) suggestion.value = "";

    popover.classList.add("hs-visible");

    if (currentSelection) {
      const rect = currentSelection.range.getBoundingClientRect();
      popover.style.top = `${window.scrollY + rect.bottom + 12}px`;
      popover.style.left = `${window.scrollX + rect.left}px`;
      const pRect = popover.getBoundingClientRect();
      if (pRect.right > window.innerWidth - 8) {
        popover.style.left = `${window.innerWidth - popover.offsetWidth - 8}px`;
      }
    }

    popover.querySelector(".hs-popover-comment").focus();
  }

  function hidePopover() {
    if (popover) popover.classList.remove("hs-visible");
    currentSelection = null;
  }

  function saveFromPopover() {
    if (!currentSelection) return;

    const action = popover.dataset.action;
    const comment = popover.querySelector(".hs-popover-comment").value.trim();
    const suggestion = popover.querySelector(".hs-popover-suggestion")?.value.trim() || undefined;

    if (!comment && action !== "delete") return;

    const annotation = {
      id: uuid(),
      type: action,
      selectedText: currentSelection.text,
      comment: comment || `[${action}] requested`,
      suggestedChange: action === "modify" ? suggestion : undefined,
      section: findNearestSection(currentSelection.range.startContainer),
      xpath: getXPath(currentSelection.range.startContainer),
      rangeStart: currentSelection.range.startOffset,
      rangeEnd: currentSelection.range.endOffset,
      createdAt: new Date().toISOString(),
    };

    annotations.push(annotation);
    saveAnnotations();
    highlightAnnotation(annotation, currentSelection.range);
    renderPanel();
    updateBadge();
    hidePopover();
  }

  // --- XPath helper ---
  function getXPath(node) {
    const parts = [];
    let current = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (current && current !== document.body) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }
    return "/body/" + parts.join("/");
  }

  // --- Highlighting ---
  function highlightAnnotation(annotation, range) {
    try {
      const mark = document.createElement("mark");
      mark.className = "hs-highlight hs-highlight-" + annotation.type;
      mark.dataset.annotationId = annotation.id;
      mark.title = annotation.comment;
      range.surroundContents(mark);
    } catch (e) {
      // Range spans multiple elements — wrap what we can
    }
  }

  function removeAllHighlights() {
    document.querySelectorAll("mark.hs-highlight").forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  // --- Side Panel ---
  function createPanel() {
    const el = document.createElement("div");
    el.id = "hs-panel";
    el.innerHTML = `
      <div class="hs-panel-header">
        <span>Annotations</span>
        <button class="hs-panel-close">✕</button>
      </div>
      <div class="hs-panel-list"></div>
      <div class="hs-panel-footer">
        <button class="hs-panel-clear">Clear All</button>
      </div>
    `;
    el.querySelector(".hs-panel-close").addEventListener("click", togglePanel);
    el.querySelector(".hs-panel-clear").addEventListener("click", () => {
      if (confirm("Clear all annotations?")) clearAnnotations();
    });
    document.body.appendChild(el);
    return el;
  }

  function togglePanel() {
    if (!panel) panel = createPanel();
    panel.classList.toggle("hs-panel-open");
    if (panel.classList.contains("hs-panel-open")) renderPanel();
  }

  function renderPanel() {
    if (!panel) return;
    const list = panel.querySelector(".hs-panel-list");
    if (!list) return;

    const icons = { comment: "💬", modify: "✏️", delete: "🗑️", insert: "➕" };
    list.innerHTML = annotations
      .map(
        (a) => `
      <div class="hs-panel-item" data-id="${a.id}">
        <div class="hs-panel-item-header">
          <span>${icons[a.type] || "📝"} ${a.type}</span>
          <button class="hs-panel-item-delete" data-id="${a.id}">✕</button>
        </div>
        <div class="hs-panel-item-text">"${a.selectedText.slice(0, 60)}${a.selectedText.length > 60 ? "..." : ""}"</div>
        <div class="hs-panel-item-comment">${a.comment}</div>
        ${a.section ? `<div class="hs-panel-item-section">§ ${a.section}</div>` : ""}
      </div>`
      )
      .join("");

    list.querySelectorAll(".hs-panel-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".hs-panel-item-delete")) {
          const id = e.target.closest(".hs-panel-item-delete").dataset.id;
          deleteAnnotation(id);
          return;
        }
        const id = item.dataset.id;
        const mark = document.querySelector(`mark[data-annotation-id="${id}"]`);
        if (mark) mark.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function deleteAnnotation(id) {
    annotations = annotations.filter((a) => a.id !== id);
    saveAnnotations();
    const mark = document.querySelector(`mark[data-annotation-id="${id}"]`);
    if (mark) {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
    renderPanel();
    updateBadge();
  }

  // --- Export ---
  function getExportData() {
    const meta = document.getElementById("hyperspec-meta");
    let docTitle = document.title;
    let docFile = document.location.pathname.split("/").pop();
    let version = 1;

    if (meta) {
      try {
        const data = JSON.parse(meta.textContent);
        docTitle = data.title || docTitle;
        docFile = data.source || docFile;
        version = data.version || 1;
      } catch (e) {}
    }

    const typeCounts = {};
    annotations.forEach((a) => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });
    const summary = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");

    return {
      document: docFile,
      documentTitle: docTitle,
      timestamp: new Date().toISOString(),
      version: version,
      summary: `${annotations.length} annotations: ${summary}`,
      annotations: annotations.map((a) => ({
        id: a.id,
        type: a.type,
        selectedText: a.selectedText,
        comment: a.comment,
        ...(a.suggestedChange ? { suggestedChange: a.suggestedChange } : {}),
        section: a.section,
      })),
    };
  }

  async function exportFeedback() {
    if (annotations.length === 0) {
      showToast("No annotations to export.");
      return;
    }
    const data = getExportData();
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      showToast("Feedback copied! Paste into your agent.");
    } catch (e) {
      const textarea = document.createElement("textarea");
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      showToast("Feedback copied! Paste into your agent.");
    }
  }

  // --- Export Button + Badge ---
  function createExportButton() {
    const btn = document.createElement("button");
    btn.id = "hs-export-btn";
    btn.innerHTML = `📋 Export Feedback <span class="hs-badge">0</span>`;
    btn.addEventListener("click", exportFeedback);
    document.body.appendChild(btn);

    const panelBtn = document.createElement("button");
    panelBtn.id = "hs-panel-toggle";
    panelBtn.textContent = "📝";
    panelBtn.title = "Toggle annotation panel";
    panelBtn.addEventListener("click", togglePanel);
    document.body.appendChild(panelBtn);
  }

  function updateBadge() {
    const badge = document.querySelector("#hs-export-btn .hs-badge");
    if (badge) {
      badge.textContent = annotations.length;
      badge.style.display = annotations.length > 0 ? "inline-flex" : "none";
    }
  }

  // --- Toast ---
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "hs-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("hs-toast-visible"));
    setTimeout(() => {
      toast.classList.remove("hs-toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // --- Selection listener ---
  function onSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      hideToolbar();
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      hideToolbar();
      return;
    }

    // Ignore selections inside HyperSpec UI
    const anchorEl = selection.anchorNode?.parentElement;
    if (anchorEl?.closest("#hs-toolbar, #hs-popover, #hs-panel, #hs-export-btn")) {
      return;
    }

    const range = selection.getRangeAt(0);
    currentSelection = { text, range: range.cloneRange() };
    showToolbar(range);
  }

  // --- Init ---
  function init() {
    loadAnnotations();
    createExportButton();
    document.addEventListener("mouseup", () => {
      setTimeout(onSelectionChange, 10);
    });
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest("#hs-toolbar, #hs-popover")) {
        hideToolbar();
        hidePopover();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideToolbar();
        hidePopover();
      }
    });
    updateBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Write annotate.css — complete styles**

Replace `assets/annotate.css`:

```css
/* --- HyperSpec Annotation Styles --- */

/* Toolbar */
#hs-toolbar {
  position: absolute;
  z-index: 10000;
  display: flex;
  gap: 2px;
  padding: 4px;
  background: #1e293b;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
#hs-toolbar.hs-visible {
  opacity: 1;
  pointer-events: auto;
}
#hs-toolbar button {
  border: none;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 16px;
  line-height: 1;
  transition: background 0.1s;
}
#hs-toolbar button:hover {
  background: #334155;
}

/* Popover */
#hs-popover {
  position: absolute;
  z-index: 10001;
  width: 320px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
#hs-popover.hs-visible {
  opacity: 1;
  pointer-events: auto;
}
.hs-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 14px;
}
.hs-popover-close {
  border: none;
  background: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
}
.hs-popover-close:hover {
  background: #f1f5f9;
}
.hs-popover-comment,
.hs-popover-suggestion {
  display: block;
  width: calc(100% - 32px);
  margin: 12px 16px 0;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}
.hs-popover-comment:focus,
.hs-popover-suggestion:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.hs-popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
}
.hs-popover-actions button {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.hs-popover-save {
  background: #3b82f6 !important;
  color: #fff !important;
  border-color: #3b82f6 !important;
}
.hs-popover-save:hover {
  background: #2563eb !important;
}
.hs-popover-cancel:hover {
  background: #f1f5f9;
}

/* Highlights */
mark.hs-highlight {
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}
mark.hs-highlight-comment {
  background: rgba(59, 130, 246, 0.15);
  border-bottom: 2px solid #3b82f6;
}
mark.hs-highlight-modify {
  background: rgba(245, 158, 11, 0.15);
  border-bottom: 2px solid #f59e0b;
}
mark.hs-highlight-delete {
  background: rgba(239, 68, 68, 0.1);
  border-bottom: 2px solid #ef4444;
  text-decoration: line-through;
  text-decoration-color: #ef4444;
}
mark.hs-highlight-insert {
  background: rgba(34, 197, 94, 0.15);
  border-bottom: 2px solid #22c55e;
}

/* Side Panel */
#hs-panel {
  position: fixed;
  top: 0;
  right: -380px;
  width: 360px;
  height: 100vh;
  background: #fff;
  border-left: 1px solid #e2e8f0;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  z-index: 10002;
  display: flex;
  flex-direction: column;
  transition: right 0.25s ease;
  font-size: 14px;
}
#hs-panel.hs-panel-open {
  right: 0;
}
.hs-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 16px;
}
.hs-panel-close {
  border: none;
  background: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 18px;
  padding: 2px 8px;
  border-radius: 4px;
}
.hs-panel-close:hover {
  background: #f1f5f9;
}
.hs-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.hs-panel-item {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.1s;
}
.hs-panel-item:hover {
  background: #f8fafc;
}
.hs-panel-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: capitalize;
}
.hs-panel-item-delete {
  border: none;
  background: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}
.hs-panel-item-delete:hover {
  background: #fee2e2;
  color: #ef4444;
}
.hs-panel-item-text {
  color: #64748b;
  font-size: 13px;
  font-style: italic;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hs-panel-item-comment {
  color: #1e293b;
  font-size: 13px;
}
.hs-panel-item-section {
  color: #94a3b8;
  font-size: 12px;
  margin-top: 4px;
}
.hs-panel-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
}
.hs-panel-clear {
  width: 100%;
  padding: 8px;
  border: 1px solid #fecaca;
  background: #fff;
  color: #ef4444;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.hs-panel-clear:hover {
  background: #fef2f2;
}

/* Export Button */
#hs-export-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  padding: 8px 16px;
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
}
#hs-export-btn:hover {
  background: #334155;
}
.hs-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #3b82f6;
  color: #fff;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

/* Panel Toggle */
#hs-panel-toggle {
  position: fixed;
  top: 16px;
  right: 200px;
  z-index: 9999;
  width: 40px;
  height: 40px;
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: background 0.15s;
}
#hs-panel-toggle:hover {
  background: #334155;
}

/* Toast */
.hs-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  padding: 12px 24px;
  background: #1e293b;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  z-index: 10003;
}
.hs-toast.hs-toast-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* --- Responsive --- */
@media (max-width: 768px) {
  #hs-panel {
    width: 100%;
    right: -100%;
  }
  #hs-popover {
    width: calc(100vw - 32px);
    left: 16px !important;
  }
}
```

- [ ] **Step 3: Create a test HTML page to manually verify annotation behavior**

Create `tests/fixtures/annotation-test.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annotation Test</title>
  <link rel="stylesheet" href="../../assets/base.css">
  <link rel="stylesheet" href="../../assets/annotate.css">
  <script type="application/json" id="hyperspec-meta">
  {
    "title": "Test Document",
    "category": "spec",
    "tags": ["test"],
    "created": "2026-05-25",
    "updated": "2026-05-25",
    "locale": "en",
    "version": 1
  }
  </script>
</head>
<body>
  <h1>Test Document</h1>
  <h2>Authentication Architecture</h2>
  <p>Use JWT for authentication with a 24-hour token expiry. Tokens are stored in HTTP-only cookies and validated on every request.</p>
  <h2>Caching Strategy</h2>
  <p>The Redis cache layer handles session data and rate limiting. Cache TTL is set to 15 minutes for most endpoints.</p>
  <h2>Legacy Auth</h2>
  <p>The legacy authentication system uses basic auth headers. This section describes the old approach that is being phased out.</p>
  <h3>Details</h3>
  <p>Legacy tokens are stored in plain-text cookies without encryption. Migration to the new system is recommended.</p>
  <script src="../../assets/annotate.js"></script>
</body>
</html>
```

- [ ] **Step 4: Open test page in browser and verify**

Open `tests/fixtures/annotation-test.html` in a browser.

Verify:
1. Export Feedback button appears top-right with badge showing 0
2. Panel toggle button appears next to it
3. Select text "Use JWT" → floating toolbar appears with 4 buttons
4. Click 💬 Comment → popover appears with text input
5. Type "Consider sessions instead" → click Save → text gets blue highlight
6. Click 📝 panel toggle → panel opens showing the annotation
7. Click annotation in panel → scrolls to highlight
8. Click Export Feedback → JSON copied to clipboard, toast shown
9. Refresh page → annotation persists (localStorage)
10. Open panel → click ✕ on annotation → highlight removed
11. Click Clear All → all annotations removed

- [ ] **Step 5: Rebuild and update init to copy real assets**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add assets/annotate.js assets/annotate.css assets/base.css tests/fixtures/annotation-test.html
git commit -m "feat: annotation module with selection, toolbar, popover, panel, export"
```

---

### Task 5: Manifest Indexer

**Files:**
- Create: `src/lib/manifest.ts`
- Create: `tests/lib/manifest.test.ts`
- Create: `tests/fixtures/sample-doc.html`
- Create: `tests/fixtures/sample-no-meta.html`

- [ ] **Step 1: Create test fixtures**

Create `tests/fixtures/sample-doc.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><title>Auth Spec</title></head>
<body>
  <script type="application/json" id="hyperspec-meta">
  {
    "title": "Authentication System Spec",
    "category": "spec",
    "tags": ["auth", "security"],
    "created": "2026-05-25",
    "updated": "2026-05-25",
    "locale": "en",
    "version": 2
  }
  </script>
  <h1>Auth Spec</h1>
</body>
</html>
```

Create `tests/fixtures/sample-no-meta.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><title>No Meta</title></head>
<body><h1>Plain HTML</h1></body>
</html>
```

- [ ] **Step 2: Write failing tests**

Create `tests/lib/manifest.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractMetadata,
  generateManifest,
  type ManifestDocument,
} from "../../src/lib/manifest.js";

describe("manifest", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hyperspec-manifest-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("extractMetadata", () => {
    it("extracts metadata from hyperspec-meta script tag", () => {
      const html = readFileSync(
        join(__dirname, "..", "fixtures", "sample-doc.html"),
        "utf-8"
      );
      const meta = extractMetadata(html);
      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("Authentication System Spec");
      expect(meta!.category).toBe("spec");
      expect(meta!.tags).toEqual(["auth", "security"]);
      expect(meta!.version).toBe(2);
      expect(meta!.locale).toBe("en");
    });

    it("returns null for HTML without metadata", () => {
      const html = readFileSync(
        join(__dirname, "..", "fixtures", "sample-no-meta.html"),
        "utf-8"
      );
      const meta = extractMetadata(html);
      expect(meta).toBeNull();
    });
  });

  describe("generateManifest", () => {
    it("scans htmls/ directory and builds manifest", () => {
      const htmlsDir = join(tempDir, "htmls");
      const koDir = join(htmlsDir, "ko");
      mkdirSync(koDir, { recursive: true });

      copyFileSync(
        join(__dirname, "..", "fixtures", "sample-doc.html"),
        join(htmlsDir, "auth-spec.html")
      );

      const koHtml = readFileSync(
        join(__dirname, "..", "fixtures", "sample-doc.html"),
        "utf-8"
      ).replace('"locale": "en"', '"locale": "ko"');
      writeFileSync(join(koDir, "auth-spec.html"), koHtml);

      const manifest = generateManifest(tempDir, {
        title: "Test Docs",
        filters: ["category", "tags", "locale"],
      });

      expect(manifest.documents).toHaveLength(2);
      const enDoc = manifest.documents.find((d) => d.locale === "en");
      expect(enDoc).toBeDefined();
      expect(enDoc!.title).toBe("Authentication System Spec");
      expect(enDoc!.path).toBe("htmls/auth-spec.html");

      const koDoc = manifest.documents.find((d) => d.locale === "ko");
      expect(koDoc).toBeDefined();
      expect(koDoc!.path).toBe("htmls/ko/auth-spec.html");
    });

    it("links translations in manifest", () => {
      const htmlsDir = join(tempDir, "htmls");
      const koDir = join(htmlsDir, "ko");
      mkdirSync(koDir, { recursive: true });

      copyFileSync(
        join(__dirname, "..", "fixtures", "sample-doc.html"),
        join(htmlsDir, "auth-spec.html")
      );

      const koHtml = readFileSync(
        join(__dirname, "..", "fixtures", "sample-doc.html"),
        "utf-8"
      ).replace('"locale": "en"', '"locale": "ko"');
      writeFileSync(join(koDir, "auth-spec.html"), koHtml);

      const manifest = generateManifest(tempDir, {
        title: "Test Docs",
        filters: ["category", "tags", "locale"],
      });

      const enDoc = manifest.documents.find((d) => d.locale === "en");
      expect(enDoc!.translations).toEqual({ ko: "htmls/ko/auth-spec.html" });
    });

    it("skips HTML files without metadata", () => {
      const htmlsDir = join(tempDir, "htmls");
      mkdirSync(htmlsDir, { recursive: true });

      copyFileSync(
        join(__dirname, "..", "fixtures", "sample-no-meta.html"),
        join(htmlsDir, "plain.html")
      );

      const manifest = generateManifest(tempDir, {
        title: "Test Docs",
        filters: ["category"],
      });

      expect(manifest.documents).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/lib/manifest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement manifest module**

Create `src/lib/manifest.ts`:

```typescript
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";

export interface DocumentMeta {
  title: string;
  category: string;
  tags: string[];
  created: string;
  updated: string;
  locale: string;
  source?: string;
  version: number;
}

export interface ManifestDocument extends DocumentMeta {
  path: string;
  translations: Record<string, string>;
}

export interface Manifest {
  generated: string;
  config: {
    title: string;
    filters: string[];
  };
  documents: ManifestDocument[];
}

export function extractMetadata(html: string): DocumentMeta | null {
  const match = html.match(
    /<script[^>]+id=["']hyperspec-meta["'][^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    if (!data.title || !data.category) return null;
    return {
      title: data.title,
      category: data.category,
      tags: data.tags || [],
      created: data.created || "",
      updated: data.updated || "",
      locale: data.locale || "en",
      source: data.source || undefined,
      version: data.version || 1,
    };
  } catch {
    return null;
  }
}

function collectHtmlFiles(
  dir: string,
  baseDir: string
): Array<{ path: string; absPath: string }> {
  const results: Array<{ path: string; absPath: string }> = [];

  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(fullPath, baseDir));
    } else if (entry.name.endsWith(".html")) {
      results.push({
        path: relative(baseDir, fullPath).replace(/\\/g, "/"),
        absPath: fullPath,
      });
    }
  }
  return results;
}

export function generateManifest(
  outputDir: string,
  config: { title: string; filters: string[] }
): Manifest {
  const htmlsDir = join(outputDir, "htmls");
  const files = collectHtmlFiles(htmlsDir, outputDir);

  const docs: ManifestDocument[] = [];

  for (const file of files) {
    const html = readFileSync(file.absPath, "utf-8");
    const meta = extractMetadata(html);
    if (!meta) continue;

    docs.push({
      ...meta,
      path: file.path,
      translations: {},
    });
  }

  // Link translations: match by filename across locale subdirectories
  for (const doc of docs) {
    if (doc.locale === "en" || !doc.path.includes("/")) continue;
    // This is a translation — find the source
    const filename = basename(doc.path);
    const source = docs.find(
      (d) => d.path === `htmls/${filename}` && d.locale !== doc.locale
    );
    if (source) {
      source.translations[doc.locale] = doc.path;
    }
  }

  return {
    generated: new Date().toISOString(),
    config,
    documents: docs,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run build && npx vitest run tests/lib/manifest.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/manifest.ts tests/lib/manifest.test.ts tests/fixtures/sample-doc.html tests/fixtures/sample-no-meta.html
git commit -m "feat: manifest indexer with metadata extraction and translation linking"
```

---

### Task 6: CLI Index Command

**Files:**
- Create: `src/cli/index-cmd.ts`
- Modify: `src/cli/index.ts`
- Create: `tests/cli/index-cmd.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/cli/index-cmd.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runIndex } from "../../src/cli/index-cmd.js";
import { getDefaultConfig, saveConfig } from "../../src/lib/config.js";

describe("index command", () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hyperspec-index-"));
    outputDir = join(tempDir, "docs", "html-spec");
    mkdirSync(join(outputDir, "htmls"), { recursive: true });
    saveConfig(join(outputDir, "hyperspec.config.json"), getDefaultConfig());
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("generates manifest.json from HTML files", async () => {
    copyFileSync(
      join(__dirname, "..", "fixtures", "sample-doc.html"),
      join(outputDir, "htmls", "auth-spec.html")
    );

    await runIndex(tempDir);

    const manifest = JSON.parse(
      readFileSync(join(outputDir, "manifest.json"), "utf-8")
    );
    expect(manifest.documents).toHaveLength(1);
    expect(manifest.documents[0].title).toBe("Authentication System Spec");
  });

  it("creates empty manifest when no HTML files exist", async () => {
    await runIndex(tempDir);

    const manifest = JSON.parse(
      readFileSync(join(outputDir, "manifest.json"), "utf-8")
    );
    expect(manifest.documents).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/cli/index-cmd.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement index command**

Create `src/cli/index-cmd.ts`:

```typescript
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../lib/config.js";
import { generateManifest } from "../lib/manifest.js";

export async function runIndex(projectRoot: string): Promise<void> {
  const config = loadConfig(
    join(projectRoot, "docs", "html-spec", "hyperspec.config.json")
  );
  const outputDir = join(projectRoot, config.outputDir);

  const manifest = generateManifest(outputDir, {
    title: config.index.title,
    filters: config.index.filters,
  });

  writeFileSync(
    join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );

  console.log(
    `✓ Indexed ${manifest.documents.length} document(s) → manifest.json`
  );
}
```

- [ ] **Step 4: Register in CLI**

Add to `src/cli/index.ts`, after the `init` command:

```typescript
import { runIndex } from "./index-cmd.js";

// ...existing code...

program
  .command("index")
  .description("Scan HTML files and generate manifest.json")
  .action(async () => {
    await runIndex(process.cwd());
  });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run build && npx vitest run tests/cli/index-cmd.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/cli/index-cmd.ts src/cli/index.ts tests/cli/index-cmd.test.ts
git commit -m "feat: CLI index command for manifest generation"
```

---

### Task 7: Index Portal

**Files:**
- Create: `assets/portal/index.html`
- Create: `assets/portal/portal.js`
- Create: `assets/portal/portal.css`
- Modify: `src/cli/init.ts` (copy portal assets)

- [ ] **Step 1: Create portal.css**

Create `assets/portal/portal.css`:

```css
:root {
  --portal-accent: #3b82f6;
  --portal-bg: #f8fafc;
  --portal-card-bg: #fff;
  --portal-text: #1e293b;
  --portal-text-sec: #64748b;
  --portal-border: #e2e8f0;
}

body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--portal-bg);
  color: var(--portal-text);
}

.portal-header {
  padding: 2rem 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.portal-header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
}

.portal-search {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--portal-border);
  border-radius: 8px;
  font-size: 15px;
  background: var(--portal-card-bg);
  margin-bottom: 1rem;
}
.portal-search:focus {
  outline: none;
  border-color: var(--portal-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.portal-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 1rem;
}

.portal-chip {
  padding: 4px 12px;
  border: 1px solid var(--portal-border);
  border-radius: 16px;
  background: var(--portal-card-bg);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
  user-select: none;
}
.portal-chip:hover {
  border-color: var(--portal-accent);
}
.portal-chip.active {
  background: var(--portal-accent);
  color: #fff;
  border-color: var(--portal-accent);
}

.portal-locale-switch {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.portal-locale-btn {
  padding: 4px 10px;
  border: 1px solid var(--portal-border);
  background: var(--portal-card-bg);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}
.portal-locale-btn:first-child { border-radius: 6px 0 0 6px; }
.portal-locale-btn:last-child { border-radius: 0 6px 6px 0; }
.portal-locale-btn.active {
  background: var(--portal-accent);
  color: #fff;
  border-color: var(--portal-accent);
}

.portal-sort {
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid var(--portal-border);
  border-radius: 6px;
  background: var(--portal-card-bg);
  cursor: pointer;
}

.portal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 0 2rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.portal-card {
  background: var(--portal-card-bg);
  border: 1px solid var(--portal-border);
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}
.portal-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-decoration: none;
}

.portal-card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--portal-text);
}

.portal-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.portal-category {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
.portal-category-spec { background: #dbeafe; color: #1e40af; }
.portal-category-review { background: #fef3c7; color: #92400e; }
.portal-category-report { background: #d1fae5; color: #065f46; }
.portal-category-tutorial { background: #ede9fe; color: #5b21b6; }
.portal-category-prototype { background: #fce7f3; color: #9d174d; }

.portal-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: #f1f5f9;
  color: var(--portal-text-sec);
}

.portal-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--portal-text-sec);
  margin-top: 8px;
}

.portal-outdated {
  color: #f59e0b;
  font-weight: 500;
}

.portal-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem;
  color: var(--portal-text-sec);
}

@media (max-width: 768px) {
  .portal-grid { grid-template-columns: 1fr; padding: 0 1rem 1rem; }
  .portal-header { padding: 1rem; }
}
```

- [ ] **Step 2: Create portal.js**

Create `assets/portal/portal.js`:

```javascript
(function () {
  "use strict";

  let manifest = null;
  let activeCategories = new Set();
  let activeTags = new Set();
  let activeLocale = "en";
  let sortBy = "updated";
  let searchQuery = "";

  async function loadManifest() {
    try {
      const resp = await fetch("manifest.json");
      manifest = await resp.json();
      document.querySelector(".portal-header h1").textContent =
        manifest.config?.title || "Project Documentation";
      buildFilters();
      render();
    } catch (e) {
      document.querySelector(".portal-grid").innerHTML =
        '<div class="portal-empty">No manifest.json found. Run <code>hyperspec index</code> to generate it.</div>';
    }
  }

  function getFilteredDocs() {
    if (!manifest) return [];

    return manifest.documents
      .filter((doc) => {
        if (activeLocale !== "all" && doc.locale !== activeLocale) return false;
        if (activeCategories.size > 0 && !activeCategories.has(doc.category)) return false;
        if (activeTags.size > 0 && !doc.tags.some((t) => activeTags.has(t))) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match =
            doc.title.toLowerCase().includes(q) ||
            doc.tags.some((t) => t.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "updated") return b.updated.localeCompare(a.updated);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "category") return a.category.localeCompare(b.category);
        return 0;
      });
  }

  function buildFilters() {
    const categories = [...new Set(manifest.documents.map((d) => d.category))];
    const tags = [...new Set(manifest.documents.flatMap((d) => d.tags))];
    const locales = [...new Set(manifest.documents.map((d) => d.locale))];

    const filtersEl = document.querySelector(".portal-filters");

    const categoryChips = categories
      .map((c) => `<span class="portal-chip" data-filter="category" data-value="${c}">${c}</span>`)
      .join("");

    const tagChips = tags
      .map((t) => `<span class="portal-chip" data-filter="tag" data-value="${t}">${t}</span>`)
      .join("");

    const localeButtons = locales
      .map(
        (l) =>
          `<button class="portal-locale-btn${l === activeLocale ? " active" : ""}" data-locale="${l}">${l.toUpperCase()}</button>`
      )
      .join("");

    filtersEl.innerHTML = `
      ${categoryChips}
      ${tagChips}
      <select class="portal-sort">
        <option value="updated">Newest</option>
        <option value="title">A–Z</option>
        <option value="category">Category</option>
      </select>
      <div class="portal-locale-switch">${localeButtons}</div>
    `;

    filtersEl.addEventListener("click", (e) => {
      const chip = e.target.closest(".portal-chip");
      if (chip) {
        const filter = chip.dataset.filter;
        const value = chip.dataset.value;
        if (filter === "category") {
          activeCategories.has(value) ? activeCategories.delete(value) : activeCategories.add(value);
        } else if (filter === "tag") {
          activeTags.has(value) ? activeTags.delete(value) : activeTags.add(value);
        }
        chip.classList.toggle("active");
        render();
      }

      const localeBtn = e.target.closest(".portal-locale-btn");
      if (localeBtn) {
        activeLocale = localeBtn.dataset.locale;
        filtersEl.querySelectorAll(".portal-locale-btn").forEach((b) => b.classList.remove("active"));
        localeBtn.classList.add("active");
        render();
      }
    });

    filtersEl.querySelector(".portal-sort").addEventListener("change", (e) => {
      sortBy = e.target.value;
      render();
    });
  }

  function render() {
    const docs = getFilteredDocs();
    const grid = document.querySelector(".portal-grid");

    if (docs.length === 0) {
      grid.innerHTML = '<div class="portal-empty">No documents match your filters.</div>';
      return;
    }

    grid.innerHTML = docs
      .map((doc) => {
        const tags = doc.tags.map((t) => `<span class="portal-tag">${t}</span>`).join("");
        const outdated = Object.entries(doc.translations || {}).some(([locale, path]) => {
          const translated = manifest.documents.find((d) => d.path === path);
          return translated && translated.version < doc.version;
        });

        return `
        <a class="portal-card" href="${doc.path}">
          <h3 class="portal-card-title">${doc.title}</h3>
          <div class="portal-card-meta">
            <span class="portal-category portal-category-${doc.category}">${doc.category}</span>
            ${tags}
          </div>
          <div class="portal-card-footer">
            <span>${doc.updated} · v${doc.version}</span>
            ${outdated ? '<span class="portal-outdated">⚠ translation outdated</span>' : ""}
          </div>
        </a>`;
      })
      .join("");
  }

  function init() {
    const searchInput = document.querySelector(".portal-search");
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value.trim();
        render();
      }, 200);
    });

    loadManifest();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
```

- [ ] **Step 3: Create portal index.html template**

Create `assets/portal/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HyperSpec — Project Documentation</title>
  <link rel="stylesheet" href="assets/portal.css">
</head>
<body>
  <div class="portal-header">
    <h1>Project Documentation</h1>
    <input type="text" class="portal-search" placeholder="Search documents by title or tag...">
    <div class="portal-filters"></div>
  </div>
  <div class="portal-grid"></div>
  <script src="assets/portal.js"></script>
</body>
</html>
```

- [ ] **Step 4: Update init to copy portal assets**

In `src/cli/init.ts`, update the `runInit` function to also copy portal assets:

Replace the asset-copying section:

```typescript
  // Copy annotation assets
  const assetsDir = getAssetsDir();
  const assetFiles = ["base.css", "annotate.js", "annotate.css"];
  for (const file of assetFiles) {
    const src = join(assetsDir, file);
    const dest = join(outputDir, "assets", file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    } else {
      writeFileSync(dest, `/* ${file} — placeholder */\n`);
    }
  }

  // Copy portal assets
  const portalAssets = ["portal.js", "portal.css"];
  for (const file of portalAssets) {
    const src = join(assetsDir, "portal", file);
    const dest = join(outputDir, "assets", file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  }
```

Also replace the `generatePlaceholderIndex` call with copying the portal template:

```typescript
  const indexPath = join(outputDir, "index.html");
  if (!existsSync(indexPath)) {
    const portalTemplate = join(assetsDir, "portal", "index.html");
    if (existsSync(portalTemplate)) {
      copyFileSync(portalTemplate, indexPath);
    } else {
      writeFileSync(indexPath, generatePlaceholderIndex());
    }
  }
```

- [ ] **Step 5: Rebuild and verify init copies portal files**

Run: `npm run build && npx vitest run tests/cli/init.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Manual verification — run init, add sample HTML, run index, open portal**

```bash
cd /tmp && mkdir portal-test && cd portal-test
node /path/to/hyperspec/bin/hyperspec.js init
cp /path/to/hyperspec/tests/fixtures/sample-doc.html docs/html-spec/htmls/
node /path/to/hyperspec/bin/hyperspec.js index
# Open docs/html-spec/index.html in a browser via a local server
npx serve docs/html-spec
```

Verify: portal shows "Authentication System Spec" card with category badge, tags, search works.

- [ ] **Step 7: Commit**

```bash
git add assets/portal/ src/cli/init.ts
git commit -m "feat: index portal with search, filter, locale switcher"
```

---

### Task 8: Component Scanner + CLI Setup

**Files:**
- Create: `src/lib/scanner.ts`
- Create: `src/cli/setup.ts`
- Create: `tests/lib/scanner.test.ts`
- Create: `tests/fixtures/sample-components/components.css`
- Create: `tests/fixtures/sample-components/components.js`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Create test fixtures**

Create `tests/fixtures/sample-components/components.css`:

```css
.hs-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.hs-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.hs-callout {
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid;
}
.hs-callout.warning {
  background: #fef3c7;
  border-color: #f59e0b;
}
.hs-callout.error {
  background: #fee2e2;
  border-color: #ef4444;
}
```

Create `tests/fixtures/sample-components/components.js`:

```javascript
class HsAccordion extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute("title") || "Section";
    this.innerHTML = `<details><summary>${title}</summary><div>${this.innerHTML}</div></details>`;
  }
}
customElements.define("hs-accordion", HsAccordion);

class HsCopyButton extends HTMLElement {
  connectedCallback() {
    const target = this.getAttribute("data-target");
    this.innerHTML = `<button>Copy</button>`;
  }
}
customElements.define("hs-copy-button", HsCopyButton);
```

- [ ] **Step 2: Write failing tests for scanner**

Create `tests/lib/scanner.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanComponents } from "../../src/lib/scanner.js";

const fixtureDir = join(__dirname, "..", "fixtures", "sample-components");

describe("component scanner", () => {
  it("extracts CSS class names from CSS file", () => {
    const result = scanComponents(
      join(fixtureDir, "components.css"),
      join(fixtureDir, "components.js")
    );
    expect(result.cssClasses).toContain(".hs-card");
    expect(result.cssClasses).toContain(".hs-grid-2");
    expect(result.cssClasses).toContain(".hs-callout");
    expect(result.cssClasses).toContain(".hs-callout.warning");
    expect(result.cssClasses).toContain(".hs-callout.error");
  });

  it("extracts custom element names from JS file", () => {
    const result = scanComponents(
      join(fixtureDir, "components.css"),
      join(fixtureDir, "components.js")
    );
    expect(result.customElements).toContain("hs-accordion");
    expect(result.customElements).toContain("hs-copy-button");
  });

  it("generates markdown reference", () => {
    const result = scanComponents(
      join(fixtureDir, "components.css"),
      join(fixtureDir, "components.js")
    );
    const md = result.toMarkdown("Test Project");
    expect(md).toContain("# Component Reference");
    expect(md).toContain(".hs-card");
    expect(md).toContain("hs-accordion");
  });

  it("handles missing JS file gracefully", () => {
    const result = scanComponents(
      join(fixtureDir, "components.css"),
      null
    );
    expect(result.cssClasses.length).toBeGreaterThan(0);
    expect(result.customElements).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/lib/scanner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement component scanner**

Create `src/lib/scanner.ts`:

```typescript
import { readFileSync, existsSync } from "node:fs";

export interface ScanResult {
  cssClasses: string[];
  customElements: string[];
  toMarkdown(projectName: string): string;
}

export function scanComponents(
  cssPath: string | null,
  jsPath: string | null
): ScanResult {
  const cssClasses: string[] = [];
  const customElements: string[] = [];

  if (cssPath && existsSync(cssPath)) {
    const css = readFileSync(cssPath, "utf-8");
    const classRegex = /^(\.[a-zA-Z_][\w-]*(?:\.[a-zA-Z_][\w-]*)*)\s*\{/gm;
    let match;
    while ((match = classRegex.exec(css)) !== null) {
      const cls = match[1];
      if (!cssClasses.includes(cls)) {
        cssClasses.push(cls);
      }
    }
  }

  if (jsPath && existsSync(jsPath)) {
    const js = readFileSync(jsPath, "utf-8");
    const ceRegex = /customElements\.define\(\s*["']([a-z][\w-]*)["']/g;
    let match;
    while ((match = ceRegex.exec(js)) !== null) {
      if (!customElements.includes(match[1])) {
        customElements.push(match[1]);
      }
    }
  }

  return {
    cssClasses,
    customElements,
    toMarkdown(projectName: string): string {
      let md = `# Component Reference — ${projectName}\n\n`;

      if (cssClasses.length > 0) {
        md += `## CSS Classes\n\n`;
        for (const cls of cssClasses) {
          md += `- \`${cls}\`\n`;
        }
        md += `\n`;
      }

      if (customElements.length > 0) {
        md += `## Custom Elements\n\n`;
        for (const el of customElements) {
          md += `- \`<${el}>\`\n`;
        }
        md += `\n`;
      }

      if (cssPath) {
        md += `## Usage\n\n`;
        md += "```html\n";
        if (cssPath) md += `<link rel="stylesheet" href="../components/components.css">\n`;
        if (jsPath) md += `<script src="../components/components.js"></script>\n`;
        md += "```\n";
      }

      return md;
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run build && npx vitest run tests/lib/scanner.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 6: Implement CLI setup command**

Create `src/cli/setup.ts`:

```typescript
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { loadConfig, saveConfig } from "../lib/config.js";
import { scanComponents } from "../lib/scanner.js";

function ask(rl: ReturnType<typeof createInterface>, question: string, defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${question} (${defaultValue}): `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

export async function runSetup(projectRoot: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const outputDir = await ask(rl, "? Output directory", "docs/html-spec");
    const localesStr = await ask(rl, "? Supported locales (comma-separated)", "en, ko");
    const locales = localesStr.split(",").map((l) => l.trim());
    const componentsPath = await ask(rl, "? Component library path (leave empty to skip)", "");
    const annotationEnabled = (await ask(rl, "? Enable annotations (yes/no)", "yes")) === "yes";

    const configPath = join(projectRoot, outputDir, "hyperspec.config.json");
    const config = loadConfig(configPath);

    config.outputDir = outputDir;
    config.locales = locales;
    config.annotation.enabled = annotationEnabled;

    if (componentsPath) {
      const absPath = resolve(projectRoot, componentsPath);
      const cssFile = join(absPath, "components.css");
      const jsFile = join(absPath, "components.js");

      const cssExists = existsSync(cssFile);
      const jsExists = existsSync(jsFile);

      if (!cssExists && !jsExists) {
        console.log(`⚠ No components.css or components.js found in ${componentsPath}`);
      } else {
        const result = scanComponents(
          cssExists ? cssFile : null,
          jsExists ? jsFile : null
        );
        console.log(`  → Found: ${result.cssClasses.length} CSS classes, ${result.customElements.length} custom elements`);

        const compDir = join(projectRoot, outputDir, "components");
        mkdirSync(compDir, { recursive: true });

        if (cssExists) copyFileSync(cssFile, join(compDir, "components.css"));
        if (jsExists) copyFileSync(jsFile, join(compDir, "components.js"));

        const refPath = join(compDir, "COMPONENT-REFERENCE.md");
        const projectName = projectRoot.split(/[\\/]/).pop() || "Project";
        writeFileSync(refPath, result.toMarkdown(projectName));
        console.log(`  → Generated: components/COMPONENT-REFERENCE.md`);

        config.components.css = cssExists ? "components/components.css" : null;
        config.components.js = jsExists ? "components/components.js" : null;
        config.components.reference = "components/COMPONENT-REFERENCE.md";
      }
    }

    saveConfig(configPath, config);
    console.log(`✓ Config saved to ${configPath}`);
  } finally {
    rl.close();
  }
}
```

- [ ] **Step 7: Register setup in CLI**

Add to `src/cli/index.ts`:

```typescript
import { runSetup } from "./setup.js";

// ...existing commands...

program
  .command("setup")
  .description("Interactive configuration wizard")
  .action(async () => {
    await runSetup(process.cwd());
  });
```

- [ ] **Step 8: Build and commit**

Run: `npm run build`

```bash
git add src/lib/scanner.ts src/cli/setup.ts src/cli/index.ts tests/lib/scanner.test.ts tests/fixtures/sample-components/
git commit -m "feat: component scanner and CLI setup command"
```

---

### Task 9: CLI Serve Command

**Files:**
- Create: `src/cli/serve.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Implement serve command**

Create `src/cli/serve.ts`:

```typescript
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { loadConfig } from "../lib/config.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const LIVE_RELOAD_SCRIPT = `
<script>
(function(){
  const es = new EventSource("/__hs_reload");
  es.onmessage = () => location.reload();
  es.onerror = () => setTimeout(() => location.reload(), 2000);
})();
</script>
`;

export async function runServe(
  projectRoot: string,
  options: { port?: number }
): Promise<void> {
  const config = loadConfig(
    join(projectRoot, "docs", "html-spec", "hyperspec.config.json")
  );
  const servePath = join(projectRoot, config.outputDir);
  const port = options.port || 4444;

  let clients: Array<import("node:http").ServerResponse> = [];

  const server = createServer((req, res) => {
    if (req.url === "/__hs_reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write("data: connected\n\n");
      clients.push(res);
      req.on("close", () => {
        clients = clients.filter((c) => c !== res);
      });
      return;
    }

    let filePath = join(servePath, req.url === "/" ? "index.html" : req.url!);

    if (!existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    if (statSync(filePath).isDirectory()) {
      filePath = join(filePath, "index.html");
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
    }

    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    let content = readFileSync(filePath);

    if (ext === ".html") {
      const html = content.toString("utf-8");
      const injected = html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`);
      content = Buffer.from(injected, "utf-8");
    }

    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  });

  // File watcher for live reload
  try {
    const { watch } = await import("chokidar");
    const watcher = watch(servePath, {
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../,
    });
    watcher.on("all", () => {
      for (const client of clients) {
        client.write("data: reload\n\n");
      }
    });
  } catch {
    console.log("(chokidar not available — live reload disabled)");
  }

  server.listen(port, () => {
    console.log(`✓ Serving ${servePath}`);
    console.log(`  → http://localhost:${port}`);
    console.log(`  Live reload enabled. Press Ctrl+C to stop.`);
  });
}
```

- [ ] **Step 2: Register serve in CLI**

Add to `src/cli/index.ts`:

```typescript
import { runServe } from "./serve.js";

// ...existing commands...

program
  .command("serve")
  .description("Start local preview server with live reload")
  .option("-p, --port <port>", "Port number", "4444")
  .action(async (options) => {
    await runServe(process.cwd(), { port: parseInt(options.port, 10) });
  });
```

- [ ] **Step 3: Build and test manually**

Run: `npm run build`

```bash
cd /tmp/test-project  # a project where init was already run
node /path/to/hyperspec/bin/hyperspec.js serve
# Open http://localhost:4444 in browser
```

Expected: portal page loads, live reload script injected.

- [ ] **Step 4: Commit**

```bash
git add src/cli/serve.ts src/cli/index.ts
git commit -m "feat: CLI serve command with live reload"
```

---

### Task 10: CLI Translate Command

**Files:**
- Create: `src/cli/translate.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Implement translate command**

Create `src/cli/translate.ts`:

```typescript
import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { loadConfig } from "../lib/config.js";
import { extractMetadata } from "../lib/manifest.js";

export async function runTranslate(
  projectRoot: string,
  file: string,
  options: { locale: string }
): Promise<void> {
  const config = loadConfig(
    join(projectRoot, "docs", "html-spec", "hyperspec.config.json")
  );
  const outputDir = join(projectRoot, config.outputDir);
  const filePath = join(outputDir, file);

  if (!existsSync(filePath)) {
    console.error(`✗ File not found: ${filePath}`);
    process.exit(1);
  }

  const html = readFileSync(filePath, "utf-8");
  const meta = extractMetadata(html);
  const locale = options.locale;
  const targetPath = `htmls/${locale}/${basename(file)}`;

  console.log(`\nTranslation prompt for your AI agent:\n`);
  console.log("─".repeat(60));
  console.log(`
Read the HTML file at: ${file}
Translate all human-readable text content to locale: ${locale}

Rules:
- Preserve all HTML structure, CSS, JS, and annotation module untouched
- Do NOT translate: code blocks, variable names, technical terms, CSS class names, HTML attributes
- DO translate: prose, headings, UI labels (Export Feedback → 피드백 내보내기, Comment → 코멘트), table headers, alt text
- Update the hyperspec-meta script tag: set "locale" to "${locale}"
- Save the translated file to: ${targetPath}
- Run: hyperspec index

Source document: ${meta?.title || file}
Source locale: ${meta?.locale || "en"}
Target locale: ${locale}
`.trim());
  console.log("─".repeat(60));
}
```

- [ ] **Step 2: Register in CLI**

Add to `src/cli/index.ts`:

```typescript
import { runTranslate } from "./translate.js";

// ...existing commands...

program
  .command("translate <file>")
  .description("Generate translation prompt for an HTML document")
  .requiredOption("--locale <code>", "Target locale code (e.g., ko)")
  .action(async (file, options) => {
    await runTranslate(process.cwd(), file, options);
  });
```

- [ ] **Step 3: Build and test**

Run: `npm run build`

```bash
node bin/hyperspec.js translate htmls/auth-spec.html --locale ko
```

Expected: prints translation prompt with rules and file paths.

- [ ] **Step 4: Commit**

```bash
git add src/cli/translate.ts src/cli/index.ts
git commit -m "feat: CLI translate command with agent prompt generation"
```

---

### Task 11: Claude Code Skill Files

**Files:**
- Create: `skills/claude-code/SKILL.md`
- Create: `skills/claude-code/commands/hyperspec.md`
- Create: `skills/claude-code/commands/hyperspec-feedback.md`
- Create: `skills/claude-code/commands/hyperspec-translate.md`

- [ ] **Step 1: Create SKILL.md**

Create `skills/claude-code/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Create /hyperspec command**

Create `skills/claude-code/commands/hyperspec.md`:

```markdown
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

1. Read `docs/html-spec/hyperspec.config.json` for settings
2. If `components.reference` exists, read it
3. Read source content (markdown file, or gather requirements interactively)
4. Generate HTML following the SKILL.md principles:
   - Rich structure: tables, code blocks, diagrams, interactive elements
   - Inject annotation module and base styles (per `assetMode`)
   - Include `hyperspec-meta` block with title, category, tags, dates, locale, version
5. Save to `docs/html-spec/htmls/<filename>.html`
6. Run `hyperspec index` to update manifest
7. Report the file path and suggest opening in browser
```

- [ ] **Step 3: Create /hyperspec-feedback command**

Create `skills/claude-code/commands/hyperspec-feedback.md`:

```markdown
---
description: Process annotation feedback from an HTML document and apply changes
allowed-tools: Read, Write, Edit, Bash(hyperspec:*), Glob, Grep
---

# Process HyperSpec Annotation Feedback

The user has pasted structured JSON feedback exported from a HyperSpec HTML document.

## Parse the feedback JSON

Expected format:
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

## Apply each annotation

1. Find the source HTML file in `docs/html-spec/htmls/`
2. Read the file
3. For each annotation:
   - `comment`: improve the referenced content based on the feedback
   - `modify`: replace `selectedText` with `suggestedChange`, informed by `comment`
   - `delete`: remove the content identified by `selectedText` + `section`
   - `insert`: add new content after `selectedText`, using `comment` as spec
4. Increment `version` in the hyperspec-meta block
5. Update the `updated` date
6. Save the file
7. Run `hyperspec index`
8. Summarize all changes made
```

- [ ] **Step 4: Create /hyperspec-translate command**

Create `skills/claude-code/commands/hyperspec-translate.md`:

```markdown
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
```

- [ ] **Step 5: Commit**

```bash
git add skills/
git commit -m "feat: Claude Code skill files — SKILL.md and slash commands"
```

---

### Task 12: Multi-Agent Skills

**Files:**
- Create: `skills/codex/AGENTS.md`
- Create: `skills/antigravity/skill.md`

- [ ] **Step 1: Create Codex AGENTS.md**

Create `skills/codex/AGENTS.md`:

```markdown
# HyperSpec — HTML Document Generation (Codex)

## Overview

Generate rich, annotatable HTML documents. Each HTML includes an annotation system where users select text, add comments, and export structured JSON feedback that you process to update the document.

## Generation Principles

1. Maximize information density — tables, SVG, code blocks, interactive elements
2. Visual clarity — tabs, collapsible sections, color coding
3. Self-contained — no CDN, local asset references or inline styles only
4. Include export buttons — "Copy as JSON", "Copy as Prompt"
5. Every HTML needs a `<script type="application/json" id="hyperspec-meta">` metadata block

## Metadata Block

```json
{
  "title": "Document Title",
  "category": "spec | review | report | tutorial | prototype",
  "tags": ["tag1"],
  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD",
  "locale": "en",
  "version": 1
}
```

## Asset Injection

Check `docs/html-spec/hyperspec.config.json` for `assetMode`:
- `reference`: `<link href="../assets/base.css">`, `<link href="../assets/annotate.css">`, `<script src="../assets/annotate.js">`
- `inline`: embed file contents directly

## Workflow

1. Read config at `docs/html-spec/hyperspec.config.json`
2. If `components.reference` is set, read the component reference
3. Generate HTML with annotation support
4. Save to `docs/html-spec/htmls/<name>.html`
5. Run `hyperspec index`

## Feedback Processing

When the user pastes annotation JSON, parse it and apply changes per annotation type (comment → improve, modify → replace, delete → remove, insert → add). Increment version, run `hyperspec index`.
```

- [ ] **Step 2: Create Antigravity skill.md**

Create `skills/antigravity/skill.md`:

```markdown
# HyperSpec — HTML Document Generation (Antigravity)

Generate rich, annotatable HTML documents for review and iterative refinement.

## Core Rules

- Every HTML includes annotation module (base.css, annotate.css, annotate.js)
- Every HTML includes `<script type="application/json" id="hyperspec-meta">` with title, category, tags, dates, locale, version
- Use tables, SVG, interactive elements for information density
- No CDN links — self-contained output only
- Check `docs/html-spec/hyperspec.config.json` for `assetMode` (reference vs inline) and component library settings
- Save output to `docs/html-spec/htmls/`
- Run `hyperspec index` after generating

## Annotation Feedback

Users export annotation JSON with types: comment, modify, delete, insert. Process each annotation against the source HTML, increment version, save, and re-index.
```

- [ ] **Step 3: Commit**

```bash
git add skills/codex/ skills/antigravity/
git commit -m "feat: Codex and Antigravity skill files"
```

---

### Task 13: CLI Install + npm Packaging

**Files:**
- Create: `src/cli/install.ts`
- Modify: `src/cli/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Implement install command**

Create `src/cli/install.ts`:

```typescript
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getSkillsDir(): string {
  return join(__dirname, "..", "..", "skills");
}

export async function runInstall(agent: string): Promise<void> {
  const skillsDir = getSkillsDir();
  const agentDir = join(skillsDir, agent === "claude-code" ? "claude-code" : agent);

  if (!existsSync(agentDir)) {
    const available = ["claude-code", "codex", "antigravity"];
    console.error(`✗ Unknown agent: ${agent}`);
    console.error(`  Available: ${available.join(", ")}`);
    process.exit(1);
  }

  if (agent === "claude-code") {
    const targetSkillDir = join(
      process.env.HOME || process.env.USERPROFILE || "~",
      ".claude",
      "skills",
      "hyperspec"
    );
    mkdirSync(targetSkillDir, { recursive: true });
    cpSync(agentDir, targetSkillDir, { recursive: true });
    console.log(`✓ HyperSpec skill installed to ${targetSkillDir}`);
    console.log(`  Slash commands: /hyperspec, /hyperspec-feedback, /hyperspec-translate`);
  } else if (agent === "codex") {
    const targetPath = join(process.cwd(), "AGENTS.md");
    if (existsSync(targetPath)) {
      console.log("⚠ AGENTS.md already exists. Merge manually from:");
      console.log(`  ${join(agentDir, "AGENTS.md")}`);
    } else {
      cpSync(join(agentDir, "AGENTS.md"), targetPath);
      console.log(`✓ HyperSpec AGENTS.md created at ${targetPath}`);
    }
  } else if (agent === "antigravity") {
    const targetPath = join(process.cwd(), ".antigravity", "skills", "hyperspec.md");
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(join(agentDir, "skill.md"), targetPath);
    console.log(`✓ HyperSpec skill installed to ${targetPath}`);
  }
}
```

- [ ] **Step 2: Register install command in CLI**

Add to `src/cli/index.ts`:

```typescript
import { runInstall } from "./install.js";

// ...existing commands...

program
  .command("install <agent>")
  .description("Install HyperSpec skill for an AI agent (claude-code, codex, antigravity)")
  .action(async (agent) => {
    await runInstall(agent);
  });

program
  .command("update <agent>")
  .description("Update HyperSpec skill files to latest version (alias for install)")
  .action(async (agent) => {
    await runInstall(agent);
  });
```

- [ ] **Step 3: Update package.json for distribution**

Ensure `package.json` has:

```json
{
  "name": "hyperspec",
  "version": "0.1.0",
  "description": "Annotatable HTML document generation plugin for AI coding agents",
  "type": "module",
  "bin": {
    "hyperspec": "./bin/hyperspec.js"
  },
  "files": [
    "bin/",
    "dist/",
    "assets/",
    "skills/"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["html", "annotation", "spec", "claude-code", "codex", "ai-agent", "hyperspec"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/kimsama/HyperSpec.git"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "commander": "^13.0.0",
    "chokidar": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 4: Build final package and run all tests**

Run:
```bash
npm run build
npm test
```

Expected: all tests pass, dist/ generated cleanly.

- [ ] **Step 5: Verify npx flow**

```bash
cd /tmp && mkdir npx-test && cd npx-test
node /path/to/hyperspec/bin/hyperspec.js init
node /path/to/hyperspec/bin/hyperspec.js index
node /path/to/hyperspec/bin/hyperspec.js --help
```

Expected: init creates structure, index generates manifest, help shows all commands.

- [ ] **Step 6: Commit**

```bash
git add src/cli/install.ts src/cli/index.ts package.json
git commit -m "feat: CLI install command and npm packaging"
```

---

### Task 14: Integration Test + Final Verification

**Files:**
- Create: `tests/integration/full-flow.test.ts`

- [ ] **Step 1: Write end-to-end integration test**

Create `tests/integration/full-flow.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "../../src/cli/init.js";
import { runIndex } from "../../src/cli/index-cmd.js";

describe("full flow", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hyperspec-e2e-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("init → add HTML → index → manifest has document", async () => {
    await runInit(tempDir);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><title>E2E Test</title></head>
<body>
<script type="application/json" id="hyperspec-meta">
{
  "title": "E2E Integration Test",
  "category": "spec",
  "tags": ["e2e", "test"],
  "created": "2026-05-25",
  "updated": "2026-05-25",
  "locale": "en",
  "version": 1
}
</script>
<link rel="stylesheet" href="../assets/base.css">
<link rel="stylesheet" href="../assets/annotate.css">
<h1>E2E Test Document</h1>
<p>This document tests the full HyperSpec flow.</p>
<script src="../assets/annotate.js"></script>
</body>
</html>`;

    writeFileSync(
      join(tempDir, "docs", "html-spec", "htmls", "e2e-test.html"),
      htmlContent
    );

    await runIndex(tempDir);

    const manifest = JSON.parse(
      readFileSync(
        join(tempDir, "docs", "html-spec", "manifest.json"),
        "utf-8"
      )
    );

    expect(manifest.documents).toHaveLength(1);
    expect(manifest.documents[0].title).toBe("E2E Integration Test");
    expect(manifest.documents[0].category).toBe("spec");
    expect(manifest.documents[0].tags).toEqual(["e2e", "test"]);
    expect(manifest.documents[0].path).toBe("htmls/e2e-test.html");
  });

  it("translation linking works across locales", async () => {
    await runInit(tempDir);

    const enHtml = `<!DOCTYPE html><html><body>
<script type="application/json" id="hyperspec-meta">
{"title":"Test Doc","category":"spec","tags":["test"],"created":"2026-05-25","updated":"2026-05-25","locale":"en","version":1}
</script></body></html>`;

    const koHtml = enHtml.replace('"locale":"en"', '"locale":"ko"');

    writeFileSync(
      join(tempDir, "docs", "html-spec", "htmls", "test-doc.html"),
      enHtml
    );
    writeFileSync(
      join(tempDir, "docs", "html-spec", "htmls", "ko", "test-doc.html"),
      koHtml
    );

    await runIndex(tempDir);

    const manifest = JSON.parse(
      readFileSync(
        join(tempDir, "docs", "html-spec", "manifest.json"),
        "utf-8"
      )
    );

    const enDoc = manifest.documents.find(
      (d: any) => d.locale === "en"
    );
    expect(enDoc.translations).toEqual({
      ko: "htmls/ko/test-doc.html",
    });
  });

  it("annotation assets are present after init", async () => {
    await runInit(tempDir);

    const assetsDir = join(tempDir, "docs", "html-spec", "assets");
    expect(existsSync(join(assetsDir, "annotate.js"))).toBe(true);
    expect(existsSync(join(assetsDir, "annotate.css"))).toBe(true);
    expect(existsSync(join(assetsDir, "base.css"))).toBe(true);
    expect(existsSync(join(assetsDir, "portal.js"))).toBe(true);
    expect(existsSync(join(assetsDir, "portal.css"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run full test suite**

Run: `npm run build && npm test`
Expected: ALL tests pass — config (3), init (4), manifest (4), index-cmd (2), scanner (4), integration (3) = 20 tests.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/
git commit -m "test: end-to-end integration tests for full HyperSpec flow"
```

- [ ] **Step 4: Final manual verification**

```bash
cd /tmp && rm -rf hyperspec-final && mkdir hyperspec-final && cd hyperspec-final
node /path/to/HyperSpec/bin/hyperspec.js init
# Manually create a rich HTML doc in docs/html-spec/htmls/
node /path/to/HyperSpec/bin/hyperspec.js index
node /path/to/HyperSpec/bin/hyperspec.js serve
# Open http://localhost:4444 — verify portal shows the document
# Click into the document — verify annotation toolbar works
# Select text, add annotations, click Export Feedback
# Paste the JSON output — verify it's structured correctly
```

- [ ] **Step 5: Final commit with all remaining files**

```bash
git add -A
git commit -m "chore: final integration verification"
```
