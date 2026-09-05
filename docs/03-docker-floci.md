# 03 — Docker + Floci (S3 local)

La idea de Abuelo Campu: **simular S3** con Docker y practicar DevOps. Usamos el ecosistema [Floci](https://floci.io) / [floci-ui](https://github.com/floci-io/floci-ui).

## Opción A — Solo el runtime S3 (recomendada para empezar)

En la raíz del repo:

```bash
docker compose up -d
```

Eso levanta:

| Servicio | Puerto | Para qué |
|----------|--------|----------|
| `floci` | 4566 | API compatible con AWS (S3, etc.) |

Healthcheck:

```bash
curl http://localhost:4566/_floci/health
```

Crear bucket y subir demo:

```bash
npm run s3:create-bucket
npm run s3:upload-demo
```

Credenciales locales (convención Floci/LocalStack):

```bash
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=us-east-1
```

Con AWS CLI (si lo tienes):

```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://microapps-bundles
aws --endpoint-url=http://localhost:4566 s3 ls
aws --endpoint-url=http://localhost:4566 s3 cp ./algo.txt s3://microapps-bundles/
```

## Opción B — Consola visual floci-ui

El compose oficial de floci-ui monta UI + API + Floci:

```bash
npm run docker:ui
cd infra/floci-ui
docker compose up
```

Luego abre:

- UI: http://localhost:4500  
- API: http://localhost:4501  
- Runtime: http://localhost:4566  

En **Cloud Explorer → Storage** verás buckets/objetos reales (no mocks).

> Si ya tienes Floci de la Opción A en `:4566`, apaga uno de los dos stacks para no pelear el puerto:

```bash
docker compose down   # en la raíz MicroApps
```

## ¿Para qué sirve en este proyecto?

1. **Practicar** subir artefactos (`*.container.js.bundle`, `mf-manifest.json`).
2. **Contar en portafolio**: “host carga mini apps desde object storage local”.
3. **Base DevOps**: mismo flujo que CDN/S3 en la nube, sin gastar AWS.

## Flujo mental de release de una mini app

```text
build catalog (Re.Pack)
   → output: catalog.container.js.bundle + mf-manifest.json
   → upload a s3://microapps-bundles/catalog/android/...
   → el host (release) ya apunta al manifiesto en S3
   → usuarios reciben la nueva UI al abrir Catálogo
```

## Troubleshooting

| Problema | Qué hacer |
|----------|-----------|
| `ECONNREFUSED :4566` | `docker compose up -d` y espera ~10s |
| Docker socket error en Windows | Activa integración WSL2 / “Expose daemon” en Docker Desktop |
| Puerto 4566 ocupado | `docker ps` y para el otro Floci/LocalStack |
| Bucket create falla con fetch | Usa AWS CLI con `--endpoint-url` (más fiable) |

## Enlaces

- Repo UI: https://github.com/floci-io/floci-ui  
- Este compose simple: `docker-compose.yml` en la raíz
