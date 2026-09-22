/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/test/setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**'],
  moduleNameMapper: {
    // Uniwind compila global.css con Rspack; en Jest basta un módulo vacío.
    '\\.css$': '<rootDir>/test/mocks/style.js',
    // Remotes de Module Federation: no existen en node_modules, se sustituyen por mocks.
    '^(catalog|profile)/App$': '<rootDir>/test/mocks/$1App.tsx',
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/build/'],
};
