/**
 * Clona floci-ui (si no existe) e imprime cómo levantar la consola web.
 * Repo: https://github.com/floci-io/floci-ui
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(__dirname, '..', 'floci-ui');
const repo = 'https://github.com/floci-io/floci-ui.git';

if (!fs.existsSync(target)) {
  console.log('Clonando floci-ui…');
  execSync(`git clone --depth 1 ${repo} "${target}"`, { stdio: 'inherit' });
} else {
  console.log('floci-ui ya existe en infra/floci-ui');
}

console.log(`
Siguiente paso — consola web de Floci:

  cd infra/floci-ui
  docker compose up

UI:  http://localhost:4500
API: http://localhost:4501
S3:  http://localhost:4566  (servicio floci del compose de floci-ui)

Nota: el docker-compose de la raíz de MicroApps ya levanta solo Floci (:4566)
para practicar S3 sin clonar todo. Usa floci-ui cuando quieras la consola visual.
`);
