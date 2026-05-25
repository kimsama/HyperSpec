# HyperSpec

Annotatable HTML document generation for AI coding agents.

Agents generate rich, interactive HTML (tables, SVG, tabs, code blocks) instead of markdown. Users annotate in-browser, export structured JSON feedback, and paste it back — the agent applies changes and increments the version.

## Install

```bash
npm install -g hyperspec
```

## Quick Start

```bash
hyperspec init          # scaffold docs/html/ in your project
hyperspec serve         # preview at http://localhost:4444
hyperspec index         # rebuild manifest.json from htmls/
hyperspec setup         # register a component library
hyperspec install claude-code  # install agent skills
```

## Agent Usage

```
/hyperspec docs/spec.md          # convert markdown to HTML
/hyperspec                       # generate interactively
/hyperspec-feedback              # apply annotation JSON
/hyperspec-translate file --locale ko
```

## Documentation

| File | Description |
|------|-------------|
| [`CLAUDE.md`](CLAUDE.md) | Project instructions for AI agents |
| [`docs/00.Architecture.md`](docs/00.Architecture.md) | System architecture and data flows |
| [`docs/01.FileStructure.md`](docs/01.FileStructure.md) | Repository layout with file descriptions |
| [`docs/superpowers/specs/`](docs/superpowers/specs/) | Design specification |
| [`docs/superpowers/plans/`](docs/superpowers/plans/) | Implementation plan |

## License

MIT
