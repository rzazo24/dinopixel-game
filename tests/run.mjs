// Runs everything: syntax check of every JS file, then the API and UI suites.
//   node tests/run.mjs            (needs Node 22+ and Chrome/Chromium; set CHROME_BIN if Chrome is not on the PATH)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const files = ['sw.js', ...fs.readdirSync(path.join(ROOT, 'js')).map((f) => 'js/' + f), ...fs.readdirSync(path.join(ROOT, 'api')).map((f) => 'api/' + f), ...fs.readdirSync(path.join(ROOT, 'tests')).map((f) => 'tests/' + f)]
  .filter((f) => /\.(m?js)$/.test(f));
let failed = 0;
console.log('== Syntax');
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', path.join(ROOT, f)], { encoding: 'utf8' });
  if (r.status !== 0) { failed++; console.log('  FAIL  ' + f + '\n' + r.stderr); }
}
console.log(failed ? `-- Syntax: ${failed} file(s) with errors` : `-- Syntax: ${files.length}/${files.length} files ok`);

for (const s of ['api.test.mjs', 'ui.test.mjs']) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tests', s)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? '\nTESTS FAILED' : '\nALL TESTS PASSED');
process.exit(failed ? 1 : 0);
