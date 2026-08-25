"use client";

import { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type FamilyWingPoint = { x: number; y: number };
export type FamilyWingPath = { veinId: string; nodeIds: string[] };
export type FamilyWingTemplate = {
  id: string;
  name: string;
  taxon: string;
  note: string;
  referenceSize: { width: number; height: number };
  nodes: Record<string, FamilyWingPoint>;
  paths: FamilyWingPath[];
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

const PHYLOGENY_SOURCE = "https://pubmed.ncbi.nlm.nih.gov/21402926/";
const EARLY_BRACHYCERA_SOURCE = "https://doi.org/10.1111/syen.12275";
const BRACHYCERA_2025_SOURCE = "https://pubmed.ncbi.nlm.nih.gov/41109215/";
const SCHIZOPHORA_SOURCE = "https://pmc.ncbi.nlm.nih.gov/articles/PMC7871583/";
const CALYPTRATAE_SOURCE = "https://pubmed.ncbi.nlm.nih.gov/34618931/";
const MANUAL_VOL2 = "https://www.biodiversitylibrary.org/page/64795149";
const MANUAL_VOL3 = "https://www.nhm.ac.uk/our-science/research/projects/manual-afrotropical-diptera.html";
const MAD_OVERVIEW = "https://www.nhm.ac.uk/our-science/research/projects/manual-afrotropical-diptera.html";
const SYRPHID_GLOSSARY = "https://doi.org/10.55710/1.AIMS1978";

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
    id: "bombyliidae", family: "Bombyliidae", commonName: "bee flies", clade: "Heterodactyla · sister to Asiloidea + Eremoneura", representative: "Bombylius-like working morphotype",
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
    caveat: "Terminology follows van Steenis et al. 2023; the Mapper opens your reviewed Eristalis geometry, not this thumbnail sketch.", confidence: "high", sourceLabel: "van Steenis et al. 2023", sourceUrl: SYRPHID_GLOSSARY, accent: "#c3654f", variant: "syrphid", geometryStatus: "reviewed",
  },
  {
    id: "drosophilidae", family: "Drosophilidae", commonName: "vinegar flies", clade: "Ephydroidea · Schizophora", representative: "Drosophila-like working morphotype",
    diagnosticWing: "Compact venation with humeral and subcostal costal breaks; crossveins r-m and dm-cu and the costal index are common measured landmarks.",
    evolutionaryReading: "A compact acalyptrate pattern whose quantitative vein proportions are often more informative than a dramatic unique branch gain.",
    caveat: "The familiar Drosophila pattern is only one part of family diversity; exact costal-break terminology must be checked.", confidence: "high", sourceLabel: "Manual of Afrotropical Diptera, vol. 3", sourceUrl: MANUAL_VOL3, accent: "#9b6f93", variant: "drosophilid",
  },
  {
    id: "muscidae", family: "Muscidae", commonName: "house & stable flies", clade: "Calyptratae · Schizophora", representative: "Musca-like working morphotype",
    diagnosticWing: "The medial vein bends forward distally in many familiar muscids; the calypter and the width of cell r4+5 are also important identification characters.",
    evolutionaryReading: "Represents the calyptrate branch here; the forward bend is conspicuous in Musca-like wings but varies across Muscidae.",
    caveat: "Do not score an entire family from the Musca domestica condition alone.", confidence: "medium", sourceLabel: "Cumming & Wood 2017; Muscidae literature", sourceUrl: MAD_OVERVIEW, accent: "#5d7780", variant: "muscid",
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

const initialProfiles: FamilyProfile[] = [...coreProfiles, ...additionalProfiles];

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

const initialTree: TreeNode[] = [
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

const baseNodes: Record<string, FamilyWingPoint> = {
  base: { x: 30, y: 128 }, c1: { x: 120, y: 54 }, c2: { x: 340, y: 30 }, tip: { x: 530, y: 96 },
  sc1: { x: 115, y: 72 }, sc2: { x: 305, y: 48 }, rStem: { x: 126, y: 94 }, rFork: { x: 238, y: 72 },
  r1: { x: 355, y: 52 }, r23: { x: 424, y: 66 }, r45a: { x: 330, y: 102 }, r45b: { x: 505, y: 91 },
  mBase: { x: 112, y: 126 }, mFork: { x: 235, y: 125 }, m1: { x: 365, y: 127 }, m1End: { x: 513, y: 120 },
  m4: { x: 352, y: 162 }, m4End: { x: 485, y: 178 }, cu0: { x: 88, y: 150 }, cu1: { x: 260, y: 178 }, cu2: { x: 420, y: 196 },
  a0: { x: 72, y: 168 }, a1: { x: 245, y: 205 }, rmR: { x: 304, y: 105 }, rmM: { x: 304, y: 130 }, dmT: { x: 366, y: 128 }, dmB: { x: 360, y: 164 },
  sv0: { x: 190, y: 112 }, sv1: { x: 390, y: 139 },
};

const basePaths: FamilyWingPath[] = [
  { veinId: "C", nodeIds: ["base", "c1", "c2", "tip"] },
  { veinId: "Sc", nodeIds: ["base", "sc1", "sc2"] },
  { veinId: "R1", nodeIds: ["base", "rStem", "rFork", "r1", "c2"] },
  { veinId: "R2+3", nodeIds: ["rFork", "r23", "tip"] },
  { veinId: "R4+5", nodeIds: ["rFork", "rmR", "r45a", "r45b"] },
  { veinId: "M1", nodeIds: ["mBase", "mFork", "rmM", "m1", "m1End"] },
  { veinId: "M4", nodeIds: ["mBase", "mFork", "m4", "m4End"] },
  { veinId: "CuA", nodeIds: ["cu0", "cu1", "cu2"] },
  { veinId: "A1", nodeIds: ["a0", "a1"] },
  { veinId: "r-m", nodeIds: ["rmR", "rmM"] },
  { veinId: "dm-m", nodeIds: ["dmT", "dmB"] },
];

function buildWing(profile: FamilyProfile): FamilyWingTemplate {
  const nodes = Object.fromEntries(Object.entries(baseNodes).map(([id, point]) => [id, { ...point }])) as Record<string, FamilyWingPoint>;
  let paths = basePaths.map((path) => ({ ...path, nodeIds: [...path.nodeIds] }));
  const change = (id: string, x: number, y: number) => { nodes[id] = { x, y }; };

  if (profile.variant === "tipulid") {
    change("tip", 535, 75); change("cu2", 458, 202); change("a1", 330, 218); change("m4End", 515, 174);
  } else if (profile.variant === "psychodid") {
    change("c1", 132, 30); change("c2", 360, 16); change("tip", 515, 112); change("cu2", 405, 214); change("a1", 300, 224);
  } else if (profile.variant === "culicid") {
    Object.keys(nodes).forEach((id) => { nodes[id] = { x: nodes[id].x, y: 112 + (nodes[id].y - 112) * .56 }; });
    change("tip", 535, 100); change("a1", 285, 175);
  } else if (profile.variant === "stratiomyid") {
    change("rFork", 275, 61); change("r1", 355, 47); change("r23", 385, 61); change("r45a", 365, 81); change("r45b", 440, 89);
    change("m4End", 405, 168); change("cu2", 350, 190); paths = paths.filter((path) => path.veinId !== "A1");
  } else if (profile.variant === "tabanid") {
    change("r23", 440, 50); change("r45a", 360, 104); change("m1End", 525, 125); change("m4End", 510, 186);
  } else if (profile.variant === "bombyliid") {
    change("c1", 145, 36); change("c2", 360, 24); change("tip", 518, 113); change("m4End", 485, 198); change("a1", 285, 216);
  } else if (profile.variant === "asilid") {
    change("tip", 535, 83); change("r23", 438, 52); change("r45a", 370, 94); change("r45b", 522, 78); change("m1End", 510, 129);
  } else if (profile.variant === "empidid") {
    change("tip", 515, 91); change("r23", 405, 72); change("r45b", 465, 97); change("cu2", 388, 190); change("a1", 250, 203);
  } else if (profile.variant === "syrphid") {
    change("r45a", 365, 96); change("r45b", 468, 75); change("m1End", 505, 118); paths.push({ veinId: "vena spuria", nodeIds: ["sv0", "sv1"] });
  } else if (profile.variant === "phorid") {
    change("c2", 255, 38); change("sc2", 210, 56); change("r1", 248, 59); change("r23", 292, 73); change("m1End", 500, 137); change("m4End", 476, 176);
    paths = paths.filter((path) => ["C", "Sc", "R1", "R2+3", "M1", "M4", "CuA"].includes(path.veinId));
  } else if (profile.variant === "drosophilid") {
    change("tip", 505, 91); change("c1", 110, 48); change("c2", 335, 34); change("cu2", 388, 184); change("a1", 225, 195);
  } else if (profile.variant === "muscid") {
    change("m1", 402, 120); change("m1End", 485, 84); change("r45b", 512, 94); change("tip", 532, 91); change("a1", 230, 198);
  }

  if (profile.id === "nemestrinidae") {
    nodes.acc0 = { x: 168, y: 92 }; nodes.acc1 = { x: 272, y: 94 }; nodes.acc2 = { x: 398, y: 82 };
    nodes.acc3 = { x: 184, y: 146 }; nodes.acc4 = { x: 300, y: 151 }; nodes.acc5 = { x: 430, y: 145 };
    paths.push({ veinId: "accessory 1", nodeIds: ["acc0", "acc1", "acc2"] }, { veinId: "accessory 2", nodeIds: ["acc3", "acc4", "acc5"] });
  }

  return {
    id: `family-${profile.id}`,
    name: `${profile.family} · editable working morphotype`,
    taxon: `${profile.family} · ${profile.representative}`,
    note: `Research-backed teaching scaffold, not a universal family diagnosis. ${profile.caveat}`,
    referenceSize: { width: 560, height: 246 },
    nodes,
    paths,
  };
}

function wingPath(points: FamilyWingPoint[]) {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  return points.reduce((value, point, index) => index === 0 ? `M ${point.x} ${point.y}` : `${value} L ${point.x} ${point.y}`, "");
}

function cloneTree(nodes: TreeNode[]) {
  return nodes.map((node) => ({ ...node }));
}

function cloneWings(wings: Record<string, FamilyWingTemplate>) {
  return Object.fromEntries(Object.entries(wings).map(([id, wing]) => [id, {
    ...wing,
    nodes: Object.fromEntries(Object.entries(wing.nodes).map(([nodeId, point]) => [nodeId, { ...point }])),
    paths: wing.paths.map((path) => ({ ...path, nodeIds: [...path.nodeIds] })),
  }])) as Record<string, FamilyWingTemplate>;
}

const initialWings = Object.fromEntries(initialProfiles.map((profile) => [profile.id, buildWing(profile)])) as Record<string, FamilyWingTemplate>;

function WingGlyph({ wing, accent, editable = false, draggingNode, onNodeDown, onMove, onUp }: {
  wing: FamilyWingTemplate;
  accent: string;
  editable?: boolean;
  draggingNode?: string | null;
  onNodeDown?: (nodeId: string, event: ReactPointerEvent<SVGCircleElement>) => void;
  onMove?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onUp?: (event: ReactPointerEvent<SVGSVGElement>) => void;
}) {
  const patterned = ["Tephritidae", "Ulidiidae", "Platystomatidae"].some((family) => wing.taxon.startsWith(family));
  const spotted = ["Ceratopogonidae", "Sepsidae"].some((family) => wing.taxon.startsWith(family));
  return <svg className={`family-wing-glyph ${editable ? "editable" : ""}`} viewBox="0 0 560 246" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
    <path className="wing-outline" d="M 27 128 C 88 24 350 0 531 77 C 555 88 544 117 515 145 C 420 224 150 232 27 128 Z" />
    {patterned && <g className="wing-pattern" style={{ color: accent }} aria-hidden="true"><path d="M 188 38 C 230 76 243 128 220 194" /><path d="M 342 23 C 377 68 390 120 371 190" /><path d="M 453 48 C 482 83 487 122 469 157" /></g>}
    {spotted && <g className="wing-spots" style={{ color: accent }} aria-hidden="true"><circle cx="360" cy="66" r="18" /><circle cx="454" cy="109" r="15" /></g>}
    {wing.paths.map((path) => {
      const points = path.nodeIds.map((id) => wing.nodes[id]).filter(Boolean);
      const reduced = wing.taxon.startsWith("Phoridae") && ["M1", "M4", "CuA"].includes(path.veinId);
      return <g key={path.veinId}>
        <path d={wingPath(points)} className={`wing-vein-line ${reduced ? "weak" : ""}`} style={{ stroke: accent }} />
        {editable && points.length > 1 && <text x={points[Math.floor(points.length * .62)].x + 4} y={points[Math.floor(points.length * .62)].y - 5} className="wing-vein-label">{path.veinId}</text>}
      </g>;
    })}
    {editable && Object.entries(wing.nodes).map(([nodeId, point]) => <circle key={nodeId} cx={point.x} cy={point.y} r={draggingNode === nodeId ? 7 : 5} className={`family-wing-point ${draggingNode === nodeId ? "dragging" : ""}`} onPointerDown={(event) => onNodeDown?.(nodeId, event)} />)}
  </svg>;
}

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

function safeProject(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const candidate = payload as { tree?: unknown; wings?: unknown };
  if (!Array.isArray(candidate.tree) || !candidate.wings || typeof candidate.wings !== "object") return null;
  const tree = candidate.tree.filter((value): value is TreeNode => Boolean(value && typeof value === "object" && typeof (value as TreeNode).id === "string" && typeof (value as TreeNode).label === "string"));
  if (!tree.length) return null;
  const wings = candidate.wings as Record<string, FamilyWingTemplate>;
  return { tree, wings };
}

export default function PhyloAtlas({ onOpenMapper }: { onOpenMapper: (familyId: string, wing: FamilyWingTemplate) => void }) {
  const [tree, setTree] = useState<TreeNode[]>(() => cloneTree(initialTree));
  const [wings, setWings] = useState<Record<string, FamilyWingTemplate>>(() => cloneWings(initialWings));
  const [selectedNodeId, setSelectedNodeId] = useState("syrphidae-node");
  const [editTree, setEditTree] = useState(false);
  const [wingEditing, setWingEditing] = useState(false);
  const [expandedMobileNodes, setExpandedMobileNodes] = useState<Set<string>>(() => new Set(["diptera"]));
  const [draggingWingNode, setDraggingWingNode] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [status, setStatus] = useState("Research tree loaded · every topology statement remains editable.");
  const importRef = useRef<HTMLInputElement>(null);
  const wingSvgRef = useRef<SVGSVGElement | null>(null);
  const mobileTreeRef = useRef<HTMLDivElement>(null);
  const desktopTreeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("entowing-phylo-project-v2");
      if (saved) {
        const parsed = safeProject(JSON.parse(saved));
        if (parsed) {
          setTree(parsed.tree);
          setWings({ ...cloneWings(initialWings), ...parsed.wings });
          setStatus("Your 50-family phylogeny and wing edits were restored.");
        }
      } else {
        const legacy = window.localStorage.getItem("entowing-phylo-project-v1");
        const parsed = legacy ? safeProject(JSON.parse(legacy)) : null;
        if (parsed) {
          setWings({ ...cloneWings(initialWings), ...parsed.wings });
          setStatus("Your earlier wing edits were carried into the new audited 50-family tree.");
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
    try {
      window.localStorage.setItem("entowing-phylo-project-v2", JSON.stringify({ schema: "entowing-phylogeny/2.0", tree, wings }));
    } catch {
      // The atlas remains usable even when private storage is unavailable.
    }
  }, [tree, wings, storageReady]);

  useEffect(() => {
    const ancestors = mobileAncestorIds(tree, selectedNodeId);
    setExpandedMobileNodes((current) => {
      const next = new Set(current);
      let changed = false;
      ancestors.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [selectedNodeId, tree]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 820px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      const selected = Array.from(mobileTreeRef.current?.querySelectorAll<HTMLElement>("[data-tree-node]") ?? [])
        .find((element) => element.dataset.treeNode === selectedNodeId);
      selected?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedNodeId, expandedMobileNodes]);

  const mobileTreeRows = useMemo(() => computeMobileTreeRows(tree, expandedMobileNodes), [tree, expandedMobileNodes]);
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
  const sortedProfiles = useMemo(() => [...initialProfiles].sort((a, b) => a.family.localeCompare(b.family)), []);

  const centerDesktopSelection = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = desktopTreeRef.current;
    if (!container) return;
    const selected = Array.from(container.querySelectorAll<HTMLElement>("[data-tree-node]"))
      .find((element) => element.dataset.treeNode === selectedNodeId);
    if (!selected) return;
    container.scrollTo({
      left: Math.max(0, selected.offsetLeft - container.clientWidth * .42),
      top: Math.max(0, selected.offsetTop - container.clientHeight * .5),
      behavior,
    });
  }, [selectedNodeId]);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 821px)").matches) return;
    const frame = window.requestAnimationFrame(() => centerDesktopSelection("auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [centerDesktopSelection, expandedMobileNodes]);

  function toggleMobileBranch(nodeId: string) {
    setExpandedMobileNodes((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function collapseMobileTree() {
    setExpandedMobileNodes(new Set(["diptera", ...mobileAncestorIds(tree, selectedNodeId)]));
  }

  function expandAllBranches() {
    setExpandedMobileNodes(new Set(tree.filter((node) => node.rank !== "family").map((node) => node.id)));
  }

  function openSelectedMobileBranch() {
    setExpandedMobileNodes((current) => new Set([...current, ...mobileAncestorIds(tree, selectedNodeId), ...(selectedNode?.rank === "clade" ? [selectedNode.id] : [])]));
  }

  function updateSelected(patch: Partial<TreeNode>) {
    setTree((current) => current.map((node) => node.id === selectedNodeId ? { ...node, ...patch } : node));
    setStatus("Tree annotation updated and saved in this browser.");
  }

  function addNode(rank: "clade" | "family") {
    const parentId = selectedNode?.rank === "family" ? selectedNode.parentId ?? "diptera" : selectedNode?.id ?? "diptera";
    const id = `${rank}-${Date.now()}`;
    const siblings = tree.filter((node) => node.parentId === parentId);
    const familyId = rank === "family" ? `custom-family-${Date.now()}` : undefined;
    setTree((current) => [...current, {
      id, parentId, label: rank === "family" ? "New family" : "New clade", rank, order: siblings.length,
      confidence: "working", changeType: "uncertain", changeTitle: "character change to review", changeSummary: "Add evidence, source and a cautious interpretation.",
      sourceLabel: "user-added node", sourceUrl: "", familyId, userAdded: true,
    }]);
    if (familyId) {
      const seedProfile = { ...initialProfiles[7], id: familyId, family: "New family", representative: "user-created working morphotype", variant: "empidid" as WingVariant };
      setWings((current) => ({ ...current, [familyId]: buildWing(seedProfile) }));
    }
    setSelectedNodeId(id);
    setEditTree(true);
    setStatus(`${rank === "family" ? "Family" : "Clade"} added under ${selectedNode?.label ?? "Diptera"}.`);
  }

  function deleteSelected() {
    if (!selectedNode || selectedNode.id === "diptera") return;
    const parentId = selectedNode.parentId;
    setTree((current) => current.filter((node) => node.id !== selectedNode.id).map((node) => node.parentId === selectedNode.id ? { ...node, parentId } : node));
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
    setSelectedNodeId("syrphidae-node");
    setWingEditing(false);
    setStatus("Research tree and all 50 working wing morphotypes were reset.");
  }

  function exportProject() {
    const blob = new Blob([JSON.stringify({ schema: "entowing-phylogeny/2.0", exportedAt: new Date().toISOString(), tree, wings }, null, 2)], { type: "application/json" });
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
        setTree(parsed.tree);
        setWings({ ...cloneWings(initialWings), ...parsed.wings });
        setSelectedNodeId(parsed.tree[0].id);
        setStatus(`${file.name} imported.`);
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
    setWings((current) => ({ ...current, [selectedProfile.id]: buildWing(selectedProfile) }));
    setStatus(`${selectedProfile.family} working morphotype reset.`);
  }

  return <>
    <section className="phylo-hero">
      <div className="hero-wing-watermark" aria-hidden="true"><WingGlyph wing={initialWings.syrphidae} accent="#77a868" /></div>
      <div className="hero-field-notes" aria-hidden="true"><span>RAIN / VEIN / SIGNAL</span><span>50 FAMILY SYSTEM</span><span>ZÜRICH · 2026</span></div>
      <div>
        <p className="eyebrow">EVOLUTIONARY WING MAP · 50 RESEARCHED FAMILIES</p>
        <h1>Follow what changed.</h1>
      </div>
      <div className="phylo-hero-copy">
        <p>Branches carry <em>inferred character changes</em>, not automatic claims of unique innovation. The topology follows current broad phylogenomics where evidence is strong and says “working” where it is not. Every family wing and every branch remain editable.</p>
        <div className="phylo-status"><i />{status}</div>
      </div>
    </section>

    <section className="wing-workflow" aria-label="Recommended wing review workflow">
      <strong>DON’T REDRAW 50 WINGS FROM ZERO</strong>
      <div><span><b>1</b> literature template</span><i>→</i><span><b>2</b> representative photo</span><i>→</i><span><b>3</b> fit shared nodes</span><i>→</i><span><b>4</b> hand-correct veins</span><i>→</i><span><b>5</b> expert review</span></div>
      <small>Eristalis / Syrphidae is user-reviewed. The other 49 geometries are literature-informed draft morphotypes and are deliberately marked for manual verification.</small>
    </section>

    <section className="phylo-toolbar" aria-label="Phylogeny project tools">
      <label className="family-jump"><span>JUMP TO FAMILY</span><select value={selectedNode?.familyId && initialProfiles.some((profile) => profile.id === selectedNode.familyId) ? selectedNode.familyId : ""} onChange={(event) => { const node = tree.find((item) => item.familyId === event.target.value); if (node) { setSelectedNodeId(node.id); setWingEditing(false); } }}><option value="">Choose one of 50…</option>{sortedProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.family} · {profile.commonName}</option>)}</select></label>
      <div className="phylo-toolbar-group view-controls"><span>TREE</span><button onClick={collapseMobileTree}>Lineage</button><button onClick={expandAllBranches}>All branches</button><button onClick={() => centerDesktopSelection()}>◎ Selected</button></div>
      <div className="phylo-toolbar-group"><span>STRUCTURE</span><button className={editTree ? "active" : ""} onClick={() => setEditTree((value) => !value)}>✎ Edit tree</button><button onClick={() => addNode("clade")}>＋ Clade</button><button onClick={() => addNode("family")}>＋ Family</button></div>
      <div className="phylo-toolbar-group project-actions"><span>PROJECT</span><button onClick={exportProject}>↓ Export</button><button onClick={() => importRef.current?.click()}>↑ Import</button><button onClick={resetProject}>↺ Reset</button><input ref={importRef} type="file" accept="application/json,.json" onChange={importProject} hidden /></div>
      <div className="confidence-key"><span><i className="high" /> high</span><span><i className="medium" /> medium</span><span><i className="working" /> working</span></div>
    </section>

    <section className="phylo-workbench">
      <div className="tree-panel">
        <div className="tree-map-heading">
          <span>50 FAMILY MAP · TAP A WING</span>
          <strong>Diptera, branching through wing change.</strong>
          <small>Each star is a branch hypothesis; each wing opens a family.</small>
        </div>
        <div className="tree-scroll desktop-tree-scroll" ref={desktopTreeRef} aria-label="Editable phylogenetic tree of selected Diptera families">
          <div className="desktop-lineage-card" aria-label="Lineage of selected taxon">
            <span>SELECTED LINEAGE</span>
            <div>{selectedLineage.map((lineageNode, index) => <span key={`desktop-lineage-${lineageNode.id}`}>
              {index > 0 && <i aria-hidden="true">→</i>}
              <button type="button" className={lineageNode.id === selectedNodeId ? "current" : ""} onClick={() => { setSelectedNodeId(lineageNode.id); setWingEditing(false); }}>{lineageNode.label}</button>
            </span>)}</div>
            <small>Every indented node descends from the nearest less-indented clade above it.</small>
          </div>
          <div className="desktop-tree-route">
            {mobileTreeRows.map(({ node, depth, familyCount, hasChildren }) => {
              const profile = node.familyId ? initialProfiles.find((item) => item.id === node.familyId) : null;
              const wing = node.familyId ? wings[node.familyId] : null;
              const accent = profile?.accent ?? "#4a91c5";
              const parentLabel = tree.find((item) => item.id === node.parentId)?.label;
              const isExpanded = node.rank === "root" || expandedMobileNodes.has(node.id);
              const canToggle = hasChildren && node.rank !== "root";
              return <button
                key={`desktop-${node.id}`}
                type="button"
                data-tree-node={node.id}
                className={`desktop-tree-row ${node.rank} confidence-${node.confidence} ${hasChildren ? "has-children" : ""} ${isExpanded ? "expanded" : "collapsed"} ${selectedNodeId === node.id ? "selected" : ""}`}
                style={{ "--desktop-depth": Math.min(depth, 8), "--node-accent": accent } as CSSProperties}
                aria-expanded={canToggle ? isExpanded : undefined}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setWingEditing(false);
                  if (canToggle) toggleMobileBranch(node.id);
                }}
              >
                <span className="desktop-branch-junction" aria-hidden="true">{node.rank === "family" ? "★" : node.rank === "root" ? "D" : "✦"}</span>
                {wing ? <WingGlyph wing={wing} accent={accent} /> : <span className="desktop-clade-orb" aria-hidden="true" />}
                <span className="desktop-tree-copy"><em>{node.rank === "root" ? "ROOT OF THIS MAP" : `WITHIN ${parentLabel ?? "UNPLACED"}`}</em><strong>{node.label}</strong><small>{profile?.commonName ?? node.changeTitle}</small></span>
                <span className={`desktop-confidence ${node.confidence}`}>{node.confidence}</span>
                {canToggle ? <span className="desktop-tree-disclosure" aria-hidden="true"><b>{familyCount} families</b><i>{isExpanded ? "−" : "+"}</i></span> : <span className="desktop-tree-change">{node.changeType}</span>}
              </button>;
            })}
          </div>
        </div>
        <div className="mobile-tree-scroll" ref={mobileTreeRef} aria-label="Mobile phylogenetic route through selected Diptera families">
          <div className="mobile-tree-sky" aria-hidden="true"><span>50</span><i>FAMILIES</i></div>
          <div className="mobile-lineage-card" aria-label="Lineage of selected taxon">
            <span>SELECTED LINEAGE</span>
            <div className="mobile-lineage-path">
              {selectedLineage.map((lineageNode, index) => <span key={`lineage-${lineageNode.id}`}>
                {index > 0 && <i aria-hidden="true">→</i>}
                <button
                  type="button"
                  className={lineageNode.id === selectedNodeId ? "current" : ""}
                  onClick={() => { setSelectedNodeId(lineageNode.id); setWingEditing(false); }}
                >{lineageNode.label}</button>
              </span>)}
            </div>
            <small>Nested clades share ancestors; one living family is not the ancestor of the next.</small>
          </div>
          <div className="mobile-tree-controls">
            <span><b>{mobileTreeRows.filter(({ node }) => node.rank === "family").length}</b> families visible</span>
            <button type="button" onClick={collapseMobileTree}>Collapse</button>
            <button type="button" onClick={openSelectedMobileBranch}>Open selected</button>
          </div>
          <div className="mobile-tree-route">
            {mobileTreeRows.map(({ node, depth, familyCount, hasChildren }) => {
              const profile = node.familyId ? initialProfiles.find((item) => item.id === node.familyId) : null;
              const wing = node.familyId ? wings[node.familyId] : null;
              const accent = profile?.accent ?? "#6f9c63";
              const parentLabel = tree.find((item) => item.id === node.parentId)?.label;
              const isExpanded = node.rank === "root" || expandedMobileNodes.has(node.id);
              const canToggle = hasChildren && node.rank !== "root";
              return <button
                key={`mobile-${node.id}`}
                type="button"
                data-tree-node={node.id}
                className={`mobile-tree-row ${node.rank} confidence-${node.confidence} ${hasChildren ? "has-children" : ""} ${isExpanded ? "expanded" : "collapsed"} ${selectedNodeId === node.id ? "selected" : ""}`}
                style={{ "--mobile-depth": Math.min(depth, 5), "--node-accent": accent } as CSSProperties}
                aria-expanded={canToggle ? isExpanded : undefined}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setWingEditing(false);
                  if (canToggle) toggleMobileBranch(node.id);
                }}
              >
                <span className="mobile-branch-star" aria-hidden="true">{node.rank === "family" ? "★" : node.rank === "root" ? "D" : "✦"}</span>
                {wing ? <WingGlyph wing={wing} accent={accent} /> : <span className="mobile-clade-orb" aria-hidden="true" />}
                <span className="mobile-tree-copy">
                  <em>{node.rank === "root" ? "ROOT OF THIS MAP" : `WITHIN ${parentLabel ?? "UNPLACED"}`}</em>
                  <strong>{node.label}</strong>
                  <small>{profile?.commonName ?? node.changeTitle}</small>
                </span>
                {canToggle
                  ? <span className="mobile-tree-disclosure" aria-hidden="true"><b>{familyCount}</b><i>{isExpanded ? "−" : "+"}</i></span>
                  : <span className="mobile-tree-change">{node.changeType}</span>}
              </button>;
            })}
          </div>
        </div>
        <div className="tree-foot"><span className="desktop-tree-tip">↔ Scroll to follow deep branches</span><span className="mobile-tree-tip">→ Read the lineage above · ＋ opens descendants</span><span>Tip order and parentage are editable · unsupported shortcuts are marked “working”</span></div>
      </div>

      <aside className="phylo-inspector">
        <div className="inspector-head">
          <div><span>{selectedNode?.rank ?? "node"} · {selectedNode?.confidence ?? "working"} confidence</span><h2>{selectedNode?.label}</h2></div>
          <span className={`change-pill ${selectedNode?.changeType}`}>{selectedNode?.changeType}</span>
        </div>

        {editTree && selectedNode ? <div className="tree-editor-form">
          <label><span>NODE LABEL</span><input value={selectedNode.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>
          <div className="form-pair">
            <label><span>PARENT</span><select value={selectedNode.parentId ?? ""} disabled={selectedNode.id === "diptera"} onChange={(event) => updateSelected({ parentId: event.target.value || null })}><option value="">No parent</option>{tree.filter((node) => node.id !== selectedNode.id && node.rank !== "family").map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
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
          <div className="family-study-title"><span>FAMILY WING · WORKING MORPHOTYPE</span><strong>{selectedProfile.representative}</strong></div>
          <div className={`geometry-status ${selectedProfile.geometryStatus === "reviewed" ? "reviewed" : "draft"}`}><i />{selectedProfile.geometryStatus === "reviewed" ? "GEOMETRY · USER-REVIEWED" : "GEOMETRY · LITERATURE DRAFT · HAND REVIEW NEEDED"}</div>
          <div className="family-wing-editor" ref={(element) => { wingSvgRef.current = element?.querySelector("svg") ?? null; }}>
            <WingGlyph wing={selectedWing} accent={selectedProfile.accent} editable={wingEditing} draggingNode={draggingWingNode} onNodeDown={startWingDrag} onMove={moveWingPoint} onUp={stopWingDrag} />
          </div>
          <div className="family-wing-actions"><button className={wingEditing ? "active" : ""} onClick={() => setWingEditing((value) => !value)}>{wingEditing ? "✓ Finish quick edit" : "✥ Drag wing points"}</button><button onClick={resetSelectedWing}>↺ Reset wing</button></div>
          <h3>{selectedProfile.diagnosticWing}</h3>
          <p>{selectedProfile.evolutionaryReading}</p>
          <div className="family-caveat"><span>VERIFY</span>{selectedProfile.caveat}</div>
          <button className="open-mapper-button" onClick={() => onOpenMapper(selectedProfile.id, selectedWing)}>Open {selectedProfile.family} in full Wing Mapper →</button>
          <small>In Mapper you can insert/delete points, join nodes, create crossveins, control Bézier handles, upload a specimen and export the result.</small>
        </div>}
      </aside>
    </section>

    <section className="research-ledger">
      <div><span className="section-number">50</span><h2>Families are hypotheses with receipts.</h2></div>
      <div className="research-ledger-copy">
        <p>The backbone is cross-checked against broad phylogenomic studies, while wing interpretations point to morphology manuals or family-focused work. A thumbnail is a representative teaching morphotype—not a claim that every member of a family has the same wing. Red “working” nodes are scientific uncertainties, not unfinished styling.</p>
        <div className="source-grid">
          <a href={PHYLOGENY_SOURCE} target="_blank" rel="noreferrer"><strong>Diptera backbone</strong><span>Wiegmann et al. 2011 · 149 families</span></a>
          <a href={BRACHYCERA_2025_SOURCE} target="_blank" rel="noreferrer"><strong>Brachycera update</strong><span>Mulhair et al. 2025 · 186 genomes, 44 families</span></a>
          <a href={SCHIZOPHORA_SOURCE} target="_blank" rel="noreferrer"><strong>Schizophora</strong><span>Bayless et al. 2021 · phylotranscriptomics</span></a>
          <a href={CALYPTRATAE_SOURCE} target="_blank" rel="noreferrer"><strong>Calyptratae</strong><span>Kutty et al. 2019 · 1,456 genes</span></a>
          <a href={MAD_OVERVIEW} target="_blank" rel="noreferrer"><strong>Wing morphology</strong><span>Manual of Afrotropical Diptera</span></a>
          <a href={SYRPHID_GLOSSARY} target="_blank" rel="noreferrer"><strong>Syrphidae terms</strong><span>van Steenis et al. 2023</span></a>
        </div>
      </div>
    </section>
  </>;
}
