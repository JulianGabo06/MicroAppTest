# 07 — Repos separados + Biome

Qué cambió respecto al monorepo inicial (todo en `apps/`).

## Layout

```text
Proyectos/
├── MicroApps/                 # host / base (este repo)
│   ├── apps/host/
│   ├── packages/shared/
│   ├── biome.json
│   └── …
├── microapp-catalog/          # repo git independiente
│   ├── src/App.tsx
│   ├── shared.js
│   ├── biome.json
│   └── …
└── microapp-profile/          # repo git independiente
    ├── src/App.tsx
    ├── shared.js
    ├── biome.json
    └── …
```

| Antes | Ahora |
|-------|--------|
| `apps/catalog`, `apps/profile` dentro del host | Carpetas hermanas con su propio `.git` |
| `npm start -w catalog` | `npm --prefix ../microapp-catalog start` |
| Shared vía workspace `@microapps/shared` | Host: workspace; remotes: `shared.js` local (mismas versiones) |

## Por qué

1. Cada equipo puede versionar y desplegar su mini app solo.
2. El host solo declara **URLs** de `mf-manifest.json` (Module Federation).
3. Subir un bundle a S3/Floci actualiza la mini app **sin** republicar el APK/IPA.

## Cómo arrancar

```bash
cd MicroApps
npm run setup      # instala host + remotes si existen al lado
npm run prebuild   # una vez
npm start          # host :8081 + catalog :9001 + profile :9002
```

Si falta un hermano:

```bash
# desde Proyectos/
git clone <url-catalog> microapp-catalog
git clone <url-profile> microapp-profile
cd MicroApps && npm run setup
```

## Publicar / clonar los repos

```bash
# Al lado de MicroApps:
git clone git@github.com:JulianGabo06/microapp-catalog.git
git clone git@github.com:JulianGabo06/microapp-profile.git
```

Remotes:

- https://github.com/JulianGabo06/microapp-catalog  
- https://github.com/JulianGabo06/microapp-profile  

## Biome (todos los proyectos)

Instalado como devDependency exacta `@biomejs/biome@2.3.11` en:

- `MicroApps/` (raíz del host)
- `microapp-catalog/`
- `microapp-profile/`

Cada uno tiene su `biome.json` (formatter + linter recommended, ignores de `android`/`ios`/`node_modules`/`build`).

```bash
# Host
cd MicroApps && npm run lint

# Catalog
cd ../microapp-catalog && npm run lint

# Profile
cd ../microapp-profile && npm run lint
```

Scripts comunes:

| Script | Acción |
|--------|--------|
| `npm run lint` | `biome check .` |
| `npm run lint:fix` | `biome check --write .` |
| `npm run format` | `biome format --write .` |

## Checklist si agregas otra micro app

Sigue [`06-agregar-microapp-repo.md`](./06-agregar-microapp-repo.md) y además:

1. Carpeta hermana `../microapp-<nombre>` con su `biome.json`.
2. Script en el host: `"start:<nombre>": "npm --prefix ../microapp-<nombre> start"`.
3. Entrada en `start:all` (concurrently) si quieres un solo comando.
4. `remotes` + UI en el host.
