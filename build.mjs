import { globby } from 'globby';
import esbuild from 'esbuild';
import path from 'path';

const entryPoints = await globby('src/ts/**/*.ts');

for (const entry of entryPoints) {
  const outFile = entry
    .replace(/^src[\\/]/, '')   // remove 'src/'
    .replace(/^ts[\\/]/, '');   // optional: remove 'ts/' prefix
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    sourcemap: true,
    format: 'esm',
    target: ['es2020'],
    outfile: `assets/js/${outFile.replace(/\.ts$/, '.js')}`,
    platform: 'browser',
  });
}