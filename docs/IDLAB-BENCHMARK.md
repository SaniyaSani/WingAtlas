# Wing ID Lab — accuracy test (v0.52, 2026-10-18)

How well does the on-device classifier (`app/wingIdentification.ts`) find the right family?
Three test sets, run with automatic orientation, default sensitivity (58) and the full
local reference library. Harness: `scripts/idlab-benchmark/`. The Wing ID Lab shows these
numbers under “Accuracy test” (from `public/idlab-benchmark.json`).

| set | n | v0.52 | v0.51 |
| --- | --- | --- | --- |
| Same printed figure | 40 | top1 36 · top3 38 | top1 23 · top3 26 |
| Other species, same family | 34 | top1 3 · top3 4 · keptUnidentified 24 · confidentlyWrong 8 | top1 1 · top3 1 · keptUnidentified 3 · confidentlyWrong 30 |
| Families not in the library | 5 | keptUnidentified 4 | keptUnidentified 3 |

*top1* = right family named first · *top3* = right family among the three cards ·
*keptUnidentified* = the lab answered “no reliable match” · *confidentlyWrong* = it named a
family and that family was wrong.

## What changed in v0.52

Vein lines are thinned to one pixel and compared line-to-line (a symmetric chamfer score:
the share of each drawing's lines lying close to a line of the other, best over small
shifts, also after stretching both wings to the same frame). This counts 70 % of the
similarity; the v0.47 grid/direction features count 30 %. Line width, stipple and
scan contrast now matter much less.

## How to read it

* **Same printed figure:** the lab now reliably finds a drawing that is in its library
  (scan → its own tracing) — an easy test, because image and plate show the same drawing. Three of the four misses are whole-fly figures where the body hides the wing base.
* **Other species of a library family:** still mostly *not* identified. With one or a few
  drawings per family, another species of the same family usually looks too different —
  different proportions, photographs instead of drawings, pigment patterns. The important
  change is that the lab now says “no reliable match” in most of these cases (24 of 34)
  instead of naming a wrong family (30 of 34 before).
* **Families without a plate:** 4 of 5 correctly left unidentified.

So the lab is a way to find **look-alike plates for comparison**, not an identification
tool. More plates per family (several species, both photographs and drawings) are what
would improve it next.

## Test images (not part of EntoWing)

Downloaded from Zenodo / Plazi for testing only; open licences as recorded on Zenodo.

| family | Zenodo record | licence | figure |
| --- | --- | --- | --- |
| Anisopodidae | [912220](https://zenodo.org/records/912220) | cc-by-4.0 | Figure 5a from: Kolcsár L, Dvořák L, Beuk P (2016) New records of Sylvicola (Diptera: Anisopodidae) from Roman |
| Anthomyiidae | [8342918](https://zenodo.org/records/8342918) | cc-by-4.0 | Figs 5, 6 in Proposal of Karliella gen. n. for the Afrotropical 'Pegomya' sexpunctata Karl, 1935 (Diptera: Ant |
| Anthomyzidae | [4272839](https://zenodo.org/records/4272839) | cc-by-4.0 | Fig. 11 in Nearctic Anthomyzidae: a monograph of Anthomyza and allied genera (Diptera) |
| Blephariceridae | [6051339](https://zenodo.org/records/6051339) | cc-by-4.0 | Figure 2 from: Zhang X, Kang Z (2022) The genus Blepharicera Macquart, 1843 newly recorded from Sichuan, China |
| Bolitophilidae | [12586924](https://zenodo.org/records/12586924) | cc-by-4.0 | Figs 5–6 in Bolitophilidae (Diptera) From Taiwan: A Family New To The Oriental Region |
| Chironomidae | [935633](https://zenodo.org/records/935633) | cc-by-4.0 | Figures 2-4 from: Lin X, Qi X, Wang X (2012) Two new species of Bryophaenocladius Thienemann, 1934 (Diptera, C |
| Chironomidae | [986130](https://zenodo.org/records/986130) | cc-by-4.0 | Figures 8 from: Yan C-C, Guo Q, Liu T, Guo W, Wang X-H, Pan B-P (2016) Review of the genus Harnischia Kieffer  |
| Clusiidae | [7665990](https://zenodo.org/records/7665990) | cc-by-4.0 | Fig. 2 in A new species of Tetrameringia McAlpine (Diptera: Schizophora: Clusiidae) from Malawi, the third spe |
| Chloropidae | [932652](https://zenodo.org/records/932652) | cc-by-4.0 | Figures 3-7 from: Liu X, Yang D (2011) Species of the genus Thressa Walker, 1860 from China (Diptera, Chloropi |
| Cryptochetidae | [3668828](https://zenodo.org/records/3668828) | cc-by-4.0 | Figs 8–10 in Three new Cryptochetum Rondani, 1875 (Diptera: Cryptochetidae) from Yunnan Province, China and an |
| Culicidae | [13184603](https://zenodo.org/records/13184603) | cc-by-4.0 | Figure 3 in Culex (Culex) gaugleri, a new species (Diptera: Culicidae) from India |
| Dixidae | [13343155](https://zenodo.org/records/13343155) | cc-by-4.0 | FIGURE 3 in The first fossil New World Dixidae with a critical discussion of generic definitions |
| Empididae | [4676698](https://zenodo.org/records/4676698) | cc-by-4.0 | Figure 7. Sororsenexa macalpinei n in Sororsenexa-New Genus (Diptera: Empididae: Hemerodromiinae) from Austral |
| Empididae | [5342411](https://zenodo.org/records/5342411) | cc-by-4.0 | Figs. 5–8 in Anaclastoctedon (Diptera: Empididae: Hemerodromiinae), A New Genus From Asia And Australia |
| Fanniidae | [6784135](https://zenodo.org/records/6784135) | cc-by-4.0 | Fig. 3. Australofannia spiniclunis Pont, 1977 in Costal vein chaetotaxy, a neglected character source in Fanni |
| Heleomyzidae | [3699281](https://zenodo.org/records/3699281) | cc-by-4.0 | Figs 2–5 in Two new species of Heleomyzidae (Diptera) from Czech Republic and Crimea |
| Hippoboscidae | [20385269](https://zenodo.org/records/20385269) | cc-by-4.0 | Fig. 3 in Description of a new species of Icosta Speiser, 1905 (Diptera: Hippoboscidae) from Southern Vietnam  |
| Lauxaniidae | [18600947](https://zenodo.org/records/18600947) | cc-by-4.0 | Figs 16–18 in The Holotype Of Homoneura Grandis (Kertész, 1915) With Description Of A New Species From Taiwan  |
| Platystomatidae | [4684897](https://zenodo.org/records/4684897) | cc-by-4.0 | Figures 27–29. Bama bickeli n in Signal Flies of the Genus Bama (Diptera: Platystomatidae) in Papua New Guinea |
| Psychodidae | [13194722](https://zenodo.org/records/13194722) | cc-by-4.0 | Figs. 18–19 in Description of a new species of Psathyromyia Barreto (Diptera, Psychodidae, Phlebotominae) from |
| Pyrgotidae | [6453716](https://zenodo.org/records/6453716) | cc-by-4.0 | Fig. 10 in New Taxa And Synonymy In The Family Pyrgotidae (Diptera Tephritoidea) Ii Subtribe Adapsiliina And A |
| Scenopinidae | [934155](https://zenodo.org/records/934155) | cc-by-4.0 | Figure 1 from: Winterton S (2011) Iranotrichia gen. n., a new genus of Scenopinidae (Diptera) from Iran, with  |
| Nemestrinidae | [10664705](https://zenodo.org/records/10664705) | cc-by-4.0 | Figs. 5–8 in Redescription of the adult male and description of the puparium of Hirmoneuropsis luctuosa (Phili |
| Stratiomyidae | [5174537](https://zenodo.org/records/5174537) | cc-by-4.0 | Figures 1–3 in new species of Culcua Walker (Diptera: Stratiomyidae) from Vietnam |
| Stratiomyidae | [5380961](https://zenodo.org/records/5380961) | cc-by-4.0 | FIG. 9 in Diverse Orthorrhaphan Flies (Insecta: Diptera: Brachycera) In Amber From The Cretaceous Of Myanmar:  |
| Syrphidae | [14006230](https://zenodo.org/records/14006230) | cc-by-4.0 | Figs 11–12 in A revision of the Afrotropical hover fly genus Afroxanthandrus Kassebeer, 2000 (Diptera, Syrphid |
| Tabanidae | [936371](https://zenodo.org/records/936371) | cc-by-4.0 | Figure 4 from: Grimaldi D, Arillo A, Cumming J (2011) Brachyceran Diptera (Insecta) in Cretaceous ambers, part |
| Tanyderidae | [13343184](https://zenodo.org/records/13343184) | cc-by-4.0 | FIGURE 4 in Nannotanyderinae: a new subfamily of Tanyderidae (Diptera) |
| Therevidae | [941699](https://zenodo.org/records/941699) | cc-by-4.0 | Figures 15-18 from: Liu S, Yang D (2012) Revision of the Chinese species of Dialineura Rondani, 1856 (Diptera, |
| Therevidae | [941711](https://zenodo.org/records/941711) | cc-by-4.0 | Figures 43-47 from: Liu S, Yang D (2012) Revision of the Chinese species of Dialineura Rondani, 1856 (Diptera, |
| Ulidiidae | [982759](https://zenodo.org/records/982759) | cc-by-4.0 | Figure 7 from: Galinskaya TV (2016) Two new species of the genus Timia and a redescription of Timia mongolica  |
| Conopidae | [7915404](https://zenodo.org/records/7915404) | cc-by-4.0 | Figs 115–118 in A revision of Afrotropical species of Stylogaster Macquart (Diptera: Conopidae), with descript |
| Agromyzidae | [5165963](https://zenodo.org/records/5165963) | cc-by-4.0 | Figures 689-692 from: Lonsdale O (2021) Manual of North American Agromyzidae (Diptera, Schizophora), with revi |
| Ceratopogonidae | [5182575](https://zenodo.org/records/5182575) | cc-by-4.0 | Figures 22–26 in A revision of the biting midges in the Culicoides (Monoculicoides) nubeculosus-stigma complex |
