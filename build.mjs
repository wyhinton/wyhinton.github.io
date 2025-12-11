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
// --------------------------------------------------
// Generate enriched art asset manifest
// --------------------------------------------------

console.log("🎨 Generating enriched art asset manifest...");

const MONTH_MAP = {
  JAN: 1, JANUARY: 1,
  FEB: 2, FEBRUARY: 2,
  MAR: 3, MARCH: 3,
  APR: 4, APRIL: 4,
  MAY: 5,
  JUN: 6, JUNE: 6,
  JUL: 7, JULY: 7,
  AUG: 8, AUGUST: 8,
  SEP: 9, SEPTEMBER: 9,
  OCT: 10, OCTOBER: 10,
  NOV: 11, NOVEMBER: 11,
  DEC: 12, DECEMBER: 12,
};

function normalizeCity(tokens) {
  return tokens
    .map(t => t.charAt(0) + t.slice(1).toLowerCase())
    .join(" ");
}

function slugify(str) {
  return str.toLowerCase().replace(/[^\w]+/g, "-");
}

function parseFilename(filename) {
  const original = filename;
  const ext = path.extname(filename).replace(".", "");
  const base = path.basename(filename, "." + ext);

  const tokens = base.split("_");

  let month = null;
  let monthStr = tokens[0]?.toUpperCase();

  if (!MONTH_MAP[monthStr]) {
  return {
    src: `/assets/art_assets/${filename}`,
    slug: slugify(base),
    city: null,
    date: null,
    year: null,
    month: null,
    day: null,
    ext,
    flags: []
  };
  }

  month = MONTH_MAP[monthStr];
  const day = Number(tokens[1]);
  const year = Number(tokens[2]);

  let remaining = tokens.slice(3);

  const FLAGS = new Set(["FINAL", "FLYER"]);
  const flags = remaining.filter(t => FLAGS.has(t));
  const cityTokens = remaining.filter(t => !FLAGS.has(t));

  const city = normalizeCity(cityTokens);

  const isoDate = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  return {
    src: `/assets/art_assets/${filename}`,
    slug: slugify(base),
    city,
    date: isoDate,
    year,
    month,
    day,
    ext,
    flags
  };
}

async function generateArtManifest() {
  const files = await globby(
    "assets/art_assets/**/*.{png,jpg,jpeg,webp,mp4,webm, PNG, JPG, JPEG}"
  );

  const assets = files
    .map(f => path.basename(f))
    .map(parseFilename)
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.localeCompare(a.date);
    });

  fs.mkdirSync("src/generated", { recursive: true });

  fs.writeFileSync(
    "src/generated/artManifest.ts",
    `
export type ArtAsset = {
  src: string
  slug: string
  city: string | null
  date: string | null
  year: number | null
  month: number | null
  day: number | null
  ext: string
  flags: string[]
}

export const artAssets: ArtAsset[] = ${JSON.stringify(assets, null, 2)};
`
  );

  console.log(`✅ Art manifest generated: ${assets.length} enriched assets`);
}

await generateArtManifest();


const endTime = performance.now();
console.log(`✅ Build completed in ${(endTime - startTime).toFixed(2)}ms`);
console.log(`📦 Output directory: assets/js/`);