# Incremental decomposition plan

v0.48 extracted pure logic and two shared components without moving large JSX blocks. The next steps keep every step small, buildable and testable.

## Done in v0.48
- `app/lib/wingTypes.ts` — shared Mapper types (were local to `page.tsx`).
- `app/lib/templateSchema.ts` — import validation and migration (was inline in `loadTemplateMap`).
- `app/lib/mapperAutosave.ts`, `app/lib/safeStorage.ts` — persistence.
- `app/lib/referenceModel.ts`, `app/lib/referenceIndex.ts` — reference data model.
- `app/lib/compareMath.ts` — Compare geometry.
- `app/components/SearchCombobox.tsx`, `app/components/ReferenceMetadataCard.tsx`.
- `prepareNewWing()` replaced three duplicated reset blocks in `page.tsx`.

## Proposed next steps (one per release, each with tests)
1. `app/lib/imageTracing.ts` — move `makeAutoTrace`, `traceBetweenAnchors`, skeleton/thinning and stitching helpers out of `page.tsx` (pure functions over `ImageData`; testable with synthetic masks).
2. `app/lib/templateGeometry.ts` — `smoothPath`, `fitTemplateNodes`, `transformTemplateNodes`, `withSharedJunctionCorners`, `scaleCurveHandles`.
3. `app/components/AppShell.tsx` — topbar, mode nav and theme toggle.
4. `app/mapper/useMapperHistory.ts` and `useMapperAutosave.ts` — hooks around the history and autosave state now in `Home`.
5. `app/mapper/TemplateToolbar.tsx`, `MapperCanvas.tsx`, `MapperSidebar.tsx` — split the Mapper JSX; state stays in one `useMapperState` hook until the boundaries are stable.
6. `app/atlas/familyProfiles.ts`, `app/atlas/tree.ts` — move the authored profiles, sampled tree and layout functions out of `PhyloAtlas.tsx`.
7. `app/atlas/FlowBoard.tsx`, `FamilyInspector.tsx` — split the Atlas JSX.
8. CSS: consolidate the layered history in `globals.css` behind the `--ew-*` tokens, one feature section at a time, with screenshot comparison in both themes.
