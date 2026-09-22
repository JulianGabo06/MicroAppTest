/**
 * Genera un APK release del host instalable en un teléfono físico.
 *
 *   npm run android:release                      # IP del Wi-Fi detectada automáticamente
 *   npm run android:release -- --host 192.168.1.10
 *   ANDROID_ARCHS=arm64-v8a,armeabi-v7a npm run android:release
 *
 * - El JS del host va embebido (Re.Pack, modo producción).
 * - Los remotes se cargan de http://<host>:9001 / :9002 → servirlos con `npm run remotes:serve`.
 * - Firmado con la clave debug de Android: sirve para instalar por fuera de la tienda.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const hostDir = path.join(root, 'apps/host');
const androidDir = path.join(hostDir, 'android');

function detectLanIp() {
  const candidates = Object.entries(os.networkInterfaces()).flatMap(([name, nets]) =>
    (nets ?? [])
      .filter((net) => net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254'))
      .map((net) => ({ name, address: net.address })),
  );
  const wifi = candidates.find(({ name }) => /wi-?fi|wlan|wireless/i.test(name));
  return (wifi ?? candidates[0])?.address;
}

const hostArgIndex = process.argv.indexOf('--host');
const remotesHost =
  (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) ||
  process.env.MF_REMOTES_HOST ||
  detectLanIp();

if (!remotesHost) {
  console.error('✗ No se pudo detectar la IP. Usa: npm run android:release -- --host <ip-del-pc>');
  process.exit(1);
}

const archs = process.env.ANDROID_ARCHS || 'arm64-v8a';
const env = { ...process.env, MF_REMOTES_HOST: remotesHost };
const run = (cmd, cwd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, env, stdio: 'inherit', shell: true });
};

console.log(`Remotes: http://${remotesHost}:9001 (catalog), http://${remotesHost}:9002 (profile)`);
console.log(`ABIs: ${archs}`);

// Aplica los config plugins (Re.Pack en el release, HTTP en claro) y los parches nativos.
run('npx expo prebuild --platform android --no-install', hostDir);
run('node scripts/patch-native.js', root);

/**
 * Windows: la compilación C++ (ninja) falla con rutas de más de 260 caracteres, y este repo
 * vive en una ruta larga. Se compila desde una unidad virtual (`subst`) que apunta a la raíz.
 */
function withShortRoot(fn) {
  if (process.platform !== 'win32') return fn(root);
  const drive = ['X', 'Y', 'Z', 'W', 'V', 'U'].find((letter) => !fs.existsSync(`${letter}:\\`));
  if (!drive) return fn(root);
  execSync(`subst ${drive}: "${root}"`);
  try {
    return fn(`${drive}:\\`);
  } finally {
    execSync(`subst ${drive}: /d`);
  }
}

withShortRoot((base) => {
  const dir = path.join(base, 'apps/host/android');
  const gradlew = path.join(dir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  run(`"${gradlew}" assembleRelease --no-daemon -PreactNativeArchitectures=${archs}`, dir);
});

const apk = path.join(androidDir, 'app/build/outputs/apk/release/app-release.apk');
const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, 'microapps-host-release.apk');
fs.copyFileSync(apk, target);

console.log(`
✓ APK: ${target}

Instalar:  adb install -r "${target}"   (o copiar el .apk al teléfono y abrirlo)
Remotes:   npm run remotes:build && npm run remotes:serve   (en este PC, misma Wi-Fi)
`);
