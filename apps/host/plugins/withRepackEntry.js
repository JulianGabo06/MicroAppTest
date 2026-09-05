const {
  withMainApplication,
  withAppDelegate,
  withDangerousMod,
  createRunOncePlugin,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Re.Pack sirve el bundle como `index.bundle`.
 * Expo por defecto pide `.expo/.virtual-metro-entry` → 404 con Re.Pack.
 * Este plugin fija jsMainModulePath / bundle root a `index` tras `expo prebuild`.
 */
function ensureAndroidJsEntry(contents) {
  if (contents.includes('jsMainModulePath = "index"') || contents.includes("jsMainModulePath = 'index'")) {
    return contents;
  }

  // Caso típico Expo SDK 53+: getDefaultReactHost( context = ..., packageList = ... )
  if (contents.includes('ExpoReactHostFactory.getDefaultReactHost')) {
    const patched = contents.replace(
      /(packageList\s*=\s*PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?\n\s*\})/,
      '$1,\n      // Re.Pack entry (no usar .expo/.virtual-metro-entry)\n      jsMainModulePath = "index"',
    );
    if (patched !== contents) {
      return patched;
    }
  }

  return contents;
}

function ensureIosJsEntry(contents) {
  if (!contents.includes('.expo/.virtual-metro-entry')) {
    return contents;
  }
  return contents
    .replaceAll('".expo/.virtual-metro-entry"', '"index"')
    .replaceAll("'.expo/.virtual-metro-entry'", "'index'");
}

function ensureGradleWindowsSsl(contents) {
  if (contents.includes('Windows-ROOT')) {
    return contents;
  }

  const sslBlock = [
    '# Windows + antivirus/proxy: usa el trust store del sistema (evita PKIX en Maven)',
    'org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NUL',
    'systemProp.javax.net.ssl.trustStoreType=Windows-ROOT',
    'systemProp.javax.net.ssl.trustStore=NUL',
    '',
  ].join('\n');

  if (/^org\.gradle\.jvmargs=.+$/m.test(contents)) {
    return contents.replace(/^org\.gradle\.jvmargs=.+$/m, sslBlock.trimEnd());
  }

  return `${sslBlock}\n${contents}`;
}

function withRepackEntry(config) {
  config = withMainApplication(config, (cfg) => {
    cfg.modResults.contents = ensureAndroidJsEntry(cfg.modResults.contents);
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    cfg.modResults.contents = ensureIosJsEntry(cfg.modResults.contents);
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const gradlePropsPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'gradle.properties',
      );
      if (fs.existsSync(gradlePropsPath)) {
        const current = fs.readFileSync(gradlePropsPath, 'utf8');
        fs.writeFileSync(gradlePropsPath, ensureGradleWindowsSsl(current));
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(
  withRepackEntry,
  'with-repack-entry',
  '1.0.0',
);
