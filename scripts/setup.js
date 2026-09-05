/**
 * Setup inicial del monorepo (post-clone).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, shell: true });
}

function tryRun(cmd) {
  try {
    run(cmd);
    return true;
  } catch {
    console.warn(`⚠ No se pudo ejecutar: ${cmd}`);
    return false;
  }
}

console.log('=== MicroApps setup ===');

if (!fs.existsSync(path.join(root, 'node_modules'))) {
  run('npm install');
} else {
  console.log('✓ node_modules presente (si algo falla: borra node_modules y package-lock, luego npm install)');
}

console.log('\n--- Docker / Floci (S3 local) ---');
if (tryRun('docker compose up -d')) {
  console.log('Esperando a que Floci responda…');
  let ok = false;
  for (let i = 0; i < 15; i++) {
    try {
      execSync('curl -sf http://localhost:4566/_floci/health', {
        stdio: 'ignore',
        cwd: root,
        shell: true,
      });
      ok = true;
      break;
    } catch {
      execSync(process.platform === 'win32' ? 'timeout /t 2 /nobreak >nul' : 'sleep 2', {
        stdio: 'ignore',
        shell: true,
      });
    }
  }
  if (ok) {
    tryRun('npm run s3:create-bucket');
  } else {
    console.warn('Floci aún no responde. Luego: npm run s3:create-bucket');
  }
} else {
  console.warn('Instala Docker Desktop y luego: npm run docker:up && npm run s3:create-bucket');
}

console.log(`
=== Siguiente ===

1) Generar nativo del host (una vez por máquina):
   npm run prebuild

2) Bundlers Re.Pack (3 procesos):
   npm start

3) Emulador (otra terminal):
   npm run android
   # o: npm run ios

Android emulator — si no carga remotes:
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:9001 tcp:9001
   adb reverse tcp:9002 tcp:9002

README.md = guía pública
docs/     = notas de estudio (Julián)
`);
