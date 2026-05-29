// Builds the CommonJS distribution and marks dist-cjs as a CJS package.
// Mirrors the LazyLayers dual-build approach.
const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

// Resolve tsc whether typescript is local or hoisted to a workspace root.
let tsc;
try {
  tsc = require.resolve('typescript/bin/tsc');
} catch {
  tsc = join('node_modules', 'typescript', 'bin', 'tsc');
}

execFileSync(process.execPath, [tsc, '-p', 'tsconfig.cjs.json'], {
  stdio: 'inherit',
});

mkdirSync('dist-cjs', { recursive: true });
writeFileSync(
  join('dist-cjs', 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
);
