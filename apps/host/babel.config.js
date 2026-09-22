module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    // Jest (CommonJS) no ejecuta `import()`; Re.Pack lo necesita intacto para Module Federation.
    test: {
      plugins: ['@babel/plugin-transform-dynamic-import'],
    },
  },
};
