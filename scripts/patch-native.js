/**
 * Verifica (y re-aplica si hace falta) los cambios nativos que Re.Pack necesita
 * después de `expo prebuild`. Seguro de correr varias veces.
 */
const fs = require('fs');
const path = require('path');

const hostRoot = path.join(__dirname, '..', 'apps', 'host');

function patchFile(filePath, transform, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭  ${label}: no existe aún (${path.relative(process.cwd(), filePath)})`);
    return;
  }
  const before = fs.readFileSync(filePath, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`✓  ${label}: OK`);
    return;
  }
  fs.writeFileSync(filePath, after);
  console.log(`✓  ${label}: parcheado`);
}

function ensureAndroidJsEntry(contents) {
  if (contents.includes('jsMainModulePath = "index"')) return contents;
  return contents.replace(
    /(packageList\s*=\s*PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?\n\s*\})/,
    '$1,\n      // Re.Pack entry (no usar .expo/.virtual-metro-entry)\n      jsMainModulePath = "index"',
  );
}

function ensureIosJsEntry(contents) {
  if (!contents.includes('.expo/.virtual-metro-entry')) return contents;
  return contents
    .replaceAll('".expo/.virtual-metro-entry"', '"index"')
    .replaceAll("'.expo/.virtual-metro-entry'", "'index'");
}

function ensureGradleWindowsSsl(contents) {
  if (contents.includes('Windows-ROOT')) return contents;
  const sslBlock = [
    '# Windows + antivirus/proxy: usa el trust store del sistema (evita PKIX en Maven)',
    'org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NUL',
    'systemProp.javax.net.ssl.trustStoreType=Windows-ROOT',
    'systemProp.javax.net.ssl.trustStore=NUL',
  ].join('\n');
  if (/^org\.gradle\.jvmargs=.+$/m.test(contents)) {
    return contents.replace(/^org\.gradle\.jvmargs=.+$/m, sslBlock);
  }
  return `${sslBlock}\n\n${contents}`;
}

function findMainApplication() {
  const base = path.join(hostRoot, 'android', 'app', 'src', 'main', 'java');
  if (!fs.existsSync(base)) return null;
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) stack.push(full);
      else if (name === 'MainApplication.kt' || name === 'MainApplication.java') {
        return full;
      }
    }
  }
  return null;
}

function findAppDelegate() {
  const ios = path.join(hostRoot, 'ios');
  if (!fs.existsSync(ios)) return null;
  const stack = [ios];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && name !== 'Pods' && name !== 'build') stack.push(full);
      else if (name === 'AppDelegate.swift' || name === 'AppDelegate.mm' || name === 'AppDelegate.m') {
        return full;
      }
    }
  }
  return null;
}

console.log('Parcheando nativo para Re.Pack…');

const mainApp = findMainApplication();
if (mainApp) {
  patchFile(mainApp, ensureAndroidJsEntry, 'Android MainApplication jsMainModulePath');
} else {
  console.log('⏭  Android aún no generado — corre: npm run prebuild');
}

const appDelegate = findAppDelegate();
if (appDelegate) {
  patchFile(appDelegate, ensureIosJsEntry, 'iOS AppDelegate bundle root');
}

patchFile(
  path.join(hostRoot, 'android', 'gradle.properties'),
  ensureGradleWindowsSsl,
  'Android gradle.properties (SSL Windows)',
);

console.log('Listo.');
