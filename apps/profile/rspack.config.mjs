import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';

const require = createRequire(import.meta.url);
const { getSharedDependencies } = require('@microapps/shared');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Mini app Profile (Expo + Re.Pack remote).
 * Solo JS: no tiene binario nativo propio; el host provee el runtime nativo.
 * Expone ./App vía Module Federation.
 */
export default Repack.defineRspackConfig(({ mode, platform }) => {
  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
      modules: [
        path.resolve(__dirname, '../../node_modules'),
        path.resolve(__dirname, '../host/node_modules'),
        'node_modules',
      ],
    },
    output: {
      uniqueName: 'profile',
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
        ...Repack.getAssetTransformRules({ inline: true }),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/${platform}/remote`,
          },
        ],
      }),
      new ExpoModulesPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'profile',
        filename: 'profile.container.js.bundle',
        dts: false,
        exposes: {
          './App': './src/App.tsx',
        },
        shared: getSharedDependencies(false),
      }),
    ],
  };
});
