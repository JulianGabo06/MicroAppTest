const { createRequire } = require('node:module');
const path = require('node:path');

/**
 * Compila el CSS de entrada de Uniwind a JS reutilizando el transformer de Metro
 * que publica Uniwind (`uniwind/metro` → transformer.cjs). El transformer delega el
 * JS final a `metro-transform-worker`; aquí se sustituye por un passthrough para
 * quedarnos con el código generado y dejar que Rspack lo procese.
 *
 * `uniwind` se resuelve desde el proyecto que compila (host o remote), no desde
 * este paquete: en los remotes llega como dependencia `file:` (symlink).
 */
const transformers = new Map();

function getTransformer(projectRoot) {
  const cached = transformers.get(projectRoot);
  if (cached) return cached;

  const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
  const metroEntry = projectRequire.resolve('uniwind/metro');
  const transformerPath = path.join(path.dirname(metroEntry), 'transformer.cjs');
  const transformerRequire = createRequire(transformerPath);

  const workerPath = transformerRequire.resolve('metro-transform-worker');
  require.cache[workerPath] = {
    id: workerPath,
    filename: workerPath,
    loaded: true,
    exports: {
      transform: async (_config, _projectRoot, _filename, data) => ({
        output: [{ data: { code: data.toString('utf8') } }],
      }),
    },
  };

  const transformer = transformerRequire(transformerPath);
  transformers.set(projectRoot, transformer);
  return transformer;
}

module.exports = function uniwindLoader() {
  const callback = this.async();
  const { projectRoot, platform, dtsFile, extraThemes } = this.getOptions();

  // Los estilos dependen de las clases usadas en todo el proyecto: se recompila en cada build.
  this.cacheable(false);

  // Uniwind resuelve el CSS de entrada y el .d.ts contra process.cwd().
  const cwd = process.cwd();
  const cssEntryFile = path.relative(cwd, this.resourcePath);
  const config = {
    uniwind: {
      cssEntryFile,
      dtsFile: path.relative(cwd, path.resolve(projectRoot, dtsFile ?? 'uniwind-types.d.ts')),
      extraThemes,
      isExpoProject: false,
    },
  };

  getTransformer(projectRoot)
    .transform(config, cwd, cssEntryFile, Buffer.from(''), { type: 'module', platform })
    .then((result) => callback(null, result.output[0].data.code))
    .catch(callback);
};
