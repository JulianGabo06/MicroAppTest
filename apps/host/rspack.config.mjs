import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';
import { withRozenite } from '@rozenite/repack';

const require = createRequire(import.meta.url);
const { getSharedDependencies } = require('@microapps/shared');
const { UniwindRspackPlugin } = require('@microapps/uniwind-rspack');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dónde busca el host a los remotes. En un teléfono físico por Wi-Fi: la IP del PC
// (p. ej. MF_REMOTES_HOST=192.168.1.10 al compilar el release). Ver docs/12-build-android.md.
const REMOTES_HOST = process.env.MF_REMOTES_HOST ?? 'localhost';

const ROZENITE_PLUGINS = ['@rozenite/network-activity-plugin', '@rozenite/react-navigation-plugin'];
const ROZENITE_NOOP = path.join(__dirname, 'devtools/rozenite-noop.js');

/**
 * Host = shell nativo.
 * Carga las mini apps en runtime vía Module Federation (Re.Pack).
 *
 * Puertos en desarrollo:
 * - host:    8081
 * - catalog: 9001
 * - profile: 9002
 *
 * Rozenite (paneles extra en React Native DevTools) añade un middleware al dev server
 * (desactivar con WITH_ROZENITE=false). En producción los plugins se sustituyen por no-ops
 * para que su código no entre al bundle.
 */
export default withRozenite(
  Repack.defineRspackConfig(({ mode, platform }) => {
    return {
      mode,
      context: __dirname,
      entry: './index.js',
      resolve: {
        ...Repack.getResolveOptions({ enablePackageExports: true }),
        alias:
          mode === 'production'
            ? Object.fromEntries(ROZENITE_PLUGINS.map((name) => [`${name}$`, ROZENITE_NOOP]))
            : {},
      },
      // Peers opcionales del plugin de red de Rozenite (se cargan dentro de try/catch).
      ignoreWarnings: [/react-native-nitro-fetch|react-native-sse/],
      output: {
        uniqueName: 'host',
      },
      module: {
        rules: [
          {
            test: /\.[cm]?[jt]sx?$/,
            use: {
              loader: '@callstack/repack/babel-swc-loader',
              parallel: false,
              options: { hideParallelModeWarning: true },
            },
            type: 'javascript/auto',
          },
          ...Repack.getAssetTransformRules(),
        ],
      },
      plugins: [
        new Repack.RepackPlugin(),
        new ExpoModulesPlugin(),
        new UniwindRspackPlugin({ cssEntryFile: './global.css', platform }),
        new Repack.plugins.ModuleFederationPluginV2({
          name: 'host',
          filename: 'host.container.js.bundle',
          dts: false,
          remotes: {
            catalog: `catalog@http://${REMOTES_HOST}:9001/${platform}/mf-manifest.json`,
            profile: `profile@http://${REMOTES_HOST}:9002/${platform}/mf-manifest.json`,
          },
          shared: getSharedDependencies(true),
        }),
      ],
    };
  }),
  { enabled: process.env.WITH_ROZENITE !== 'false' },
);
