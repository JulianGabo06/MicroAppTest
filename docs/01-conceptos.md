# 01 — Conceptos (léelo primero)

## ¿Qué problema resolvemos?

En una app monolítica, **todo** el JS viaja en un solo binario. Si el equipo de “Catálogo” cambia una pantalla, hay que **republicar toda la app**.

Con **micro apps** (microfrontends móviles):

1. El **host** es el shell nativo (binario instalado).
2. Cada **mini app** es un bundle JS independiente.
3. El host **descarga** la mini app en runtime (dev server o S3/CDN).
4. Puedes actualizar Catálogo **sin** sacar una nueva versión de la tienda (solo JS).

## Piezas de este proyecto

| Término | En este repo |
|---------|----------------|
| Host / Shell | `apps/host` (este repo) |
| Remote / Mini app | repos hermanos `microapp-catalog`, `microapp-profile` |
| Bundler | **Re.Pack** (Rspack), no Metro |
| Runtime linking | **Module Federation v2** |
| Almacén de bundles | **Floci** (S3 local en Docker) |
| Consola cloud | **floci-ui** (opcional) |
| Lint / format | **Biome** (host + cada micro app) |

## Flujo en desarrollo

```text
1. npm start  (desde MicroApps; levanta host + remotes hermanos)
   ├─ host               escucha :8081
   ├─ microapp-catalog   escucha :9001  (mf-manifest.json + container)
   └─ microapp-profile   escucha :9002

2. Usuario toca "Abrir Catálogo"
3. Host hace import('catalog/App')
4. Module Federation pide http://localhost:9001/<platform>/mf-manifest.json
5. ScriptManager (Re.Pack) descarga y evalúa el JS
6. React monta la pantalla remota dentro del host
```

## Flujo “tipo producción” (DevOps)

```text
1. CI buildea catalog → catalog.container.js.bundle
2. CI sube el bundle a S3 (aquí: Floci :4566)
3. Host en release resuelve remotes desde s3://microapps-bundles/...
4. Usuario recibe la mini app actualizada sin reinstalar el APK/IPA
```

En este starter el paso 3 aún apunta a **localhost** (más simple). El Docker + scripts S3 ya están listos para practicar el upload.

Para sumar otra mini app desde un **repositorio externo**: ver [`06-agregar-microapp-repo.md`](./06-agregar-microapp-repo.md).  
Layout multi-repo + Biome: [`07-repos-separados-y-biome.md`](./07-repos-separados-y-biome.md).

## Expo vs Re.Pack (importante)

- Pediste **Expo** → el host usa el paquete `expo` + plugin `@callstack/repack-plugin-expo-modules`.
- Module Federation necesita código nativo de Re.Pack → **no** Expo Go.
- Flujo: `expo prebuild` genera `android/` / `ios/`, luego Re.Pack bundlear.

## Por qué 2 botones bastan

El brief era simple a propósito:

> App principal → vista con 2 botones → cada uno abre una micro app distinta.

Eso demuestra el contrato completo: **navegación en el host** + **carga remota** + **independencia de bundles**. El resto (auth, tabs, CDN firmado) es evolución.
