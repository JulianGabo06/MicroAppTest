/**
 * Reescribe `'react-native'` → `'uniwind/components'` en imports, re-exports,
 * `require()` e `import()` del código de la app (equivale al resolver de Metro de Uniwind).
 */
const REACT_NATIVE_IMPORT =
  /(\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s+)(['"])react-native\2/g;

module.exports = function uniwindImportsLoader(source) {
  return source.replace(REACT_NATIVE_IMPORT, '$1$2uniwind/components$2');
};
