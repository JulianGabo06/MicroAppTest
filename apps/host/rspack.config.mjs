import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';

const require = createRequire(import.meta.url);
const { getSharedDependencies } = require('@microapps/shared');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Host = shell nativo.
 * Carga las mini apps en runtime vía Module Federation (Re.Pack).
 *
 * Puertos en desarrollo:
 * - host:    8081
 * - catalog: 9001
 * - profile: 9002
 */
export default Repack.defineRspackConfig(({ mode, platform }) => {
  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
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
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'host',
        filename: 'host.container.js.bundle',
        dts: false,
        remotes: {
          catalog: `catalog@http://localhost:9001/${platform}/mf-manifest.json`,
          profile: `profile@http://localhost:9002/${platform}/mf-manifest.json`,
        },
        shared: getSharedDependencies(true),
      }),
    ],
  };
});
