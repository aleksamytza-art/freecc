/**
 * Zero-dependency static server for the FREECC UI.
 *
 *   npm start            -> http://127.0.0.1:8080
 *   PORT=3000 npm start  -> http://127.0.0.1:3000
 *
 * The app also runs straight from disk (file://), because it has no fetch(),
 * no modules and no external requests — this server just gives you a URL that
 * behaves the same way the deployed GitHub Pages site does.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let rel = normalize(urlPath).replace(/^([/\\])+/, '');
  if (rel === '' || rel === '.') rel = 'index.html';

  const target = resolve(join(ROOT, rel));
  // Path-traversal guard: never serve outside the app root.
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('403 forbidden');
  }

  let path = target;
  try {
    if (statSync(path).isDirectory()) path = join(path, 'index.html');
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('404 not found');
  }

  let size;
  try {
    size = statSync(path).size;
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('404 not found');
  }

  res.writeHead(200, {
    'content-type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(path).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`FREECC UI  ->  http://${HOST}:${PORT}/`);
  console.log(`serving    ${ROOT}`);
  console.log('ctrl-c to stop');
});
