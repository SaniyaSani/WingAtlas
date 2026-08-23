export type DipteraFamilyCatalogEntry = {
  id: string;
  family: string;
  groupId: string;
  groupLabel: string;
  major: "nematocera" | "brachycera";
  rankNote?: string;
};

type CatalogGroup = {
  id: string;
  label: string;
  major: DipteraFamilyCatalogEntry["major"];
  families: string[];
};

const groups: CatalogGroup[] = [
  {
    id: "tipulomorpha",
    label: "Tipulomorpha",
    major: "nematocera",
    families: ["Cylindrotomidae", "Limoniidae", "Pediciidae", "Tipulidae"],
  },
  {
    id: "psychodomorpha",
    label: "Psychodomorpha",
    major: "nematocera",
    families: ["Canthyloscelidae", "Perissommatidae", "Psychodidae", "Scatopsidae", "Trichoceridae"],
  },
  {
    id: "ptychopteromorpha",
    label: "Ptychopteromorpha",
    major: "nematocera",
    families: ["Ptychopteridae", "Tanyderidae"],
  },
  {
    id: "culicomorpha",
    label: "Culicomorpha",
    major: "nematocera",
    families: ["Ceratopogonidae", "Chaoboridae", "Chironomidae", "Corethrellidae", "Culicidae", "Dixidae", "Simuliidae", "Thaumaleidae"],
  },
  {
    id: "blephariceromorpha",
    label: "Blephariceromorpha",
    major: "nematocera",
    families: ["Blephariceridae", "Deuterophlebiidae", "Nymphomyiidae"],
  },
  {
    id: "bibionomorpha",
    label: "Bibionomorpha",
    major: "nematocera",
    families: ["Anisopodidae", "Bibionidae", "Bolitophilidae", "Cecidomyiidae", "Diadocidiidae", "Ditomyiidae", "Hesperinidae", "Keroplatidae", "Lygistorrhinidae", "Mycetophilidae", "Pachyneuridae", "Rangomaramidae", "Sciaridae"],
  },
  {
    id: "axymyiomorpha",
    label: "Axymyiomorpha",
    major: "nematocera",
    families: ["Axymyiidae"],
  },
  {
    id: "stratiomyomorpha",
    label: "Stratiomyomorpha",
    major: "brachycera",
    families: ["Panthophthalmidae", "Stratiomyidae", "Xylomyidae"],
  },
  {
    id: "tabanomorpha",
    label: "Tabanomorpha",
    major: "brachycera",
    families: ["Acroceridae", "Athericidae", "Austroleptidae", "Nemestrinidae", "Oreoleptidae", "Rhagionidae", "Spaniidae", "Tabanidae", "Xylophagidae"],
  },
  {
    id: "vermileonomorpha",
    label: "Vermileonomorpha",
    major: "brachycera",
    families: ["Vermileonidae"],
  },
  {
    id: "asiloidea",
    label: "Asiloidea",
    major: "brachycera",
    families: ["Apioceridae", "Apsilocephalidae", "Apystomyiidae", "Asilidae", "Bombyliidae", "Evocoidae", "Hilarimorphidae", "Mydidae", "Mythicomyiidae", "Scenopinidae", "Therevidae"],
  },
  {
    id: "empidoidea",
    label: "Empidoidea",
    major: "brachycera",
    families: ["Atelestidae", "Brachystomatidae", "Dolichopodidae", "Empididae", "Homalocnemiidae", "Hybotidae", "Iteaphila group", "Oreogetonidae"],
  },
  {
    id: "aschiza",
    label: "Aschiza · working grade",
    major: "brachycera",
    families: ["Ironomyiidae", "Lonchopteridae", "Opetiidae", "Phoridae", "Pipunculidae", "Platypezidae", "Syrphidae"],
  },
  {
    id: "calyptratae",
    label: "Calyptratae",
    major: "brachycera",
    families: ["Anthomyiidae", "Calliphoridae", "Fanniidae", "Glossinidae", "Hippoboscidae", "Mormotomyiidae", "Muscidae", "Mystacinobiidae", "Oestridae", "Rhiniidae", "Rhinophoridae", "Sarcophagidae", "Scathophagidae", "Tachinidae"],
  },
  {
    id: "nerioidea",
    label: "Nerioidea",
    major: "brachycera",
    families: ["Cypselosomatidae", "Megamerinidae", "Micropezidae", "Neriidae"],
  },
  {
    id: "diopsoidea",
    label: "Diopsoidea",
    major: "brachycera",
    families: ["Diopsidae", "Gobryidae", "Nothybidae", "Psilidae", "Somatiidae", "Strongylophthalmyiidae", "Syringogastridae", "Tanypezidae"],
  },
  {
    id: "conopoidea",
    label: "Conopoidea",
    major: "brachycera",
    families: ["Conopidae"],
  },
  {
    id: "tephritoidea",
    label: "Tephritoidea",
    major: "brachycera",
    families: ["Ctenostylidae", "Lonchaeidae", "Pallopteridae", "Piophilidae", "Platystomatidae", "Pyrgotidae", "Richardiidae", "Tachiniscidae", "Tephritidae", "Ulidiidae"],
  },
  {
    id: "lauxanioidea",
    label: "Lauxanioidea",
    major: "brachycera",
    families: ["Celyphidae", "Chamaemyiidae", "Eurychoromyiidae", "Lauxaniidae"],
  },
  {
    id: "sciomyzoidea",
    label: "Sciomyzoidea",
    major: "brachycera",
    families: ["Coelopidae", "Dryomyzidae", "Helcomyzidae", "Helosciomyzidae", "Heterocheilidae", "Huttoninidae", "Phaeomyiidae", "Ropalomeridae", "Sciomyzidae", "Sepsidae"],
  },
  {
    id: "opomyzoidea",
    label: "Opomyzoidea",
    major: "brachycera",
    families: ["Agromyzidae", "Anthomyzidae", "Asteiidae", "Aulacigastridae", "Clusiidae", "Fergusoninidae", "Marginidae", "Neminidae", "Neurochaetidae", "Odiniidae", "Opomyzidae", "Periscelididae", "Teratomyzidae", "Xenasteiidae"],
  },
  {
    id: "carnoidea",
    label: "Carnoidea",
    major: "brachycera",
    families: ["Acartophthalmidae", "Australimyzidae", "Braulidae", "Canacidae", "Carnidae", "Chloropidae", "Cryptochetidae", "Milichiidae"],
  },
  {
    id: "sphaeroceroidea",
    label: "Sphaeroceroidea",
    major: "brachycera",
    families: ["Chyromyidae", "Heleomyzidae", "Nannodastiidae", "Sphaeroceridae"],
  },
  {
    id: "ephydroidea",
    label: "Ephydroidea",
    major: "brachycera",
    families: ["Camillidae", "Curtonotidae", "Diastatidae", "Drosophilidae", "Ephydridae"],
  },
];

function catalogId(family: string) {
  return family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const DIPTERA_FAMILY_CATALOG: DipteraFamilyCatalogEntry[] = groups.flatMap((group) => group.families.map((family) => ({
  id: catalogId(family),
  family,
  groupId: group.id,
  groupLabel: group.label,
  major: group.major,
  rankNote: family === "Iteaphila group" ? "family-level group with unsettled rank" : undefined,
})));

export const DIPTERA_FAMILY_COUNT = DIPTERA_FAMILY_CATALOG.length;
export const SYSTEMA_DIPTERORUM_FAMILY_SOURCE = "https://www.diptera.org/FamilyByGroups";

