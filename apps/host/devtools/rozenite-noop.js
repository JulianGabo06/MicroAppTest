/**
 * Sustituye a los plugins de Rozenite en builds de producción (alias en rspack.config.mjs).
 * Los plugins ya son no-op en producción, pero su código entraría igual al bundle.
 */
const noop = () => null;

module.exports = {
  useNetworkActivityDevTools: noop,
  useReactNavigationDevTools: noop,
  withOnBootNetworkActivityRecording: noop,
};
