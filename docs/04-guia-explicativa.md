# Guía explicativa — qué se construyó y por qué

Esta guía sirve para **contar el proyecto** (entrevista, portafolio, revisión con el equipo).  
No reemplaza `01`–`03`: esos son notas técnicas; esto es el **relato ordenado**.

Repo: https://github.com/JulianGabo06/MicroAppTest  
Rama de trabajo: `develop`

---

## 1. El problema que resuelve

En una app móvil clásica (monolito):

- Todo el JavaScript viaja en **un solo binario**.
- Un cambio en “Catálogo” obliga a **republicar toda la app** en las tiendas.
- Varios equipos pisan el mismo código y el mismo ciclo de release.

La idea de **micro apps / microfrontends móviles**:

1. Hay un **host** (shell nativo instalado en el teléfono).
2. Hay **mini apps** (bundles JS independientes).
3. El host las **descarga en runtime** (dev server o S3/CDN).
4. Puedes actualizar una mini app **sin** sacar una nueva versión de la tienda (solo JS), siempre que no necesites código nativo nuevo.

Eso es lo que pedían practicar: **Expo + Re.Pack + estructura de micro apps + Docker (S3)**, de forma sencilla.

---

## 2. Qué hay en el monorepo (mapa mental)

```text
Host (Expo + Re.Pack)     ← único APK/IPA
   │
   ├─ botón "Catálogo" ──► remote catalog (:9001)  ← solo JS
   └─ botón "Perfil"   ──► remote profile (:9002)  ← solo JS
                │
                ▼
         Floci S3 (:4566)   ← simula object storage / CDN
```

| Pieza | Carpeta | Qué es |
|--------|---------|--------|
| Host / shell | `apps/host` | App Expo que el usuario instala. Navegación + 2 botones. |
| Micro app Catálogo | repo hermano `microapp-catalog` | Remote Module Federation. Lista de productos. |
| Micro app Perfil | repo hermano `microapp-profile` | Remote Module Federation. Pantalla de perfil. |
| Shared MF | `packages/shared` | `getSharedDependencies()` (react / react-native singleton). |
| S3 local | `docker-compose.yml` + `infra/scripts` | Floci emula AWS S3. |
| Docs estudio | `docs/01`–`03` | Conceptos, Re.Pack, Docker. |

**Regla clave:** solo el **host** tiene binario nativo (`expo prebuild` → `android/` / `ios/`).  
Las mini apps **no** se abren solas con Expo Go: son JS que el host carga.

---

## 3. Paso a paso de lo realizado

### Paso A — Monorepo con npm workspaces

Se armó un repo con:

- `apps/*` → host, catalog, profile  
- `packages/*` → shared  
- Un solo `npm install` en la raíz  

Así todas las apps comparten versiones alineadas de React / React Native / Expo.

### Paso B — Host con Expo + Re.Pack

1. App host con Expo (SDK 56) y entry `index.js`.
2. Se reemplazó Metro por **Re.Pack** (`react-native.config.js` → comandos Rspack).
3. `rspack.config.mjs` del host:
   - `ModuleFederationPluginV2`
   - `remotes`: catalog `:9001`, profile `:9002`
   - `ExpoModulesPlugin` (integración Expo + Re.Pack)
   - `shared`: solo `react` y `react-native` (eager + singleton)

4. UI pedida:
   - Home con **2 botones**
   - Cada uno navega a una pantalla que hace `React.lazy(() => import('catalog/App'))` / `profile/App`

### Paso C — Mini apps como remotes (no como apps instalables)

Al inicio catalog/profile eran solo RN + Re.Pack (sin Expo).  
En `develop` se **alinearon** con Expo:

- `app.json`
- dependencia `expo`
- `@callstack/repack-plugin-expo-modules`
- `tsconfig` al estilo Expo

Pero siguen siendo **remotes JS**:

- No generan su propio `android/` / `ios/`
- No usan `expo run:android`
- Solo exponen `./App` en Module Federation

### Paso D — Detalles que hubo que corregir al correr

| Problema | Qué significaba | Solución |
|----------|-----------------|----------|
| `expo run:android --no-packager` | Flag viejo | `--no-bundler` |
| Gradle `PKIX` / SSL | Antivirus/proxy rompe certificados Java | `Windows-ROOT` en `gradle.properties` |
| 404 `.expo/.virtual-metro-entry` | Expo pide un entry; Re.Pack sirve `index` | Plugin `withRepackEntry` + `jsMainModulePath = "index"` |
| Federation `RUNTIME-006` | `loadShareSync` con `@react-navigation` en shared | Shared solo react/RN |
| Mini apps sin Expo | Stack inconsistente con el host | Alineación en rama `develop` |

### Paso E — Docker + Floci (S3)

- `docker compose up` → Floci en `:4566`
- Scripts para crear bucket `microapps-bundles` y subir un demo
- Opcional: clonar [floci-ui](https://github.com/floci-io/floci-ui) para consola visual (DevOps / cloud local)

Hoy los remotes en **dev** salen de localhost (`:9001` / `:9002`).  
Floci está listo para el siguiente paso: **subir bundles a S3** y apuntar los `remotes` ahí (tipo CDN).

### Paso F — Repo y ramas

- Remoto: `JulianGabo06/MicroAppTest`
- `main` → commit inicial usable
- `develop` → trabajo continuo (alineación Expo de remotes, etc.)

Scripts útiles: `npm run setup`, `npm run prebuild`, `npm start`, `npm run android`.

---

## 4. Cómo explicarlo en 60 segundos

> “Armé un monorepo de microfrontends móviles. El host es una app Expo con Re.Pack. En la home hay dos botones; cada uno carga en runtime una mini app distinta con Module Federation. Las mini apps son bundles JS independientes (catalog y profile), alineadas con Expo pero sin binario propio. El nativo solo vive en el host. Además levanté Floci en Docker para simular S3 y practicar el flujo de publicar artefactos como en un CDN.”

---

## 5. Cómo explicarlo en 3 minutos (guión)

1. **Contexto:** monolito vs micro apps; release independiente de features JS.  
2. **Arquitectura:** host + 2 remotes + shared + Floci.  
3. **Por qué Re.Pack:** Metro no trae Module Federation; Re.Pack usa Rspack/webpack.  
4. **Demo:** `npm start` → tres ports → host en emulador → dos botones → remotes.  
5. **Prueba de independencia:** apagar `:9001` → Catálogo falla al cargar.  
6. **DevOps:** Floci = S3 local; siguiente paso = subir manifests/bundles.  
7. **Lecciones:** entry Expo vs Re.Pack, SSL en Windows, qué sí/no va en `shared`.

---

## 6. Flujo técnico (dev)

```text
1. npm start
   host    :8081  → index.bundle
   catalog :9001  → mf-manifest.json + container
   profile :9002  → mf-manifest.json + container

2. Usuario toca "Abrir Catálogo"

3. Host: import('catalog/App')  (Federation)

4. Runtime pide:
   http://localhost:9001/<platform>/mf-manifest.json

5. ScriptManager (Re.Pack) descarga y evalúa el JS remoto

6. React monta la UI de catalog dentro del host
```

Verificación rápida sin emulador:

```bash
curl http://localhost:9001/android/mf-manifest.json
curl http://localhost:9002/android/mf-manifest.json
```

Debes ver `exposes` con `App`.

---

## 7. Qué queda por delante (roadmap corto)

1. Subir bundles reales de catalog/profile a Floci (S3).  
2. Cambiar `remotes` del host de localhost → URLs S3.  
3. `ScriptManager` con resolver de producción (versión / fallback offline).  
4. CI que buildee cada mini app por separado.  
5. Más remotes desde repos externos: [`06-agregar-microapp-repo.md`](./06-agregar-microapp-repo.md).

---

## 8. Fuentes para estudiar a fondo

### Microfrontends móviles y Re.Pack

| Recurso | Por qué leerlo |
|---------|----------------|
| [Re.Pack — sitio oficial](https://re-pack.dev/) | Qué es Re.Pack y por qué reemplaza Metro. |
| [Re.Pack — Expo Modules](https://re-pack.dev/docs/guides/expo-modules) | Cómo integrar Expo Modules con Re.Pack. |
| [Re.Pack — Module Federation (docs v5 en progreso; ver también v4)](https://re-pack.dev/docs/features/module-federation) | Concepto MF en el ecosistema Re.Pack. |
| [Module Federation — docs oficiales](https://module-federation.io/) | Modelo mental de host / remote / shared. |
| [MF troubleshooting RUNTIME-006](https://module-federation.io/guide/troubleshooting/runtime#runtime-006) | El error de `loadShareSync` que vimos. |
| [Callstack Super App Showcase](https://github.com/callstack/super-app-showcase) | Ejemplo real host + remotes con Re.Pack. |
| [Callstack — Super App / case study](https://www.callstack.com/blog/case-study-super-app-template) | Cómo piensan el producto “super app”. |
| [Your first federated remote in React Native (DEV)](https://dev.to/warrendeleon/your-first-federated-remote-in-react-native-4omg) | Tutorial host + remote paso a paso. |
| [Re.Pack 5 announcement (Callstack)](https://www.callstack.com/blog/announcing-re-pack-5-with-rspack-module-federation) | Rspack + Module Federation 2. |

### Expo y React Native

| Recurso | Por qué leerlo |
|---------|----------------|
| [Expo docs](https://docs.expo.dev/) | Prebuild, development builds, vs Expo Go. |
| [Expo — development builds](https://docs.expo.dev/develop/development-builds/introduction/) | Por qué este proyecto no usa Expo Go. |
| [React Native — New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page) | Contexto del runtime moderno. |

### Bundlers (Metro vs Rspack/webpack)

| Recurso | Por qué leerlo |
|---------|----------------|
| [Metro](https://metrobundler.dev/) | Bundler default de RN (el que reemplazamos). |
| [Rspack](https://rspack.dev/) | Motor bajo Re.Pack 5. |
| [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) | Origen del patrón en web. |

### S3 / cloud local / DevOps

| Recurso | Por qué leerlo |
|---------|----------------|
| [Floci UI](https://github.com/floci-io/floci-ui) | Consola local multi-cloud (la que recomendaron). |
| [Floci](https://floci.io/) | Emulador compatible con APIs AWS. |
| [AWS S3 — conceptos](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) | Buckets, objetos, URLs (análogo a CDN de bundles). |
| [LocalStack](https://docs.localstack.cloud/) | Alternativa clásica de cloud local (contexto). |

### Arquitectura y lectura “de producto”

| Recurso | Por qué leerlo |
|---------|----------------|
| [micro-frontends.org](https://micro-frontends.org/) | Ideas originales (web); el paralelo mental con móvil. |
| [Martin Fowler — Micro Frontends](https://martinfowler.com/articles/micro-frontends.html) | Visión arquitectónica y trade-offs. |

---

## 9. Orden de estudio sugerido (1–2 semanas)

1. **Día 1–2:** este documento + `docs/01-conceptos.md` + demo local (`npm start` + android).  
2. **Día 3–4:** tutorial federated remote (DEV.to) + docs Module Federation (shared / remotes / exposes).  
3. **Día 5:** Super App Showcase (ojear estructura host/trading/wallet).  
4. **Día 6:** Expo development builds + por qué no Expo Go.  
5. **Día 7:** Floci/S3: subir un archivo, pensar el path de `mf-manifest.json` en un bucket.  
6. **Extra:** article de Martin Fowler + micro-frontends.org para discurso de arquitectura.

---

## 10. Frases útiles si te preguntan

- **“¿Por qué no Metro?”** → Porque necesitamos Module Federation; Re.Pack trae el ecosistema webpack/Rspack a RN.  
- **“¿Las mini apps son apps de la tienda?”** → No: son bundles JS; el usuario instala solo el host.  
- **“¿Puedo usar Expo Go?”** → No con Re.Pack MF; hace falta development build / prebuild.  
- **“¿Dónde entra S3?”** → Como CDN de artefactos: el host resuelve URLs de manifests/bundles remotos.  
- **“¿Qué va en shared?”** → Como mínimo react y react-native en singleton; demasiadas libs shared rompen el runtime (ej. RUNTIME-006).

---

Listo para explicar el proyecto de punta a punta.  
- Relato / pitch: este documento (`04`).  
- Código archivo por archivo: [`05-guia-tecnica-codigo.md`](./05-guia-tecnica-codigo.md).  
- Config Re.Pack / Docker: `docs/02-repack.md` y `docs/03-docker-floci.md`.
