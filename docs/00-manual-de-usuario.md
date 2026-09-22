# Manual de usuario — MicroApps

Guía general del proyecto: qué es, cómo está organizado, cómo se arranca y cómo se trabaja
día a día. Para el detalle de cada pieza, los documentos numerados de esta carpeta.

---

## 1. Qué es

Una **super app móvil** con micro frontends:

- Un **host** (shell nativo, Expo + React Native) que se instala en el teléfono.
- Varias **micro apps** (remotes) que son solo JavaScript: el host las descarga y las monta
  en tiempo de ejecución con **Module Federation** (Re.Pack / Rspack).
- Cada micro app vive en **su propio repo**, se versiona y se despliega por separado.

```text
            ┌──────────────── teléfono ────────────────┐
            │  Host (binario nativo, :8081 en dev)     │
            │   ├─ Home                                │
            │   ├─ [Catálogo] ──► catalog/App  ◄───────┼── microapp-catalog (:9001)
            │   └─ [Perfil]   ──► profile/App  ◄───────┼── microapp-profile (:9002)
            └──────────────────────────────────────────┘
                              │ (producción)
                              ▼
                     S3 / Floci (:4566) — bundles publicados
```

| Pieza | Repo | Rol |
|-------|------|-----|
| Host | `MicroApps` ([MicroAppTest](https://github.com/JulianGabo06/MicroAppTest)) | Único binario nativo. Navegación y carga de remotes |
| Catálogo | [microapp-catalog](https://github.com/JulianGabo06/microapp-catalog) | Remote `catalog`, expone `./App` |
| Perfil | [microapp-profile](https://github.com/JulianGabo06/microapp-profile) | Remote `profile`, expone `./App` |

---

## 2. Stack

| Área | Herramienta |
|------|-------------|
| App | Expo 56, React Native 0.85.3, React 19.2.3, React Navigation 7 |
| Bundler | Re.Pack 5.2 (Rspack) + Module Federation v2 |
| Estilos | Uniwind (Tailwind v4) con `className` |
| Tests | Jest 29 + jest-expo + React Native Testing Library 14 |
| Tipos | TypeScript 5.9 (`npm run typecheck`) |
| Lint / formato | Biome |
| Tareas / caché | Turborepo (solo host) |
| Versionado | Changesets |
| CI | GitHub Actions (`pr-verify.yml`) |
| Debug | React Native DevTools + Rozenite |
| Infra local | Docker + Floci (S3 compatible) |

---

## 3. Estructura

Los tres repos van **uno al lado del otro** (los scripts y el CI asumen este layout):

```text
Proyectos/
├── MicroApps/            ← host
├── microapp-catalog/
└── microapp-profile/
```

### Host (`MicroApps/`)

```text
MicroApps/
├── apps/host/                    # la app nativa
│   ├── src/
│   │   ├── App.tsx               # providers + NavigationContainer + Rozenite
│   │   ├── navigation/RootNavigator.tsx
│   │   ├── screens/HomeScreen.tsx     # botones que abren cada micro app
│   │   ├── screens/RemoteScreen.tsx   # React.lazy + Suspense sobre el remote
│   │   └── **/__tests__/         # tests de cada vista/componente
│   ├── test/                     # setup y mocks de Jest (remotes, CSS)
│   ├── devtools/rozenite-noop.js # Rozenite fuera del bundle de producción
│   ├── plugins/withRepackEntry.js# config plugin de Expo para Re.Pack
│   ├── rspack.config.mjs         # Re.Pack + MF (remotes) + Uniwind + Rozenite
│   ├── global.css                # entrada de Uniwind/Tailwind
│   ├── mf-modules.d.ts           # tipos de catalog/App y profile/App
│   └── jest.config.js
├── packages/
│   ├── shared/                   # contrato MF: react / react-native singleton
│   └── uniwind-rspack/           # integración Uniwind ↔ Rspack (host y remotes)
├── scripts/                      # setup, patch-native, typecheck
├── infra/                        # scripts de Floci / S3
├── docs/                         # esta documentación
├── .github/workflows/pr-verify.yml
├── .changeset/
├── turbo.json · biome.json · docker-compose.yml · .nvmrc
└── package.json                  # workspaces + scripts globales
```

### Micro app (`microapp-catalog/`, `microapp-profile/`)

```text
microapp-xxx/
├── src/App.tsx               # módulo expuesto al host (importa global.css)
├── src/__tests__/App.test.tsx
├── index.js                  # vacío: el host nunca lo ejecuta
├── shared.js                 # copia del contrato MF (mismas versiones que el host)
├── rspack.config.mjs         # remote MF + Uniwind
├── global.css · jest.config.js · test/
├── scripts/typecheck.js
├── .github/workflows/pr-verify.yml
└── .changeset/
```

---

## 4. Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js | **24** (`.nvmrc`; mínimo 22.13) |
| npm | 11 (viene con Node 24) |
| Docker Desktop | para Floci (opcional en el día a día) |
| Android Studio / Xcode | *development build* (Re.Pack **no** funciona en Expo Go) |

---

## 5. Primera vez

```bash
cd Proyectos
git clone git@github.com:JulianGabo06/MicroAppTest.git MicroApps
git clone git@github.com:JulianGabo06/microapp-catalog.git
git clone git@github.com:JulianGabo06/microapp-profile.git

cd MicroApps
git checkout develop
npm run setup        # instala host + remotes, levanta Floci y crea el bucket
npm run prebuild     # genera android/ios del host y aplica parches de Re.Pack
```

---

## 6. Día a día

### Levantar todo

```bash
npm start            # host (:8081) + catalog (:9001) + profile (:9002)
npm run android      # otra terminal (o: npm run ios)
```

Emulador Android, si no cargan los remotes:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:9001 tcp:9001
adb reverse tcp:9002 tcp:9002
```

En la app: **Home → Abrir Catálogo / Abrir Perfil**. Si apagas `:9001` y abres Catálogo,
se queda en "Cargando…": prueba de que el código viene del remote.

### Verificar antes de abrir un PR

```bash
npm run verify       # host: typecheck + tests (Turbo) + Biome
# en cada micro app:
npm run verify       # typecheck + tests + Biome
```

### Comandos (raíz del host)

| Comando | Qué hace |
|---------|----------|
| `npm start` · `start:host` · `start:catalog` · `start:profile` | Bundlers |
| `npm run android` / `ios` | Compila e instala el host |
| `npm run typecheck` / `typecheck:all` | TypeScript del host / host + remotes |
| `npm test` / `test:all` / `test:coverage` | Jest del host / host + remotes / cobertura |
| `npm run verify` | Lo mismo que el CI |
| `npm run lint` / `lint:fix` / `format` | Biome |
| `npm run changeset` / `changeset:status` / `changeset:version` | Versionado |
| `npm run docker:up` / `s3:create-bucket` / `s3:upload-demo` | Floci / S3 |

En cada micro app: `start`, `typecheck`, `test`, `test:watch`, `test:coverage`, `verify`,
`lint`, `changeset`, `bundle:android` / `bundle:ios`.

---

## 7. Tareas habituales

### Escribir estilos (Uniwind)

```tsx
<View className="flex-1 items-center bg-slate-900 p-6">
  <Text className="text-2xl font-bold text-white">Hola</Text>
</View>
```

Funciona en el host y en cada micro app. Cada app compila sus propias clases; los tipos de
`className` salen de `uniwind-types.d.ts` (lo genera el build). Detalle:
[08-uniwind-typecheck-changesets.md](08-uniwind-typecheck-changesets.md).

### Escribir un test

Junto al componente, en `__tests__/NombreComponente.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

it('navega al pulsar', async () => {
  await render(<MiPantalla />);
  await userEvent.setup().press(screen.getByRole('button', { name: /Abrir/ }));
  expect(await screen.findByText('...')).toBeOnTheScreen();
});
```

`render` y `userEvent` son async en RNTL 14. Detalle: [09-tests.md](09-tests.md).

### Registrar un cambio (Changesets)

```bash
npm run changeset    # elige paquete(s) y tipo de bump, escribe una línea
git add .changeset && git commit
```

Al liberar: `npm run changeset:version` aplica los bumps y escribe `CHANGELOG.md`.

### Abrir un PR

El pipeline `PR verify` corre solo: `npm ci` → typecheck → tests → Biome. Si falla, el PR
queda en rojo. Detalle: [10-ci-turbo-rozenite.md](10-ci-turbo-rozenite.md).

### Depurar con Rozenite

Con `npm start` corriendo, pulsa `j` en la terminal del host (o *Open DevTools* en el menú de
desarrollo). Pestañas extra: **React Navigation** (timeline y estado) y **Network Activity**
(peticiones, incluidos los `mf-manifest.json` de los remotes).

### Instalar la app en un teléfono (APK)

```bash
npm run android:release   # → dist/microapps-host-release.apk
npm run remotes:build     # bundles de producción de las micro apps
npm run remotes:serve     # servirlos por la Wi-Fi mientras usas la app
```

Detalle: [12-build-android.md](12-build-android.md).

### Agregar una micro app nueva

Seguir [06-agregar-microapp-repo.md](06-agregar-microapp-repo.md). Además de lo que describe:
`global.css` + `UniwindRspackPlugin`, `jest.config.js` + tests, `scripts/typecheck.js`,
`.changeset/` y `.github/workflows/pr-verify.yml` (copiar de catalog y cambiar el nombre).

---

## 8. Problemas frecuentes

| Síntoma | Causa / solución |
|---------|------------------|
| Se queda en "Cargando Catálogo…" | El bundler del remote no corre (`npm run start:catalog`) o falta `adb reverse tcp:9001 tcp:9001` |
| `Cannot read properties of null (reading 'useRef')` en tests | Dos copias de React. Revisar que `overrides.test-renderer` siga en `~1.2.0` y reinstalar |
| `npm install -w host <pkg>` falla con `reading 'location'` | Bug de npm 11 con workspaces: añadir la dependencia a `apps/host/package.json` y correr `npm install` en la raíz |
| Un `className` no aplica estilos | Comprobar que la app importa `global.css` (host: `src/App.tsx`; remote: el módulo expuesto) y reiniciar el bundler |
| `_wrap_reg_exp is not defined by "exports"` al compilar un remote en dev | `@swc/core` 1.16 vs `@swc/helpers` 0.5.17 en los remotes (pendiente de alinear) |
| El CI de una micro app falla en `npm ci` | La rama `HOST_REF` del host no tiene `packages/uniwind-rspack` |
| Expo Go no abre la app | Re.Pack no funciona en Expo Go: usar `npm run android` / `ios` |

---

## 9. Mapa de la documentación

| Doc | Tema |
|-----|------|
| [01-conceptos.md](01-conceptos.md) | Micro frontends y Module Federation |
| [02-repack.md](02-repack.md) | Re.Pack |
| [03-docker-floci.md](03-docker-floci.md) | Floci / S3 local |
| [04-guia-explicativa.md](04-guia-explicativa.md) | Guía explicativa |
| [05-guia-tecnica-codigo.md](05-guia-tecnica-codigo.md) | Recorrido por el código |
| [06-agregar-microapp-repo.md](06-agregar-microapp-repo.md) | Agregar una micro app |
| [07-repos-separados-y-biome.md](07-repos-separados-y-biome.md) | Multi-repo + Biome |
| [08-uniwind-typecheck-changesets.md](08-uniwind-typecheck-changesets.md) | Uniwind, typecheck, Changesets |
| [09-tests.md](09-tests.md) | Tests |
| [10-ci-turbo-rozenite.md](10-ci-turbo-rozenite.md) | CI, Turborepo, Rozenite |
| [11-guia-de-cambios.md](11-guia-de-cambios.md) | Qué cambió en esta tanda y por qué |
| [12-build-android.md](12-build-android.md) | APK release para un teléfono físico |
