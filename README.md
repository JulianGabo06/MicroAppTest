# MicroApps (host / base)

Shell de **microfrontends móviles** con:

- **Expo** + **Re.Pack** + **Module Federation**
- **Floci** en Docker (S3 local)
- **Biome** (lint + format)

Las mini apps **no** viven en este repo. Están en repos hermanos:

| Repo | Puerto | Federation |
|------|--------|------------|
| [microapp-catalog](https://github.com/JulianGabo06/microapp-catalog) | 9001 | `catalog` |
| [microapp-profile](https://github.com/JulianGabo06/microapp-profile) | 9002 | `profile` |

```
Host (:8081) ──► [Catálogo] → microapp-catalog (:9001)
             └──► [Perfil]   → microapp-profile (:9002)
                      │
                      ▼
              Floci S3 (:4566)
```

---

## Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js | ≥ 20 (ver `.nvmrc`) |
| npm | ≥ 10 |
| Docker Desktop | para Floci |
| Android Studio y/o Xcode | development build (no Expo Go) |
| Repos hermanos | `microapp-catalog` y `microapp-profile` junto a esta carpeta |

> Re.Pack **no** corre en Expo Go. Hay que generar nativo con `npm run prebuild`.

Layout en disco:

```text
Proyectos/
├── MicroApps/            ← este repo (host)
├── microapp-catalog/
└── microapp-profile/
```

---

## Clone y arranque

```bash
# 1) Host
git clone git@github.com:JulianGabo06/MicroAppTest.git MicroApps
cd MicroApps
git checkout develop

# 2) Mini apps (hermanas, al mismo nivel)
cd ..
git clone git@github.com:JulianGabo06/microapp-catalog.git
git clone git@github.com:JulianGabo06/microapp-profile.git
cd MicroApps

# 3) deps host + deps remotes + docker + bucket
npm run setup

# 4) nativo del host
npm run prebuild

# 5) tres bundlers (host + 2 remotes)
npm start
```

En **otra terminal**:

```bash
npm run android
# o
npm run ios
```

### Emulador Android

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:9001 tcp:9001
adb reverse tcp:9002 tcp:9002
```

### Qué deberías ver

1. Home **MicroApps** con 2 botones  
2. **Abrir Catálogo** → remote `catalog`  
3. **Abrir Perfil** → remote `profile`  
4. Si apagas `:9001` y abres Catálogo → falla el load (prueba de que es remoto)

---

## Estructura (host)

```text
MicroApps/
├── apps/
│   └── host/                 # ÚNICO binario nativo
│       ├── plugins/
│       ├── rspack.config.mjs # remotes → localhost:9001/9002
│       └── src/
├── packages/shared/          # getSharedDependencies() (contrato host)
├── scripts/
│   ├── setup.js              # host + instala remotes hermanos
│   └── patch-native.js
├── infra/scripts/
├── docs/
├── biome.json
├── docker-compose.yml
├── package.json
└── README.md
```

### Roles

| Pieza | Repo | Nativo | Rol |
|-------|------|--------|-----|
| host | este | Sí | Shell + carga remotes |
| catalog | `microapp-catalog` | No | Remote MF JS |
| profile | `microapp-profile` | No | Remote MF JS |

---

## Scripts npm (raíz)

| Comando | Descripción |
|---------|-------------|
| `npm run setup` | Install host + remotes hermanos + Floci + bucket |
| `npm run prebuild` | `expo prebuild` + parches Re.Pack |
| `npm start` | Host + catalog + profile en paralelo |
| `npm run start:host` / `start:catalog` / `start:profile` | Uno solo |
| `npm run android` / `ios` | Corre el host (`--no-bundler`) |
| `npm run lint` / `lint:fix` / `format` | Biome |
| `npm run typecheck` | TypeScript del host |
| `npm run docker:up` | Floci |
| `npm run s3:create-bucket` | Bucket `microapps-bundles` |

---

## Biome

```bash
npm run lint
npm run lint:fix
npm run format
```

Misma herramienta en host y en cada micro app (`biome.json` en cada repo).

---

## Piezas importantes

1. **Entry JS** — plugin `withRepackEntry` + `patch-native.js` → `jsMainModulePath = "index"`.
2. **Shared MF** — solo `react` + `react-native`. Las mini apps copian el contrato en su `shared.js`.
3. **SSL Windows** — `.npmrc` + Gradle `Windows-ROOT`.
4. **Remotes** — URLs en `apps/host/rspack.config.mjs` (localhost en dev; S3/Floci en prod).

---

## Floci / S3

```bash
npm run docker:up
curl http://localhost:4566/_floci/health
npm run s3:create-bucket
npm run s3:upload-demo
```

---

## Notas de estudio

- [`docs/06-agregar-microapp-repo.md`](docs/06-agregar-microapp-repo.md) — agregar otra micro app  
- [`docs/07-repos-separados-y-biome.md`](docs/07-repos-separados-y-biome.md) — layout multi-repo + Biome  
- [`docs/04-guia-explicativa.md`](docs/04-guia-explicativa.md)  
- [`docs/05-guia-tecnica-codigo.md`](docs/05-guia-tecnica-codigo.md)  
- [`docs/01-conceptos.md`](docs/01-conceptos.md)  
- [`docs/02-repack.md`](docs/02-repack.md)  
- [`docs/03-docker-floci.md`](docs/03-docker-floci.md)  

---

## Referencias

- [Re.Pack](https://re-pack.dev/)
- [Module Federation](https://module-federation.io/)
- [Biome](https://biomejs.dev/)
- [Callstack Super App Showcase](https://github.com/callstack/super-app-showcase)
- [floci-ui](https://github.com/floci-io/floci-ui)
