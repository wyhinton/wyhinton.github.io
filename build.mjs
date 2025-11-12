import { globby } from 'globby';
import esbuild from 'esbuild';
import path from 'path';

console.log('🔨 Building TypeScript files...');
const startTime = performance.now();

const entryPoints = await globby('src/ts/**/*.ts');
console.log(`📁 Found ${entryPoints.length} TypeScript files`);

for (const entry of entryPoints) {
  const outFile = entry
    .replace(/^src[\\/]/, '')   // remove 'src/'
    .replace(/^ts[\\/]/, '');   // optional: remove 'ts/' prefix
  
  console.log(`   📝 Building: ${entry} → assets/js/${outFile.replace(/\.ts$/, '.js')}`);
  
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

const endTime = performance.now();
console.log(`✅ Build completed in ${(endTime - startTime).toFixed(2)}ms`);
console.log(`📦 Output directory: assets/js/`);