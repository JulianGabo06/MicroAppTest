import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';

const require = createRequire(import.meta.url);
const { getSharedDependencies } = require('@microapps/shared');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Mini app Catalog — solo expone ./App.
 * No registra AppRegistry: el host la monta en runtime.
 */
export default Repack.defineRspackConfig(({ mode, platform }) => {
  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
      modules: [
        path.resolve(__dirname, '../host/node_modules'),
        'node_modules',
      ],
    },
    output: {
      uniqueName: 'catalog',
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
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'catalog',
        filename: 'catalog.container.js.bundle',
        dts: false,
        exposes: {
          './App': './src/App.tsx',
        },
        shared: getSharedDependencies(false),
      }),
    ],
  };
});
