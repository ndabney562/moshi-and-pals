import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

/** A real transport outage: lets service-worker fetch fail without WebKit's offline-emulation navigation error. */
export async function offlineServer() {
  const root = resolve('dist');
  let online = true;
  const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
  const server = createServer(async (request, response) => {
    if (!online) { request.socket.destroy(); return; }
    const path = new URL(request.url!, 'http://localhost').pathname;
    if (!path.startsWith('/moshi-and-pals/')) { response.writeHead(404).end(); return; }
    const file = resolve(root, path.slice('/moshi-and-pals/'.length) || 'index.html');
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    try {
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a local TCP address');
  return {
    url: `http://127.0.0.1:${address.port}/moshi-and-pals/`,
    disconnect: () => { online = false; },
    close: () => new Promise<void>((done, reject) => {
      server.close((error) => error ? reject(error) : done());
      server.closeAllConnections();
    }),
  };
}
