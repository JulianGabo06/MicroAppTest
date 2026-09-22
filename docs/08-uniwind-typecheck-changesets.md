# 08 — Uniwind, typecheck y Changesets

Configuración común al host y a las micro apps (`microapp-catalog`, `microapp-profile`).

---

## Uniwind (Tailwind v4 para React Native)

### Por qué hay un plugin propio

Uniwind solo trae adaptadores para **Metro** (`uniwind/metro`) y **Vite**. Este proyecto
compila con **Re.Pack/Rspack**, así que `packages/uniwind-rspack` replica lo que hace
`withUniwindConfig`:

| Pieza | Qué hace |
|-------|----------|
| `src/imports-loader.js` | Reescribe `'react-native'` → `'uniwind/components'` en el código de la app (no en node_modules). Así `View`, `Text`, `Pressable`… aceptan `className`. |
| `src/loader.js` | Compila `global.css` a JS (`Uniwind.__reinit(stylesheet)`) usando el transformer de Metro que publica Uniwind, con `metro-transform-worker` sustituido por un passthrough. |
| `src/index.js` | `UniwindRspackPlugin`: registra las dos reglas anteriores. |

La reescritura se hace en el código fuente (y no con un hook de resolución) porque el
`ConsumeSharedPlugin` de Module Federation consume `react-native` como shared **antes**
de que corran los hooks de JS de Rspack.

> El loader usa internals de Uniwind (`dist/metro/transformer.cjs`). Al subir de versión
> `uniwind`, recompila host y remotes y comprueba que los estilos siguen aplicándose.

### Por qué cada app compila su propio CSS

`Uniwind.__reinit` **reemplaza** el stylesheet global. Si `uniwind` fuera singleton en
`shared`, cada remote que carga pisaría las clases del host y de los demás remotes. Por eso:

- `uniwind` **no** está en `getSharedDependencies()`; cada bundle lleva su copia.
- Cada app tiene su `global.css` y Tailwind solo escanea las clases de esa app.
- Un remote puede desplegarse con clases nuevas sin recompilar el host.

### Uso

```ts
// rspack.config.mjs
new UniwindRspackPlugin({ cssEntryFile: './global.css', platform }),
```

```css
/* global.css */
@import 'tailwindcss';
@import 'uniwind';
```

- **Host:** `import '../global.css'` en `src/App.tsx`.
- **Remote:** `import '../global.css'` en el módulo expuesto (`src/App.tsx`). El `index.js` del remote no se ejecuta en el host.
- Los remotes consumen el plugin como `"@microapps/uniwind-rspack": "file:../MicroApps/packages/uniwind-rspack"` (requiere el layout de repos hermanos).
- `uniwind-types.d.ts` lo genera el build (tipos de `className`). Se versiona para que `typecheck` funcione sin compilar y Biome lo ignora.

```tsx
<View className="flex-1 items-center bg-slate-900 p-6">
  <Text className="text-2xl font-bold text-white">Hola</Text>
</View>
```

---

## Typecheck

`scripts/typecheck.js` (copiado en cada repo) equivale a:

```bash
tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules | grep 'error TS'
```

pero funciona en Windows (npm usa `cmd.exe`) y sale con código 1 solo si hay errores propios.

| Comando (raíz del host) | Qué revisa |
|-------------------------|------------|
| `npm run typecheck` | host |
| `npm run typecheck:all` | host + catalog + profile |
| `npm run typecheck:catalog` / `typecheck:profile` | un remote |

En cada micro app: `npm run typecheck`.

---

## Changesets

Cada repo tiene su `.changeset/`: host (monorepo: `host`, `@microapps/shared`,
`@microapps/uniwind-rspack`) y cada micro app (paquete único), porque se versionan y
despliegan por separado.

```bash
npm run changeset          # crea un changeset (paquetes + tipo de bump)
npm run changeset:status   # qué se versionaría respecto a main
npm run changeset:version  # aplica bumps y escribe CHANGELOG.md
```

- `baseBranch: main`, `commit: false`.
- Todos los paquetes son privados: `privatePackages.version = true`, `tag = false` (se versionan pero no se publican).
