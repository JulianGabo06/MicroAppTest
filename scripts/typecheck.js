/**
 * Typecheck del proyecto en el directorio actual. Equivale a:
 *   tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules | grep 'error TS'
 * pero multiplataforma (npm usa cmd.exe en Windows) y con exit code correcto:
 * 0 si no hay errores propios, 1 si los hay (grep devolvería lo contrario).
 */
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');

const cwd = process.cwd();
const tsc = createRequire(path.join(cwd, 'package.json')).resolve('typescript/bin/tsc');

const result = spawnSync(process.execPath, [tsc, '--noEmit', '--skipLibCheck'], {
  cwd,
  encoding: 'utf8',
});
if (result.error) throw result.error;

const errors = `${result.stdout}${result.stderr}`
  .split(/\r?\n/)
  .filter((line) => !line.includes('node_modules') && line.includes('error TS'));

const name = path.basename(cwd);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\n✗ ${name}: ${errors.length} error(es) de TypeScript`);
  process.exit(1);
}
console.log(`✓ ${name}: sin errores de TypeScript`);
