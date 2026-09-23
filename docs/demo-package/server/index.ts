import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { handleApiRequest } from "./handlers.ts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, "../dist")
const PORT = parseInt(process.env.PORT || "8443", 10)

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`)
  let filePath = path.join(DIST_DIR, decodeURIComponent(url.pathname))
  if (url.pathname.endsWith("/")) filePath = path.join(filePath, "index.html")
  if (!filePath.startsWith(DIST_DIR)) {
    res.statusCode = 403
    res.end("Forbidden")
    return true
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, "index.html")
  }
  const ext = path.extname(filePath)
  res.statusCode = 200
  res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream")
  fs.createReadStream(filePath).pipe(res)
  return true
}

const server = http.createServer(async (req, res) => {
  const handled = await handleApiRequest(req, res)
  if (handled) return
  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res)
    return
  }
  res.statusCode = 405
  res.end("Method Not Allowed")
})

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Restaurant API + static server running at http://localhost:${PORT}`)
})
