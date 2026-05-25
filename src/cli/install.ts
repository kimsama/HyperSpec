import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the skills directory. In the compiled output (dist/), __dirname is
 * dist/ so ../skills points to the project root skills/. In tests running
 * source directly, __dirname is src/cli/ so we walk up until we find skills/.
 */
function getSkillsDir(): string {
  // Try the compiled path first: dist/ -> ../skills
  const compiled = resolve(__dirname, "..", "skills");
  if (existsSync(join(compiled, "claude-code"))) return compiled;

  // Walk up from __dirname to find the skills/ directory (test / dev scenario)
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, "skills");
    if (existsSync(join(candidate, "claude-code"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback to the expected compiled path
  return compiled;
}

export async function runInstall(agent: string): Promise<void> {
  const skillsDir = getSkillsDir();
  const available = ["claude-code", "codex", "antigravity"];

  if (!available.includes(agent)) {
    console.error(`✗ Unknown agent: ${agent}\n  Available: ${available.join(", ")}`);
    process.exit(1);
  }

  if (agent === "claude-code") {
    // Copy skills/claude-code/ to ~/.claude/skills/hyperspec/
    const home = process.env.HOME || process.env.USERPROFILE || "~";
    const targetDir = join(home, ".claude", "skills", "hyperspec");
    mkdirSync(targetDir, { recursive: true });
    cpSync(join(skillsDir, "claude-code"), targetDir, { recursive: true });
    console.log(`✓ HyperSpec skill installed to ${targetDir}`);
    console.log(`  Slash commands: /hyperspec, /hyperspec-feedback, /hyperspec-translate`);
  } else if (agent === "codex") {
    // Copy skills/codex/AGENTS.md to cwd
    const targetPath = join(process.cwd(), "AGENTS.md");
    if (existsSync(targetPath)) {
      console.log(`⚠ AGENTS.md already exists. Merge manually from:\n  ${join(skillsDir, "codex", "AGENTS.md")}`);
    } else {
      cpSync(join(skillsDir, "codex", "AGENTS.md"), targetPath);
      console.log(`✓ HyperSpec AGENTS.md created at ${targetPath}`);
    }
  } else if (agent === "antigravity") {
    const targetPath = join(process.cwd(), ".antigravity", "skills", "hyperspec.md");
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(join(skillsDir, "antigravity", "skill.md"), targetPath);
    console.log(`✓ HyperSpec skill installed to ${targetPath}`);
  }
}
