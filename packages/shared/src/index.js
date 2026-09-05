/**
 * Dependencias compartidas entre host y mini apps (Module Federation).
 * Solo React / React Native como singleton — suficiente para este demo.
 * Compartir @react-navigation aquí provoca RUNTIME-006 (loadShareSync).
 */
function getSharedDependencies(eager) {
  return {
    react: {
      singleton: true,
      eager,
      requiredVersion: '19.2.3',
    },
    'react-native': {
      singleton: true,
      eager,
      requiredVersion: '0.85.3',
    },
  };
}

const REMOTE_PORTS = {
  catalog: 9001,
  profile: 9002,
};

const FLOCI_ENDPOINT = 'http://localhost:4566';
const S3_BUCKET = 'microapps-bundles';

module.exports = {
  getSharedDependencies,
  REMOTE_PORTS,
  FLOCI_ENDPOINT,
  S3_BUCKET,
};
