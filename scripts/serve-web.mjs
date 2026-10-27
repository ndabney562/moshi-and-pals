import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Strict static hosting: supports Pages' repository subpath and iOS' root layout without SPA fallbacks. */
export async function serveWeb({ port = 4173, host = '127.0.0.1', root = resolve('dist') } = {}) {
  let online = true;
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.css': 'text/css' };
  const httpServer = createServer(async (request, response) => {
    if (!online) { request.socket.destroy(); return; }
    try {
      const url = new URL(request.url, `http://${host}`);
      const path = decodeURIComponent(url.pathname).replace(/^\/moshi-and-pals(?=\/|$)/, '');
      const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
      if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((done, reject) => { httpServer.once('error', reject); httpServer.listen(port, host, done); });
  const address = httpServer.address();
  return { httpServer, url: `http://${host}:${address.port}/moshi-and-pals/`, setOnline: (value) => { online = value; } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const portIndex = process.argv.indexOf('--port');
  const server = await serveWeb({ port: portIndex < 0 ? 4173 : Number(process.argv[portIndex + 1]) });
  console.log(`Local web bundle: ${server.url}`);
}
