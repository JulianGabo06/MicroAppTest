/**
 * Setup inicial del host (post-clone).
 * Las mini apps viven en repos hermanos: ../microapp-catalog y ../microapp-profile.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalogRoot = path.resolve(root, '../microapp-catalog');
const profileRoot = path.resolve(root, '../microapp-profile');

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd, shell: true });
}

function tryRun(cmd, cwd = root) {
  try {
    run(cmd, cwd);
    return true;
  } catch {
    console.warn(`⚠ No se pudo ejecutar: ${cmd}`);
    return false;
  }
}

console.log('=== MicroApps host setup ===');

if (!fs.existsSync(path.join(root, 'node_modules'))) {
  run('npm install');
} else {
  console.log(
    '✓ node_modules presente (si algo falla: borra node_modules y package-lock, luego npm install)',
  );
}

console.log('\n--- Repos de mini apps (hermanos) ---');
for (const [name, dir] of [
  ['microapp-catalog', catalogRoot],
  ['microapp-profile', profileRoot],
]) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠ No encontré ${name} en ${dir}`);
    console.warn('  Clona o crea el repo junto a MicroApps (ver docs/06-agregar-microapp-repo.md)');
    continue;
  }
  console.log(`✓ ${name} → ${dir}`);
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    tryRun('npm install', dir);
  } else {
    console.log(`  node_modules OK`);
  }
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

2) Bundlers (host + remotes hermanos):
   npm start
   # o por separado:
   #   npm run start:host
   #   npm run start:catalog
   #   npm run start:profile

3) Emulador (otra terminal):
   npm run android
   # o: npm run ios

4) Lint (Biome):
   npm run lint

Android emulator — si no carga remotes:
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:9001 tcp:9001
   adb reverse tcp:9002 tcp:9002

Layout esperado:
  Proyectos/
  ├── MicroApps/            ← este repo (host)
  ├── microapp-catalog/
  └── microapp-profile/

README.md = guía pública
docs/     = notas de estudio
`);
