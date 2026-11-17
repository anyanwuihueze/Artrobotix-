import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('build', { recursive: true });

await build({
  entryPoints: ['server.ts'],
  outfile: 'api/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['pg-native'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
