# 11 — Guía de cambios

Qué se añadió al host y a las micro apps, por qué, y qué hay que tener en cuenta.
Cambios aplicados en los tres repos: `MicroApps` (host), `microapp-catalog` y `microapp-profile`.

---

## Resumen

| # | Cambio | Host | Micro apps |
|---|--------|:----:|:----------:|
| 1 | Uniwind (Tailwind v4 con `className`) | ✓ | ✓ |
| 2 | Typecheck filtrado y multiplataforma | ✓ | ✓ |
| 3 | Changesets | ✓ | ✓ |
| 4 | Tests con Jest + React Native Testing Library | ✓ | ✓ |
| 5 | Pipeline de verificación de PRs (GitHub Actions) | ✓ | ✓ |
| 6 | Turborepo | ✓ | — |
| 7 | Rozenite (React Native DevTools) | ✓ | — |
| 8 | Node 24 | ✓ | ✓ |

---

## 1. Uniwind

**Qué:** estilos con `className` (Tailwind v4) en los componentes de React Native.

**Problema:** Uniwind solo trae integración para Metro y Vite; este proyecto compila con
Re.Pack (Rspack).

**Solución:** paquete propio `packages/uniwind-rspack` con `UniwindRspackPlugin`:

- `imports-loader.js`: en el código de la app reescribe `'react-native'` → `'uniwind/components'`.
  Se hace sobre el código fuente porque Module Federation consume `react-native` como shared
  antes de que corran los hooks de resolución.
- `loader.js`: compila `global.css` con el compilador de Uniwind y genera
  `Uniwind.__reinit(stylesheet)`.

**Decisión: una configuración por app, no global.** `__reinit` reemplaza el stylesheet global;
si `uniwind` fuera singleton compartido, cada remote pisaría las clases del host. Por eso
cada app tiene su `global.css`, compila sus clases y lleva su copia del runtime. Ventaja:
un remote puede desplegarse con clases nuevas sin recompilar el host.

**Archivos:**

- Host: `packages/uniwind-rspack/`, `apps/host/global.css`, `apps/host/uniwind-types.d.ts`,
  `apps/host/rspack.config.mjs`, `apps/host/src/App.tsx` (importa el CSS).
- Remotes: `global.css`, `uniwind-types.d.ts`, `rspack.config.mjs`, `src/App.tsx` (el módulo
  expuesto importa el CSS), dependencia `"@microapps/uniwind-rspack": "file:../MicroApps/packages/uniwind-rspack"`.

**Tener en cuenta:**

- El loader usa código interno de Uniwind (`dist/metro/transformer.cjs`). Al actualizar
  `uniwind`, recompilar y comprobar estilos.
- Los remotes necesitan el host clonado al lado (también en CI).
- `uniwind-types.d.ts` es generado; se versiona para que `typecheck` funcione sin compilar, y
  Biome lo ignora.

Detalle: [08-uniwind-typecheck-changesets.md](08-uniwind-typecheck-changesets.md).

---

## 2. Typecheck

**Qué:** `scripts/typecheck.js` en cada repo, equivalente a
`tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules | grep 'error TS'`.

**Por qué en Node y no con `grep`:** npm usa `cmd.exe` en Windows (sin `grep`) y, con `grep`,
el exit code queda invertido (fallaría justo cuando no hay errores).

**Comandos:** `npm run typecheck` (host, vía Turbo), `npm run typecheck:all` (host + remotes).

---

## 3. Changesets

**Qué:** `.changeset/` en cada repo (el host versiona `host`, `@microapps/shared` y
`@microapps/uniwind-rspack`; cada micro app se versiona sola).

- `baseBranch: main`, `commit: false`.
- Paquetes privados: `privatePackages.version = true`, `tag = false` (se versionan, no se publican).
- `changeset init` de la v3 es interactivo; la configuración se escribió a mano.

**Comandos:** `npm run changeset`, `changeset:status`, `changeset:version`.

---

## 4. Tests

**Qué:** Jest 29 + jest-expo 56 + React Native Testing Library 14 (`test-renderer` 1.2).

| App | Tests |
|-----|-------|
| Host | `App` (incluye Rozenite), `RootNavigator`, `HomeScreen`, `RemoteScreen` (carga y loader) — 13 tests |
| Catalog | `App`: cabecera y los 4 productos — 5 tests |
| Profile | `App`: avatar, nombre, rol, tarjeta, pie — 4 tests |

Cobertura: 100 % en las tres apps.

**Configuración relevante:**

- `jest.config.js`: `global.css` → módulo vacío; en el host, `catalog/App` y `profile/App` → mocks
  (los tests no necesitan los bundlers de los remotes).
- `test/setup.js`: `process.env.EXPO_OS` (lo inlinea `babel-preset-expo`, que aquí no se usa),
  mock de `react-native-safe-area-context` y de los plugins de Rozenite.
- `apps/host/babel.config.js`: `@babel/plugin-transform-dynamic-import` **solo en `env.test`**
  (Jest no ejecuta `import()`; Re.Pack lo necesita intacto).
- `overrides.test-renderer: ~1.2.0` en cada `package.json`: evita que npm instale
  `test-renderer` 1.3 → React 19.3 → dos copias de React.

**Cambio en código de la app:** los `Pressable` del `HomeScreen` tienen
`accessibilityRole="button"` (accesibilidad + consulta por rol en tests).

Detalle: [09-tests.md](09-tests.md).

---

## 5. Pipeline de PRs

**Qué:** `.github/workflows/pr-verify.yml` en cada repo. En cada pull request: `npm ci` →
typecheck → tests → `biome ci`.

- Host: PRs a `main` y `develop`; usa Turbo con caché.
- Micro apps: PRs a `main`; clonan el host (sparse, solo `packages/uniwind-rspack`) como carpeta
  hermana, en la rama `HOST_REF` (hoy `develop`).
- Simulado en limpio en local (copia sin `node_modules`): host y catalog en verde.

**Pendiente en GitHub:** exigir el check **Typecheck + tests + lint** con *branch protection* /
*rulesets* en `main` y `develop` para bloquear merges en rojo.

---

## 6. Turborepo

**Qué:** `turbo.json` en el host. `npm run typecheck`, `npm test` y `npm run test:coverage`
pasan por Turbo (caché local y en CI).

- Tarea `transit`: un cambio en `packages/*` invalida la caché del host.
- **Microfrontends de Turborepo 2.6: no aplica.** Es un proxy HTTP para apps web por rutas URL;
  aquí las micro apps son bundles de React Native cargados por Module Federation y viven en
  repos separados.

---

## 7. Rozenite

**Qué:** paneles extra en React Native DevTools, solo en el host (los remotes corren dentro de
su runtime).

- `rspack.config.mjs`: `withRozenite(...)`, middleware `/rozenite` en el dev server
  (activo por defecto; `WITH_ROZENITE=false` lo apaga).
- `src/App.tsx`: `useReactNavigationDevTools({ ref })` y `useNetworkActivityDevTools()`.
- `index.js`: `withOnBootNetworkActivityRecording()`.
- **Producción:** alias a `devtools/rozenite-noop.js` → 0 referencias a Rozenite en el bundle
  (−92 KB). Sin esto el código entraba aunque no se ejecutara (rozenite#415).
- `ignoreWarnings` para dos peers opcionales del plugin de red.

Verificado: el dev server responde en `/rozenite/agent/info` y carga los 2 plugins. Falta
probar los paneles en un emulador.

Detalle: [10-ci-turbo-rozenite.md](10-ci-turbo-rozenite.md).

---

## 8. Node 24

`.nvmrc` → `24` y `engines.node` → `>=22.13` en los tres repos (lo exige React Native Testing
Library 14). Quien siga en Node 20 debe actualizar.

---

## Dependencias añadidas

| Repo | Dependencias | Dev dependencies |
|------|--------------|------------------|
| Host (raíz) | — | `@changesets/cli`, `turbo` |
| Host (`apps/host`) | `uniwind`, `tailwindcss`, `@microapps/uniwind-rspack` | `jest`, `jest-expo`, `@react-native/jest-preset`, `@testing-library/react-native`, `test-renderer`, `@types/jest`, `@babel/plugin-transform-dynamic-import`, `@rozenite/repack`, `@rozenite/react-navigation-plugin`, `@rozenite/network-activity-plugin` |
| Micro apps | `uniwind`, `tailwindcss`, `@microapps/uniwind-rspack` (`file:`) | `@changesets/cli`, `jest`, `jest-expo`, `@react-native/jest-preset`, `@testing-library/react-native`, `test-renderer`, `@types/jest` |

---

## Pendientes

1. **Orden de push:** primero el host a `develop` (el CI de las micro apps necesita
   `packages/uniwind-rspack` en `HOST_REF`). Al llegar a `main`, cambiar `HOST_REF` a `main`.
2. **Branch protection** en GitHub para exigir el check del pipeline.
3. **`@swc/core` / `@swc/helpers` en los remotes:** `@swc/core` 1.16.2 con `@swc/helpers`
   0.5.17 rompe el bundle en modo dev del catálogo (error previo a estos cambios). Alinear con
   el host (`@swc/core` 1.11.24) o subir `@swc/helpers`.
4. **Probar en emulador** los estilos de Uniwind y los paneles de Rozenite (verificado solo a
   nivel de bundle y dev server).
5. **Publicar `@microapps/uniwind-rspack`** en un registro privado si los remotes deben poder
   compilarse sin el host al lado.
