# 06 — Agregar una micro app desde un repo nuevo

Guía para crear una **tercera** (o N-ésima) mini app en un **repositorio remoto** e integrarla en este proyecto, que actúa como **host/base**.

`catalog` y `profile` **se quedan** como están. Esta guía no las reemplaza: solo describe el contrato para sumar otra.

---

## Idea en una frase

El host **no clona el código** de la mini app en runtime. Solo necesita:

1. Un **nombre Federation** (`orders`, `payments`, …).
2. Una **URL** al `mf-manifest.json` (dev: localhost; prod: S3/Floci/CDN).
3. Un **expose** fijo: `./App`.

Cuando el otro repo publique un bundle nuevo, el host carga esa versión sin republicar la tienda (solo JS).

```text
Repo nuevo (microapp-orders)
        │  build + (opcional) upload S3
        ▼
   mf-manifest.json + container
        │
        ▼
Repo base (este) — apps/host
   remotes.orders → URL del manifiesto
   Home → botón → import('orders/App')
```

---

## Contratos que no puedes romper

| Contrato | Valor en este proyecto | En tu micro app |
|----------|------------------------|-----------------|
| Nombre MF | único: `catalog`, `profile`, **el tuyo** | `name: 'orders'` (ejemplo) |
| Expose | `./App` | `exposes: { './App': './src/App.tsx' }` |
| Shared | `react` + `react-native` singleton | mismas versiones que el host |
| Binario nativo | solo el host | **sin** `android/` / `ios/` propios |
| React / RN | `19.2.3` / `0.85.3` | alinear con `packages/shared` |
| Expo | `~56` en remotes actuales | misma major que el host |

Si cambias el nombre del expose o las versiones de React sin coordinar, el host falla en runtime (`RUNTIME-006`, chunk 404, etc.).

---

## Dos formas de trabajar

### A) Repo externo (objetivo de esta guía)

```text
~/code/MicroApps/                 ← este monorepo (host + catalog + profile)
~/code/microapp-orders/           ← repo nuevo, solo la mini app
```

En desarrollo levantas el remote en su puerto; el host apunta a `http://localhost:<puerto>/.../mf-manifest.json`.

### B) Primero dentro del monorepo (opcional)

Puedes copiar `../microapp-catalog` → `../microapp-orders`, cablear el host, y ajustar puerto/nombre Federation. El contrato es el mismo.

Esta guía asume **A**, y marca qué archivos del host hay que tocar en ambos casos.

---

## Paso 1 — Crear el repo de la micro app

Plantilla mínima (copia de `../microapp-catalog` renombrada):

```text
microapp-orders/
├── package.json
├── app.json
├── index.js                 # export {}; (sin AppRegistry)
├── babel.config.js
├── react-native.config.js   # commands: @callstack/repack/commands/rspack
├── rspack.config.mjs
├── tsconfig.json
├── .gitignore
└── src/
    └── App.tsx              # UI de la mini app
```

### 1.1 `package.json` (repo propio)

```json
{
  "name": "orders",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "react-native start --port 9003",
    "typecheck": "tsc --noEmit",
    "bundle:android": "react-native bundle --platform android --dev false --entry-file index.js",
    "bundle:ios": "react-native bundle --platform ios --dev false --entry-file index.js"
  },
  "dependencies": {
    "@module-federation/enhanced": "2.5.0",
    "expo": "~56.0.3",
    "react": "19.2.3",
    "react-native": "0.85.3"
  },
  "devDependencies": {
    "@babel/core": "^7.26.0",
    "@callstack/repack": "5.2.5",
    "@callstack/repack-plugin-expo-modules": "5.2.5",
    "@react-native-community/cli": "20.2.0",
    "@react-native-community/cli-platform-android": "20.2.0",
    "@react-native-community/cli-platform-ios": "20.2.0",
    "@react-native/babel-preset": "0.85.3",
    "@rspack/core": "^1.4.11",
    "@swc/core": "^1.11.24",
    "@swc/helpers": "0.5.17",
    "@types/react": "~19.2.2",
    "typescript": "~5.9.2"
  }
}
```

**Puerto:** elige uno libre. Convención actual:

| Mini app | Puerto |
|----------|--------|
| catalog  | 9001   |
| profile  | 9002   |
| **siguiente** | **9003**, 9004, … |

### 1.2 Shared: `@microapps/shared`

En el monorepo es un workspace (`*`). En un **repo aparte** tienes que resolverlo de otra forma:

| Opción | Cómo |
|--------|------|
| **Git dependency** | `"@microapps/shared": "git+ssh://git@github.com:ORG/MicroAppTest.git#develop:packages/shared"` (si el path subfolder lo soporta tu npm) |
| **Copiar el contrato** | Duplicar `getSharedDependencies()` en `shared.js` local (simple para demos; sincroniza versiones a mano) |
| **npm privado** | Publicar `@microapps/shared` y versionar |

Mientras no publiques el paquete, lo más claro para practicar es un archivo local:

```js
// shared.js (en el repo de la micro app)
function getSharedDependencies(eager) {
  return {
    react: { singleton: true, eager, requiredVersion: '19.2.3' },
    'react-native': { singleton: true, eager, requiredVersion: '0.85.3' },
  };
}
module.exports = { getSharedDependencies };
```

### 1.3 `rspack.config.mjs` (lo crítico)

```js
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';

const require = createRequire(import.meta.url);
const { getSharedDependencies } = require('./shared.js'); // o @microapps/shared
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default Repack.defineRspackConfig(({ mode, platform }) => {
  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      uniqueName: 'orders', // = name Federation
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: false,
            options: { hideParallelModeWarning: true },
          },
          type: 'javascript/auto',
        },
        ...Repack.getAssetTransformRules({ inline: true }),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/${platform}/remote`,
          },
        ],
      }),
      new ExpoModulesPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'orders',
        filename: 'orders.container.js.bundle',
        dts: false,
        exposes: {
          './App': './src/App.tsx',
        },
        shared: getSharedDependencies(false),
      }),
    ],
  };
});
```

Notas:

- En monorepo, catalog/profile aún resuelven `node_modules` hacia la raíz / host. En **repo propio** basta con `node_modules` local tras `npm install`.
- **No** generes `expo prebuild` ni corras `expo run:android` en este repo: no es una app instalable.

### 1.4 `app.json` (metadatos)

```json
{
  "expo": {
    "name": "MicroApps Orders",
    "slug": "microapps-orders",
    "version": "1.0.0",
    "extra": {
      "role": "remote",
      "federationName": "orders",
      "devPort": 9003
    }
  }
}
```

### 1.5 `src/App.tsx`

Export default de un componente React Native. Ese es el módulo que el host importa como `orders/App`.

### 1.6 `index.js`

```js
// Remote entry: no AppRegistry.
export {};
```

### 1.7 `react-native.config.js`

```js
module.exports = {
  commands: require('@callstack/repack/commands/rspack'),
};
```

---

## Paso 2 — Cablear el host (este repo)

Sustituye `orders` / `9003` / `Orders` por tu nombre real.

### 2.1 `packages/shared/src/index.js`

Añade el puerto al mapa (útil para docs y futuros helpers):

```js
const REMOTE_PORTS = {
  catalog: 9001,
  profile: 9002,
  orders: 9003,
};
```

### 2.2 `apps/host/rspack.config.mjs`

```js
remotes: {
  catalog: `catalog@http://localhost:9001/${platform}/mf-manifest.json`,
  profile: `profile@http://localhost:9002/${platform}/mf-manifest.json`,
  orders: `orders@http://localhost:9003/${platform}/mf-manifest.json`,
},
```

Más adelante (S3/Floci):

```js
orders: `orders@http://localhost:4566/microapps-bundles/orders/${platform}/mf-manifest.json`,
```

### 2.3 `apps/host/mf-modules.d.ts`

```ts
declare module 'orders/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}
```

### 2.4 `apps/host/src/screens/RemoteScreen.tsx`

```ts
type RemoteName = 'catalog' | 'profile' | 'orders';

const remotes = {
  catalog: lazy(() => import('catalog/App')),
  profile: lazy(() => import('profile/App')),
  orders: lazy(() => import('orders/App')),
};
```

### 2.5 `apps/host/src/navigation/RootNavigator.tsx`

```ts
export type RootStackParamList = {
  Home: undefined;
  Catalog: undefined;
  Profile: undefined;
  Orders: undefined;
};

// dentro del Navigator:
<Stack.Screen name="Orders" options={{ title: 'Pedidos' }}>
  {() => <RemoteScreen remote="orders" title="Pedidos" />}
</Stack.Screen>
```

### 2.6 `apps/host/src/screens/HomeScreen.tsx`

Añade un botón que navegue a `Orders` (igual patrón que Catálogo / Perfil).

### 2.7 Scripts raíz (opcional)

Si la mini app vive **fuera** del monorepo, `npm start` de este repo **no** la arranca. Tienes dos opciones:

1. Terminal aparte en el otro repo: `npm start` (puerto 9003).
2. O documentar en el README:

```bash
# Terminal 1 — base
cd MicroApps && npm start

# Terminal 2 — micro app externa
cd ../microapp-orders && npm start
```

Si la metes **dentro** del monorepo (`apps/orders`), actualiza workspaces (ya cubre `apps/*`) y `package.json` raíz:

```json
"start:all": "npx concurrently ... \"npm run start -w orders\""
```

### 2.8 Emulador Android

```bash
adb reverse tcp:9003 tcp:9003
```

(además de 8081, 9001, 9002).

---

## Paso 3 — Probar el cableado

```bash
# Repo microapp-orders
npm install
npm start
# → http://localhost:9003/android/mf-manifest.json

# Repo MicroApps (host)
npm start          # o solo start:host si catalog/profile ya corren
npm run android
```

Comprobaciones:

```bash
curl http://localhost:9003/android/mf-manifest.json
```

Debes ver el manifiesto con `exposes` / nombre `orders`. En el host: botón → loader → UI remota. Si apagas `:9003`, la carga debe fallar (prueba de que es remoto).

---

## Paso 4 — Publicar a Floci/S3 (actualización sin tocar el host)

Cuando el remoto ya no sea localhost:

```text
1. En microapp-orders: build de producción (bundle Re.Pack)
2. Upload a:
   s3://microapps-bundles/orders/<platform>/mf-manifest.json
   s3://microapps-bundles/orders/<platform>/orders.container.js.bundle
   (+ chunks)
3. En el host, cambiar la URL del remote a:
   http://localhost:4566/microapps-bundles/orders/<platform>/mf-manifest.json
```

Helpers ya existentes en este repo:

- `npm run docker:up`
- `npm run s3:create-bucket`
- `npm run s3:upload-demo` (placeholder; el upload real del `build/` lo haces en el CI del repo de la micro app)

Path recomendado:

```text
microapps-bundles/
  catalog/<platform>/...
  profile/<platform>/...
  orders/<platform>/...
```

Cada push al repo de la micro app → CI build + upload → el host con URL S3 ve la versión nueva.

---

## Checklist rápido

### En el repo nuevo

- [ ] `name` Federation único (ej. `orders`)
- [ ] `exposes['./App']` → `src/App.tsx`
- [ ] `shared` = mismas versiones React/RN que el host
- [ ] Puerto libre (9003+)
- [ ] Sin carpeta `android/` / `ios/` generada para instalar
- [ ] `react-native.config.js` apunta a comandos Re.Pack
- [ ] `npm start` sirve `mf-manifest.json`

### En este host (base)

- [ ] `remotes` en `rspack.config.mjs`
- [ ] Declaración TS en `mf-modules.d.ts`
- [ ] Entrada en `RemoteScreen`
- [ ] Ruta + botón en navegación / Home
- [ ] `adb reverse` del nuevo puerto
- [ ] (Opcional) puerto en `REMOTE_PORTS` de shared

### Para “se actualiza solo”

- [ ] CI del repo remoto sube a S3/Floci
- [ ] Host apunta `remotes` a esa URL (no al código git)

---

## Errores frecuentes

| Síntoma | Causa típica |
|---------|----------------|
| 404 `mf-manifest.json` | Remote no está corriendo o puerto mal en `remotes` |
| `Unable to resolve module orders/App` | Falta el remote en `rspack` del host o typo en `name`/`exposes` |
| `RUNTIME-006` / shared | Versiones distintas de React o shared de más paquetes |
| App nativa “vacía” al abrir sola la mini app | Normal: es remote JS, se abre **desde el host** |
| Emulador no carga remote | Falta `adb reverse tcp:9003` |

---

## Relación con catalog / profile

| Mini app | Repo hoy | Puerto |
|----------|----------|--------|
| catalog | hermano `../microapp-catalog` | 9001 |
| profile | hermano `../microapp-profile` | 9002 |
| **nueva** | otro repo externo (esta guía) | 9003+ |

Layout y Biome: [`07-repos-separados-y-biome.md`](./07-repos-separados-y-biome.md).

---

## Referencias en este monorepo

- Plantilla real: `../microapp-catalog/` (copiar y renombrar).
- Shared: `packages/shared/src/index.js`
- Host remotes: `apps/host/rspack.config.mjs`
- Carga UI: `apps/host/src/screens/RemoteScreen.tsx`
- S3 local: `docs/03-docker-floci.md`
- Conceptos MF: `docs/02-repack.md`
