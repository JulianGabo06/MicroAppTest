# 02 — Re.Pack y Module Federation (paso a paso)

## ¿Qué es Re.Pack?

[Re.Pack](https://re-pack.dev/) reemplaza a **Metro** (el bundler default de React Native) por **Rspack/webpack**. Eso habilita:

- Module Federation (microfrontends)
- Code splitting avanzado
- Ecosistema webpack (plugins, loaders)

## Qué ya quedó configurado

### A) Apuntar la CLI a Re.Pack

En **cada** app (`host`, `catalog`, `profile`):

```js
// react-native.config.js
module.exports = {
  commands: require('@callstack/repack/commands/rspack'),
};
```

Con esto, `react-native start` y `react-native bundle` usan Rspack.

### B) Host: declarar remotes

`apps/host/rspack.config.mjs`:

```js
new Repack.plugins.ModuleFederationPluginV2({
  name: 'host',
  remotes: {
    catalog: `catalog@http://localhost:9001/${platform}/mf-manifest.json`,
    profile: `profile@http://localhost:9002/${platform}/mf-manifest.json`,
  },
  shared: getSharedDependencies(true), // eager: true en el host
})
```

- `catalog@url` = nombre del remote + URL del manifiesto.
- `shared` con `singleton: true` = una sola copia de React / RN (si no, se rompen los hooks).

También está `ExpoModulesPlugin` para poder usar paquetes Expo.

### C) Mini apps: exponer pantallas

`../microapp-catalog/rspack.config.mjs` (igual idea en profile):

```js
exposes: {
  './App': './src/App.tsx',
}
```

El entry `index.js` del remote **no** registra `AppRegistry`: solo exporta módulos para el host.

### D) Cargar en UI

```tsx
const Catalog = React.lazy(() => import('catalog/App'));
```

`catalog/App` no es un archivo local: es el contrato Federation (`nombre/exposición`).

Tipos en `apps/host/mf-modules.d.ts`.

## Cómo verificar que Federation vive

1. Con `npm start`, abre en el navegador:
   - http://localhost:9001/android/mf-manifest.json  
   - http://localhost:9002/android/mf-manifest.json  
2. Debes ver `exposes` con `./App`.
3. En la app, al abrir Catálogo, el network/log de Re.Pack muestra la descarga.

## Puertos

| Proceso | Puerto | Manifiesto |
|---------|--------|------------|
| host | 8081 | (entry del shell) |
| catalog | 9001 | `/<platform>/mf-manifest.json` |
| profile | 9002 | `/<platform>/mf-manifest.json` |

## Errores comunes

| Síntoma | Causa probable |
|---------|----------------|
| Spinner infinito en Catálogo | Servidor `:9001` apagado |
| Crash de hooks | React duplicado (shared mal configurado) |
| `Can't resolve @swc/helpers` | Falta `@swc/helpers` en devDependencies |
| `swc.transformSync is not a function` | Usa `@rspack/core@1.4.x` + `@swc/core` (ya pinneados) |
| `RUNTIME-006` / `loadShareSync` | No compartas `@react-navigation/*` en MF shared |
| Expo Go no carga | Esperado: usa development build |
| Android no alcanza localhost | Corre `adb reverse` de los 3 puertos |
| 404 `.expo/.virtual-metro-entry` | `MainApplication` debe usar `jsMainModulePath = "index"` |

## Siguiente nivel (opcional)

Cambiar remotes a S3:

```js
catalog: `catalog@http://localhost:4566/microapps-bundles/catalog/${platform}/mf-manifest.json`
```

(ajustando path público / virtual-hosted style según cómo Floci sirva objetos).

Para producción real suele usarse `ScriptManager.shared.addResolver(...)` con CDN versionado.
