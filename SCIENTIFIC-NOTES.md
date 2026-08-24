# Scientific notes and limitations

EntoWing v0.35 is a research and teaching prototype. Its interface distinguishes reviewed geometry, literature-supported statements, working hypotheses, and unresolved homologies.

## Wing-template scope

- The included 560 × 246 template is a hand-reviewed tracing of an *Eristalis* wing.
- Its topology contains 47 editable nodes and 13 labelled structures.
- The original reference photograph is not included in this repository.
- **Syrphidae and Bombyliidae no longer use one universal Eristalis copy.** They now have explicit literature-grounded morphotypes described below.
- The remaining family records still receive independent editable copies of the Eristalis scaffold. A copied scaffold is not evidence that the displayed topology is diagnostic or representative for that family.
- Each scaffold must eventually be fitted to a documented representative specimen, corrected by hand, and reviewed against appropriate morphological literature.


## v0.35 family morphotypes

### Bombyliidae

The three Bombyliidae templates are **independent topology redraws**, not direct SVG traces. Their purpose is to stop forcing bee-fly wings through a syrphid R4+5 topology and to preserve family-level radial/medial branching as individually clickable structures.

1. **Bombylius-type** — separate distal R4 and R5; R5 and M1 converge into a short common terminal stem; M1, M2 and M3+4 retained; CuA and A1 free. Source topology: Giancarlo Dessì, *Bombyliidae wing veins-1.svg* (Wikimedia Commons). The source also notes that supplementary radial crossveins may occur.
2. **Anthrax-type** — R4 and R5 separate; R5 and M1 terminate independently; M1, M2 and M3+4 retained; CuA and A1 free. Source topology: Dessì, *Bombyliidae wing veins-2.svg*.
3. **Usiinae-type** — R4 and R5 separate; R5 and M1 free; the displayed medial system is reduced to M1 and M3+4; CuA and A1 converge into a common terminal stem. Source topology: Dessì, *Bombyliidae wing veins-3.svg*. The English and Italian metadata on that Commons page disagree about the number of posterior cells, so v0.35 deliberately does **not** encode posterior-cell count as a hard recognition rule.

Bombyliidae use family-specific labels (`Rs`, `R4`, `R5`, `M2`, `M3+4`) rather than blindly inheriting the Eristalis `R4+5`/modern Syrphidae labels. Shared distal stems (`R5+M1`, `CuA+A1`) are separate selectable paths so the parent veins stay independently clickable.

### Syrphidae

1. **Eristalis** — the original 47-node user-reviewed EntoWing anchor, retaining its strongly looped R4+5 geometry. It is a high-confidence specimen/genus anchor, **not** a universal family wing.
2. **Ceriana-like** — a literature-derived alternative with a different R4+5 loop and an explicit selectable appendicular vein. Ceriana descriptions place `r-m` distally and describe a V-shaped R4+5 loop with an appendix into cell r4+5.
3. **Straighter-R4+5 working morphotype** — an intentionally less-looped Syrphidae alternative for hoverflies in which R4+5 is nearly straight or only gently curved. A Madeira Syrphidae key explicitly contrasts a more curved R4+5 state with a more-or-less straight state.

The 2023 Syrphidae terminology glossary is used as the nomenclatural guardrail. In particular, the **vena spuria can be evanescent or absent**, and R4+5 may bear a short appendix or be deeply looped in some groups. Therefore the atlas now treats those features as variable morphotype characters rather than absolute pixel-level requirements.

### Recognition philosophy

EntoWing morphotypes are topology guides, not image masks. Matching should prioritize **junctions, branch presence/absence, convergence/fusion, and relative curvature**. A distal vein that visually fades just before the wing margin should not automatically fail a match if the surrounding topology is consistent. This is particularly important for photographs, worn wings, low contrast, and marginal veins.

## Terminology cautions

- `r-m` is a radial–medial crossvein, not a longitudinal vein.
- `sv` is the vena spuria: a vein-like longitudinal thickening characteristic of many Syrphidae, not automatically a standard true vein.
- The geometry now displayed as `m-cu` originated as a manually added `Cu1` element in the reviewed tracing. Its homology and preferred name must be verified for the taxon being studied.
- `h` is a manually placed working humeral-crossvein homology and likewise requires verification.
- Labels used for one group or nomenclatural system must not be transferred to another taxon without checking the relevant literature.

## Phylogenetic board

The board is an editable working hypothesis designed for comparison and teaching. Confidence badges communicate the status of relationships and inferred character changes. A labelled change on a branch should not be interpreted automatically as a unique synapomorphy or as a state shared by every member of a family.

The application links broad phylogenetic studies, morphology manuals, and family-specific sources next to relevant records. Those links should be consulted before using a statement in formal research.

## Recommended review workflow

1. Select a published terminology and a documented representative specimen.
2. Load the specimen photograph in the Wing Mapper.
3. Fit the shared topology to the specimen without assuming every structure is present.
4. Delete absent structures, add family-specific connections, and correct curves and junctions.
5. Record the representative taxon, image source, literature source, nomenclatural system, and reviewer.
6. Obtain expert review before treating the result as a comparative dataset.
