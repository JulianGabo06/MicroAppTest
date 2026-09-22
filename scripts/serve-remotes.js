/**
 * Sirve los bundles de PRODUCCIÓN de las micro apps (repos hermanos) para un host release
 * instalado en un teléfono de la misma red. Escucha en todas las interfaces.
 *
 *   npm run remotes:build   # compila catalog y profile (android)
 *   npm run remotes:serve   # :9001 catalog, :9002 profile
 *
 * El host pide `http://<ip>:<puerto>/<platform>/mf-manifest.json` y Re.Pack resuelve los
 * chunks relativos a esa URL, así que todo se sirve bajo `/<platform>/`.
 */
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const projects = path.resolve(__dirname, '../..');
const REMOTES = [
  { name: 'catalog', port: 9001, dir: path.join(projects, 'microapp-catalog') },
  { name: 'profile', port: 9002, dir: path.join(projects, 'microapp-profile') },
];

const CONTENT_TYPES = {
  '.json': 'application/json',
  '.bundle': 'application/javascript',
  '.map': 'application/json',
};

function resolveFile(remoteDir, platform, file) {
  if (file === 'mf-manifest.json' || file === 'mf-stats.json') {
    return path.join(remoteDir, 'build/generated', platform, file);
  }
  return path.join(remoteDir, 'build', platform, 'remote', file);
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
}

for (const remote of REMOTES) {
  const manifest = resolveFile(remote.dir, 'android', 'mf-manifest.json');
  if (!fs.existsSync(manifest)) {
    console.warn(
      `⚠ ${remote.name}: no hay build de producción (${manifest}). Corre: npm run remotes:build`,
    );
  }

  http
    .createServer((req, res) => {
      const [, platform, ...rest] = decodeURIComponent(req.url.split('?')[0]).split('/');
      const file = rest.join('/');
      const valid = ['android', 'ios'].includes(platform) && file && !file.includes('..');
      const filePath = valid ? resolveFile(remote.dir, platform, file) : null;

      if (!filePath || !fs.existsSync(filePath)) {
        console.log(`[${remote.name}] 404 ${req.url}`);
        res.writeHead(404).end('Not found');
        return;
      }

      console.log(`[${remote.name}] 200 ${req.url}`);
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    })
    .listen(remote.port, '0.0.0.0', () => {
      const urls = lanAddresses().map(
        (ip) => `http://${ip}:${remote.port}/android/mf-manifest.json`,
      );
      console.log(`✓ ${remote.name} → ${urls.join('  ')}`);
    });
}
