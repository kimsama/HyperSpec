import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInit } from "./init.js";
import { runIndex } from "./index-cmd.js";
import { runSetup } from "./setup.js";
import { runServe } from "./serve.js";
import { runTranslate } from "./translate.js";

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

program
  .command("serve")
  .description("Start local preview server with live reload")
  .option("-p, --port <port>", "Port number", "4444")
  .action(async (options) => { await runServe(process.cwd(), { port: parseInt(options.port, 10) }); });

program
  .command("translate <file>")
  .description("Generate translation prompt for an HTML document")
  .requiredOption("--locale <code>", "Target locale code (e.g., ko)")
  .action(async (file, options) => { await runTranslate(process.cwd(), file, options); });

program.parse();
