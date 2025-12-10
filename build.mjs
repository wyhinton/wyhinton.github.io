import { globby } from 'globby';
import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

console.log('🔨 Building TypeScript and React files...');
const startTime = performance.now();

// Build existing TypeScript files
const tsEntryPoints = await globby('src/ts/**/*.ts');
console.log(`📁 Found ${tsEntryPoints.length} TypeScript files`);

for (const entry of tsEntryPoints) {
  const outFile = entry
    .replace(/^src[\\/]/, '')
    .replace(/^ts[\\/]/, '');
  
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

// Build React art app if it exists
if (fs.existsSync('src/art/index.tsx')) {
  console.log('   📝 Building React art app...');
  try {
    await esbuild.build({
      entryPoints: ['src/art/index.tsx'],
      bundle: true,
      sourcemap: true,
      format: 'iife',
      target: ['es2020'],
      outfile: 'assets/js/art-app.bundle.js',
      platform: 'browser',
      jsx: 'automatic',
      external: [],
    });
    console.log('   ✅ React art app built successfully');
  } catch (error) {
    console.error('   ❌ Failed to build React art app:', error.message);
  }
} else {
  console.log('   ⚠️  No React art app found at src/art/index.tsx');
}

const endTime = performance.now();
console.log(`✅ Build completed in ${(endTime - startTime).toFixed(2)}ms`);
console.log(`📦 Output directory: assets/js/`);