import { readFileSync, existsSync } from "node:fs";

export interface ScanResult {
  cssClasses: string[];
  customElements: string[];
  toMarkdown(projectName: string): string;
}

export function scanComponents(cssPath: string | null, jsPath: string | null): ScanResult {
  const cssClasses: string[] = [];
  const customElements: string[] = [];

  // Parse CSS: extract unique class selectors from rule declarations
  if (cssPath && existsSync(cssPath)) {
    const cssContent = readFileSync(cssPath, "utf-8");
    const cssRegex = /^(\.[a-zA-Z_][\w-]*(?:\.[a-zA-Z_][\w-]*)*)\s*\{/gm;
    let match: RegExpExecArray | null;
    while ((match = cssRegex.exec(cssContent)) !== null) {
      const selector = match[1];
      if (!cssClasses.includes(selector)) {
        cssClasses.push(selector);
      }
    }
  }

  // Parse JS: extract custom element names from customElements.define() calls
  if (jsPath && existsSync(jsPath)) {
    const jsContent = readFileSync(jsPath, "utf-8");
    const jsRegex = /customElements\.define\(\s*["']([a-z][\w-]*)["']/g;
    let match: RegExpExecArray | null;
    while ((match = jsRegex.exec(jsContent)) !== null) {
      const elementName = match[1];
      if (!customElements.includes(elementName)) {
        customElements.push(elementName);
      }
    }
  }

  return {
    cssClasses,
    customElements,
    toMarkdown(projectName: string): string {
      const lines: string[] = [];

      lines.push(`# Component Reference — ${projectName}`);
      lines.push("");

      lines.push("## CSS Classes");
      if (cssClasses.length > 0) {
        for (const cls of cssClasses) {
          lines.push(`- \`${cls}\``);
        }
      } else {
        lines.push("No CSS classes found.");
      }
      lines.push("");

      lines.push("## Custom Elements");
      if (customElements.length > 0) {
        for (const el of customElements) {
          lines.push(`- \`<${el}>\``);
        }
      } else {
        lines.push("No custom elements found.");
      }
      lines.push("");

      lines.push("## Usage");
      lines.push("```html");
      if (cssPath) {
        lines.push(`<link rel="stylesheet" href="components/components.css">`);
      }
      if (jsPath) {
        lines.push(`<script type="module" src="components/components.js"></script>`);
      }
      lines.push("```");
      lines.push("");

      return lines.join("\n");
    },
  };
}
