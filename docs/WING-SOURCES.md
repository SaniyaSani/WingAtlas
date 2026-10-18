# Wing sources for EntoWing — research log (v0.51, 2026-10-18)

Goal: find wing drawings for Diptera families that EntoWing could not show yet, check
their licences, and turn usable ones into SVG plates without inventing anything.

## Starting point (v0.50)

* 102 manifest entries, 46 stored locally.
* **63 families had no plate at all** (Atlas filter “No plate yet”).
* **56 families had only a linked Wikimedia Commons plate** (not stored locally, so
  Compare and the Wing ID Lab could not use them).

## Result (v0.51)

* **35 new traced plates** from three public-domain books, all stored locally, all in
  Vein review (`public/plate-vectors/`), all with a scan crop underneath for checking.
* **23 families got their first plate**; families with no plate: 63 → **40**.
* **11 linked-only families now also have a local plate** (Compare / ID Lab can use them):
  Dolichopodidae, Empididae, Nemestrinidae, Psychodidae, Rhagionidae, Scenopinidae,
  Stratiomyidae, Tabanidae, Tanyderidae, Therevidae, Tipulidae.
* No vein names were assigned to any tracing. Names printed on some figures stay visible
  in the scan; a reviewer can add them as *their* labels on the Vein review page.

| book | archive.org | licence status | plates |
| --- | --- | --- | --- |
| Williston S. W. 1908, *Manual of North American Diptera*, 3rd ed. | [manualofnorthame00willuoft](https://archive.org/details/manualofnorthame00willuoft) | NOT_IN_COPYRIGHT | 21 |
| Comstock J. H. 1918, *The Wings of Insects* | [wingsofinsectsex00coms](https://archive.org/details/wingsofinsectsex00coms) | NOT_IN_COPYRIGHT | 12 |
| Walker F. 1853, *Insecta Britannica. Diptera* vol. 2 | [insectabritannic02walkuoft](https://archive.org/details/insectabritannic02walkuoft) | NOT_IN_COPYRIGHT | 2 |

### New plates

Family — name exactly as printed (figure) — quality. The written basis for every family
assignment is in `app/reference-curation.json` and in the plate file (`provenance`).

**Families that had no plate before**

| family | source | as printed | fig. | quality |
| --- | --- | --- | --- | --- |
| Blephariceridae | Williston | *Bibiocephala* · *Blepharocera* | 47.4 · 47.1 | good · fair |
| Neriidae | Williston | *Nerius* | 103.1 | good |
| Micropezidae | Williston | *Micropeza* | 103.5 | good |
| Tanypezidae | Williston | *Tanypeza* | 103.10 | good |
| Psilidae | Williston | *Chyliza* | 104.3 | fair (stippled) |
| Sepsidae | Williston | *Sepsis* | 105.1 | good |
| Piophilidae | Williston | *Piophila* | 105.5 | good |
| Pyrgotidae | Williston | *Pyrgota* | 108.1 | fair |
| Platystomatidae | Williston | *Rivellia* | 108.5 | fair |
| Richardiidae | Williston | *Richardia* | 108.14 | fair |
| Ulidiidae | Williston | *Euxesta* | 109.15 | fair |
| Lonchaeidae | Williston | *Lonchaea* | 114.1 | good |
| Lauxaniidae | Williston | *Sapromyza* | 114.5 | fair |
| Sphaeroceridae | Williston | *Sphaerocera* | 125.1 | good |
| Heleomyzidae | Williston | *Leria* | 132.1 | good |
| Fanniidae | Williston | *Homalomyia (Fannia) scalaris* | 136.8 | fair |
| Anthomyiidae | Williston | *Hammomyia unilineata* | 137.21 | good |
| Calliphoridae | Williston | *Chrysomyia* | 139.1 | fair |
| Tachinidae | Williston | *Alophora fumosa* | 149.20 | fair |
| Hippoboscidae | Williston | *Ornithomyia* | 160.2 | good |
| Conopidae | Comstock | *Conops* | 369 | good |
| Scathophagidae | Walker | *Scatophaga stercoraria* | pl. XIII 3c | fair |
| Chamaemyiidae | Walker | *Ochthiphila aridella* | pl. XV 2c | fair |

**Linked-only families that now also have a local plate**

| family | source | as printed | fig. | quality |
| --- | --- | --- | --- | --- |
| Nemestrinidae | Comstock | *Rhynchocephalus* | 358 | fair |
| Tanyderidae | Comstock | *Protoplasa fitchii* | 360 | good |
| Psychodidae | Comstock | “moth-like fly” (genus not given) | 362 | fair |
| Rhagionidae | Comstock | *Leptis* | 364 | good |
| Therevidae | Comstock | *Thereva* | 366 | good |
| Scenopinidae | Comstock | *Scenopinus* | 370 | good |
| Empididae | Comstock | *Rhamphomyia* | 371 | good |
| Dolichopodidae | Comstock | *Psilopodius sipho* | 373 | good |
| Tipulidae | Comstock | *Tipula* | 377 | good |
| Stratiomyidae | Comstock | *Stratiomyia* | 378 | good |
| Tabanidae | Comstock (after Williston) | *Tabanus* | 379 | fair |

### Deliberately left out

* Williston fig. 149.32 *Rhinophora mexicana*: the species is now *Microchaetina
  mexicana* (Tachinidae). Filing it under Rhinophoridae would have been wrong, so
  Rhinophoridae stays empty.
* Comstock fig. 361 “wings of fungus gnats”: no genus is given, and “fungus gnats” in 1918
  covered several modern families (Mycetophilidae, Sciaridae, Keroplatidae …).
* Williston fig. 114.8 *Lauxania*: stipple too dense; fig. 114.5 *Sapromyza* used instead.
* Whole-fly (habitus) drawings: wings overlap the body and legs, so a tracing would mix
  wing veins with legs and bristles.

## Sources checked

| source | what was found | outcome |
| --- | --- | --- |
| Wikimedia Commons (Dessì wing-vein series and others) | 232 files catalogued with licences: 195 CC BY-SA 3.0, 28 CC BY-SA 4.0, several public domain. Only one new file for an empty family (*Conops* — a Williston 1908 scan, covered here from Comstock instead). About 120 extra Diptera morphotypes for families that already have a plate (list below). | **Download blocked**: upload.wikimedia.org answers HTTP 429 (retry-after 600 s) to this environment's shared address for days. Linked plates still work for users. To do: localise the 56 linked plates + extra morphotypes when reachable (`scripts/import-commons-wings.py`). |
| Williston 1908 | Wing figures for most acalyptrate and calyptrate families of North America. | 21 plates. |
| Comstock 1918 | Labelled (Comstock–Needham) wings of 20+ Diptera genera. | 12 plates. The other Diptera figures (Rhyphus, gall gnat, Dixa, Eulonchus, Pantarbes, Erax, Eristalis, Musca) belong to families that already had local plates; fig. 361 (fungus gnats) was left out, see above. |
| Walker 1853 (Insecta Britannica vol. 2) | Separate wing figures on some plates; most figures are habitus. | 2 plates (Scathophagidae, Chamaemyiidae). Leads for hand tracing below. |
| Meigen 1818–1838 (Systematische Beschreibung, vols 4–6, archive.org) | Lithographed plates, wings tiny and faint, mostly on habitus. | Not usable for automatic tracing. |
| Austen 1903 / 1911 (tsetse monographs) | *Glossina* wing only inside a labelled whole-fly diagram. | Not usable; Glossinidae stays empty. |
| Zenodo / Plazi (Biodiversity Literature Repository) | 40 families searched; open-licence wing figures found for 20, but almost all are **photographs** (automatic tracing fails on membrane texture and colour patterns). Two clean line drawings: *Neosciomyza peckorum* (Helosciomyzidae, McAlpine 2012, Rec. Aust. Mus. 64) and *Gymnochiromyia maculiventris* (Chyromyidae, Ebejer 2008, Afr. Invertebr. 49). | **Not added.** Zenodo marks both CC BY 4.0, but the publishers' own licence could not be confirmed (the Australian Museum states CC BY only from 2019). Both tracings exist in the research workspace and can be added once the licence is confirmed. |

## v0.52 update (2026-10-18)

* **4 more families** from whole-fly figures in Walker 1853 (wing base hidden by the thorax and
  cut off; quality “rough”): Coelopidae (*Coelopa frigida*, pl. XIII 4), Sciomyzidae
  (*Tetanocera ferruginea*, pl. XIV 2), Dryomyzidae (*Dryomyza flaveola*, pl. XIV 1),
  Pallopteridae (*Palloptera decem-punctata*, pl. XV 1).
* **Correction caught before filing:** Walker's pl. XII 4 “*Sarcophaga mortuorum*” is
  Linnaeus' *Musca mortuorum* (Walker cites “mortuorum, L. 1761”), today *Cynomya mortuorum*,
  a blow fly. It was added as an extra **Calliphoridae** plate, so Sarcophagidae stays empty.
* Wikimedia Commons still answers HTTP 429 to this environment (checked again 2026-10-18);
  a web-archive copy could not be reached either.

## Still without a plate (36)

Deuterophlebiidae, Nymphomyiidae, Axymyiidae, Austroleptidae, Apystomyiidae, Evocoidae,
Ironomyiidae, Glossinidae, Mormotomyiidae, Mystacinobiidae, Oestridae, Rhiniidae,
Rhinophoridae, Sarcophagidae, Cypselosomatidae, Megamerinidae, Diopsidae, Gobryidae,
Nothybidae, Somatiidae, Strongylophthalmyiidae, Syringogastridae, Ctenostylidae,
Tachiniscidae, Celyphidae, Eurychoromyiidae, Helcomyzidae, Helosciomyzidae,
Heterocheilidae, Huttoninidae, Phaeomyiidae, Ropalomeridae, Marginidae, Braulidae,
Chyromyidae, Nannodastiidae.

Best leads (all need either hand tracing or a licence answer):

* **Photographs with open licences (CC BY 4.0, ZooKeys / Pensoft)** — good for a hand
  tracing in the Wing Mapper, not for automatic tracing: Axymyiidae (Polevoi et al. 2025,
  fig. 2C, labelled), Sarcophagidae (Zhang et al. 2014, fig. 5B), Diopsidae (Feijen &
  Feijen 2020, fig. 72), Rhinophoridae (Cerretti et al. 2020, figs 2E, 9, 10 — 2E labelled),
  Oestridae (*Gasterophilus*, Li, Pape & Zhang 2019, fig. 10), Strongylophthalmyiidae
  (Galinskaya & Shatalkin 2016), Celyphidae (Gaimari 2017), Ropalomeridae (Ale-Rocha &
  Pollet 2019, CC0).
* **Walker 1853 habitus wings** (public domain) — Oestridae (pl. XIX fig. 3 *Oestrus bovis*,
  fig. 5 *Gasterophilus equi*): legs cross the wings, so they were not traced automatically.
* **Licence to confirm**: Helosciomyzidae and Chyromyidae drawings (see above).
* **Families described after 1930** (Deuterophlebiidae, Nymphomyiidae, Mystacinobiidae,
  Evocoidae, Ironomyiidae, Apystomyiidae, Austroleptidae, Gobryidae, Marginidae …) have no
  public-domain figures; they need a CC-licensed paper or an author's permission.

## Extra Commons morphotypes waiting for download (families already covered)

Asilidae (cup/media/radius variants ×5) · Atelestidae ×3 · Bombyliidae ×3 ·
Brachystomatidae (Centamerinae ×2) · Canacidae ×2 · Canthyloscelidae (Exiliscelis,
Hyperoscelis, Synneuron) · Carnidae (Hemeromyia, Meoneura) · Cecidomyiidae (Catochini,
Lasiopterini, Lestremiini, Micromyini/Peromyiini, Porricondylinae, Winnertziini) ·
Ceratopogonidae (Forcipomyia, Leptoconops) · Cylindrotomidae (Diogma, Liogma,
Phalacrocera) · Dolichopodidae (-2, Microphorinae, Parathalassiinae) · Drosophilidae-2 ·
Ephydridae (Austrocoenia, Brachydeutera, Cirrula, Clanoneurum, Discomyza, Discostriata,
Donaceus, Eremomusca, Garifuna) · Hybotidae ×2 · Inbiomyiidae · Keroplatidae ·
Limoniidae ×4 (+ Rhipidia after Walker, public domain) · Lonchopteridae (male) · Milichiidae
(Aldrichiomyza, Desmometopa, Eusiphona, Madiza, Neophyllomyza, Paramyia, Pholeomyia) ·
Mydidae ×4 · Mythicomyiidae ×2 · Odiniidae · Phoridae-2 · Platypezidae (×2,
Melanderomyiinae, Microsaniinae) · Psychodidae (Bruchomyia, Eutonnoiria, Nemapalpus,
Phlebotominae, Sycorax, Trichomyia) · Rangomaramidae (Chiletrichinae, Ohakuneinae) ·
Rhagionidae (Chrysopilus) · Scenopinidae-2 · Sciaridae (Bradysia) · Stratiomyidae
(-2, Chiromyzinae) · Tipulidae-2 · Xenasteiidae-2 · and single genera (Astiosoma,
Bolitophila, Chalarus, Euthychaeta, Geomyza, Leiomyza, Mycetobia, Ocnaea, Ogcodes,
Oscinellinae, Phlebotera, Phytomyzinae ×2, Pterodontia, Rachicerus, Stenomicrinae,
Verrallia). Licences: CC BY-SA 3.0 / 4.0 (author Giancarlo Dessì unless noted).

## How the tracings were made

See `scripts/pd-tracings/README.md`. In short: 300 dpi page render → figure crop (mirrored
when the base is on the right) → stipple, figure numbers and printed letters removed →
ridge filter → skeleton → smoothing → junction clean-up. Each plate records its quality
(`good` / `fair`) and known weak spots. Nothing was redrawn by hand.
