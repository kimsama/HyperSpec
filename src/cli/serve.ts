import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import type { ServerResponse } from "node:http";
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

const LIVE_RELOAD_SCRIPT = `<script>(function(){var es=new EventSource("/__hs_reload");es.onmessage=function(){location.reload()};es.onerror=function(){setTimeout(function(){location.reload()},2000)}})();</script>`;

export async function runServe(projectRoot: string, options: { port?: number }): Promise<void> {
  const config = loadConfig(join(projectRoot, "docs", "html-spec", "hyperspec.config.json"));
  const servePath = join(projectRoot, config.outputDir);
  const port = options.port || 4444;
  let clients: Array<ServerResponse> = [];

  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    // SSE endpoint for live reload
    if (url === "/__hs_reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write(": connected\n\n");
      clients.push(res);
      req.on("close", () => {
        clients = clients.filter((c) => c !== res);
      });
      return;
    }

    // Resolve file path
    let filePath = join(servePath, url.split("?")[0]);

    // Directory → index.html fallback
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    if (!existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] ?? "application/octet-stream";

    try {
      let content: string | Buffer = readFileSync(filePath);

      // Inject live reload script into HTML files
      if (ext === ".html") {
        const html = content.toString("utf-8");
        const injected = html.includes("</body>")
          ? html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`)
          : html + LIVE_RELOAD_SCRIPT;
        content = injected;
      }

      res.writeHead(200, { "Content-Type": mimeType });
      res.end(content);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("500 Internal Server Error");
    }
  });

  // File watcher using chokidar (dynamic import, graceful fallback)
  try {
    const chokidar = await import("chokidar");
    const watcher = chokidar.watch(servePath, {
      ignoreInitial: true,
      ignored: /(^|[/\\])\../,
    });

    const notifyClients = () => {
      for (const client of clients) {
        try {
          client.write("data: reload\n\n");
        } catch {
          // Client already disconnected; ignore
        }
      }
    };

    watcher.on("change", notifyClients);
    watcher.on("add", notifyClients);
    watcher.on("unlink", notifyClients);
  } catch {
    console.warn("  Warning: chokidar not available, live reload disabled.");
  }

  server.listen(port, () => {
    console.log(`✓ Serving ${servePath}`);
    console.log(`  → http://localhost:${port}`);
    console.log(`  Live reload enabled. Press Ctrl+C to stop.`);
  });
}
