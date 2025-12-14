import { globby } from 'globby';
import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from "url";
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
    src: `/assets/art_assets/curation/${filename}`,
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
    src: `/assets/art_assets/curation/${filename}`,
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
    "assets/art_assets/curation/**/*.{png,jpg,jpeg,webp,mp4,webm, PNG, JPG, JPEG}"
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

// --------------------------------------------------
// Generate work projects manifest
// --------------------------------------------------

async function generateWorkManifest() {
  console.log("🔨 Generating work projects manifest...");

  const workDir = "assets/art_assets/work";
  
  // Get all subdirectories in the work folder
  const projectDirs = await globby(`${workDir}/*/`, { onlyDirectories: true });
  
  const projects = [];

  for (const projectPath of projectDirs) {
    const projectName = path.basename(projectPath);
    
    // Skip if it's a hidden directory or common non-project folders
    if (projectName.startsWith('.') || projectName === 'node_modules') {
      continue;
    }

    console.log(`   📁 Processing project: ${projectName}`);
    
    // Find all image files in this project directory
    const imageFiles = await globby(`${projectPath}/**/*.{png,jpg,jpeg,webp,gif,PNG,JPG,JPEG,WEBP,GIF}`);
    
    // Find the markdown description file
    const mdFiles = await globby(`${projectPath}/**/*.md`);
    
    let description = "";
    if (mdFiles.length > 0) {
      try {
        description = fs.readFileSync(mdFiles[0], 'utf-8').trim();
      } catch (error) {
        console.warn(`   ⚠️  Could not read description file for ${projectName}: ${error.message}`);
      }
    }

    // Convert file paths to web-accessible URLs
    const images = imageFiles.map(filePath => {
      const relativePath = filePath.replace(/\\/g, '/');
      return `/${relativePath}`;
    });

    const project = {
      id: projectName,
      name: projectName.charAt(0).toUpperCase() + projectName.slice(1), // Capitalize first letter
      slug: slugify(projectName),
      description,
      images,
      imageCount: images.length,
      folderPath: `/${projectPath.replace(/\\/g, '/')}`
    };

    projects.push(project);
  }

  // Sort projects alphabetically by name
  projects.sort((a, b) => a.name.localeCompare(b.name));

  const outputPath = "src/generated/workManifest.ts";
  fs.mkdirSync("src/generated", { recursive: true });

  const tsContent = `
// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY
// Generated by build.mjs

export interface WorkProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  imageCount: number;
  folderPath: string;
}

export const workProjects: WorkProject[] = ${JSON.stringify(projects, null, 2)} as const;
`;

  fs.writeFileSync(outputPath, tsContent);
  
  console.log(`✅ Work manifest generated: ${projects.length} projects found`);
  projects.forEach(project => {
    console.log(`   📂 ${project.name}: ${project.imageCount} images`);
  });
}

await generateWorkManifest();

const endTime = performance.now();
console.log(`✅ Build completed in ${(endTime - startTime).toFixed(2)}ms`);
console.log(`📦 Output directory: assets/js/`);