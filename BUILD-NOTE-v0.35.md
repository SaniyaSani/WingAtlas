# v0.35 build note

The TypeScript/TSX source was syntax-validated with the available TypeScript compiler, and the generated browser JavaScript passes `node --check`.

The sandbox used for this morphology pass could not resolve `registry.npmjs.org`, so the normal `npm install` / Vite-Vinext production build could not be rerun here. To keep the package directly uploadable to GitHub Pages, the included `docs/` folder was regenerated as browser-native ES modules and uses an import map for React 19.2.6 from `esm.sh`.

On a normal development machine with npm network access, the preferred release build remains:

```bash
npm install
npm run build:github
```

That command can replace `docs/` with the ordinary bundled Vite output. The source changes in `app/` are the canonical v0.35 implementation.
