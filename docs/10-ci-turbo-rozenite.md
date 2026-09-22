# 10 — Pipeline de PR, Turborepo y Rozenite

---

## Pipeline de verificación (GitHub Actions)

Cada repo tiene `.github/workflows/pr-verify.yml`. Se ejecuta en cada **pull request**
(y a mano con *Run workflow*). Si falla un paso, el PR queda en rojo.

| Paso | Host (`MicroAppTest`) | Micro apps |
|------|-----------------------|------------|
| Instalación | `npm ci` | `npm ci` |
| Typecheck | `turbo run typecheck` | `npm run typecheck` |
| Tests | `turbo run test` (Jest) | `npm test` (Jest) |
| Lint | `biome ci .` | `biome ci .` |

- **Ramas:** en el host, PRs hacia `main` y `develop`; en las micro apps, hacia `main`.
- **Node:** el de `.nvmrc` (24). React Native Testing Library 14 exige Node `^22.13 || >=24`.
- **Micro apps:** dependen de `file:../MicroApps/packages/uniwind-rspack`, así que el workflow
  clona el host como carpeta hermana (checkout sparse, solo ese paquete). El repo del host es
  público, así que no hace falta token. La rama del host se elige con `HOST_REF` (hoy `develop`;
  cambiar a `main` cuando el paquete esté en `main`).
- **Caché:** npm (`actions/setup-node`) y `.turbo/cache` (`actions/cache`).

Para que el PR **no se pueda mergear** si falla, en GitHub: *Settings → Branches → Branch
protection rule* (o *Rulesets*) sobre `main`/`develop` → *Require status checks to pass* →
seleccionar **Typecheck + tests + lint**.

En local, lo mismo que el pipeline:

```bash
npm run verify        # host: turbo typecheck + test, y Biome
npm run verify        # en cada micro app: typecheck + test + lint
```

---

## Turborepo

Orquesta y cachea las tareas del monorepo del host (`apps/*`, `packages/*`).

```bash
npx turbo run typecheck test   # la segunda vez sin cambios: FULL TURBO (caché)
npm run typecheck              # = turbo run typecheck
npm test                       # = turbo run test
npm run test:coverage          # = turbo run test:coverage
```

`turbo.json`:

- `transit`: tarea vacía que encadena dependencias (`^transit`). Así, un cambio en
  `packages/shared` o `packages/uniwind-rspack` invalida la caché de `typecheck`/`test` del host
  aunque esos paquetes no tengan scripts propios.
- `globalDependencies`: `scripts/typecheck.js` y `tsconfig.json` (si cambian, se invalida todo).
- `globalPassThroughEnv: ["CI"]`: Jest detecta CI (sin modo watch, sin escribir snapshots).

### ¿Y los *microfrontends* de Turborepo 2.6?

[Turborepo 2.6 microfrontends](https://turborepo.dev/blog/turbo-2-6#microfrontends) es un proxy
HTTP para **web**: `turbo dev` levanta `localhost:3024` y enruta rutas URL (`/docs/*` → app `docs`)
a apps web en distintos puertos, con `microfrontends.json`. **No aplica a este proyecto**:

- Las micro apps son bundles de **React Native** que carga el host nativo con Module Federation
  (Re.Pack), no páginas web servidas por rutas.
- Cada remote ya tiene su puerto (9001/9002) y el host los resuelve por `mf-manifest.json`, no
  por rutas.
- Las micro apps viven en **repos separados**; Turbo solo orquesta paquetes del mismo workspace.

Lo que sí aporta Turbo aquí es la caché y la orquestación de tareas del host.

---

## Rozenite

[Rozenite](https://www.rozenite.dev/) añade paneles a **React Native DevTools** (Callstack). Es
compatible con Re.Pack ≥ 5.2 mediante `@rozenite/repack`.

| Pieza | Dónde |
|-------|-------|
| `withRozenite(...)` | `apps/host/rspack.config.mjs`: middleware `/rozenite` en el dev server (activo por defecto; `WITH_ROZENITE=false` lo desactiva) |
| `useReactNavigationDevTools({ ref })` | `apps/host/src/App.tsx`: timeline de navegación, estado, deep links |
| `useNetworkActivityDevTools()` | `apps/host/src/App.tsx`: peticiones HTTP/WebSocket; útil para ver la carga de los `mf-manifest.json` de los remotes |
| `withOnBootNetworkActivityRecording()` | `apps/host/index.js`: captura también las peticiones previas al primer render |

- Solo en el **host**: los remotes se ejecutan dentro del runtime del host, así que sus
  peticiones y su navegación aparecen en los mismos paneles.
- **Producción:** los hooks ya son no-op, pero su código entraba al bundle
  ([rozenite#415](https://github.com/callstackincubator/rozenite/issues/415)). En `mode === 'production'`
  se aliasan a `apps/host/devtools/rozenite-noop.js`, y el bundle queda sin rastro de Rozenite.
- **Tests:** los plugins están mockeados en `apps/host/test/setup.js`.
- **Uso:** `npm start`, abrir la app, pulsar `j` en la terminal del host (o *Open DevTools*
  desde el menú de desarrollo) y buscar las pestañas de Rozenite.
- **Otros plugins:** `performance-monitor` requiere `react-native-performance` (módulo nativo,
  implica `prebuild`); `expo-atlas` y `require-profiler` son solo para Metro; `storage`, `mmkv`,
  `sqlite`, `tanstack-query` y `redux-devtools` se añaden cuando el proyecto use esas librerías.
