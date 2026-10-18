# Wing ID Lab accuracy test

Measures the on-device classifier (`app/wingIdentification.ts`) on three sets and writes
`public/idlab-benchmark.json`, which the Wing ID Lab shows as “Accuracy test”.

| set | images | right answer |
| --- | --- | --- |
| same-figure | the 35 book-scan crops in `public/plate-vectors/scans/` | the family of the tracing made from that scan |
| other-specimens | 34 open-licence wing photos/drawings from Zenodo/Plazi (`fetch_testset.py`) | their family (all families are in the library, but other species) |
| absent-families | 5 wing photos of families without a plate (`absent.json`, same procedure) | “no reliable match” |

```bash
npm run dev -- --port 5174 --host 127.0.0.1      # Vite serves the TypeScript module directly
python3 fetch_testset.py                          # downloads + crops the test wings
node run.mjs result-scan.json all                 # same-figure
node run2.mjs positives.json result-pos.json      # other-specimens
python3 score.py result-pos.json
```

`run2.mjs` passes each image straight to `identifyWing()` with automatic orientation, the
default sensitivity (58) and the full local reference set. `mkbench.py` combines the
current and the previous (v0.51) results into `public/idlab-benchmark.json`.
