import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const createModule = require('@jspawn/ghostscript-wasm/gs.js');
try {
  const mod = await createModule({
    noInitialRun: true,
    locateFile: () => require.resolve('@jspawn/ghostscript-wasm/gs.wasm'),
  });
  console.log('module loaded, FS:', typeof mod.FS, 'callMain:', typeof mod.callMain);
} catch (e) {
  console.log('ERROR:', String(e).slice(0, 500));
}
