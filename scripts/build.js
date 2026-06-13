// eslint-disable-next-line @typescript-eslint/no-require-imports
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['src/**/*.ts'],
  outdir: 'dist',

  platform: 'node',
  format: 'cjs',
  minify: true
});