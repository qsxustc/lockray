import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { projectRoot, isSiteFile } from "./site-files.js";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "Usage: node scripts/serve.js [--dist]\nServes only public app files on http://127.0.0.1:4173. Set PORT to override.",
  );
  process.exit(0);
}
if (args.some((arg) => arg !== "--dist"))
  throw new Error("Unknown option. Use --help for usage.");
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be an integer from 1 to 65535.");
const root = await realpath(
  path.join(projectRoot, args.includes("--dist") ? "dist" : "."),
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
};
const server = http.createServer(async (request, response) => {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  const reply = (status, body, extra = {}) => {
    response.writeHead(status, {
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
      ...extra,
    });
    response.end(request.method === "HEAD" ? undefined : body);
  };
  if (!["GET", "HEAD"].includes(request.method))
    return reply(405, "Method not allowed\n", { Allow: "GET, HEAD" });
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const name = pathname === "/" ? "index.html" : pathname.slice(1);
    if (name.includes("\\") || name.includes("\0") || !isSiteFile(name))
      return reply(404, "Not found\n");
    const target = await realpath(path.join(root, name));
    if (
      !target.startsWith(`${root}${path.sep}`) ||
      !(await stat(target)).isFile()
    )
      return reply(404, "Not found\n");
    const contents = await readFile(target);
    response.writeHead(200, {
      ...headers,
      "Content-Type": mime[path.extname(target)] ?? "application/octet-stream",
      "Content-Length": contents.length,
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    if (error instanceof URIError) return reply(400, "Malformed path\n");
    if (error.code === "ENOENT" || error.code === "ENOTDIR")
      return reply(404, "Not found\n");
    console.error(error.message);
    reply(500, "Unable to read file\n");
  }
});
server.on("error", (error) => {
  console.error(`Cannot start server: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Lockray is ready at http://127.0.0.1:${port}${args.includes("--dist") ? " (dist)" : ""}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
