# MicroApps

Monorepo de **microfrontends móviles** con:

- **Expo** (host + remotes alineados)
- **Re.Pack** + **Module Federation** (mini apps en runtime)
- **Floci** en Docker (S3 local para practicar DevOps)

La app principal muestra **2 botones**; cada uno carga una micro app distinta (`catalog` / `profile`).

```
Host (:8081) ──► [Catálogo] → catalog (:9001)
             └──► [Perfil]   → profile (:9002)
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

> Re.Pack **no** corre en Expo Go. Hay que generar nativo con `npm run prebuild`.

---

## Clone y arranque (otra persona)

```bash
git clone git@github.com:JulianGabo06/MicroAppTest.git
cd MicroAppTest
git checkout develop   # rama de trabajo

# 1) deps + docker + bucket S3 (si Docker está disponible)
npm run setup

# 2) generar android/ios del host + parches Re.Pack
npm run prebuild

# 3) tres bundlers (host, catalog, profile)
npm start
```

En **otra terminal**:

```bash
npm run android
# o
npm run ios
```

### Emulador Android

Si las mini apps no cargan:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:9001 tcp:9001
adb reverse tcp:9002 tcp:9002
```

### Qué deberías ver

1. Home **MicroApps** con 2 botones  
2. **Abrir Catálogo** → lista remota (`catalog`)  
3. **Abrir Perfil** → pantalla remota (`profile`)  
4. Si apagas el server `:9001` y abres Catálogo → falla el load (prueba de que es remoto)

---

## Estructura

```text
MicroApps/
├── apps/
│   ├── host/                 # Shell Expo + Re.Pack (ÚNICO binario nativo)
│   │   ├── plugins/          # withRepackEntry (prebuild)
│   │   ├── rspack.config.mjs
│   │   └── src/
│   ├── catalog/              # Remote Expo+Re.Pack (solo JS, :9001)
│   └── profile/              # Remote Expo+Re.Pack (solo JS, :9002)
├── packages/shared/          # getSharedDependencies() para MF
├── scripts/
│   ├── setup.js              # post-clone
│   └── patch-native.js       # re-parche entry + Gradle SSL
├── infra/scripts/            # S3 / floci-ui helpers
├── docs/                     # Notas de estudio
├── docker-compose.yml
├── package.json              # npm workspaces
└── README.md
```

### Roles (importante)

| App | Expo | Nativo (`android`/`ios`) | Rol |
|-----|------|---------------------------|-----|
| `host` | Sí | Sí (`expo prebuild`) | Shell: navegación + carga remotes |
| `catalog` | Sí (`app.json` + deps + plugin) | **No** | Remote MF: solo bundle JS |
| `profile` | Sí (`app.json` + deps + plugin) | **No** | Remote MF: solo bundle JS |

Las mini apps **no** se abren con Expo Go ni con `expo run:*`. Viven dentro del host. Alinean versión de `expo` / `react` / `react-native` y usan `@callstack/repack-plugin-expo-modules`.

---

## Scripts npm (raíz)

| Comando | Descripción |
|---------|-------------|
| `npm run setup` | Install + Docker Floci + bucket |
| `npm run prebuild` | `expo prebuild` + parches nativos Re.Pack |
| `npm start` | Host + catalog + profile en paralelo |
| `npm run android` / `ios` | Corre el host (`--no-bundler`; usa los servers de `npm start`) |
| `npm run typecheck` | TypeScript en las 3 apps |
| `npm run docker:up` | Solo Floci |
| `npm run docker:ui` | Clona floci-ui (consola web) |
| `npm run s3:create-bucket` | Crea `microapps-bundles` |
| `npm run patch:native` | Reaplica nativo si regeneraste `android/`/`ios/` |

---

## Piezas importantes (por si regeneras nativo)

1. **Entry JS**  
   Re.Pack sirve `index.bundle`. Expo por defecto pide `.expo/.virtual-metro-entry` → 404.  
   El plugin `apps/host/plugins/withRepackEntry.js` + `scripts/patch-native.js` dejan `jsMainModulePath = "index"`.

2. **Module Federation `shared`**  
   Solo `react` + `react-native` (singleton, eager en host).  
   No compartir `@react-navigation/*` (provoca `RUNTIME-006`).

3. **SSL en Windows**  
   - npm: `.npmrc` con `strict-ssl=false` (redes con antivirus/proxy)  
   - Gradle: trust store `Windows-ROOT` (lo aplica el prebuild/parche)

4. **Workspaces**  
   Todo se instala desde la **raíz** con `npm install`. No hace falta entrar a cada app.

---

## Floci / S3

```bash
npm run docker:up
curl http://localhost:4566/_floci/health
npm run s3:create-bucket
npm run s3:upload-demo
```

Consola visual opcional:

```bash
npm run docker:ui
cd infra/floci-ui && docker compose up
# http://localhost:4500
```

---

## Notas de estudio

Las guías paso a paso viven en [`docs/`](docs/) (conceptos, Re.Pack, Docker). Úsalas para entender el “por qué”; este README es el contrato para clonar y correr.

---

## Referencias

- [Re.Pack](https://re-pack.dev/)
- [Module Federation](https://module-federation.io/)
- [Callstack Super App Showcase](https://github.com/callstack/super-app-showcase)
- [floci-ui](https://github.com/floci-io/floci-ui)
- [Expo Modules + Re.Pack](https://re-pack.dev/docs/guides/expo-modules)
