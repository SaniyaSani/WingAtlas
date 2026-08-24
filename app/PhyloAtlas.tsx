"use client";

import { ChangeEvent, CSSProperties, memo, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import reviewedEristalisPayload from "./Eristalis-reference.entowing-template.json";
import wingReferenceData from "./family-wing-references.generated.json";
import { mapReferenceSvgToTemplate } from "./svgWingMapper";
import {
  DIPTERA_FAMILY_CATALOG,
  DIPTERA_FAMILY_COUNT,
  DipteraFamilyCatalogEntry,
  SYSTEMA_DIPTERORUM_FAMILY_SOURCE,
} from "./dipteraFamilyCatalog";

export type FamilyWingPoint = { x: number; y: number };
export type FamilyWingPath = {
  veinId: string;
  displayLabel?: string;
  nodeIds: string[];
  color?: string;
  sourcePathId?: string;
  confidence?: "high" | "medium" | "unassigned";
};
export type FamilyWingTemplate = {
  id: string;
  name: string;
  taxon: string;
  note: string;
  referenceSize: { width: number; height: number };
  nodes: Record<string, FamilyWingPoint>;
  paths: FamilyWingPath[];
  outlinePoints?: FamilyWingPoint[];
  mappingStatus?: "reviewed" | "machine-draft" | "scaffold";
  mappingStats?: { sourcePathCount: number; namedPathCount: number; nodeCount: number };
  sourceReference?: string;
};

export type FamilyWingReference = {
  family: string;
  title: string;
  taxon?: string;
  rank?: string;
  assetPath: string;
  classifierAssetPath?: string;
  sourcePage: string;
  originalUrl: string;
  author: string;
  credit: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
  localAsset: boolean;
  referenceOnly: true;
};

const familyWingReferences = wingReferenceData as Record<string, FamilyWingReference>;

type BoardPoint = { x: number; y: number };
type BoardView = { x: number; y: number; scale: number };
type BoardGesture = {
  kind: "pan" | "node";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startView?: BoardView;
  nodeId?: string;
  startNode?: BoardPoint;
};

type Confidence = "high" | "medium" | "working";
type ChangeType = "gain" | "loss" | "fusion" | "shift" | "reduction" | "uncertain";

type TreeNode = {
  id: string;
  parentId: string | null;
  label: string;
  rank: "root" | "clade" | "family";
  order: number;
  confidence: Confidence;
  changeType: ChangeType;
  changeTitle: string;
  changeSummary: string;
  sourceLabel: string;
  sourceUrl: string;
  familyId?: string;
  userAdded?: boolean;
};

type FamilyProfile = {
  id: string;
  family: string;
  commonName: string;
  clade: string;
  representative: string;
  diagnosticWing: string;
  evolutionaryReading: string;
  caveat: string;
  confidence: Confidence;
  sourceLabel: string;
  sourceUrl: string;
  accent: string;
  variant: WingVariant;
  geometryStatus?: "reviewed" | "literature-draft";
};

type WingVariant = "tipulid" | "psychodid" | "culicid" | "stratiomyid" | "tabanid" | "bombyliid" | "asilid" | "empidid" | "syrphid" | "phorid" | "drosophilid" | "muscid";

type WingVeinMeta = {
  id: string;
  label: string;
  fullName: string;
  symbolMeaning: string;
  plainMeaning: string;
  group: string;
  color: string;
  note: string;
};

type WingLabelPlacement = { x: number; y: number; nodeId: string; anchor?: "start" | "middle" | "end" };

const PHYLOGENY_SOURCE = "https://pubmed.ncbi.nlm.nih.gov/21402926/";
const EARLY_BRACHYCERA_SOURCE = "https://doi.org/10.1111/syen.12275";
const BRACHYCERA_2025_SOURCE = "https://pubmed.ncbi.nlm.nih.gov/41109215/";
const SCHIZOPHORA_SOURCE = "https://pmc.ncbi.nlm.nih.gov/articles/PMC7871583/";
const CALYPTRATAE_SOURCE = "https://pubmed.ncbi.nlm.nih.gov/34618931/";
const MANUAL_VOL2 = "https://www.biodiversitylibrary.org/page/64795149";
const MANUAL_VOL3 = "https://www.nhm.ac.uk/our-science/research/projects/manual-afrotropical-diptera.html";
const MAD_OVERVIEW = "https://www.nhm.ac.uk/our-science/research/projects/manual-afrotropical-diptera.html";
const SYRPHID_GLOSSARY = "https://doi.org/10.55710/1.AIMS1978";

const reviewedVeinDetails = Object.fromEntries(reviewedEristalisPayload.veins.map((source) => {
  if (source.id === "Cu1") {
    return ["m-cu", {
      ...source,
      id: "m-cu",
      label: "m-cu",
      fullName: "Medial–cubital crossvein · working homology",
      symbolMeaning: "m-cu = Media ↔ Cubitus",
      plainMeaning: "a short crossvein connecting medial and cubital systems",
      note: "This geometry was added manually as Cu1 in the reviewed tracing. EntoWing shows the working modern label m-cu; verify the homology and terminology for the representative taxon.",
    }];
  }
  if (source.id === "h") {
    return ["h", {
      ...source,
      fullName: "Humeral crossvein · working homology",
      symbolMeaning: "h = humeral crossvein",
      plainMeaning: "a short basal crossvein near the leading edge",
      note: "This structure was placed manually in the reviewed tracing. Verify that h is the correct homology for the representative taxon.",
    }];
  }
  return [source.id, source];
})) as Record<string, WingVeinMeta>;

const wingLabelPlacements: Record<string, WingLabelPlacement> = {
  C: { x: 158, y: 22, nodeId: "edit-1786217175082-r8bae", anchor: "middle" },
  Sc: { x: 252, y: 42, nodeId: "edit-1786217017331-sfg8i", anchor: "middle" },
  R1: { x: 357, y: 21, nodeId: "r1Mid", anchor: "middle" },
  "R2+3": { x: 454, y: 27, nodeId: "edit-1786217036683-nugxh", anchor: "middle" },
  "R4+5": { x: 514, y: 103, nodeId: "edit-1786216927165-u37e3", anchor: "end" },
  M1: { x: 489, y: 153, nodeId: "edit-1786216913013-j4pdx", anchor: "end" },
  M4: { x: 363, y: 211, nodeId: "dmBottom", anchor: "middle" },
  CuA: { x: 238, y: 226, nodeId: "edit-1786216834382-82qud", anchor: "middle" },
  A1: { x: 126, y: 207, nodeId: "edit-1786216730114-eu7gw", anchor: "middle" },
  "r-m": { x: 317, y: 108, nodeId: "rmM", anchor: "end" },
  sv: { x: 236, y: 91, nodeId: "svMid1", anchor: "middle" },
  "m-cu": { x: 222, y: 171, nodeId: "edit-1786216834382-82qud", anchor: "end" },
  h: { x: 60, y: 48, nodeId: "scMid", anchor: "middle" },
};

function veinMeta(veinId: string, color = "#52645a"): WingVeinMeta {
  return reviewedVeinDetails[veinId] ?? {
    id: veinId,
    label: veinId,
    fullName: `${veinId} · user-defined structure`,
    symbolMeaning: `${veinId} = user label`,
    plainMeaning: "a structure added to this editable family wing",
    group: "user-defined",
    color,
    note: "User-defined structure: verify its identity, homology and terminology against the specimen and an appropriate taxonomic source.",
  };
}

const coreProfiles: FamilyProfile[] = [
  {
    id: "tipulidae", family: "Tipulidae", commonName: "crane flies", clade: "Tipulomorpha", representative: "Tipula-like working morphotype",
    diagnosticWing: "Typically elongate, with a comparatively complete longitudinal system and several long cells; Rs branching and the medial/discal region are important for identification.",
    evolutionaryReading: "A useful early-diverging comparison state for following later concentration, fusion and reduction of the dipteran venation.",
    caveat: "Tipuloidea classification and venation vary; this is not a diagnosis of every Tipulidae genus.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#6f8560", variant: "tipulid",
  },
  {
    id: "psychodidae", family: "Psychodidae", commonName: "moth & sand flies", clade: "Psychodomorpha", representative: "Psychoda-like working morphotype",
    diagnosticWing: "Often broad to lanceolate and densely setose; the radial and medial sectors form conspicuous long branches while some basal structures are reduced.",
    evolutionaryReading: "Broad wing shape and heavy setation are immediately visible, but the family contains markedly different psychodine and phlebotomine patterns.",
    caveat: "Do not use a Psychoda-like wing as a universal Psychodidae template.", confidence: "medium", sourceLabel: "Kvifte & Wagner 2017, MAD vol. 2", sourceUrl: MANUAL_VOL2, accent: "#8b7766", variant: "psychodid",
  },
  {
    id: "culicidae", family: "Culicidae", commonName: "mosquitoes", clade: "Culicomorpha", representative: "Culex-like working morphotype",
    diagnosticWing: "Narrow wing with scales on the veins and margin; long forked radial and medial branches provide major landmarks.",
    evolutionaryReading: "The scale-bearing wing is a conspicuous derived surface character; internal relationships and exact fork proportions remain taxon-specific.",
    caveat: "Anopheline and culicine wings differ; scales and fork positions must be checked on the specimen.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#70859b", variant: "culicid",
  },
  {
    id: "stratiomyidae", family: "Stratiomyidae", commonName: "soldier flies", clade: "Stratiomyomorpha", representative: "Stratiomys-like working morphotype",
    diagnosticWing: "Radial veins are commonly crowded toward the anterior margin and arise around a compact discal region; posterior venation is often weaker or reduced.",
    evolutionaryReading: "A strong example of anterior concentration and posterior simplification, best treated as a family tendency rather than one invariant pattern.",
    caveat: "Stratiomyid subfamilies differ considerably in how far the venation is reduced.", confidence: "high", sourceLabel: "Hauser, Woodley & Fachin 2017", sourceUrl: MANUAL_VOL2, accent: "#5d8b82", variant: "stratiomyid",
  },
  {
    id: "tabanidae", family: "Tabanidae", commonName: "horse flies", clade: "Tabanomorpha", representative: "Tabanus-like working morphotype",
    diagnosticWing: "Robust venation with a large discal cell; R4 and R5 diverge distally and R4 may bear a short recurrent appendix in some taxa.",
    evolutionaryReading: "Retains a strong lower-brachyceran network and makes a useful contrast with the concentrated stratiomyid pattern.",
    caveat: "The R4 appendix is variable and cannot be treated as present throughout Tabanidae.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#a77555", variant: "tabanid",
  },
  {
    id: "bombyliidae", family: "Bombyliidae", commonName: "bee flies", clade: "Heterodactyla · sister to Asiloidea + Eremoneura", representative: "Bombylius · Anthrax · Usiinae classifier morphotypes",
    diagnosticWing: "Venation is diverse but often retains several radial branches and a well-developed discal system; dark patterning may be as diagnostic as the veins.",
    evolutionaryReading: "Genome-scale evidence places Bombyliidae as a heterodactylan branch beside Asiloidea and Eremoneura, not inside Asiloidea; its wing morphology remains highly heterogeneous.",
    caveat: "One Bombylius-like scheme cannot summarize 19 currently recognized subfamilial lineages.", confidence: "medium", sourceLabel: "Mulhair et al. 2025; Li et al. 2021", sourceUrl: BRACHYCERA_2025_SOURCE, accent: "#b38b47", variant: "bombyliid",
  },
  {
    id: "asilidae", family: "Asilidae", commonName: "robber flies", clade: "Asiloidea", representative: "Asilus-like working morphotype",
    diagnosticWing: "Strong radial and medial veins delimit long distal cells; the openness or closure of marginal cells and branch positions are important and variable.",
    evolutionaryReading: "A robust asiloid pattern with repeated lineage-level changes in distal cell closure—better coded as states than as one family innovation.",
    caveat: "Cell closure varies across Asilidae; verify the chosen genus before naming a derived state.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#9d6254", variant: "asilid",
  },
  {
    id: "empididae", family: "Empididae", commonName: "dance flies", clade: "Empidoidea · Eremoneura", representative: "Empis-like working morphotype",
    diagnosticWing: "Often a compact eremoneuran pattern; R4+5 may be forked or unbranched and the discal medial region changes among subgroups.",
    evolutionaryReading: "Useful transition into Eremoneura, but reduction and branch loss have occurred repeatedly within empidoid lineages.",
    caveat: "Empididae sensu stricto is not interchangeable with the older, broader Empididae concept.", confidence: "medium", sourceLabel: "Sinclair & Daugeron 2017", sourceUrl: "https://www.biodiversitylibrary.org/part/426688", accent: "#727b9c", variant: "empidid",
  },
  {
    id: "phoridae", family: "Phoridae", commonName: "scuttle flies", clade: "Platypezoidea · Cyclorrhapha", representative: "Megaselia-like working morphotype",
    diagnosticWing: "Highly distinctive reduction: short, strong anterior veins end near the front of the wing while several long posterior veins are weak and unbranched.",
    evolutionaryReading: "An excellent visible example of strong venational reduction, but not evidence that all other cyclorrhaphan changes happened in the same direction.",
    caveat: "This schematic exaggerates line-weight contrast so the diagnostic architecture reads at thumbnail size.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#8f6f78", variant: "phorid",
  },
  {
    id: "syrphidae", family: "Syrphidae", commonName: "hover flies", clade: "Syrphoidea · Cyclorrhapha", representative: "Eristalis reference · user-reviewed geometry",
    diagnosticWing: "Most have a vena spuria, a vein-like longitudinal thickening; many groups also show characteristic configurations of R4+5 and closed radial cells.",
    evolutionaryReading: "Vena spuria is the strongest family-level teaching landmark here, while radial loops and cell closure remain subgroup-dependent.",
    caveat: "Terminology follows van Steenis et al. 2023; the Mapper keeps your reviewed Eristalis geometry, while the identifier also compares Ceriana, Episyrphus and Pipiza morphotypes.", confidence: "high", sourceLabel: "van Steenis et al. 2023", sourceUrl: SYRPHID_GLOSSARY, accent: "#c3654f", variant: "syrphid", geometryStatus: "reviewed",
  },
  {
    id: "drosophilidae", family: "Drosophilidae", commonName: "vinegar flies", clade: "Ephydroidea · Schizophora", representative: "Drosophila-like working morphotype",
    diagnosticWing: "Compact venation with humeral and subcostal costal breaks; crossveins r-m and dm-cu and the costal index are common measured landmarks.",
    evolutionaryReading: "A compact acalyptrate pattern whose quantitative vein proportions are often more informative than a dramatic unique branch gain.",
    caveat: "The familiar Drosophila pattern is only one part of family diversity; exact costal-break terminology must be checked.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#9b6f93", variant: "drosophilid",
  },
  {
    id: "muscidae", family: "Muscidae", commonName: "house & stable flies", clade: "Calyptratae · Schizophora", representative: "Musca domestica · Coenosia · Drymeia references",
    diagnosticWing: "The medial vein bends forward distally in many familiar muscids; the calypter and the width of cell r4+5 are also important identification characters.",
    evolutionaryReading: "Represents the calyptrate branch here; the forward bend is conspicuous in Musca-like wings but varies across Muscidae.",
    caveat: "The Musca, Coenosia and Drymeia references deliberately cover both strongly curved and straighter medial-vein states; family identification still requires non-wing characters.", confidence: "medium", sourceLabel: "Comstock 1918; Michelsen 2022", sourceUrl: "https://doi.org/10.5852/ejt.2022.826.1839", accent: "#5d7780", variant: "muscid",
  },
];

const additionalProfiles: FamilyProfile[] = [
  {
    id: "limoniidae", family: "Limoniidae", commonName: "limoniid crane flies", clade: "Tipuloidea", representative: "Limonia-like draft morphotype",
    diagnosticWing: "Usually an elongate crane-fly wing with a long subcostal system and taxonomically informative radial, medial and discal-cell configurations.",
    evolutionaryReading: "A comparatively rich network within Tipuloidea; many branches and crossveins vary strongly among genera.",
    caveat: "Limoniidae in its broad traditional sense may be paraphyletic; genus-level templates are essential.", confidence: "working", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#7b906b", variant: "tipulid",
  },
  {
    id: "trichoceridae", family: "Trichoceridae", commonName: "winter crane flies", clade: "Tipulomorpha", representative: "Trichocera-like draft morphotype",
    diagnosticWing: "Slender wing with a well-developed radial sector and medial branches; crossvein positions help separate trichocerid genera from superficially similar crane flies.",
    evolutionaryReading: "A distinct tipulomorphan lineage whose exact position near Tipuloidea remains a useful comparison rather than a simple ancestral state.",
    caveat: "Afrotropical occurrence is questionable and the draft should be checked against a regional Trichocera treatment.", confidence: "working", sourceLabel: "Cumming & Wood 2017; Diptera backbone", sourceUrl: MAD_OVERVIEW, accent: "#83927a", variant: "tipulid",
  },
  {
    id: "ptychopteridae", family: "Ptychopteridae", commonName: "phantom crane flies", clade: "Ptychopteromorpha", representative: "Ptychoptera-like draft morphotype",
    diagnosticWing: "Elongate wing with several radial and medial branches and a compact crossvein field around the middle of the wing.",
    evolutionaryReading: "Retains a visibly rich venation, but its isolated lineage should not be used as the direct ancestor of other lower Diptera.",
    caveat: "This is a Ptychoptera-like scaffold; Bittacomorphinae require a separate geometry.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#697d87", variant: "tipulid",
  },
  {
    id: "dixidae", family: "Dixidae", commonName: "meniscus midges", clade: "Culicoidea", representative: "Dixa-like draft morphotype",
    diagnosticWing: "Narrow, largely bare wing with long radial and medial forks; fork proportions and crossvein placement are useful family and genus landmarks.",
    evolutionaryReading: "A culicoid comparison state without the dense vein scales characteristic of mosquitoes.",
    caveat: "Exact venation differs between Dixa and Dixella; verify the representative genus.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#718ea1", variant: "culicid",
  },
  {
    id: "chaoboridae", family: "Chaoboridae", commonName: "phantom midges", clade: "Culicoidea", representative: "Chaoborus-like draft morphotype",
    diagnosticWing: "Narrow and unscaled or sparsely setose compared with Culicidae; long radial and medial forks produce a mosquito-like but distinct pattern.",
    evolutionaryReading: "Closely compared with Culicidae and Corethrellidae, with scale cover and fork geometry carrying more information than outline alone.",
    caveat: "Adult chaoborid venation is subtle; identification must include antennae and mouthparts, not the wing alone.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#7493a9", variant: "culicid",
  },
  {
    id: "corethrellidae", family: "Corethrellidae", commonName: "frog-biting midges", clade: "Culicoidea", representative: "Corethrella-like draft morphotype",
    diagnosticWing: "Small wing with scales and a culicoid pattern; radial termination and the distribution of scales help distinguish it from mosquitoes and phantom midges.",
    evolutionaryReading: "A scale-bearing culicoid branch, demonstrating that a visible surface character must be interpreted in phylogenetic context.",
    caveat: "The thumbnail is deliberately generic; Corethrella species require specialist keys.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#6d8aa0", variant: "culicid",
  },
  {
    id: "simuliidae", family: "Simuliidae", commonName: "black flies", clade: "Chironomoidea", representative: "Simulium-like draft morphotype",
    diagnosticWing: "Broad, clear wing with strong veins concentrated anteriorly and much weaker posterior veins; the costa ends well before the wing tip.",
    evolutionaryReading: "A striking shift in vein strength and anterior concentration within Chironomoidea.",
    caveat: "Wing venation alone rarely resolves species; genitalia and pupal/larval characters remain central.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#667f87", variant: "stratiomyid",
  },
  {
    id: "ceratopogonidae", family: "Ceratopogonidae", commonName: "biting midges", clade: "Chironomoidea", representative: "Culicoides-like draft morphotype",
    diagnosticWing: "Small wing with one or two radial cells depending on lineage; pigmentation and macrotrichia are often highly diagnostic in Culicoides-like taxa.",
    evolutionaryReading: "Shows repeated radial-cell reduction and the acquisition of informative wing patterning.",
    caveat: "The Culicoides morphotype is not representative of all ceratopogonid subfamilies.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#8d7b91", variant: "psychodid",
  },
  {
    id: "chironomidae", family: "Chironomidae", commonName: "non-biting midges", clade: "Chironomoidea", representative: "Chironomus-like draft morphotype",
    diagnosticWing: "Usually narrow and unscaled, with radial veins concentrated anteriorly and characteristic medial and cubital forks; venation may be reduced in small taxa.",
    evolutionaryReading: "A highly diverse chironomoid pattern in which vein ratios and setation often matter more than a single unique vein.",
    caveat: "Subfamily-level venation differs substantially; this is only a Chironomus-like starting point.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#7b849e", variant: "culicid",
  },
  {
    id: "bibionidae", family: "Bibionidae", commonName: "March flies", clade: "Bibionomorpha", representative: "Bibio-like draft morphotype",
    diagnosticWing: "Anterior veins are conspicuously thickened and darker while the posterior veins are weaker; radial branching differs among genera.",
    evolutionaryReading: "A clear redistribution of vein strength toward the anterior wing.",
    caveat: "Bibio and Dilophus-like patterns should ultimately receive separate templates.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#7a6c62", variant: "stratiomyid",
  },
  {
    id: "sciaridae", family: "Sciaridae", commonName: "dark-winged fungus gnats", clade: "Sciaroidea", representative: "Bradysia-like draft morphotype",
    diagnosticWing: "Reduced, often smoky wing with a conspicuous Y-shaped medial fork and a simple radial sector ending anteriorly.",
    evolutionaryReading: "Medial-fork geometry becomes a dominant landmark as crossveins and other branches are reduced.",
    caveat: "M-fork shape is useful but not sufficient for family or species determination by itself.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#696f77", variant: "empidid",
  },
  {
    id: "mycetophilidae", family: "Mycetophilidae", commonName: "fungus gnats", clade: "Sciaroidea", representative: "Mycetophila-like draft morphotype",
    diagnosticWing: "Comparatively rich venation with strong radial veins and prominent medial and cubital forks; small basal crossveins and vein setation are informative.",
    evolutionaryReading: "Retains more of the sciaroid branching network than the strongly reduced sciarid and cecidomyiid patterns.",
    caveat: "Mycetophilidae contains many distinct tribal patterns; the representative genus must always be recorded.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#71856f", variant: "tipulid",
  },
  {
    id: "cecidomyiidae", family: "Cecidomyiidae", commonName: "gall midges", clade: "Sciaroidea", representative: "Cecidomyia-like draft morphotype",
    diagnosticWing: "Very reduced venation with only a few longitudinal veins, usually no crossveins, and dense microtrichia or long marginal hairs.",
    evolutionaryReading: "One of the clearest reductions in the sampled lower Diptera.",
    caveat: "Extreme family diversity means that even the number of visible longitudinal veins varies.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#a1847f", variant: "phorid",
  },
  {
    id: "anisopodidae", family: "Anisopodidae", commonName: "wood gnats", clade: "Bibionomorpha sensu lato", representative: "Sylvicola-like draft morphotype",
    diagnosticWing: "Broad wing with comparatively complete venation, a closed discal cell and conspicuous crossveins; patterned wings occur in familiar Sylvicola.",
    evolutionaryReading: "A rich lower-dipteran network useful for comparison with reduced sciaroid lineages.",
    caveat: "The phylogenetic position of Anisopodidae among lower Diptera remains unstable and is shown as working.", confidence: "working", sourceLabel: "Wiegmann et al. 2011; MAD vol. 2", sourceUrl: PHYLOGENY_SOURCE, accent: "#9a8068", variant: "tabanid",
  },
  {
    id: "blephariceridae", family: "Blephariceridae", commonName: "net-winged midges", clade: "Blephariceromorpha", representative: "Blepharicera-like draft morphotype",
    diagnosticWing: "Broad, often triangular wing with a well-developed radial sector and several medial branches; exact branch retention varies by lineage.",
    evolutionaryReading: "An isolated torrent-adapted lineage whose wing should be compared without forcing it into a linear primitive-to-derived sequence.",
    caveat: "Family-level external morphology is distinctive, but the schematic venation still needs genus-specific replacement.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#5f8593", variant: "psychodid",
  },
  {
    id: "xylophagidae", family: "Xylophagidae", commonName: "wood soldier flies", clade: "Stratiomyomorpha", representative: "Xylophagus-like draft morphotype",
    diagnosticWing: "Comparatively complete lower-brachyceran venation with a discal cell and several medial branches reaching the margin.",
    evolutionaryReading: "Provides a useful contrast with the strong anterior concentration and posterior reduction in Stratiomyidae.",
    caveat: "Some classifications separate related xylophagomorph families differently; placement is literature-backed but editable.", confidence: "medium", sourceLabel: "Mulhair et al. 2025; MAD vol. 2", sourceUrl: BRACHYCERA_2025_SOURCE, accent: "#6b876d", variant: "tabanid",
  },
  {
    id: "rhagionidae", family: "Rhagionidae", commonName: "snipe flies", clade: "Tabanomorpha", representative: "Rhagio-like draft morphotype",
    diagnosticWing: "Robust venation with a closed discal cell and multiple radial branches; cell shape and R4 branching are useful generic characters.",
    evolutionaryReading: "A relatively complete tabanomorphan network preceding repeated modifications of distal radial cells.",
    caveat: "Rhagionidae sensu lato has changed historically; confirm the modern family concept for each specimen.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#9b765c", variant: "tabanid",
  },
  {
    id: "nemestrinidae", family: "Nemestrinidae", commonName: "tangle-veined flies", clade: "Nemestrinoidea", representative: "Nemestrinus-like draft morphotype",
    diagnosticWing: "Many accessory and diagonal veins create a dense, partly reticulate network unlike the simpler radial–medial pattern of most flies.",
    evolutionaryReading: "A genuine elaboration of the venation network rather than a simple retention of an ancestral state.",
    caveat: "Tangle venation varies greatly among subfamilies; the thumbnail only communicates the architectural tendency.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#b06e4f", variant: "bombyliid",
  },
  {
    id: "acroceridae", family: "Acroceridae", commonName: "small-headed flies", clade: "Nemestrinoidea", representative: "Acrocera-like draft morphotype",
    diagnosticWing: "Venation ranges from moderately complete to strongly reduced; in reduced forms several veins fade before reaching the margin.",
    evolutionaryReading: "A lineage with repeated venational simplification, best represented by multiple morphotypes rather than one family template.",
    caveat: "Acrocerid subfamilies are too heterogeneous for one diagnostic wing.", confidence: "working", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#9d7c79", variant: "phorid",
  },
  {
    id: "therevidae", family: "Therevidae", commonName: "stiletto flies", clade: "Asiloidea", representative: "Thereva-like draft morphotype",
    diagnosticWing: "Strong radial system with R4 often curved and a characteristic open distal medial region; cell cup is closed basally away from the margin.",
    evolutionaryReading: "A recognizable asiloid arrangement that is more informative when cell openness is coded explicitly.",
    caveat: "Cell and branch states vary across Therevidae; verify against the chosen genus.", confidence: "medium", sourceLabel: "Hauser et al. 2017, MAD vol. 2", sourceUrl: MANUAL_VOL2, accent: "#9a715c", variant: "asilid",
  },
  {
    id: "hybotidae", family: "Hybotidae", commonName: "hybotid dance flies", clade: "Empidoidea", representative: "Hybos-like draft morphotype",
    diagnosticWing: "Often reduced radial and medial branching with a compact basal field; the discal medial cell may be absent or strongly modified.",
    evolutionaryReading: "A repeated simplification within Empidoidea rather than a single loss shared by every hybotid.",
    caveat: "Subfamilies differ sharply; Hybos-like geometry must not be applied to Tachydromiinae without review.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#697886", variant: "empidid",
  },
  {
    id: "dolichopodidae", family: "Dolichopodidae", commonName: "long-legged flies", clade: "Empidoidea", representative: "Dolichopus-like draft morphotype",
    diagnosticWing: "Relatively simple radial system with R2+3 and R4+5 often nearly parallel; M is frequently bent or forked and the anal region is reduced.",
    evolutionaryReading: "A compact empidoid pattern in which the course of M becomes a major diagnostic axis.",
    caveat: "Microphorinae and several dolichopodid subfamilies need their own templates.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 2", sourceUrl: MANUAL_VOL2, accent: "#4c8b7a", variant: "empidid",
  },
  {
    id: "platypezidae", family: "Platypezidae", commonName: "flat-footed flies", clade: "Platypezoidea", representative: "Platypeza-like draft morphotype",
    diagnosticWing: "Broad cyclorrhaphan wing with a compact radial field and characteristic cubital/anal cell geometry; venation varies between major lineages.",
    evolutionaryReading: "An early cyclorrhaphan comparison state before the much stronger anterior reduction seen in Phoridae.",
    caveat: "Platypezidae is morphologically diverse; the family template needs subfamily coverage.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#758765", variant: "drosophilid",
  },
  {
    id: "pipunculidae", family: "Pipunculidae", commonName: "big-headed flies", clade: "early Schizophora in Bayless et al.", representative: "Pipunculus-like draft morphotype",
    diagnosticWing: "Clear, comparatively simple wing; positions of r-m and dm-m and the curvature of medial veins are important generic characters.",
    evolutionaryReading: "Bayless et al. recovered Pipunculidae as the earliest sampled branch of Schizophora, outside traditional Syrphoidea.",
    caveat: "This placement differs from older classifications and is explicitly tied to the 2021 phylotranscriptomic hypothesis.", confidence: "medium", sourceLabel: "Bayless et al. 2021", sourceUrl: SCHIZOPHORA_SOURCE, accent: "#66868a", variant: "drosophilid",
  },
  {
    id: "tephritidae", family: "Tephritidae", commonName: "true fruit flies", clade: "Tephritoidea", representative: "Tephritis-like draft morphotype",
    diagnosticWing: "Often strongly patterned; Sc bends sharply forward near its tip and R1 commonly bears dorsal setulae, with a distinct subcostal break in the costa.",
    evolutionaryReading: "Combines structural landmarks with repeated evolution of signal-like pigmentation.",
    caveat: "Many tephritids have clear wings; patterning is common and informative, not universal.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#c0784f", variant: "drosophilid",
  },
  {
    id: "ulidiidae", family: "Ulidiidae", commonName: "picture-winged flies", clade: "Tephritoidea", representative: "Ulidia-like draft morphotype",
    diagnosticWing: "Often patterned with a subcostal costal break; Sc is complete and vein/cell proportions help distinguish ulidiids from other tephritoids.",
    evolutionaryReading: "Wing pigmentation is evolutionarily labile and must be mapped separately from vein topology.",
    caveat: "Clear-winged ulidiids exist; confirm family with head and thoracic characters.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#a86d54", variant: "drosophilid",
  },
  {
    id: "platystomatidae", family: "Platystomatidae", commonName: "signal flies", clade: "Tephritoidea", representative: "Platystoma-like draft morphotype",
    diagnosticWing: "Frequently broad and boldly patterned; costal breaks, subcostal termination and the shape of the anal cell are useful tephritoid landmarks.",
    evolutionaryReading: "A lineage where display pattern and structural venation can be studied as separate evolutionary character layers.",
    caveat: "The family is especially variable in pigmentation and outline; geometry is a first-pass scaffold.", confidence: "medium", sourceLabel: "Whittington & Kirk-Spriggs 2021", sourceUrl: MANUAL_VOL3, accent: "#b27855", variant: "drosophilid",
  },
  {
    id: "sepsidae", family: "Sepsidae", commonName: "black scavenger flies", clade: "Sciomyzoidea sensu Bayless", representative: "Sepsis-like draft morphotype",
    diagnosticWing: "Usually narrow and clear, with a reduced anal region and alula; a dark apical spot occurs in many familiar Sepsis species.",
    evolutionaryReading: "A compact sciomyzoid wing in which reduction of the posterior field accompanies strong behavioral diversification.",
    caveat: "The apical spot is not universal and should be stored as pigmentation, not vein topology.", confidence: "medium", sourceLabel: "Bayless et al. 2021; MAD vol. 3", sourceUrl: SCHIZOPHORA_SOURCE, accent: "#776f7e", variant: "drosophilid",
  },
  {
    id: "lauxaniidae", family: "Lauxaniidae", commonName: "lauxaniid flies", clade: "Lauxanioidea", representative: "Minettia-like draft morphotype",
    diagnosticWing: "Sc is complete and separated from R1; the costa has a break near the subcostal termination, and wing patterning varies widely.",
    evolutionaryReading: "A relatively complete acalyptrate pattern useful for comparison across the rapid schizophoran radiation.",
    caveat: "No single venational character diagnoses every lauxaniid; bristle characters remain necessary.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#9b885d", variant: "drosophilid",
  },
  {
    id: "sciomyzidae", family: "Sciomyzidae", commonName: "marsh flies", clade: "Sciomyzoidea sensu Bayless", representative: "Tetanocera-like draft morphotype",
    diagnosticWing: "Usually a complete acalyptrate venation with Sc distinct and crossveins well developed; pigmentation and crossvein clouds occur in many genera.",
    evolutionaryReading: "Bayless et al. place Sciomyzoidea as the second early branch of Schizophora after Pipunculidae.",
    caveat: "Sciomyzoidea composition differs among classifications; this node follows the cited phylotranscriptomic result.", confidence: "medium", sourceLabel: "Bayless et al. 2021", sourceUrl: SCHIZOPHORA_SOURCE, accent: "#718a70", variant: "drosophilid",
  },
  {
    id: "agromyzidae", family: "Agromyzidae", commonName: "leaf-miner flies", clade: "Opomyzoidea", representative: "Agromyza-like draft morphotype",
    diagnosticWing: "Small wing with a subcostal break; Sc is weakened or fused distally, and the small posterior cubital/anal region is reduced.",
    evolutionaryReading: "A compact pattern shaped by repeated reduction in a radiation of minute phytophagous flies.",
    caveat: "Agromyzinae and Phytomyzinae differ in subcostal and costal characters; use subfamily-specific templates.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#6f8b67", variant: "drosophilid",
  },
  {
    id: "ephydridae", family: "Ephydridae", commonName: "shore flies", clade: "Ephydroidea", representative: "Ephydra-like draft morphotype",
    diagnosticWing: "Often short and broad; Sc and the posterior cubital/anal field are reduced, while costal breaks and crossvein positions are informative.",
    evolutionaryReading: "A reduced ephydroid pattern within the well-supported sister group of Calyptratae.",
    caveat: "Ephydridae is extremely ecologically and morphologically diverse; the scaffold is deliberately conservative.", confidence: "medium", sourceLabel: "Winkler et al. 2022; MAD vol. 3", sourceUrl: "https://doi.org/10.1371/journal.pone.0274292", accent: "#5d8990", variant: "drosophilid",
  },
  {
    id: "chloropidae", family: "Chloropidae", commonName: "grass flies", clade: "Carnoidea / unresolved higher Schizophora", representative: "Chlorops-like draft morphotype",
    diagnosticWing: "Small, simple wing with Sc weak or incomplete, a costal break, and a reduced posterior field; R and M remain the main visible landmarks.",
    evolutionaryReading: "A strong simplification in a family whose superfamily-level placement remains sensitive to phylogenomic sampling.",
    caveat: "Bayless et al. left chloropid placement unresolved; the parent node is intentionally marked working.", confidence: "working", sourceLabel: "Bayless et al. 2021", sourceUrl: SCHIZOPHORA_SOURCE, accent: "#8b9461", variant: "phorid",
  },
  {
    id: "diopsidae", family: "Diopsidae", commonName: "stalk-eyed flies", clade: "Diopsoidea", representative: "Diopsis-like draft morphotype",
    diagnosticWing: "Often patterned, with a fairly complete acalyptrate radial–medial network; no single venational novelty defines the family.",
    evolutionaryReading: "Useful for separating the evolution of exaggerated head morphology from comparatively conservative wing topology.",
    caveat: "Identification cannot be based on this wing alone; head morphology supplies the obvious family diagnosis.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#9d624f", variant: "drosophilid",
  },
  {
    id: "conopidae", family: "Conopidae", commonName: "thick-headed flies", clade: "Conopoidea", representative: "Conops-like draft morphotype",
    diagnosticWing: "Usually narrow with a strong radial system; cell r4+5 is closed or strongly narrowed in many conopids and the anal cell is elongate.",
    evolutionaryReading: "A distinctive distal-cell architecture, but closure states vary and should be coded per representative taxon.",
    caveat: "Conopinae-like closure is not universal across all Conopidae.", confidence: "medium", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#a56855", variant: "asilid",
  },
  {
    id: "anthomyiidae", family: "Anthomyiidae", commonName: "root-maggot flies", clade: "Calyptratae", representative: "Anthomyia-like draft morphotype",
    diagnosticWing: "Calyptrate wing with M1 usually rather straight compared with Musca-like flies; the anal vein often extends farther toward the margin.",
    evolutionaryReading: "A muscoid-grade comparison demonstrating that a forward-bent M is not universal across Calyptratae.",
    caveat: "Family identification requires thoracic setae and calypter characters in addition to venation.", confidence: "medium", sourceLabel: "Kutty et al. 2019; Cumming & Wood 2017", sourceUrl: CALYPTRATAE_SOURCE, accent: "#748291", variant: "muscid",
  },
  {
    id: "calliphoridae", family: "Calliphoridae", commonName: "blow flies", clade: "Oestroidea · Calyptratae", representative: "Calliphora-like draft morphotype",
    diagnosticWing: "M1 bends strongly forward and cell r4+5 narrows apically; setulae on the basal radial veins and calypter characters are also important.",
    evolutionaryReading: "A familiar oestroid pattern, but Calliphoridae in the broad traditional sense is not consistently monophyletic.",
    caveat: "Modern phylogenomics splits or re-ranks several former calliphorid lineages; this tip uses Calliphora sensu stricto as representative.", confidence: "working", sourceLabel: "Kutty et al. 2019; Buenaventura et al. 2021", sourceUrl: "https://doi.org/10.1111/syen.12443", accent: "#577b86", variant: "muscid",
  },
  {
    id: "sarcophagidae", family: "Sarcophagidae", commonName: "flesh flies", clade: "Oestroidea · Calyptratae", representative: "Sarcophaga-like draft morphotype",
    diagnosticWing: "M1 is strongly bent forward; R4+5 commonly bears basal setulae and cell r4+5 remains open or narrowly open at the margin.",
    evolutionaryReading: "An oestroid pattern close to other calyptrate families, requiring setation and cell-width characters rather than one unique vein.",
    caveat: "Wing characters alone do not securely identify Sarcophagidae; terminalia are often indispensable.", confidence: "medium", sourceLabel: "Kutty et al. 2019", sourceUrl: CALYPTRATAE_SOURCE, accent: "#6e7783", variant: "muscid",
  },
];

const constellationPalette = ["#8b624d", "#587982", "#9a763d", "#756a82", "#55715f", "#98645f"];

function constellationAccent(value: string) {
  const hash = [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return constellationPalette[hash % constellationPalette.length];
}

const authoredProfiles: FamilyProfile[] = [...coreProfiles, ...additionalProfiles];
const authoredProfileIds = new Set(authoredProfiles.map((profile) => profile.id));

function catalogVariant(entry: DipteraFamilyCatalogEntry): WingVariant {
  if (entry.major === "nematocera") {
    if (entry.groupId === "culicomorpha") return "culicid";
    if (entry.groupId === "psychodomorpha") return "psychodid";
    return "tipulid";
  }
  if (entry.groupId === "stratiomyomorpha") return "stratiomyid";
  if (entry.groupId === "tabanomorpha") return "tabanid";
  if (entry.groupId === "asiloidea" || entry.groupId === "vermileonomorpha") return "asilid";
  if (entry.groupId === "empidoidea") return "empidid";
  if (entry.groupId === "calyptratae") return "muscid";
  if (entry.groupId === "aschiza") return entry.family === "Phoridae" ? "phorid" : "syrphid";
  return "drosophilid";
}

const catalogScaffoldProfiles: FamilyProfile[] = DIPTERA_FAMILY_CATALOG
  .filter((entry) => !authoredProfileIds.has(entry.id))
  .map((entry) => ({
    id: entry.id,
    family: entry.family,
    commonName: entry.rankNote ?? "family-level atlas entry",
    clade: entry.groupLabel,
    representative: familyWingReferences[entry.id]
      ? "published SVG reference · machine-review workflow"
      : "reference search pending · editable scaffold",
    diagnosticWing: "This complete-catalogue card is ready for a representative wing and a literature-checked venation diagnosis; no family character has been inferred from the neutral scaffold.",
    evolutionaryReading: `Placement follows the working ${entry.groupLabel} family container in Systema Dipterorum; it is not presented as a fully resolved phylogenetic branch.`,
    caveat: entry.rankNote
      ? "Systema Dipterorum lists this as the Iteaphila group because its family-level rank remains unsettled."
      : "No reviewed family geometry is claimed here until a licensed reference or specimen tracing has been checked.",
    confidence: "working",
    sourceLabel: "Systema Dipterorum 7.2 · family classification",
    sourceUrl: SYSTEMA_DIPTERORUM_FAMILY_SOURCE,
    accent: constellationAccent(entry.groupId),
    variant: catalogVariant(entry),
  }));

const initialProfiles: FamilyProfile[] = [...authoredProfiles, ...catalogScaffoldProfiles];
const atlasReferenceCount = initialProfiles.filter((profile) => familyWingReferences[profile.id]).length;
const atlasScaffoldCount = DIPTERA_FAMILY_COUNT - atlasReferenceCount;

function cladeNode(id: string, parentId: string | null, label: string, order: number, confidence: Confidence, changeType: ChangeType, changeTitle: string, changeSummary: string, sourceLabel: string, sourceUrl: string): TreeNode {
  return { id, parentId, label, rank: id === "diptera" ? "root" : "clade", order, confidence, changeType, changeTitle, changeSummary, sourceLabel, sourceUrl };
}

function familyTreeNode(familyId: string, parentId: string, order: number, changeType: ChangeType = "shift"): TreeNode {
  const profile = initialProfiles.find((item) => item.id === familyId);
  if (!profile) throw new Error(`Missing family profile: ${familyId}`);
  return {
    id: `${familyId}-node`, parentId, label: profile.family, rank: "family", order, confidence: profile.confidence, changeType,
    changeTitle: `${profile.family} wing state`, changeSummary: `${profile.diagnosticWing} ${profile.caveat}`,
    sourceLabel: profile.sourceLabel, sourceUrl: profile.sourceUrl, familyId,
  };
}

const sampledTree: TreeNode[] = [
  cladeNode("diptera", null, "Diptera", 0, "high", "gain", "One functional wing pair", "Hind wings are transformed into halteres; this atlas follows changes inside the forewing venation.", "Wiegmann et al. 2011", PHYLOGENY_SOURCE),

  cladeNode("lower", "diptera", "early dipteran radiations · teaching grade", 0, "working", "uncertain", "Deep lower-Diptera order remains difficult", "This is an editable teaching container, not a claim that the included lineages form one clade. Short ancient internodes remain sensitive to sampling and analysis.", "Wiegmann et al. 2011", PHYLOGENY_SOURCE),
  cladeNode("tipulomorpha", "lower", "Tipulomorpha", 0, "medium", "shift", "elongate, comparatively complete networks", "The sampled crane-fly lineages retain rich branching, but exact family limits and early branching remain under study.", "Wiegmann et al. 2011; MAD vol. 2", PHYLOGENY_SOURCE),
  familyTreeNode("trichoceridae", "tipulomorpha", 0),
  cladeNode("tipuloidea", "tipulomorpha", "Tipuloidea", 1, "medium", "shift", "crane-fly radial and medial organization", "Tipulidae and Limoniidae are shown together as a practical teaching hypothesis; family limits and internal topology should be verified against the chosen classification.", "MAD vol. 2", MANUAL_VOL2),
  familyTreeNode("tipulidae", "tipuloidea", 0),
  familyTreeNode("limoniidae", "tipuloidea", 1),
  cladeNode("ptychopteromorpha", "lower", "Ptychopteromorpha", 1, "medium", "shift", "isolated rich-venation lineage", "Ptychopteridae is retained as its own early radiation rather than treated as an ancestor-like crane fly.", "Wiegmann et al. 2011; MAD vol. 2", PHYLOGENY_SOURCE),
  familyTreeNode("ptychopteridae", "ptychopteromorpha", 0),
  cladeNode("culicomorpha", "lower", "Culicomorpha", 2, "high", "shift", "narrow wings and repeated surface specializations", "Culicoidea and Chironomoidea form the sampled culicomorphan radiation; scales, setation and fork geometry evolved in lineage-specific combinations.", "Wiegmann et al. 2011", PHYLOGENY_SOURCE),
  cladeNode("culicoidea", "culicomorpha", "Culicoidea", 0, "medium", "shift", "culicoid fork geometry", "The four sampled families are compared through scales, vein strength and radial/medial fork positions.", "MAD vol. 2", MANUAL_VOL2),
  familyTreeNode("dixidae", "culicoidea", 0),
  familyTreeNode("corethrellidae", "culicoidea", 1),
  familyTreeNode("chaoboridae", "culicoidea", 2),
  familyTreeNode("culicidae", "culicoidea", 3, "gain"),
  cladeNode("chironomoidea", "culicomorpha", "Chironomoidea", 1, "high", "reduction", "anterior concentration and radial-cell change", "The sampled families repeatedly redistribute vein strength and reduce radial cells; these are not treated as one universal innovation.", "MAD vol. 2", MANUAL_VOL2),
  familyTreeNode("simuliidae", "chironomoidea", 0, "reduction"),
  familyTreeNode("ceratopogonidae", "chironomoidea", 1, "shift"),
  familyTreeNode("chironomidae", "chironomoidea", 2, "reduction"),
  cladeNode("psychodomorpha", "lower", "Psychodomorpha", 3, "working", "shift", "setose broad-wing morphologies", "Psychodidae is shown as a sampled branch; psychodine and phlebotomine wings require separate templates.", "MAD vol. 2", MANUAL_VOL2),
  familyTreeNode("psychodidae", "psychodomorpha", 0, "reduction"),
  cladeNode("blephariceromorpha", "lower", "Blephariceromorpha", 4, "medium", "shift", "stream-associated lineage", "Blephariceridae is retained as a distinct early dipteran radiation with family-specific wing geometry.", "MAD vol. 2", MANUAL_VOL2),
  familyTreeNode("blephariceridae", "blephariceromorpha", 0),
  cladeNode("bibionomorpha-sl", "lower", "Bibionomorpha sensu lato · working", 5, "working", "uncertain", "sciaroid relationships remain actively revised", "Anisopodidae is shown near the sampled bibionomorph and sciaroid lineages as an editable working placement.", "Wiegmann et al. 2011", PHYLOGENY_SOURCE),
  familyTreeNode("anisopodidae", "bibionomorpha-sl", 0),
  familyTreeNode("bibionidae", "bibionomorpha-sl", 1, "shift"),
  cladeNode("sciaroidea", "bibionomorpha-sl", "Sciaroidea · sampled", 2, "medium", "reduction", "multiple routes to simplified venation", "Mycetophilidae, Sciaridae and Cecidomyiidae illustrate contrasting degrees of branch and crossvein retention.", "MAD vol. 2", MANUAL_VOL2),
  familyTreeNode("mycetophilidae", "sciaroidea", 0),
  familyTreeNode("sciaridae", "sciaroidea", 1, "reduction"),
  familyTreeNode("cecidomyiidae", "sciaroidea", 2, "reduction"),

  cladeNode("brachycera", "diptera", "Brachycera", 1, "high", "shift", "compact higher-fly radiation", "Genome-scale analyses support Brachycera while resolving its earliest branches as a ladder-like rapid radiation.", "Mulhair et al. 2025", BRACHYCERA_2025_SOURCE),
  cladeNode("early-brachycera", "brachycera", "early Brachycera · teaching grade", 0, "working", "uncertain", "old Orthorrhapha is not a clade", "Stratiomyomorpha, Tabanomorpha and Nemestrinoidea are displayed as successive editable comparisons, not as a named natural group.", "Shin et al. 2018; Mulhair et al. 2025", BRACHYCERA_2025_SOURCE),
  cladeNode("stratiomyomorpha", "early-brachycera", "Stratiomyomorpha", 0, "high", "reduction", "anterior radial concentration", "Xylophagidae and Stratiomyidae provide a contrast in the degree of anterior concentration and posterior weakening.", "Mulhair et al. 2025; MAD vol. 2", BRACHYCERA_2025_SOURCE),
  familyTreeNode("xylophagidae", "stratiomyomorpha", 0),
  familyTreeNode("stratiomyidae", "stratiomyomorpha", 1, "reduction"),
  cladeNode("tabanomorpha", "early-brachycera", "Tabanomorpha", 1, "high", "shift", "robust radial–discal architecture", "Rhagionidae and Tabanidae retain comparatively strong networks whose exact branch states vary across genera.", "Mulhair et al. 2025; MAD vol. 2", BRACHYCERA_2025_SOURCE),
  familyTreeNode("rhagionidae", "tabanomorpha", 0),
  familyTreeNode("tabanidae", "tabanomorpha", 1),
  cladeNode("nemestrinoidea", "early-brachycera", "Nemestrinoidea", 2, "medium", "shift", "crossvein-rich and specialized states", "Nemestrinidae and Acroceridae are paired here; their position within the rapid early brachyceran radiation is retained as revisable.", "Mulhair et al. 2025", BRACHYCERA_2025_SOURCE),
  familyTreeNode("nemestrinidae", "nemestrinoidea", 0, "gain"),
  familyTreeNode("acroceridae", "nemestrinoidea", 1, "reduction"),
  cladeNode("heterodactyla", "brachycera", "Heterodactyla", 1, "high", "shift", "Bombyliidae + Asiloidea + Eremoneura", "Genome-scale evidence supports Heterodactyla as the common ancestor of these three major branches.", "Mulhair et al. 2025", BRACHYCERA_2025_SOURCE),
  familyTreeNode("bombyliidae", "heterodactyla", 0),
  cladeNode("asiloidea", "heterodactyla", "Asiloidea · sampled", 1, "medium", "shift", "distal cell reorganization", "Therevidae and Asilidae are sampled here; repeated cell closure and branch shifts require genus-level coding.", "Mulhair et al. 2025; Shin et al. 2018", BRACHYCERA_2025_SOURCE),
  familyTreeNode("therevidae", "asiloidea", 0),
  familyTreeNode("asilidae", "asiloidea", 1),
  cladeNode("eremoneura", "heterodactyla", "Eremoneura", 2, "high", "fusion", "Empidoidea + Cyclorrhapha", "A robust higher-brachyceran lineage; exact vein homologies still require an explicit nomenclatural standard.", "Mulhair et al. 2025", BRACHYCERA_2025_SOURCE),
  cladeNode("empidoidea", "eremoneura", "Empidoidea", 0, "high", "reduction", "compact eremoneuran networks", "The three sampled families show repeated radial-fork and discal-region simplification.", "Mulhair et al. 2025; MAD vol. 3", BRACHYCERA_2025_SOURCE),
  familyTreeNode("empididae", "empidoidea", 0, "reduction"),
  familyTreeNode("hybotidae", "empidoidea", 1, "reduction"),
  familyTreeNode("dolichopodidae", "empidoidea", 2, "reduction"),
  cladeNode("cyclorrhapha", "eremoneura", "Cyclorrhapha", 1, "high", "reduction", "basal venation reorganized", "A strongly supported radiation containing Platypezoidea, syrphid-grade lineages and Schizophora among the sampled families.", "Wiegmann et al. 2011", PHYLOGENY_SOURCE),
  cladeNode("platypezoidea", "cyclorrhapha", "Platypezoidea · sampled", 0, "medium", "reduction", "contrasting early cyclorrhaphan reductions", "Platypezidae and Phoridae are placed together as a sampled superfamily hypothesis, with strongly different vein-reduction patterns.", "Wiegmann et al. 2011; MAD vol. 3", PHYLOGENY_SOURCE),
  familyTreeNode("platypezidae", "platypezoidea", 0, "reduction"),
  familyTreeNode("phoridae", "platypezoidea", 1, "reduction"),
  familyTreeNode("syrphidae", "cyclorrhapha", 1, "gain"),
  cladeNode("schizophora", "cyclorrhapha", "Schizophora", 2, "high", "shift", "rapid higher-cyclorrhaphan radiation", "Dense phylogenomic sampling rejects a single natural acalyptrate group and supports a monophyletic Calyptratae.", "Bayless et al. 2021", SCHIZOPHORA_SOURCE),
  familyTreeNode("pipunculidae", "schizophora", 0, "reduction"),
  cladeNode("sciomyzoidea", "schizophora", "Sciomyzoidea sensu lato · sampled", 1, "medium", "shift", "early schizophoran branch", "Bayless et al. recover Sciomyzoidea after Pipunculidae; the two sampled family positions remain editable.", "Bayless et al. 2021", SCHIZOPHORA_SOURCE),
  familyTreeNode("sciomyzidae", "sciomyzoidea", 0),
  familyTreeNode("sepsidae", "sciomyzoidea", 1),
  cladeNode("remaining-schizophora", "schizophora", "remaining Schizophora · rapid radiation", 2, "working", "uncertain", "several superfamily relationships remain unstable", "This node deliberately preserves uncertainty instead of forcing a fully resolved ladder; Chloropidae and several superfamily placements remain difficult.", "Bayless et al. 2021", SCHIZOPHORA_SOURCE),
  cladeNode("tephritoidea", "remaining-schizophora", "Tephritoidea · sampled", 0, "medium", "gain", "patterned wings and family-specific cell states", "Tephritidae, Ulidiidae and Platystomatidae are sampled; pigmentation is not itself a universal synapomorphy of every member.", "MAD vol. 3", MANUAL_VOL3),
  familyTreeNode("tephritidae", "tephritoidea", 0, "gain"),
  familyTreeNode("ulidiidae", "tephritoidea", 1, "gain"),
  familyTreeNode("platystomatidae", "tephritoidea", 2, "gain"),
  cladeNode("lauxanioidea", "remaining-schizophora", "Lauxanioidea · sampled", 1, "working", "shift", "acalyptrate working placement", "Only Lauxaniidae is sampled; the higher placement is kept editable because nearby superfamily relationships vary among analyses.", "Bayless et al. 2021; MAD vol. 3", SCHIZOPHORA_SOURCE),
  familyTreeNode("lauxaniidae", "lauxanioidea", 0),
  cladeNode("opomyzoidea", "remaining-schizophora", "Opomyzoidea · sampled", 2, "working", "reduction", "small-fly reduction series", "Agromyzidae is shown as a sampled opomyzoid lineage with a reduced anal region.", "Bayless et al. 2021; MAD vol. 3", SCHIZOPHORA_SOURCE),
  familyTreeNode("agromyzidae", "opomyzoidea", 0, "reduction"),
  cladeNode("diopsoidea", "remaining-schizophora", "Diopsoidea · sampled", 3, "working", "shift", "working higher-schizophoran placement", "Diopsidae is retained as an editable sampled tip; its striking head innovation should not be confused with a unique wing innovation.", "Bayless et al. 2021; MAD vol. 3", SCHIZOPHORA_SOURCE),
  familyTreeNode("diopsidae", "diopsoidea", 0),
  cladeNode("conopoidea", "remaining-schizophora", "Conopoidea · working", 4, "working", "shift", "distal radial-cell closure", "Conopidae placement and internal venation states should be revisited as higher-schizophoran sampling improves.", "Bayless et al. 2021; MAD vol. 3", SCHIZOPHORA_SOURCE),
  familyTreeNode("conopidae", "conopoidea", 0),
  familyTreeNode("chloropidae", "remaining-schizophora", 5, "reduction"),
  cladeNode("ephydro-calyptratae", "remaining-schizophora", "Ephydroidea + Calyptratae", 6, "high", "shift", "supported sister relationship", "Bayless et al. recover Ephydroidea as sister to the monophyletic Calyptratae.", "Bayless et al. 2021", SCHIZOPHORA_SOURCE),
  cladeNode("ephydroidea", "ephydro-calyptratae", "Ephydroidea", 0, "high", "reduction", "compact acalyptrate venation", "Drosophilidae and Ephydridae form the sampled ephydroid pair; costal breaks and vein ratios carry much of the signal.", "Bayless et al. 2021; MAD vol. 3", SCHIZOPHORA_SOURCE),
  familyTreeNode("drosophilidae", "ephydroidea", 0, "reduction"),
  familyTreeNode("ephydridae", "ephydroidea", 1, "reduction"),
  cladeNode("calyptratae", "ephydro-calyptratae", "Calyptratae", 1, "high", "gain", "calypter complex and higher-fly radiation", "Phylogenomics supports Calyptratae and clarifies major muscoid and oestroid branches; family-level wing diagnoses still need non-wing characters.", "Kutty et al. 2019", CALYPTRATAE_SOURCE),
  familyTreeNode("anthomyiidae", "calyptratae", 0),
  familyTreeNode("muscidae", "calyptratae", 1),
  cladeNode("oestroidea", "calyptratae", "Oestroidea · sampled", 2, "medium", "shift", "forward-bent M and setation characters", "Calliphoridae sensu lato is taxonomically unstable; the sampled tips should be interpreted through representative genera.", "Buenaventura et al. 2021", "https://doi.org/10.1111/syen.12443"),
  familyTreeNode("calliphoridae", "oestroidea", 0),
  familyTreeNode("sarcophagidae", "oestroidea", 1),
];

const classificationGroups: Array<{ id: string; parentId: string; label: string; order: number }> = [
  { id: "tipulomorpha", parentId: "lower", label: "Tipulomorpha", order: 0 },
  { id: "psychodomorpha", parentId: "lower", label: "Psychodomorpha", order: 1 },
  { id: "ptychopteromorpha", parentId: "lower", label: "Ptychopteromorpha", order: 2 },
  { id: "culicomorpha", parentId: "lower", label: "Culicomorpha", order: 3 },
  { id: "blephariceromorpha", parentId: "lower", label: "Blephariceromorpha", order: 4 },
  { id: "bibionomorpha", parentId: "lower", label: "Bibionomorpha · catalogue container", order: 5 },
  { id: "axymyiomorpha", parentId: "lower", label: "Axymyiomorpha", order: 6 },
  { id: "stratiomyomorpha", parentId: "early-brachycera", label: "Stratiomyomorpha", order: 0 },
  { id: "tabanomorpha", parentId: "early-brachycera", label: "Tabanomorpha", order: 1 },
  { id: "vermileonomorpha", parentId: "early-brachycera", label: "Vermileonomorpha", order: 2 },
  { id: "asiloidea", parentId: "heterodactyla", label: "Asiloidea", order: 1 },
  { id: "empidoidea", parentId: "eremoneura", label: "Empidoidea", order: 0 },
  { id: "aschiza", parentId: "cyclorrhapha", label: "Aschiza · traditional working grade", order: 0 },
  { id: "calyptratae", parentId: "schizophora", label: "Calyptratae", order: 0 },
  { id: "acalyptratae", parentId: "schizophora", label: "Acalyptratae · non-monophyletic working grade", order: 3 },
  { id: "nerioidea", parentId: "acalyptratae", label: "Nerioidea", order: 0 },
  { id: "diopsoidea", parentId: "remaining-schizophora", label: "Diopsoidea", order: 3 },
  { id: "conopoidea", parentId: "remaining-schizophora", label: "Conopoidea", order: 4 },
  { id: "tephritoidea", parentId: "remaining-schizophora", label: "Tephritoidea", order: 0 },
  { id: "lauxanioidea", parentId: "remaining-schizophora", label: "Lauxanioidea", order: 1 },
  { id: "sciomyzoidea", parentId: "schizophora", label: "Sciomyzoidea", order: 1 },
  { id: "opomyzoidea", parentId: "remaining-schizophora", label: "Opomyzoidea", order: 2 },
  { id: "carnoidea", parentId: "acalyptratae", label: "Carnoidea", order: 6 },
  { id: "sphaeroceroidea", parentId: "acalyptratae", label: "Sphaeroceroidea", order: 7 },
  { id: "ephydroidea", parentId: "ephydro-calyptratae", label: "Ephydroidea", order: 0 },
];

const sampledNodeIds = new Set(sampledTree.map((node) => node.id));
const sampledFamilyIds = new Set(sampledTree.flatMap((node) => node.familyId ? [node.familyId] : []));
const supplementalGroupNodes = classificationGroups
  .filter((group) => !sampledNodeIds.has(group.id))
  .map((group) => cladeNode(
    group.id,
    group.parentId,
    group.label,
    group.order,
    "working",
    "uncertain",
    "complete family-classification container",
    "This node completes the global family catalogue. It is a navigation scaffold, not a claim that every higher relationship is fully resolved.",
    "Systema Dipterorum 7.2 · family classification",
    SYSTEMA_DIPTERORUM_FAMILY_SOURCE,
  ));
const supplementalFamilyNodes = DIPTERA_FAMILY_CATALOG
  .filter((entry) => !sampledFamilyIds.has(entry.id))
  .map((entry) => familyTreeNode(
    entry.id,
    entry.groupId,
    DIPTERA_FAMILY_CATALOG.filter((candidate) => candidate.groupId === entry.groupId).findIndex((candidate) => candidate.id === entry.id),
    "uncertain",
  ));
const initialTree: TreeNode[] = [...sampledTree, ...supplementalGroupNodes, ...supplementalFamilyNodes];

function buildWing(profile: FamilyProfile): FamilyWingTemplate {
  const nodes = Object.fromEntries(Object.entries(reviewedEristalisPayload.nodes).map(([id, point]) => [id, { x: point.x, y: point.y }])) as Record<string, FamilyWingPoint>;
  const veinColors = Object.fromEntries(reviewedEristalisPayload.veins.map((vein) => [vein.id === "Cu1" ? "m-cu" : vein.id, vein.color]));
  const paths = reviewedEristalisPayload.paths.map((path) => ({
    veinId: path.veinId === "Cu1" ? "m-cu" : path.veinId,
    nodeIds: [...path.nodeIds],
    color: veinColors[path.veinId === "Cu1" ? "m-cu" : path.veinId],
  }));

  return {
    id: `family-${profile.id}`,
    name: `${profile.family} · editable copy of your reviewed template`,
    taxon: `${profile.family} · Eristalis-derived starting scaffold`,
    note: `Your hand-reviewed Eristalis topology is used as a neutral editable starting point. Refit and relabel it against a representative ${profile.family} specimen before treating it as family geometry.`,
    referenceSize: { width: reviewedEristalisPayload.sourceImage.width, height: reviewedEristalisPayload.sourceImage.height },
    nodes,
    paths,
    mappingStatus: profile.id === "syrphidae" ? "reviewed" : "scaffold",
  };
}

function wingPath(points: FamilyWingPoint[]) {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const following = points[index + 2] ?? next;
    const segmentLength = Math.max(1, Math.hypot(next.x - current.x, next.y - current.y));
    const clamp = (x: number, y: number) => {
      const length = Math.hypot(x, y);
      const maximum = segmentLength * .36;
      const scale = length > maximum ? maximum / length : 1;
      return { x: x * scale, y: y * scale };
    };
    const outgoing = clamp((next.x - previous.x) / 6, (next.y - previous.y) / 6);
    const incoming = clamp((current.x - following.x) / 6, (current.y - following.y) / 6);
    d += ` C ${(current.x + outgoing.x).toFixed(2)} ${(current.y + outgoing.y).toFixed(2)}, ${(next.x + incoming.x).toFixed(2)} ${(next.y + incoming.y).toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return d;
}

function cloneTree(nodes: TreeNode[]) {
  return nodes.map((node) => ({ ...node }));
}

function cloneWings(wings: Record<string, FamilyWingTemplate>) {
  return Object.fromEntries(Object.entries(wings).map(([id, wing]) => [id, {
    ...wing,
    nodes: Object.fromEntries(Object.entries(wing.nodes).map(([nodeId, point]) => [nodeId, { ...point }])),
    paths: wing.paths.map((path) => ({ ...path, nodeIds: [...path.nodeIds] })),
    outlinePoints: wing.outlinePoints?.map((point) => ({ ...point })),
  }])) as Record<string, FamilyWingTemplate>;
}

const initialWings = Object.fromEntries(initialProfiles.map((profile) => [profile.id, buildWing(profile)])) as Record<string, FamilyWingTemplate>;

const WingGlyph = memo(function WingGlyph({ wing, accent, editable = false, animate = false, showLabels = false, selectedVeinId, draggingNode, onVeinSelect, onNodeDown, onMove, onUp }: {
  wing: FamilyWingTemplate;
  accent: string;
  editable?: boolean;
  animate?: boolean;
  showLabels?: boolean;
  selectedVeinId?: string | null;
  draggingNode?: string | null;
  onVeinSelect?: (veinId: string) => void;
  onNodeDown?: (nodeId: string, event: ReactPointerEvent<SVGCircleElement>) => void;
  onMove?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onUp?: (event: ReactPointerEvent<SVGSVGElement>) => void;
}) {
  const [morphNodes, setMorphNodes] = useState<Record<string, FamilyWingPoint>>(() => wing.nodes);
  const morphNodesRef = useRef<Record<string, FamilyWingPoint>>(wing.nodes);

  useEffect(() => {
    if (!animate || editable || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      morphNodesRef.current = wing.nodes;
      setMorphNodes(wing.nodes);
      return;
    }

    const from = morphNodesRef.current;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 680);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextNodes = Object.fromEntries(Object.entries(wing.nodes).map(([nodeId, target]) => {
        const start = from[nodeId] ?? target;
        return [nodeId, { x: start.x + (target.x - start.x) * eased, y: start.y + (target.y - start.y) * eased }];
      })) as Record<string, FamilyWingPoint>;
      morphNodesRef.current = nextNodes;
      setMorphNodes(nextNodes);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else morphNodesRef.current = wing.nodes;
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animate, editable, wing]);

  const visibleNodes = animate && !editable ? morphNodes : wing.nodes;

  const chooseVein = (veinId: string) => onVeinSelect?.(veinId);

  return <svg className={`family-wing-glyph ${editable ? "editable" : ""} ${animate ? "morph-enabled" : ""} ${onVeinSelect ? "vein-selectable" : ""}`} viewBox="0 0 560 246" role={onVeinSelect ? "group" : "img"} aria-label={`${wing.name} vector wing`} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
    <path className="wing-outline" d={wing.outlinePoints?.length ? `${wingPath(wing.outlinePoints)} Z` : "M 12 64 C 92 53 218 34 351 23 C 432 16 503 26 542 49 C 556 58 554 74 541 94 C 514 136 456 172 386 199 C 311 228 224 231 149 205 C 89 184 44 135 18 97 C 8 82 6 70 12 64 Z"} />
    {wing.paths.map((path) => {
      const points = path.nodeIds.map((id) => visibleNodes[id]).filter(Boolean);
      const selected = selectedVeinId === path.veinId;
      const displayLabel = path.displayLabel ?? path.veinId;
      const labelPlacement = wingLabelPlacements[displayLabel];
      const labelAnchor = labelPlacement ? visibleNodes[labelPlacement.nodeId] : undefined;
      const fallbackLabelPoint = points[Math.max(0, Math.min(points.length - 1, Math.floor(points.length * .68)))];
      return <g
        key={path.veinId}
        className={`wing-vein-group ${selected ? "selected" : ""} ${onVeinSelect ? "selectable" : ""}`}
        role={onVeinSelect ? "button" : undefined}
        tabIndex={onVeinSelect ? 0 : undefined}
        aria-label={onVeinSelect ? `Select ${veinMeta(path.displayLabel ?? path.veinId, path.color).fullName}` : undefined}
        aria-pressed={onVeinSelect ? selected : undefined}
        onClick={() => chooseVein(path.veinId)}
        onKeyDown={(event) => {
          if (!onVeinSelect || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          chooseVein(path.veinId);
        }}
      >
        {onVeinSelect && <path d={wingPath(points)} className="wing-vein-hit" vectorEffect="non-scaling-stroke" />}
        <path d={wingPath(points)} className="wing-vein-selection-halo" vectorEffect="non-scaling-stroke" />
        <path d={wingPath(points)} className="wing-vein-line" style={{ stroke: path.color ?? accent }} vectorEffect="non-scaling-stroke" />
        {showLabels && labelPlacement && labelAnchor && <g className={`wing-label-callout ${selected ? "selected" : ""}`}>
          <line x1={labelAnchor.x} y1={labelAnchor.y} x2={labelPlacement.x} y2={labelPlacement.y - 4} vectorEffect="non-scaling-stroke" />
          <text x={labelPlacement.x} y={labelPlacement.y} textAnchor={labelPlacement.anchor ?? "middle"}>{displayLabel}</text>
        </g>}
        {showLabels && !labelPlacement && fallbackLabelPoint && <text x={fallbackLabelPoint.x + 4} y={fallbackLabelPoint.y - 5} className={`wing-vein-label source-label ${selected ? "selected" : ""}`}>{displayLabel}</text>}
        {editable && !showLabels && points.length > 1 && <text x={points[Math.floor(points.length * .62)].x + 4} y={points[Math.floor(points.length * .62)].y - 5} className="wing-vein-label">{displayLabel}</text>}
      </g>;
    })}
    {editable && Object.entries(visibleNodes).map(([nodeId, point]) => <circle key={nodeId} cx={point.x} cy={point.y} r={draggingNode === nodeId ? 7 : 5} className={`family-wing-point ${draggingNode === nodeId ? "dragging" : ""}`} onPointerDown={(event) => onNodeDown?.(nodeId, event)} />)}
  </svg>;
});

function computeMobileTreeRows(nodes: TreeNode[], expanded: Set<string>) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, TreeNode[]>();
  nodes.forEach((node) => {
    if (!node.parentId || !byId.has(node.parentId)) return;
    children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  });
  children.forEach((items) => items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)));
  const familyCount = new Map<string, number>();
  const countFamilies = (node: TreeNode, seen = new Set<string>()): number => {
    if (node.rank === "family") return 1;
    if (seen.has(node.id)) return 0;
    const total = (children.get(node.id) ?? []).reduce((sum, child) => sum + countFamilies(child, new Set(seen).add(node.id)), 0);
    familyCount.set(node.id, total);
    return total;
  };
  nodes.forEach((node) => countFamilies(node));
  const rows: Array<{ node: TreeNode; depth: number; childCount: number; familyCount: number; hasChildren: boolean }> = [];
  const visited = new Set<string>();
  const visit = (node: TreeNode, depth: number) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    const kids = children.get(node.id) ?? [];
    rows.push({ node, depth, childCount: kids.length, familyCount: familyCount.get(node.id) ?? (node.rank === "family" ? 1 : 0), hasChildren: kids.length > 0 });
    if (node.rank === "root" || expanded.has(node.id)) kids.forEach((child) => visit(child, depth + 1));
  };
  nodes
    .filter((node) => !node.parentId || !byId.has(node.parentId))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .forEach((root) => visit(root, 0));
  nodes.filter((node) => !visited.has(node.id)).forEach((node) => visit(node, 0));
  return rows;
}

function mobileAncestorIds(nodes: TreeNode[], nodeId: string) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ancestors: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(nodeId);
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    ancestors.push(current.parentId);
    current = byId.get(current.parentId);
  }
  return ancestors;
}

function mobileLineage(nodes: TreeNode[], nodeId: string) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return [...mobileAncestorIds(nodes, nodeId).reverse(), nodeId]
    .map((id) => byId.get(id))
    .filter((node): node is TreeNode => Boolean(node));
}

function autoLayout(nodes: TreeNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, TreeNode[]>();
  nodes.forEach((node) => {
    if (!node.parentId || !byId.has(node.parentId)) return;
    children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  });
  children.forEach((items) => items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)));

  const positions: Record<string, BoardPoint> = {};
  const visiting = new Set<string>();
  let leafIndex = 0;
  const visit = (node: TreeNode, depth: number): number => {
    if (visiting.has(node.id)) {
      const y = 150 + leafIndex++ * 126;
      positions[node.id] = { x: 150 + depth * 330, y };
      return y;
    }
    visiting.add(node.id);
    const kids = children.get(node.id) ?? [];
    let y: number;
    if (!kids.length) {
      y = 150 + leafIndex++ * 126;
    } else {
      const childYs = kids.map((child) => visit(child, depth + 1));
      y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }
    positions[node.id] = { x: 150 + depth * 330, y };
    visiting.delete(node.id);
    return y;
  };

  nodes
    .filter((node) => !node.parentId || !byId.has(node.parentId))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .forEach((root) => visit(root, 0));
  nodes.filter((node) => !positions[node.id]).forEach((node) => visit(node, 0));
  return positions;
}

function safeBoardPositions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const x = Number((raw as { x?: unknown }).x);
    const y = Number((raw as { y?: unknown }).y);
    return Number.isFinite(x) && Number.isFinite(y) ? [[id, { x, y }]] : [];
  })) as Record<string, BoardPoint>;
}

function safeBoardView(value: unknown): BoardView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const x = Number((value as { x?: unknown }).x);
  const y = Number((value as { y?: unknown }).y);
  const scale = Number((value as { scale?: unknown }).scale);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(scale)
    ? { x, y, scale: Math.max(.22, Math.min(1.45, scale)) }
    : null;
}

function wouldCreateCycle(nodes: TreeNode[], childId: string, proposedParentId: string) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  let current = byId.get(proposedParentId);
  while (current && !seen.has(current.id)) {
    if (current.id === childId) return true;
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return false;
}

function safeProject(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const candidate = payload as { tree?: unknown; wings?: unknown; positions?: unknown; boardView?: unknown };
  if (!Array.isArray(candidate.tree) || !candidate.wings || typeof candidate.wings !== "object") return null;
  const tree = candidate.tree.filter((value): value is TreeNode => Boolean(value && typeof value === "object" && typeof (value as TreeNode).id === "string" && typeof (value as TreeNode).label === "string"));
  if (!tree.length) return null;
  const wings = candidate.wings as Record<string, FamilyWingTemplate>;
  return { tree, wings, positions: safeBoardPositions(candidate.positions), boardView: safeBoardView(candidate.boardView) };
}

function mergeWithCompleteCatalog(savedTree: TreeNode[]) {
  const savedById = new Map(savedTree.map((node) => [node.id, node]));
  const builtInIds = new Set(initialTree.map((node) => node.id));
  return [
    ...initialTree.map((node) => savedById.has(node.id) ? { ...node, ...savedById.get(node.id)! } : { ...node }),
    ...savedTree.filter((node) => node.userAdded || !builtInIds.has(node.id)).map((node) => ({ ...node })),
  ];
}

function isUntouchedScaffold(wing: FamilyWingTemplate, profileId: string) {
  if (wing.mappingStatus === "scaffold") return true;
  if (wing.mappingStatus) return false;
  const original = initialWings[profileId];
  if (!original || wing.paths.length !== original.paths.length) return false;
  const nodeIds = Object.keys(original.nodes);
  if (Object.keys(wing.nodes).length !== nodeIds.length) return false;
  return nodeIds.every((nodeId) => {
    const current = wing.nodes[nodeId];
    const source = original.nodes[nodeId];
    return current && Math.abs(current.x - source.x) < .01 && Math.abs(current.y - source.y) < .01;
  });
}

export default function PhyloAtlas({ onOpenMapper }: { onOpenMapper: (familyId: string, wing: FamilyWingTemplate, reference?: FamilyWingReference) => void }) {
  const [tree, setTree] = useState<TreeNode[]>(() => cloneTree(initialTree));
  const [wings, setWings] = useState<Record<string, FamilyWingTemplate>>(() => cloneWings(initialWings));
  const [positions, setPositions] = useState<Record<string, BoardPoint>>(() => autoLayout(initialTree));
  const [boardView, setBoardView] = useState<BoardView>({ x: -520, y: -5100, scale: .58 });
  const [selectedNodeId, setSelectedNodeId] = useState("syrphidae-node");
  const [editTree, setEditTree] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [wingEditing, setWingEditing] = useState(false);
  const [selectedVeinId, setSelectedVeinId] = useState("C");
  const [draggingWingNode, setDraggingWingNode] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [conversionState, setConversionState] = useState<Record<string, "mapping" | "ready" | "failed">>({});
  const [conversionError, setConversionError] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("Flowchart loaded · drag the board, then edit cards and connections.");
  const importRef = useRef<HTMLInputElement>(null);
  const wingSvgRef = useRef<SVGSVGElement | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardGesture = useRef<BoardGesture | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("entowing-phylo-project-v6")
        ?? window.localStorage.getItem("entowing-phylo-project-v5")
        ?? window.localStorage.getItem("entowing-phylo-project-v4")
        ?? window.localStorage.getItem("entowing-phylo-project-v3")
        ?? window.localStorage.getItem("entowing-phylo-project-v2");
      if (saved) {
        const parsed = safeProject(JSON.parse(saved));
        if (parsed) {
          const mergedTree = mergeWithCompleteCatalog(parsed.tree);
          setTree(mergedTree);
          setWings({ ...cloneWings(initialWings), ...parsed.wings });
          setPositions({ ...autoLayout(mergedTree), ...parsed.positions });
          if (parsed.boardView) setBoardView(parsed.boardView);
          setStatus(`Your edits were restored and merged with the complete ${DIPTERA_FAMILY_COUNT}-entry Diptera catalogue.`);
        }
      }
    } catch {
      setStatus("Research tree loaded; a damaged local draft was ignored.");
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem("entowing-phylo-project-v6", JSON.stringify({ schema: "entowing-phylogeny/6.0", catalogue: `Systema Dipterorum · ${DIPTERA_FAMILY_COUNT} extant family-level entries`, template: "Eristalis-reference · 47 nodes · 13 structures", tree, wings, positions, boardView }));
      } catch {
        // The atlas remains usable even when private storage is unavailable.
      }
    }, 420);
    return () => window.clearTimeout(saveTimer);
  }, [tree, wings, positions, boardView, storageReady]);

  const selectedNode = tree.find((node) => node.id === selectedNodeId) ?? tree[0];
  const selectedLineage = useMemo(() => mobileLineage(tree, selectedNodeId), [tree, selectedNodeId]);
  const selectedProfile: FamilyProfile | null = selectedNode?.familyId
    ? initialProfiles.find((profile) => profile.id === selectedNode.familyId) ?? {
        id: selectedNode.familyId,
        family: selectedNode.label,
        commonName: "user-added family",
        clade: tree.find((node) => node.id === selectedNode.parentId)?.label ?? "user placement",
        representative: "user-created working morphotype",
        diagnosticWing: "This family is ready for your diagnosis.",
        evolutionaryReading: "Describe the wing state and its evidence in the node editor, then refine the geometry here or in Wing Mapper.",
        caveat: "User-added node: placement, terminology and geometry have not been independently verified.",
        confidence: selectedNode.confidence,
        sourceLabel: selectedNode.sourceLabel,
        sourceUrl: selectedNode.sourceUrl,
        accent: "#7b6f8f",
        variant: "empidid",
      }
    : null;
  const selectedWing = selectedProfile ? wings[selectedProfile.id] : null;
  const selectedReference = selectedProfile ? familyWingReferences[selectedProfile.id] : undefined;
  const sortedProfiles = useMemo(() => [...initialProfiles].sort((a, b) => a.family.localeCompare(b.family)), []);
  const selectedVeinPath = selectedWing?.paths.find((path) => path.veinId === selectedVeinId) ?? selectedWing?.paths[0];
  const selectedVein = selectedVeinPath ? veinMeta(selectedVeinPath.displayLabel ?? selectedVeinPath.veinId, selectedVeinPath.color) : null;

  async function rebuildReferenceDraft(familyId: string, reference: FamilyWingReference) {
    setConversionState((current) => ({ ...current, [familyId]: "mapping" }));
    setConversionError((current) => {
      const next = { ...current };
      delete next[familyId];
      return next;
    });
    setStatus(`${reference.family}: separating venation, labels and leader lines from the published SVG…`);
    try {
      const draft = await mapReferenceSvgToTemplate(reference);
      setWings((current) => ({ ...current, [familyId]: draft }));
      setSelectedVeinId(draft.paths.find((path) => path.confidence !== "unassigned")?.veinId ?? draft.paths[0]?.veinId ?? "C");
      setConversionState((current) => ({ ...current, [familyId]: "ready" }));
      setStatus(`${reference.family}: machine-mapped ${draft.mappingStats?.sourcePathCount ?? draft.paths.length} vector paths; ${draft.mappingStats?.namedPathCount ?? 0} received label suggestions. Please verify them.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "the SVG could not be reconstructed";
      setConversionState((current) => ({ ...current, [familyId]: "failed" }));
      setConversionError((current) => ({ ...current, [familyId]: message }));
      setStatus(`${reference.family}: ${message}`);
    }
  }

  useEffect(() => {
    if (!storageReady || !selectedProfile || !selectedReference || !selectedWing || selectedProfile.id === "syrphidae") return;
    if (conversionState[selectedProfile.id] || !isUntouchedScaffold(selectedWing, selectedProfile.id)) return;
    void rebuildReferenceDraft(selectedProfile.id, selectedReference);
  }, [conversionState, selectedProfile, selectedReference, selectedWing, storageReady]);

  useEffect(() => {
    if (!selectedWing?.paths.length || selectedWing.paths.some((path) => path.veinId === selectedVeinId)) return;
    setSelectedVeinId(selectedWing.paths[0].veinId);
  }, [selectedVeinId, selectedWing]);

  const centerBoardOn = useCallback((nodeId = selectedNodeId, scale = boardView.scale) => {
    const board = boardRef.current;
    const position = positions[nodeId];
    if (!board || !position) return;
    const rect = board.getBoundingClientRect();
    const nextScale = Math.max(.22, Math.min(1.45, scale));
    setBoardView({
      x: rect.width / 2 - (position.x + 116) * nextScale,
      y: rect.height / 2 - (position.y + 48) * nextScale,
      scale: nextScale,
    });
  }, [boardView.scale, positions, selectedNodeId]);

  function fitPositions(layout: Record<string, BoardPoint>) {
    const board = boardRef.current;
    const values = Object.values(layout);
    if (!board || !values.length) return;
    const rect = board.getBoundingClientRect();
    const minX = Math.min(...values.map((point) => point.x));
    const maxX = Math.max(...values.map((point) => point.x + 232));
    const minY = Math.min(...values.map((point) => point.y));
    const maxY = Math.max(...values.map((point) => point.y + 96));
    const scale = Math.max(.16, Math.min(.9, Math.min((rect.width - 80) / Math.max(1, maxX - minX), (rect.height - 80) / Math.max(1, maxY - minY))));
    setBoardView({ x: (rect.width - (maxX - minX) * scale) / 2 - minX * scale, y: (rect.height - (maxY - minY) * scale) / 2 - minY * scale, scale });
  }

  function fitBoard() {
    fitPositions(positions);
    setStatus("Whole phylogeny fitted into the board.");
  }

  function zoomBoard(factor: number, clientX?: number, clientY?: number) {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const anchorX = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const anchorY = (clientY ?? rect.top + rect.height / 2) - rect.top;
    setBoardView((current) => {
      const scale = Math.max(.22, Math.min(1.45, current.scale * factor));
      const worldX = (anchorX - current.x) / current.scale;
      const worldY = (anchorY - current.y) / current.scale;
      return { x: anchorX - worldX * scale, y: anchorY - worldY * scale, scale };
    });
  }

  function beginBoardPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest(".flow-node")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    boardGesture.current = {
      kind: "pan",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startView: boardView,
    };
  }

  function beginNodeGesture(node: TreeNode, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (linkMode) {
      if (!selectedNode || selectedNode.id === "diptera") {
        setStatus("Select a child card first, then choose Connect parent.");
        setLinkMode(false);
        return;
      }
      if (node.rank === "family" || node.id === selectedNode.id || wouldCreateCycle(tree, selectedNode.id, node.id)) {
        setStatus("A parent must be a clade outside the selected node's descendants.");
        return;
      }
      setTree((current) => current.map((item) => item.id === selectedNode.id ? { ...item, parentId: node.id } : item));
      setLinkMode(false);
      setStatus(`${selectedNode.label} is now connected beneath ${node.label}.`);
      return;
    }

    setSelectedNodeId(node.id);
    setWingEditing(false);
    if (!editTree) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    boardGesture.current = {
      kind: "node",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      nodeId: node.id,
      startNode: positions[node.id] ?? { x: 0, y: 0 },
    };
  }

  function moveBoardGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = boardGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startClientX;
    const dy = event.clientY - gesture.startClientY;
    if (gesture.kind === "pan" && gesture.startView) {
      setBoardView({ ...gesture.startView, x: gesture.startView.x + dx, y: gesture.startView.y + dy });
    } else if (gesture.kind === "node" && gesture.nodeId && gesture.startNode) {
      setPositions((current) => ({ ...current, [gesture.nodeId!]: { x: gesture.startNode!.x + dx / boardView.scale, y: gesture.startNode!.y + dy / boardView.scale } }));
    }
  }

  function endBoardGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = boardGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.kind === "node") setStatus("Card position updated on the flowchart.");
    boardGesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleBoardWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomBoard(Math.exp(-event.deltaY * .003), event.clientX, event.clientY);
    } else {
      setBoardView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
    }
  }

  function autoArrangeBoard() {
    const layout = autoLayout(tree);
    setPositions(layout);
    setStatus("Flowchart automatically arranged from the current parent connections.");
    window.requestAnimationFrame(() => fitPositions(layout));
  }

  function updateSelected(patch: Partial<TreeNode>) {
    setTree((current) => current.map((node) => node.id === selectedNodeId ? { ...node, ...patch } : node));
    setStatus("Tree annotation updated and saved in this browser.");
  }

  function changeSelectedParent(parentId: string | null) {
    if (!selectedNode || selectedNode.id === "diptera") return;
    if (parentId && wouldCreateCycle(tree, selectedNode.id, parentId)) {
      setStatus("That connection would create a cycle, so it was not added.");
      return;
    }
    updateSelected({ parentId });
    setStatus(parentId ? "Parent connection updated." : "Card detached from its parent.");
  }

  function addNode(rank: "clade" | "family") {
    const parentId = selectedNode?.rank === "family" ? selectedNode.parentId ?? "diptera" : selectedNode?.id ?? "diptera";
    const id = `${rank}-${Date.now()}`;
    const siblings = tree.filter((node) => node.parentId === parentId);
    const familyId = rank === "family" ? `custom-family-${Date.now()}` : undefined;
    const parentPosition = positions[parentId] ?? { x: 150, y: 150 };
    setTree((current) => [...current, {
      id, parentId, label: rank === "family" ? "New family" : "New clade", rank, order: siblings.length,
      confidence: "working", changeType: "uncertain", changeTitle: "character change to review", changeSummary: "Add evidence, source and a cautious interpretation.",
      sourceLabel: "user-added node", sourceUrl: "", familyId, userAdded: true,
    }]);
    if (familyId) {
      const seedProfile = { ...initialProfiles[7], id: familyId, family: "New family", representative: "user-created working morphotype", variant: "empidid" as WingVariant };
      setWings((current) => ({ ...current, [familyId]: buildWing(seedProfile) }));
    }
    setPositions((current) => ({ ...current, [id]: { x: parentPosition.x + 330, y: parentPosition.y + Math.max(120, siblings.length * 108) } }));
    setSelectedNodeId(id);
    setEditTree(true);
    setStatus(`${rank === "family" ? "Family" : "Clade"} added under ${selectedNode?.label ?? "Diptera"}.`);
  }

  function deleteSelected() {
    if (!selectedNode || selectedNode.id === "diptera") return;
    const parentId = selectedNode.parentId;
    setTree((current) => current.filter((node) => node.id !== selectedNode.id).map((node) => node.parentId === selectedNode.id ? { ...node, parentId } : node));
    setPositions((current) => {
      const next = { ...current };
      delete next[selectedNode.id];
      return next;
    });
    setSelectedNodeId(parentId ?? "diptera");
    setStatus("Node removed; its children were reattached to the former parent.");
  }

  function moveSelected(direction: -1 | 1) {
    if (!selectedNode) return;
    const siblings = tree.filter((node) => node.parentId === selectedNode.parentId).sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((node) => node.id === selectedNode.id);
    const other = siblings[index + direction];
    if (!other) return;
    setTree((current) => current.map((node) => node.id === selectedNode.id ? { ...node, order: other.order } : node.id === other.id ? { ...node, order: selectedNode.order } : node));
    setStatus("Branch order changed.");
  }

  function resetProject() {
    setTree(cloneTree(initialTree));
    setWings(cloneWings(initialWings));
    setPositions(autoLayout(initialTree));
    setBoardView({ x: -520, y: -5100, scale: .58 });
    setSelectedNodeId("syrphidae-node");
    setWingEditing(false);
    setStatus(`Research tree reset; all ${DIPTERA_FAMILY_COUNT} family-level entries are present again.`);
  }

  function exportProject() {
    const blob = new Blob([JSON.stringify({ schema: "entowing-phylogeny/6.0", catalogue: `Systema Dipterorum · ${DIPTERA_FAMILY_COUNT} extant family-level entries`, exportedAt: new Date().toISOString(), tree, wings, positions, boardView }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "EntoWing-phylogeny-and-family-wings.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Tree, annotations and all family-wing edits exported together.");
  }

  function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = safeProject(JSON.parse(String(reader.result)));
        if (!parsed) throw new Error("Not an EntoWing phylogeny project.");
        const mergedTree = mergeWithCompleteCatalog(parsed.tree);
        setTree(mergedTree);
        setWings({ ...cloneWings(initialWings), ...parsed.wings });
        setPositions({ ...autoLayout(mergedTree), ...parsed.positions });
        if (parsed.boardView) setBoardView(parsed.boardView);
        setSelectedNodeId(mergedTree[0].id);
        setStatus(`${file.name} imported and merged with the complete family catalogue.`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not import this project.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function startWingDrag(nodeId: string, event: ReactPointerEvent<SVGCircleElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingWingNode(nodeId);
  }

  function moveWingPoint(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingWingNode || !selectedProfile || !wingSvgRef.current) return;
    const rect = wingSvgRef.current.getBoundingClientRect();
    const point = { x: Math.max(10, Math.min(550, (event.clientX - rect.left) / rect.width * 560)), y: Math.max(10, Math.min(236, (event.clientY - rect.top) / rect.height * 246)) };
    setWings((current) => ({ ...current, [selectedProfile.id]: { ...current[selectedProfile.id], nodes: { ...current[selectedProfile.id].nodes, [draggingWingNode]: point } } }));
  }

  function stopWingDrag() {
    if (draggingWingNode) setStatus(`${selectedProfile?.family ?? "Family"} wing geometry updated.`);
    setDraggingWingNode(null);
  }

  function resetSelectedWing() {
    if (!selectedProfile) return;
    if (selectedReference && selectedProfile.id !== "syrphidae") {
      void rebuildReferenceDraft(selectedProfile.id, selectedReference);
      return;
    }
    setWings((current) => ({ ...current, [selectedProfile.id]: buildWing(selectedProfile) }));
    setStatus(`${selectedProfile.family} working morphotype reset.`);
  }

  return <>
    <section className="phylo-hero">
      <div className="hero-wing-watermark" aria-hidden="true"><WingGlyph wing={initialWings.syrphidae} accent="#ff5fa2" /></div>
      <div className="hero-field-notes" aria-hidden="true"><span>DIPTERA / WING / PHYLOGENY</span><span>{DIPTERA_FAMILY_COUNT} ENTRIES · {atlasReferenceCount} SVG REFERENCES</span><span>ZÜRICH · 2026</span></div>
      <div>
        <p className="eyebrow">COMPARATIVE WING MORPHOLOGY · {DIPTERA_FAMILY_COUNT} EXTANT FAMILY-LEVEL ENTRIES</p>
        <h1>Diptera wing evolution, mapped.</h1>
      </div>
      <div className="phylo-hero-copy">
        <p>A complete working catalogue for comparing venation across living Diptera. Detailed phylogenetic branches retain their evidence, while unresolved higher relationships and the Iteaphila group remain visibly provisional.</p>
        <div className="phylo-status"><i />{status}</div>
      </div>
    </section>

    <section className="wing-workflow" aria-label="Recommended wing review workflow">
      <strong>{DIPTERA_FAMILY_COUNT} LIVE ENTRIES · {atlasReferenceCount} PUBLISHED SVG REFERENCES · {atlasScaffoldCount} REVIEW SCAFFOLDS</strong>
      <div><span><b>1</b> licensed family SVG</span><i>→</i><span><b>2</b> open in Mapper</span><i>→</i><span><b>3</b> fit shared nodes</span><i>→</i><span><b>4</b> hand-check labels</span><i>→</i><span><b>5</b> expert review</span></div>
      <small>The published family SVG is now the tracing layer where one is available. Your interactive EntoWing graph stays separate until every vein identity and homology has been checked.</small>
    </section>

    <section className="phylo-toolbar" aria-label="Phylogeny project tools">
      <label className="family-jump"><span>JUMP TO FAMILY</span><select value={selectedNode?.familyId && initialProfiles.some((profile) => profile.id === selectedNode.familyId) ? selectedNode.familyId : ""} onChange={(event) => { const node = tree.find((item) => item.familyId === event.target.value); if (node) { setSelectedNodeId(node.id); setWingEditing(false); window.requestAnimationFrame(() => centerBoardOn(node.id, .78)); } }}><option value="">Choose one of {DIPTERA_FAMILY_COUNT}…</option>{sortedProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.family} · {profile.commonName}</option>)}</select></label>
      <div className="phylo-toolbar-group view-controls"><span>BOARD</span><button onClick={() => zoomBoard(.82)}>−</button><button className="zoom-readout">{Math.round(boardView.scale * 100)}%</button><button onClick={() => zoomBoard(1.22)}>＋</button><button onClick={() => centerBoardOn()}>◎ Selected</button><button onClick={fitBoard}>Fit all</button></div>
      <div className="phylo-toolbar-group"><span>STRUCTURE</span><button className={editTree ? "active" : ""} onClick={() => { setEditTree((value) => !value); setLinkMode(false); }}>✎ Arrange</button><button className={linkMode ? "active connect-mode" : ""} disabled={!editTree || selectedNode?.id === "diptera"} onClick={() => setLinkMode((value) => !value)}>↗ Connect parent</button><button onClick={() => addNode("clade")}>＋ Clade</button><button onClick={() => addNode("family")}>＋ Family</button><button onClick={autoArrangeBoard}>⌁ Auto layout</button></div>
      <div className="phylo-toolbar-group project-actions"><span>PROJECT</span><button onClick={exportProject}>↓ Export</button><button onClick={() => importRef.current?.click()}>↑ Import</button><button onClick={resetProject}>↺ Reset</button><input ref={importRef} type="file" accept="application/json,.json" onChange={importProject} hidden /></div>
    </section>

    <section className="phylo-workbench">
      <div className="tree-panel">
        <div className="tree-map-heading">
          <span>INFINITE PHYLOGENY BOARD · {DIPTERA_FAMILY_COUNT} FAMILY-LEVEL WING RECORDS</span>
          <strong>Drag the sky. Rebuild the tree.</strong>
          <small>Drag empty space to pan · trackpad to move · pinch or ⌘-scroll to zoom · select a family to open its wing.</small>
        </div>
        <div
          className={`flow-board-viewport ${editTree ? "arrange-mode" : "explore-mode"} ${linkMode ? "link-mode" : ""}`}
          ref={boardRef}
          aria-label="Pan and zoom editable Diptera phylogeny flowchart"
          onPointerDown={beginBoardPan}
          onPointerMove={moveBoardGesture}
          onPointerUp={endBoardGesture}
          onPointerCancel={endBoardGesture}
          onWheel={handleBoardWheel}
        >
          <div className="flow-board-lineage" aria-label="Lineage of selected taxon">
            <span>SELECTED LINEAGE</span>
            <div>{selectedLineage.map((lineageNode, index) => <span key={`board-lineage-${lineageNode.id}`}>
              {index > 0 && <i aria-hidden="true">→</i>}
              <button type="button" className={lineageNode.id === selectedNodeId ? "current" : ""} onPointerDown={(event) => event.stopPropagation()} onClick={() => { setSelectedNodeId(lineageNode.id); setWingEditing(false); centerBoardOn(lineageNode.id); }}>{lineageNode.label}</button>
            </span>)}</div>
            <small>These are ancestors in the current editable hypothesis.</small>
          </div>
          <div className="flow-board-controls" onPointerDown={(event) => event.stopPropagation()}>
            <button onClick={() => zoomBoard(.82)}>−</button><strong>{Math.round(boardView.scale * 100)}%</strong><button onClick={() => zoomBoard(1.22)}>＋</button><button onClick={() => centerBoardOn()}>◎</button><button onClick={fitBoard}>FIT</button>
          </div>
          {linkMode && <div className="flow-link-prompt"><b>CONNECTING {selectedNode?.label}</b><span>Click a clade card to make it the new parent · Esc with the button above</span></div>}
          <div className="flow-board-scene" style={{ transform: `translate3d(${boardView.x}px, ${boardView.y}px, 0) scale(${boardView.scale})` }}>
            <svg className="flow-edge-layer" width="3800" height="6800" viewBox="0 0 3800 6800" aria-hidden="true">
              {tree.map((node) => {
                if (!node.parentId) return null;
                const parent = positions[node.parentId];
                const child = positions[node.id];
                if (!parent || !child) return null;
                const x1 = parent.x + 232;
                const y1 = parent.y + 48;
                const x2 = child.x;
                const y2 = child.y + 48;
                const bend = Math.max(45, Math.abs(x2 - x1) * .48);
                const d = x2 >= x1
                  ? `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`
                  : `M ${x1} ${y1} C ${x1 + 90} ${y1}, ${x2 - 90} ${y2}, ${x2} ${y2}`;
                return <path key={`edge-${node.id}`} d={d} className={`flow-edge confidence-${node.confidence} ${selectedLineage.some((item) => item.id === node.id) ? "in-lineage" : ""}`} />;
              })}
            </svg>
            {tree.map((node) => {
              const position = positions[node.id] ?? { x: 0, y: 0 };
              const profile = node.familyId ? initialProfiles.find((item) => item.id === node.familyId) : null;
              const wing = node.familyId ? wings[node.familyId] : null;
              const reference = node.familyId ? familyWingReferences[node.familyId] : undefined;
              const accent = profile ? constellationAccent(profile.id) : node.rank === "root" ? "#ff5fa2" : "#62d9ff";
              const childCount = tree.filter((item) => item.parentId === node.id).length;
              return <button
                key={`flow-${node.id}`}
                type="button"
                className={`flow-node ${node.rank} confidence-${node.confidence} ${selectedNodeId === node.id ? "selected" : ""}`}
                style={{ left: position.x, top: position.y, "--node-accent": accent } as CSSProperties}
                onPointerDown={(event) => beginNodeGesture(node, event)}
              >
                <span className="flow-node-port input" aria-hidden="true" />
                <span className={`flow-node-icon ${reference ? "has-reference" : ""}`} aria-hidden="true">{reference ? <img src={reference.assetPath} alt="" loading="lazy" crossOrigin="anonymous" referrerPolicy="no-referrer" /> : wing ? <WingGlyph wing={wing} accent={accent} /> : <i>{node.rank === "root" ? "D" : "✦"}</i>}</span>
                <span className="flow-node-copy"><em>{node.rank}{childCount ? ` · ${childCount} branches` : ""}</em><strong>{node.label}</strong><small>{profile?.commonName ?? node.changeTitle}</small></span>
                <span className={`flow-node-confidence ${node.confidence}`}>{node.confidence}</span>
                <span className="flow-node-port output" aria-hidden="true" />
              </button>;
            })}
          </div>
          <div className="flow-board-hint"><span>{editTree ? "✎ ARRANGE MODE · drag cards" : "✥ EXPLORE MODE · drag the sky"}</span><span>{linkMode ? "Choose a new parent clade" : "Every line is a parent → child connection"}</span></div>
        </div>
        <div className="tree-foot"><span>FLOWCHART · POSITION + PARENTAGE ARE EDITABLE</span><span>Click a family and its full reviewed wing opens immediately on the right.</span></div>
      </div>

      <aside className="phylo-inspector">
        <div className="inspector-head">
          <div><span>{selectedNode?.rank ?? "node"} · {selectedNode?.confidence ?? "working"} confidence</span><h2>{selectedNode?.label}</h2></div>
          <span className={`change-pill ${selectedNode?.changeType}`}>{selectedNode?.changeType}</span>
        </div>

        {editTree && selectedNode ? <div className="tree-editor-form">
          <label><span>NODE LABEL</span><input value={selectedNode.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>
          <div className="form-pair">
            <label><span>PARENT CONNECTION</span><select value={selectedNode.parentId ?? ""} disabled={selectedNode.id === "diptera"} onChange={(event) => changeSelectedParent(event.target.value || null)}><option value="">No parent</option>{tree.filter((node) => node.id !== selectedNode.id && node.rank !== "family" && !wouldCreateCycle(tree, selectedNode.id, node.id)).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
            <label><span>CONFIDENCE</span><select value={selectedNode.confidence} onChange={(event) => updateSelected({ confidence: event.target.value as Confidence })}><option value="high">high</option><option value="medium">medium</option><option value="working">working</option></select></label>
          </div>
          <div className="form-pair">
            <label><span>CHANGE TYPE</span><select value={selectedNode.changeType} onChange={(event) => updateSelected({ changeType: event.target.value as ChangeType })}>{["gain", "loss", "fusion", "shift", "reduction", "uncertain"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>BRANCH ORDER</span><div className="order-buttons"><button onClick={() => moveSelected(-1)}>↑ earlier</button><button onClick={() => moveSelected(1)}>↓ later</button></div></label>
          </div>
          <label><span>INFERRED CHANGE</span><input value={selectedNode.changeTitle} onChange={(event) => updateSelected({ changeTitle: event.target.value })} /></label>
          <label><span>INTERPRETATION</span><textarea value={selectedNode.changeSummary} onChange={(event) => updateSelected({ changeSummary: event.target.value })} /></label>
          <div className="form-pair">
            <label><span>SOURCE LABEL</span><input value={selectedNode.sourceLabel} onChange={(event) => updateSelected({ sourceLabel: event.target.value })} /></label>
            <label><span>SOURCE URL</span><input value={selectedNode.sourceUrl} onChange={(event) => updateSelected({ sourceUrl: event.target.value })} /></label>
          </div>
          <button className="delete-tree-node" disabled={selectedNode.id === "diptera"} onClick={deleteSelected}>− Delete this node</button>
        </div> : selectedNode && <div className="branch-reading">
          <span className="reading-kicker">INFERRED CHARACTER CHANGE</span>
          <h3>{selectedNode.changeTitle}</h3>
          <p>{selectedNode.changeSummary}</p>
          {selectedNode.sourceUrl ? <a href={selectedNode.sourceUrl} target="_blank" rel="noreferrer">{selectedNode.sourceLabel || "Open source"} ↗</a> : <span className="missing-source">No source attached yet · open Edit tree</span>}
        </div>}

        {selectedProfile && selectedWing && <div className="family-study-card">
          <div className="family-study-title"><span>FAMILY REFERENCE + INTERACTIVE VENATION</span><strong>{selectedProfile.family} · reference and editable EntoWing layer</strong></div>
          {selectedReference ? <div className="published-wing-reference">
            <div className="published-wing-reference-head"><span>PUBLISHED SVG REFERENCE</span><b>{selectedReference.title.replace(/\.svg$/i, "")}</b></div>
            <div className="published-wing-reference-plate"><img src={selectedReference.assetPath} alt={`${selectedProfile.family} wing venation reference`} loading="lazy" crossOrigin="anonymous" referrerPolicy="no-referrer" /></div>
            <div className="published-wing-reference-meta"><span>{selectedReference.author} · {selectedReference.license}</span><a href={selectedReference.sourcePage} target="_blank" rel="noreferrer">Source & licence ↗</a></div>
            <div className="published-wing-reference-actions">
              <button type="button" disabled={conversionState[selectedProfile.id] === "mapping" || selectedProfile.id === "syrphidae"} onClick={() => void rebuildReferenceDraft(selectedProfile.id, selectedReference)}>{selectedProfile.id === "syrphidae" ? "✓ User-reviewed Eristalis geometry" : conversionState[selectedProfile.id] === "mapping" ? "Mapping vector paths…" : conversionState[selectedProfile.id] === "failed" ? "↺ Retry SVG conversion" : selectedWing.mappingStatus === "machine-draft" ? "↺ Rebuild machine mapping" : "Convert to editable EntoWing SVG"}</button>
              <button type="button" onClick={() => onOpenMapper(selectedProfile.id, selectedWing, selectedReference)}>Open in Mapper →</button>
            </div>
            {conversionState[selectedProfile.id] === "failed" && <small className="conversion-error" role="alert">Conversion stopped: {conversionError[selectedProfile.id]}. Tap retry; the published reference remains unchanged.</small>}
          </div> : <div className="published-wing-reference missing"><span>REFERENCE GAP</span><b>No reusable family SVG is attached yet.</b><small>The editable Eristalis-derived graph remains a scaffold, not this family’s finished venation.</small></div>}
          <div className={`geometry-status ${selectedWing.mappingStatus === "reviewed" ? "reviewed" : selectedWing.mappingStatus === "machine-draft" ? "machine" : conversionState[selectedProfile.id] === "failed" ? "failed" : "draft"}`}><i />{
            conversionState[selectedProfile.id] === "mapping"
              ? "SEPARATING SOURCE PATHS + MATCHING LABELS…"
              : conversionState[selectedProfile.id] === "failed"
                ? "SVG CONVERSION STOPPED · RETRY AVAILABLE"
                : selectedWing.mappingStatus === "reviewed"
                  ? "ORIGINAL ERISTALIS · USER-REVIEWED GEOMETRY"
                  : selectedWing.mappingStatus === "machine-draft"
                    ? `MACHINE-MAPPED DRAFT · ${selectedWing.mappingStats?.namedPathCount ?? 0}/${selectedWing.mappingStats?.sourcePathCount ?? selectedWing.paths.length} PATHS LABELLED · VERIFY`
                    : "ERISTALIS SCAFFOLD · WAITING FOR FAMILY SVG MAPPING"
          }</div>
          <div className="wing-selection-guide"><span>SELECT A STRUCTURE</span><small>Tap a coloured vein, its label, or a code below.</small></div>
          <div className="family-wing-editor" ref={(element) => { wingSvgRef.current = element?.querySelector("svg") ?? null; }}>
            <WingGlyph
              wing={selectedWing}
              accent={constellationAccent(selectedProfile.id)}
              editable={wingEditing}
              animate={!wingEditing}
              showLabels
              selectedVeinId={selectedVeinPath?.veinId}
              draggingNode={draggingWingNode}
              onVeinSelect={(veinId) => {
                setSelectedVeinId(veinId);
                setStatus(`${veinId} selected on the ${selectedProfile.family} wing.`);
              }}
              onNodeDown={startWingDrag}
              onMove={moveWingPoint}
              onUp={stopWingDrag}
            />
          </div>
          <div className="vein-code-list" role="group" aria-label="Select a wing vein or landmark">
            {selectedWing.paths.map((path) => {
              const meta = veinMeta(path.displayLabel ?? path.veinId, path.color);
              return <button
                key={`vein-code-${path.veinId}`}
                type="button"
                className={selectedVeinPath?.veinId === path.veinId ? "selected" : ""}
                aria-pressed={selectedVeinPath?.veinId === path.veinId}
                style={{ "--vein-color": path.color ?? meta.color } as CSSProperties}
                onClick={() => setSelectedVeinId(path.veinId)}
              ><i aria-hidden="true" />{path.displayLabel ?? meta.label}</button>;
            })}
          </div>
          {selectedVein && selectedVeinPath && <div className="selected-vein-card" role="status" aria-live="polite" style={{ "--vein-color": selectedVeinPath.color ?? selectedVein.color } as CSSProperties}>
            <div className="selected-vein-heading"><span>SELECTED STRUCTURE</span><strong>{selectedVein.label}</strong></div>
            <h4>{selectedVein.fullName}</h4>
            <dl>
              <div><dt>SYMBOL</dt><dd>{selectedVein.symbolMeaning}</dd></div>
              <div><dt>TYPE</dt><dd>{selectedVein.group}</dd></div>
              <div><dt>PLAIN MEANING</dt><dd>{selectedVein.plainMeaning}</dd></div>
            </dl>
            <p>{selectedVein.note}</p>
          </div>}
          <div className="family-wing-actions"><button className={wingEditing ? "active" : ""} onClick={() => setWingEditing((value) => !value)}>{wingEditing ? "✓ Finish quick edit" : "✥ Drag wing points"}</button><button onClick={resetSelectedWing}>{selectedReference && selectedProfile.id !== "syrphidae" ? "↺ Re-map source SVG" : "↺ Reset wing"}</button></div>
          <h3>{selectedProfile.diagnosticWing}</h3>
          <p>{selectedProfile.evolutionaryReading}</p>
          <div className="family-caveat"><span>VERIFY</span>{selectedProfile.caveat}</div>
          <button className="open-mapper-button" onClick={() => onOpenMapper(selectedProfile.id, selectedWing, selectedReference)}>{selectedReference ? `Open ${selectedProfile.family} SVG + overlay in Mapper →` : `Open ${selectedProfile.family} scaffold in Mapper →`}</button>
          <small>In Mapper you can insert/delete points, join nodes, create crossveins, control Bézier handles, upload a specimen and export the result.</small>
        </div>}
      </aside>
    </section>

    <section className="research-ledger">
      <div><span className="section-number">{atlasReferenceCount}</span><h2>Family SVG references now become editable EntoWing drafts.</h2></div>
      <div className="research-ledger-copy">
        <p>{atlasReferenceCount} of the {DIPTERA_FAMILY_COUNT} live family-level cards open an actual published SVG and automatically separate its wing outline, venation, labels and leader lines into editable EntoWing geometry. Every remaining card is already present as a clearly marked scaffold, ready for a licensed reference or specimen tracing. Machine-matched labels remain explicit suggestions for review, and no single reference is treated as universal for every member of a family.</p>
        <div className="source-grid">
          <a href={PHYLOGENY_SOURCE} target="_blank" rel="noreferrer"><strong>Diptera backbone</strong><span>Wiegmann et al. 2011 · 149 families</span></a>
          <a href={BRACHYCERA_2025_SOURCE} target="_blank" rel="noreferrer"><strong>Brachycera update</strong><span>Mulhair et al. 2025 · 186 genomes, 44 families</span></a>
          <a href={SCHIZOPHORA_SOURCE} target="_blank" rel="noreferrer"><strong>Schizophora</strong><span>Bayless et al. 2021 · phylotranscriptomics</span></a>
          <a href={CALYPTRATAE_SOURCE} target="_blank" rel="noreferrer"><strong>Calyptratae</strong><span>Kutty et al. 2019 · 1,456 genes</span></a>
          <a href={MAD_OVERVIEW} target="_blank" rel="noreferrer"><strong>Wing morphology</strong><span>Manual of Afrotropical Diptera</span></a>
          <a href={SYRPHID_GLOSSARY} target="_blank" rel="noreferrer"><strong>Syrphidae terms</strong><span>van Steenis et al. 2023</span></a>
          <a href={SYSTEMA_DIPTERORUM_FAMILY_SOURCE} target="_blank" rel="noreferrer"><strong>Complete family catalogue</strong><span>Systema Dipterorum 7.2 · {DIPTERA_FAMILY_COUNT} extant entries</span></a>
        </div>
      </div>
    </section>
  </>;
}
