"use client";

/* eslint-disable @next/next/no-img-element -- local scientific SVG plates need native sizing and overlay transforms */

import { useMemo, useState } from "react";
import referencePayload from "./family-wing-references.generated.json";

type WingReference = {
  family: string;
  title: string;
  taxon?: string;
  rank?: string;
  assetPath: string;
  sourcePage: string;
  originalUrl: string;
  author: string;
  credit: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
  localAsset: boolean;
  referenceOnly: boolean;
};

type ReferenceOption = WingReference & { id: string };
type CompareView = "split" | "overlay";

const localReferences = Object.entries(referencePayload as Record<string, WingReference>)
  .filter(([, reference]) => reference.localAsset && reference.assetPath.startsWith("/"))
  .map(([id, reference]) => ({ id, ...reference }))
  .sort((a, b) => a.family.localeCompare(b.family));

function defaultReference(preferred: string, fallbackIndex: number) {
  return localReferences.find((reference) => reference.id === preferred)?.id
    ?? localReferences[fallbackIndex]?.id
    ?? "";
}

function ReferenceCredit({ reference }: { reference: ReferenceOption }) {
  return (
    <div className="compare-credit">
      <div>
        <span>{reference.family}</span>
        <strong>{reference.taxon ?? reference.title.replace(/\.(svg|png|jpe?g)$/i, "")}</strong>
      </div>
      <dl>
        <div><dt>Plate</dt><dd>{reference.title}</dd></div>
        <div><dt>Credit</dt><dd>{reference.author || reference.credit || "See source record"}</dd></div>
        <div><dt>License</dt><dd>{reference.licenseUrl ? <a href={reference.licenseUrl} target="_blank" rel="noreferrer">{reference.license} ↗</a> : reference.license}</dd></div>
      </dl>
      <a className="compare-source" href={reference.sourcePage} target="_blank" rel="noreferrer">Open source record ↗</a>
    </div>
  );
}

export default function WingCompare() {
  const [leftId, setLeftId] = useState(() => defaultReference("syrphidae", 0));
  const [rightId, setRightId] = useState(() => defaultReference("muscidae", 1));
  const [view, setView] = useState<CompareView>("split");
  const [rightOpacity, setRightOpacity] = useState(52);
  const [mirrorRight, setMirrorRight] = useState(false);

  const left = useMemo(
    () => localReferences.find((reference) => reference.id === leftId) ?? localReferences[0],
    [leftId],
  );
  const right = useMemo(
    () => localReferences.find((reference) => reference.id === rightId) ?? localReferences[1] ?? localReferences[0],
    [rightId],
  );

  if (!left || !right) return null;

  function swapReferences() {
    setLeftId(right.id);
    setRightId(left.id);
  }

  return (
    <section className="compare-page" aria-labelledby="compare-title">
      <header className="compare-hero">
        <div>
          <p className="eyebrow">COMPARATIVE MORPHOLOGY · REFERENCE PLATES</p>
          <h1 id="compare-title">Two wings.<br /><em>One visual field.</em></h1>
        </div>
        <div className="compare-hero-copy">
          <p>Place two published Diptera wing references side by side, or align them as a transparent overlay to inspect differences in outline and venation.</p>
          <span>{localReferences.length} locally preserved plates · source and license retained</span>
        </div>
      </header>

      <div className="compare-workbench">
        <div className="compare-controls">
          <label>
            <span>01 · LEFT REFERENCE</span>
            <select value={left.id} onChange={(event) => setLeftId(event.target.value)}>
              {localReferences.map((reference) => <option key={reference.id} value={reference.id}>{reference.family} — {reference.title.replace(/\.(svg|png|jpe?g)$/i, "")}</option>)}
            </select>
          </label>

          <button className="compare-swap" type="button" onClick={swapReferences} aria-label="Swap left and right references">⇄ <span>SWAP</span></button>

          <label>
            <span>02 · RIGHT REFERENCE</span>
            <select value={right.id} onChange={(event) => setRightId(event.target.value)}>
              {localReferences.map((reference) => <option key={reference.id} value={reference.id}>{reference.family} — {reference.title.replace(/\.(svg|png|jpe?g)$/i, "")}</option>)}
            </select>
          </label>

          <div className="compare-view-controls">
            <span>03 · VIEW</span>
            <div role="group" aria-label="Comparison view">
              <button type="button" className={view === "split" ? "active" : ""} aria-pressed={view === "split"} onClick={() => setView("split")}>Split</button>
              <button type="button" className={view === "overlay" ? "active" : ""} aria-pressed={view === "overlay"} onClick={() => setView("overlay")}>Overlay</button>
            </div>
          </div>
        </div>

        {view === "overlay" && (
          <div className="compare-overlay-controls">
            <label>
              <span>Right plate opacity <b>{rightOpacity}%</b></span>
              <input type="range" min="10" max="90" value={rightOpacity} onChange={(event) => setRightOpacity(Number(event.target.value))} />
            </label>
            <label className="compare-check">
              <input type="checkbox" checked={mirrorRight} onChange={(event) => setMirrorRight(event.target.checked)} />
              <span>Mirror right wing</span>
            </label>
          </div>
        )}

        {view === "split" ? (
          <div className="compare-stage compare-stage-split">
            <figure>
              <div className="compare-plate-label"><b>A</b><span>{left.family}</span></div>
              <img src={left.assetPath} alt={`${left.family} wing reference`} />
            </figure>
            <figure>
              <div className="compare-plate-label"><b>B</b><span>{right.family}</span></div>
              <img className={mirrorRight ? "is-mirrored" : ""} src={right.assetPath} alt={`${right.family} wing reference`} />
            </figure>
          </div>
        ) : (
          <div className="compare-stage compare-stage-overlay" aria-label={`Overlay of ${left.family} and ${right.family} wing references`}>
            <div className="compare-overlay-legend"><span><i />{left.family}</span><span><i />{right.family}</span></div>
            <img className="compare-layer compare-layer-left" src={left.assetPath} alt={`${left.family} wing reference`} />
            <img
              className={`compare-layer compare-layer-right${mirrorRight ? " is-mirrored" : ""}`}
              src={right.assetPath}
              alt={`${right.family} wing reference at ${rightOpacity}% opacity`}
              style={{ opacity: rightOpacity / 100 }}
            />
          </div>
        )}

        <div className="compare-credits-grid">
          <ReferenceCredit reference={left} />
          <ReferenceCredit reference={right} />
        </div>
      </div>

      <aside className="compare-caution">
        <span>INTERPRETATION NOTE</span>
        <p><strong>Visual alignment is exploratory.</strong> It does not establish vein homology, ancestral state, phylogenetic proximity, or identification. Plate scale, orientation and illustration style differ among sources; confirm any hypothesis against reviewed terminology and primary literature.</p>
      </aside>
    </section>
  );
}
