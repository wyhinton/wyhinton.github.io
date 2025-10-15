import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/ts/svg-nearest-point-demos.ts'], // 👈 your TS entry
  bundle: true,
  sourcemap: true,
  minify: false,
  outdir: 'assets/js', // output folder Jekyll serves
  format: 'esm',       // so you can use <script type="module">
  target: ['es2020'],
  platform: 'browser'
}).catch(() => process.exit(1));
