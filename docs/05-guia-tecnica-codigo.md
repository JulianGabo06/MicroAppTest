# Guía técnica con código — implementación paso a paso

Documento **técnico**: qué se configuró, en qué archivos y con qué código.  
Complementa [`04-guia-explicativa.md`](./04-guia-explicativa.md) (relato) y `01`–`03` (notas cortas).

Rama de referencia: `develop`  
Repo: https://github.com/JulianGabo06/MicroAppTest

---

## 0. Estructura final del monorepo

```text
MicroApps/
├── package.json                 # workspaces + scripts raíz
├── apps/
│   ├── host/                    # shell Expo + Re.Pack (binario nativo)
│   ├── catalog/                 # remote MF (solo JS)
│   └── profile/                 # remote MF (solo JS)
├── packages/shared/             # shared deps Federation
├── scripts/                     # setup + patch nativo
├── infra/scripts/               # S3 Floci helpers
└── docker-compose.yml
```

Workspaces en la raíz:

```json
{
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "start": "npm run start:all",
    "start:all": "npx concurrently -n host,catalog,profile -c blue,green,magenta \"npm run start -w host\" \"npm run start:catalog\" \"npm run start:profile\"",
    "start:catalog": "npm --prefix ../microapp-catalog start",
    "start:profile": "npm --prefix ../microapp-profile start",
    "prebuild": "npm run prebuild -w host && node scripts/patch-native.js",
    "android": "npm run android -w host"
  }
}
```

Puertos:

| App | Puerto | Rol |
|-----|--------|-----|
| host | 8081 | Shell + remotes |
| catalog | 9001 | Remote `exposes: ./App` |
| profile | 9002 | Remote `exposes: ./App` |

---

## 1. Sustituir Metro por Re.Pack

En **cada** app (`host`, `catalog`, `profile`):

```js
// apps/host/react-native.config.js  (igual en catalog/profile)
module.exports = {
  commands: require('@callstack/repack/commands/rspack'),
};
```

Efecto: `react-native start` y `react-native bundle` usan **Rspack/Re.Pack**, no Metro.

Scripts de cada app:

```json
// host
"start": "react-native start --port 8081"

// catalog
"start": "react-native start --port 9001"

// profile
"start": "react-native start --port 9002"
```

---

## 2. Shared dependencies (Module Federation)

Archivo central: `packages/shared/src/index.js`

```js
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

module.exports = {
  getSharedDependencies,
  REMOTE_PORTS: { catalog: 9001, profile: 9002 },
  FLOCI_ENDPOINT: 'http://localhost:4566',
  S3_BUCKET: 'microapps-bundles',
};
```

Reglas aplicadas en este proyecto:

- **Host** → `getSharedDependencies(true)` (`eager: true`)
- **Remotes** → `getSharedDependencies(false)`
- **No** compartir `@react-navigation/*` (provoca `RUNTIME-006` / `loadShareSync`)

---

## 3. Configurar el HOST (consumer de remotes)

### 3.1 Entry Expo

```js
// apps/host/index.js
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
```

### 3.2 `rspack.config.mjs` del host

```js
// apps/host/rspack.config.mjs (resumen)
export default Repack.defineRspackConfig(({ mode, platform }) => {
  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    plugins: [
      new Repack.RepackPlugin(),
      new ExpoModulesPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'host',
        filename: 'host.container.js.bundle',
        dts: false,
        remotes: {
          catalog: `catalog@http://localhost:9001/${platform}/mf-manifest.json`,
          profile: `profile@http://localhost:9002/${platform}/mf-manifest.json`,
        },
        shared: getSharedDependencies(true),
      }),
    ],
  };
});
```

Contrato `name@url`:

- `catalog` / `profile` = nombres Federation  
- URL = manifiesto MF del remote (`mf-manifest.json`)

### 3.3 Tipos para imports federados

```ts
// apps/host/mf-modules.d.ts
declare module 'catalog/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}

declare module 'profile/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}
```

Sin esto, TypeScript no conoce `import('catalog/App')`.

---

## 4. UI del host: 2 botones → 2 remotes

### 4.1 Navegación

```tsx
// apps/host/src/navigation/RootNavigator.tsx
export type RootStackParamList = {
  Home: undefined;
  Catalog: undefined;
  Profile: undefined;
};

<Stack.Screen name="Home" component={HomeScreen} />
<Stack.Screen name="Catalog" options={{ title: 'Catálogo' }}>
  {() => <RemoteScreen remote="catalog" title="Catálogo" />}
</Stack.Screen>
<Stack.Screen name="Profile" options={{ title: 'Perfil' }}>
  {() => <RemoteScreen remote="profile" title="Perfil" />}
</Stack.Screen>
```

### 4.2 Home (los 2 botones)

```tsx
// apps/host/src/screens/HomeScreen.tsx
<Pressable onPress={() => navigation.navigate('Catalog')}>
  <Text>Abrir Catálogo</Text>
</Pressable>

<Pressable onPress={() => navigation.navigate('Profile')}>
  <Text>Abrir Perfil</Text>
</Pressable>
```

### 4.3 Carga remota con `React.lazy`

```tsx
// apps/host/src/screens/RemoteScreen.tsx
const remotes = {
  catalog: lazy(() => import('catalog/App')),
  profile: lazy(() => import('profile/App')),
};

export default function RemoteScreen({ remote, title }: Props) {
  const RemoteApp = remotes[remote];
  return (
    <Suspense fallback={<ActivityIndicator />}>
      <RemoteApp />
    </Suspense>
  );
}
```

Flujo en runtime:

1. Usuario toca el botón  
2. Navega a `Catalog` / `Profile`  
3. `import('catalog/App')` → Federation pide el manifiesto en `:9001`  
4. Re.Pack `ScriptManager` descarga el container JS  
5. Se monta el componente expuesto por el remote  

---

## 5. Configurar un REMOTE (catalog; profile es análogo)

### 5.1 Entry vacío (sin AppRegistry)

```js
// ../microapp-catalog/index.js
// Remote entry: no AppRegistry.
// El host (Expo) importa catalog/App vía Module Federation.
export {};
```

El remote **no** se registra como app raíz: solo espera ser importado.

### 5.2 UI expuesta

```tsx
// ../microapp-catalog/src/App.tsx
export default function CatalogApp() {
  return (
    <View>
      <Text>mini app · catalog</Text>
      <FlatList data={PRODUCTS} /* ... */ />
    </View>
  );
}
```

### 5.3 `rspack.config.mjs` del remote

```js
// ../microapp-catalog/rspack.config.mjs (resumen)
new Repack.plugins.ModuleFederationPluginV2({
  name: 'catalog',
  filename: 'catalog.container.js.bundle',
  dts: false,
  exposes: {
    './App': './src/App.tsx',  // ← clave pública que el host importa
  },
  shared: getSharedDependencies(false),
}),
```

Mapeo Federation:

| En el remote (`exposes`) | En el host (`import`) |
|--------------------------|------------------------|
| `'./App': './src/App.tsx'` | `import('catalog/App')` |

`profile` es igual cambiando `name`, `filename`, puerto `:9002` y el path de `App.tsx`.

### 5.4 Alineación Expo en remotes (`develop`)

Aunque **no** tienen binario nativo, se alinearon con el host:

- `app.json` (slug, package id, `extra.role = "remote"`)
- dependencia `expo`
- `ExpoModulesPlugin` en rspack
- `tsconfig` extends `expo/tsconfig.base`

---

## 6. Parches nativos: entry `index` (no virtual Metro)

Problema: Expo pide `.expo/.virtual-metro-entry.bundle`; Re.Pack sirve `index.bundle` → **404**.

### 6.1 Plugin de Expo Config

```js
// apps/host/plugins/withRepackEntry.js (idea)
function ensureAndroidJsEntry(contents) {
  // inserta en MainApplication.kt:
  // jsMainModulePath = "index"
}

// registrado en apps/host/app.json:
"plugins": ["./plugins/withRepackEntry.js"]
```

Tras `expo prebuild`, el host nativo queda así (Android):

```kotlin
ExpoReactHostFactory.getDefaultReactHost(
  context = applicationContext,
  packageList = PackageList(this).packages.apply { /* ... */ },
  jsMainModulePath = "index",  // ← crítico para Re.Pack
)
```

### 6.2 Script de respaldo

```bash
npm run prebuild      # expo prebuild + patch-native.js
npm run patch:native  # reaplicar si regeneraste android/ios
```

También aplica workaround SSL de Gradle en Windows (`Windows-ROOT`) para evitar `PKIX path building failed`.

### 6.3 Script android del host

```json
"android": "expo run:android --no-bundler"
```

`--no-bundler` = no arranca Metro/Expo bundler; usa el de `npm start` (Re.Pack en `:8081`).

---

## 7. Docker / Floci (S3 local)

### 7.1 Compose

```yaml
# docker-compose.yml
services:
  floci:
    image: floci/floci:latest
    ports:
      - "4566:4566"
    volumes:
      - ./infra/data:/app/data
    environment:
      FLOCI_STORAGE_MODE: persistent
      FLOCI_DEFAULT_REGION: us-east-1
```

### 7.2 Crear bucket

```js
// infra/scripts/create-bucket.js (resumen)
const endpoint = 'http://localhost:4566';
const bucket = 'microapps-bundles';

await fetch(`${endpoint}/${bucket}`, { method: 'PUT', /* ... */ });
```

Uso:

```bash
npm run docker:up
npm run s3:create-bucket
npm run s3:upload-demo
```

Hoy los `remotes` apuntan a **localhost**. El siguiente paso productivo es cambiar a URLs tipo:

```js
catalog: `catalog@http://localhost:4566/microapps-bundles/catalog/${platform}/mf-manifest.json`
```

Para agregar otra micro app desde un **repo nuevo** (contrato + checklist en el host): [`06-agregar-microapp-repo.md`](./06-agregar-microapp-repo.md).

(ajustando el path público según cómo Floci sirva objetos).

---

## 8. Arranque técnico (comandos)

```bash
# deps
npm install

# S3 local
npm run docker:up

# nativo host (una vez)
npm run prebuild

# 3 bundlers Re.Pack
npm start

# otra terminal — APK
npm run android

# Android emulator → localhost del host
adb reverse tcp:8081 tcp:8081
adb reverse tcp:9001 tcp:9001
adb reverse tcp:9002 tcp:9002
```

Verificación Federation:

```bash
curl http://localhost:9001/android/mf-manifest.json
curl http://localhost:9002/android/mf-manifest.json
```

Esperado: JSON con `exposes` → `App`.

---

## 9. Diagrama de dependencias Federation

```text
┌──────────────────────── host ────────────────────────┐
│  remotes:                                            │
│    catalog@http://localhost:9001/.../mf-manifest.json│
│    profile@http://localhost:9002/.../mf-manifest.json│
│  shared: react, react-native (eager, singleton)      │
│  UI: HomeScreen → RemoteScreen → lazy import         │
└──────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
┌──── catalog ────┐      ┌──── profile ────┐
│ exposes: ./App  │      │ exposes: ./App  │
│ shared: !eager  │      │ shared: !eager  │
│ no AppRegistry  │      │ no AppRegistry  │
└─────────────────┘      └─────────────────┘
```

---

## 10. Checklist de archivos “load-bearing”

| Archivo | Por qué importa |
|---------|-----------------|
| `apps/*/react-native.config.js` | Activa Re.Pack |
| `apps/host/rspack.config.mjs` | Remotes + shared eager |
| `../microapp-catalog/rspack.config.mjs` | `exposes: ./App` |
| `../microapp-profile/rspack.config.mjs` | `exposes: ./App` |
| `packages/shared/src/index.js` | Contrato shared |
| `apps/host/src/screens/RemoteScreen.tsx` | `lazy(() => import(...))` |
| `apps/host/mf-modules.d.ts` | Tipos Federation |
| `apps/host/plugins/withRepackEntry.js` | Entry nativo `index` |
| `docker-compose.yml` | Floci S3 |

---

## 11. Errores que ya resolvimos (referencia rápida)

| Error | Causa | Fix en código |
|-------|--------|----------------|
| `Unknown arguments: --no-packager` | Flag Expo viejo | `--no-bundler` |
| `PKIX path building failed` | SSL Java/Gradle | `Windows-ROOT` en gradle.properties |
| 404 `.virtual-metro-entry` | Entry Expo ≠ Re.Pack | `jsMainModulePath = "index"` |
| `RUNTIME-006 loadShareSync` | Navigation en shared | Solo react/RN en shared |
| `Cannot find module './bootstrap'` | Dynamic import frágil | Entry síncrono en `index.js` |

---

## 12. Cómo hablarlo con código delante

1. Abrir `rspack` del **host** → enseñar `remotes`.  
2. Abrir `rspack` de **catalog** → enseñar `exposes`.  
3. Abrir `RemoteScreen.tsx` → enseñar `import('catalog/App')`.  
4. Abrir `shared` → enseñar singleton.  
5. `curl` al `mf-manifest.json`.  
6. Demo en emulador: 2 botones → 2 UIs.

Con eso demuestras el circuito completo **config → contrato Federation → UI → runtime**.
