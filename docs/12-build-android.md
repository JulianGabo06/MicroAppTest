# 12 — Build Android para un dispositivo físico

APK **release** del host para instalar en un teléfono Android. El JS del host va dentro del
APK; las micro apps se descargan desde tu PC por la **Wi-Fi** (misma red).

```text
Teléfono (APK release)                         PC (misma Wi-Fi)
  host JS embebido (Hermes)                      npm run remotes:serve
  [Catálogo] ── http://<ip-pc>:9001/android/ ──► microapp-catalog/build (producción)
  [Perfil]   ── http://<ip-pc>:9002/android/ ──► microapp-profile/build (producción)
```

## Pasos

```bash
# 1) APK del host (detecta la IP del Wi-Fi; o: -- --host 192.168.x.x)
npm run android:release
# → dist/microapps-host-release.apk

# 2) Bundles de producción de las micro apps
npm run remotes:build

# 3) Servirlos (dejar corriendo mientras usas la app)
npm run remotes:serve
```

Instalar el APK:

- **USB:** `adb install -r dist/microapps-host-release.apk`
- **Sin cable:** copiar el `.apk` al teléfono (Drive, WhatsApp, cable…) y abrirlo. Android pedirá
  permitir "instalar apps de origen desconocido".

Luego: abrir **MicroApps Host** → *Abrir Catálogo* / *Abrir Perfil*. En la terminal de
`remotes:serve` se ve cada petición del teléfono.

## Qué hace `npm run android:release`

1. `expo prebuild --platform android` + `patch-native.js`: aplica el config plugin
   `withRepackEntry` con dos ajustes para release:
   - `build.gradle`: el JS se empaqueta con **Re.Pack** (`react-native/cli.js bundle`). Expo usa
     por defecto `@expo/cli export:embed`, que es Metro.
   - `AndroidManifest.xml`: `usesCleartextTraffic="true"`. Los remotes van por HTTP y Android
     bloquea HTTP en claro en release (opción `allowCleartextTraffic` en `app.json`).
2. `MF_REMOTES_HOST=<ip>`: `rspack.config.mjs` usa esa IP en las URLs de los remotes (por
   defecto `localhost`).
3. `gradlew assembleRelease` solo para `arm64-v8a` (casi todos los teléfonos actuales). Para
   más ABIs: `ANDROID_ARCHS=arm64-v8a,armeabi-v7a npm run android:release`.
4. En Windows compila desde una unidad virtual (`subst X:`), porque ninja no admite rutas de más
   de 260 caracteres y el repo está en una ruta larga (OneDrive).
5. Copia el APK a `dist/microapps-host-release.apk` (ignorado por git).

El APK va firmado con la clave **debug** de Android: sirve para instalarlo a mano, no para
publicarlo en Google Play.

## Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| Se queda en "Cargando Catálogo…" | `npm run remotes:serve` no está corriendo, el teléfono no está en la misma Wi-Fi o la IP del PC cambió (recompilar con la IP nueva) |
| No llega ninguna petición a `remotes:serve` | Firewall de Windows: permitir **Node.js** en redes públicas y privadas. Algunas redes (hoteles, universidades) aíslan los dispositivos entre sí |
| `Filename longer than 260 characters` | Compilar con `npm run android:release` (usa `subst`), no con `gradlew` directo |
| "App no instalada" al actualizar | Hay otra versión firmada con otra clave: desinstalar la anterior |
| Cambié código de una micro app | `npm run remotes:build` y volver a abrir la pantalla. No hace falta recompilar el APK |
| Cambié código del host | `npm run android:release` e instalar de nuevo |
