# 09 — Tests (Jest + React Native Testing Library)

Host y micro apps usan **Jest 29** con el preset **jest-expo 56** y **React Native Testing
Library 14** (con `test-renderer` 1.2, la línea que corresponde a React 19.2).

## Comandos

| Comando (raíz del host) | Qué corre |
|-------------------------|-----------|
| `npm test` | tests del host |
| `npm run test:all` | host + catalog + profile |
| `npm run test:catalog` / `test:profile` | un remote |

En cada app (`apps/host`, `microapp-catalog`, `microapp-profile`): `npm test`,
`npm run test:watch`, `npm run test:coverage`.

## Qué se prueba

| App | Archivo | Cubre |
|-----|---------|-------|
| host | `src/__tests__/App.test.tsx` | Shell completo: Home + navegación a un remote |
| host | `src/navigation/__tests__/RootNavigator.test.tsx` | Pantalla inicial y navegación a cada micro app |
| host | `src/screens/__tests__/HomeScreen.test.tsx` | Textos, botones (rol `button`) y `navigate()` de cada botón |
| host | `src/screens/__tests__/RemoteScreen.test.tsx` | Carga del remote `catalog` y `profile` |
| host | `src/screens/__tests__/RemoteScreen.loading.test.tsx` | Fallback de `Suspense` mientras el bundle no llega |
| catalog | `src/__tests__/App.test.tsx` | Cabecera y cada producto con su precio |
| profile | `src/__tests__/App.test.tsx` | Avatar, nombre, rol, tarjeta y pie |

## Piezas de configuración

- **`jest.config.js`** (cada app)
  - `\.css$` → `test/mocks/style.js`: `global.css` lo compila Uniwind con Rspack; en Jest es un módulo vacío.
  - Solo host: `^(catalog|profile)/App$` → `test/mocks/<remote>App.tsx`. Los remotes de Module Federation no existen en `node_modules`; los tests del host no dependen de que los bundlers de los remotes estén levantados.
- **`test/setup.js`**
  - `process.env.EXPO_OS = 'ios'`: normalmente lo inserta `babel-preset-expo`, pero aquí se usa `@react-native/babel-preset`.
  - Host: mock oficial de `react-native-safe-area-context`.
- **`apps/host/babel.config.js`**: `@babel/plugin-transform-dynamic-import` solo en `env.test`. Jest (CommonJS) no ejecuta `import()`, y Re.Pack necesita ese `import()` intacto para cargar los remotes.
- **`overrides.test-renderer: ~1.2.0`** (en el `package.json` raíz de cada repo): sin él npm instala `test-renderer` 1.3, que arrastra React 19.3 y deja dos copias de React (`Cannot read properties of null (reading 'useRef')`).

## Convenciones (RNTL 14)

- `render`, `fireEvent` y `userEvent.*` son **async**: siempre con `await`.
- Consultar con `screen`, priorizando `getByRole` → `getByText`; `findBy*` para lo asíncrono y `queryBy*` solo para comprobar que algo no está.
- Interacciones con `userEvent.setup()` + `await user.press(...)`.
- Los tests van en `__tests__/` junto al componente: `src/**/__tests__/*.test.tsx`.
