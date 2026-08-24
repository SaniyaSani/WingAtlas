# EntoWing v0.35 — Bombyliidae + Syrphidae morphotypes

## Added

- Three Bombyliidae morphotypes: Bombylius, Anthrax, and Usiinae.
- Three Syrphidae morphotypes: reviewed Eristalis, Ceriana-like, and a straighter-R4+5 working state.
- Family-specific clickable structures for Bombyliidae: `Rs`, `R4+5 stem`, `R4`, `R5`, `M2`, `M3+4`, `m-m`, `R5+M1`, and `CuA+A1`.
- Clickable Syrphidae `R4+5` appendix in the Ceriana-like morphotype.
- Morphotype switcher in the family inspector with topology-oriented recognition hints and source links.

## Fixed

- Bombyliidae are no longer Eristalis geometry with a different family label. Their radial system now keeps R4 and R5 separate, matching the reference diagrams.
- Opening a Syrphidae morphotype in Wing Mapper no longer silently replaces it with the Eristalis template.
- Label callouts fall back to a point on the active path when a family-specific topology does not contain the Eristalis anchor node.
- Project storage moved to schema `entowing-phylogeny/6.0` / local key `entowing-phylo-project-v6`, preventing legacy v0.34 Eristalis-copy geometry from silently overwriting the new family morphotypes.

## Scientific caution

These are literature-grounded working morphotypes, not family diagnoses. Geometry was independently redrawn from topology descriptions/reference diagrams; source SVGs are not bundled or directly traced into the application. Other Diptera families still use the old editable Eristalis-derived scaffold until they receive their own morphology pass.
