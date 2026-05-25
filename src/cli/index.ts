import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInit } from "./init.js";
import { runIndex } from "./index-cmd.js";
import { runSetup } from "./setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("hyperspec")
  .description("Annotatable HTML document generation for AI coding agents")
  .version(pkg.version);

program
  .command("init")
  .description("Initialize HyperSpec in the current project")
  .action(async () => { await runInit(process.cwd()); });

program
  .command("index")
  .description("Scan HTML files and generate manifest.json")
  .action(async () => { await runIndex(process.cwd()); });

program
  .command("setup")
  .description("Interactive configuration wizard")
  .action(async () => { await runSetup(process.cwd()); });

program.parse();
