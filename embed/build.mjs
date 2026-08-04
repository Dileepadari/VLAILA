/**
 * Bundle the widget into a single self-contained file.
 *
 * IIFE rather than ESM: it has to work as a plain <script> tag on static pages
 * from 2019 with no module support and no build step of their own. ES2019 as
 * the target for the same reason -- these pages are opened on whatever browser
 * a student in a college lab happens to have.
 */

import { build } from 'esbuild';
import { mkdirSync, statSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const dev = process.argv.includes('--dev');

mkdirSync('dist', { recursive: true });

const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  outfile: 'dist/vlaila.js',
  minify: !dev,
  sourcemap: dev ? 'inline' : true,
  legalComments: 'none',
  banner: {
    js: '/*! VLAILA - Virtual Labs AI Lab Assistant | AGPL-3.0 | vlab.co.in */',
  },
  logLevel: 'info',
};

if (watch) {
  const ctx = await (await import('esbuild')).context(options);
  await ctx.watch();
  console.log('watching src/ …');
} else {
  await build(options);
  const { size } = statSync('dist/vlaila.js');
  console.log(`dist/vlaila.js  ${(size / 1024).toFixed(1)} kB`);
}
