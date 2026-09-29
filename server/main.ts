import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";

const app = await createApp();
const port = Number(process.env.PORT ?? 3000);
const web = new URL("../dist/", import.meta.url);
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

/** The built web app (npm run build); every unknown path gets index.html. */
async function serveWeb(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/^\/+/, "");
  for (const file of [path, "index.html"]) {
    if (!file || file.includes("..")) continue;
    try {
      const body = await readFile(new URL(file, web));
      return new Response(body, {
        headers: {
          "content-type": types[extname(file)] ?? "application/octet-stream",
        },
      });
    } catch {
      // Fall through to the app shell.
    }
  }
  return new Response("Run `npm run build` to serve the web app.", {
    status: 404,
  });
}

const listener = serve({
  port,
  fetch: (request) =>
    new URL(request.url).pathname.startsWith("/api")
      ? app.fetch(request)
      : serveWeb(request),
}, () => {
  console.log(`Compass Mini on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    listener.close();
    void app.close().finally(() => process.exit(0));
  });
}
