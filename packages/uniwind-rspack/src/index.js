const path = require('node:path');

const PLUGIN_NAME = 'UniwindRspackPlugin';

/**
 * Uniwind (Tailwind v4 para React Native) solo trae adaptadores para Metro y Vite.
 * Este plugin replica en Rspack lo que hace `withUniwindConfig` de Metro:
 *
 * 1. `import ... from 'react-native'` en el código de la app → `uniwind/components`
 *    (componentes con soporte de `className`). Se hace reescribiendo el código fuente
 *    (`imports-loader.js`) porque Module Federation consume `react-native` como shared
 *    antes de que corran los hooks de resolución de JS. No toca node_modules.
 * 2. El CSS de entrada (`global.css`) se compila con `loader.js` a JS que llama
 *    `Uniwind.__reinit(stylesheet)`.
 *
 * Con Module Federation, `uniwind` NO debe ir en `shared`: `__reinit` reemplaza el
 * stylesheet global, así que cada app (host y cada remote) lleva su propia copia.
 */
class UniwindRspackPlugin {
  /**
   * @param {object} options
   * @param {string} options.cssEntryFile Ruta al CSS de entrada (relativa al `context`).
   * @param {string} options.platform `android` | `ios`.
   * @param {string} [options.dtsFile] Archivo de tipos generado (default `uniwind-types.d.ts`).
   * @param {string[]} [options.extraThemes] Temas además de `light` y `dark`.
   */
  constructor(options) {
    if (!options?.cssEntryFile) {
      throw new Error(`${PLUGIN_NAME}: falta \`cssEntryFile\` (p. ej. './global.css')`);
    }
    if (!options.platform) {
      throw new Error(`${PLUGIN_NAME}: falta \`platform\``);
    }
    this.options = options;
  }

  apply(compiler) {
    const context = compiler.options.context ?? process.cwd();
    const cssEntryPath = path.resolve(context, this.options.cssEntryFile);

    compiler.options.module.rules.push(
      {
        test: /\.[cm]?[jt]sx?$/,
        exclude: /[\\/]node_modules[\\/]/,
        enforce: 'pre',
        loader: require.resolve('./imports-loader'),
      },
      {
        test: (resource) => path.resolve(resource) === cssEntryPath,
        type: 'javascript/auto',
        use: [
          // El JS generado importa `uniwind`: pasa por el mismo loader que el resto de la app.
          {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: false,
            options: { hideParallelModeWarning: true },
          },
          {
            loader: require.resolve('./loader'),
            options: {
              projectRoot: context,
              platform: this.options.platform,
              dtsFile: this.options.dtsFile,
              extraThemes: this.options.extraThemes,
            },
          },
        ],
      },
    );
  }
}

module.exports = { UniwindRspackPlugin };
