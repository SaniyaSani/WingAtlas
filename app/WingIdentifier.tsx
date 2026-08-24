"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import referenceData from "./family-wing-references.generated.json";
import {
  identifyWing,
  renderWingOrientation,
  WingIdResult,
  WingOrientation,
  WingReferenceRecord,
  WingRotation,
} from "./wingIdentification";

type LoadedWing = { src: string; name: string; width: number; height: number };

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The photograph could not be read."));
    reader.onerror = () => reject(new Error("The photograph could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image format could not be decoded."));
    image.src = src;
  });
}

function scoreClass(value: number) {
  return value >= 70 ? "good" : value >= 40 ? "fair" : "poor";
}

function orientationText(orientation: WingOrientation) {
  const rotation = orientation.rotation ? `rotated ${orientation.rotation}°` : "0° rotation";
  return `${rotation}${orientation.mirrored ? " + mirrored" : " + not mirrored"}`;
}

export default function WingIdentifier({ onUseInMapper }: { onUseInMapper: (wing: LoadedWing) => void }) {
  const references = useMemo(() => Object.entries(referenceData) as Array<[string, WingReferenceRecord]>, []);
  const localReferenceCount = references.filter(([, reference]) => reference.localAsset).length;
  const atlasReferenceCount = references.length;
  const [wing, setWing] = useState<LoadedWing | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [sensitivity, setSensitivity] = useState(58);
  const [status, setStatus] = useState<"empty" | "ready" | "analysing" | "done" | "error">("empty");
  const [progress, setProgress] = useState({ done: 0, total: localReferenceCount });
  const [result, setResult] = useState<WingIdResult | null>(null);
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState<WingRotation>(0);
  const [mirrored, setMirrored] = useState(false);
  const [autoOrient, setAutoOrient] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  function invalidateResult() {
    setResult(null);
    setError("");
    setStatus(wing ? "ready" : "empty");
  }

  function rotate(delta: -90 | 90) {
    if (status === "analysing") return;
    setRotation((current) => ((current + delta + 360) % 360) as WingRotation);
    invalidateResult();
  }

  function flip() {
    if (status === "analysing") return;
    setMirrored((current) => !current);
    invalidateResult();
  }

  function resetOrientation() {
    if (status === "analysing") return;
    setRotation(0);
    setMirrored(false);
    invalidateResult();
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      setResult(null);
      const src = await readFile(file);
      const loaded = await loadImage(src);
      setImage(loaded);
      setWing({ src, name: file.name, width: loaded.naturalWidth, height: loaded.naturalHeight });
      setRotation(0);
      setMirrored(false);
      setAutoOrient(true);
      setStatus("ready");
    } catch (failure) {
      setStatus("error");
      setError(failure instanceof Error ? failure.message : "The photograph could not be opened.");
    } finally {
      event.target.value = "";
    }
  }

  async function analyse() {
    if (!image) return;
    setStatus("analysing");
    setError("");
    setResult(null);
    setProgress({ done: 0, total: localReferenceCount });
    try {
      const next = await identifyWing(
        image,
        references,
        sensitivity,
        { rotation, mirrored },
        autoOrient,
        (done, total) => setProgress({ done, total }),
      );
      setResult(next);
      setRotation(next.orientation.rotation);
      setMirrored(next.orientation.mirrored);
      setStatus("done");
    } catch (failure) {
      setStatus("error");
      setError(failure instanceof Error ? failure.message : "The comparison could not be completed.");
    }
  }

  function openInMapper() {
    if (!wing || !image) return;
    const orientation = result?.orientation ?? { rotation, mirrored };
    const canvas = renderWingOrientation(image, image.naturalWidth, image.naturalHeight, orientation);
    const plainName = wing.name.replace(/\.[^.]+$/, "");
    onUseInMapper({
      src: canvas.toDataURL("image/png"),
      name: `${plainName}-oriented.png`,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return <>
    <section className="idlab-intro">
      <div>
        <p className="eyebrow">WING ID LAB · DUAL-LAYER VEIN ANALYSIS</p>
        <h1>One wing. Three visual candidates—or an honest no-match.</h1>
      </div>
      <p>EntoWing preserves every coloured, clickable atlas vein, but compares an invisible neutral mask made from the same geometry. Membrane fills, labels and leader lines cannot influence the result. It tests all eight rotation-and-mirror orientations and refuses a family call when the evidence is weak.</p>
    </section>

    <section className="idlab-shell" aria-label="Wing identification laboratory">
      <div className="idlab-specimen-card">
        <div className="idlab-card-head"><span>01 · SPECIMEN</span><b>{wing ? "PHOTO READY" : "ADD ONE WING"}</b></div>
        <label className={`idlab-dropzone ${wing ? "has-photo" : ""}`}>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} />
          {wing ? <img
            src={wing.src}
            alt="Uploaded prepared fly wing"
            style={{ transform: `scale(${rotation === 90 || rotation === 270 ? .78 : 1}) scaleX(${mirrored ? -1 : 1}) rotate(${rotation}deg)` }}
          /> : <div><strong>＋ Upload prepared wing</strong><span>JPG · PNG · WEBP</span><small>Use one intact, flattened wing photographed straight from above.</small></div>}
          {wing && <span className="idlab-replace">Replace photo</span>}
        </label>

        {wing && <div className="idlab-orientation">
          <div className="idlab-orientation-head"><span>PHOTO ORIENTATION</span><b>{orientationText({ rotation, mirrored }).toUpperCase()}</b></div>
          <div className="idlab-orientation-buttons" aria-label="Manual photo orientation controls">
            <button type="button" onClick={() => rotate(-90)} disabled={status === "analysing"} aria-label="Rotate photograph left 90 degrees">↶ <span>Left 90°</span></button>
            <button type="button" onClick={() => rotate(90)} disabled={status === "analysing"} aria-label="Rotate photograph right 90 degrees">↷ <span>Right 90°</span></button>
            <button type="button" className={mirrored ? "active" : ""} onClick={flip} disabled={status === "analysing"}>⇋ <span>Mirror</span></button>
            <button type="button" onClick={resetOrientation} disabled={status === "analysing"}>○ <span>Reset</span></button>
          </div>
          <label className="idlab-auto-orient">
            <input type="checkbox" checked={autoOrient} onChange={(event) => { setAutoOrient(event.target.checked); invalidateResult(); }} disabled={status === "analysing"} />
            <span><b>Auto-orient before matching</b><small>Tests 0°, 90°, 180° and 270°, both original and mirrored.</small></span>
          </label>
        </div>}

        <div className="idlab-photo-protocol">
          <span><i>1</i> Whole wing, narrow margin</span>
          <span><i>2</i> Pale even background</span>
          <span><i>3</i> Vein junctions in focus</span>
          <span><i>4</i> Camera perpendicular</span>
        </div>

        <label className="idlab-sensitivity">
          <span><b>Vein sensitivity</b><small>Adjust only when faint veins disappear or background texture dominates.</small></span>
          <strong>{sensitivity}</strong>
          <input type="range" min="35" max="82" value={sensitivity} onChange={(event) => { setSensitivity(Number(event.target.value)); invalidateResult(); }} disabled={status === "analysing"} />
        </label>

        <button className="idlab-analyse" disabled={!wing || status === "analysing"} onClick={analyse}>
          {status === "analysing" ? `Comparing ${progress.done}/${progress.total} references…` : result ? "↺ Analyse again" : "✦ Find three candidates"}
        </button>
        <p className="privacy-note">The photograph is analysed on this device and is not sent to a server.</p>
        {error && <div className="idlab-error" role="alert">{error}</div>}
      </div>

      <div className="idlab-results-card" aria-live="polite">
        <div className="idlab-card-head"><span>02 · CANDIDATES</span><b>{result ? `${result.referencesCompared} REFERENCES COMPARED` : "WAITING FOR PHOTO"}</b></div>
        {!result ? <div className="idlab-empty-result">
          <div className="idlab-ghost-wing" aria-hidden="true"><i /><i /><i /><i /></div>
          <strong>{status === "analysing" ? "Cleaning and comparing the vein field…" : "Your three nearest visual references will appear here."}</strong>
          <p>If none passes the structural threshold, EntoWing will keep the specimen unidentified instead of forcing a family name.</p>
          {status === "analysing" && <div className="idlab-progress"><i style={{ width: `${progress.total ? progress.done / progress.total * 100 : 0}%` }} /></div>}
        </div> : <>
          <div className={`idlab-verdict ${result.noReliableMatch ? "no-match" : result.uncertain ? "uncertain" : "supported"}`}>
            <span>{result.noReliableMatch ? "NO RELIABLE MATCH IN THE CURRENT LIBRARY" : result.uncertain ? "LOW SEPARATION · REVIEW REQUIRED" : "REFERENCE MATCH · REVIEW REQUIRED"}</span>
            <strong>{result.noReliableMatch
              ? "This wing should remain unidentified: none of the available references reproduces its venation closely enough."
              : result.uncertain
                ? `${result.candidates[0].taxon} is nearest, but the evidence is not strongly separated.`
                : `${result.candidates[0].taxon} is the closest current reference.`}</strong>
            <small>{result.noReliableMatch
              ? "The three cards below are nearest neighbours for manual comparison—not diagnoses."
              : "Percentages are provisional support within this reference set; they are not validated species probabilities."}</small>
            {!!result.rejectionReasons.length && <ul className="idlab-rejection-reasons">{result.rejectionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
          </div>

          <div className="idlab-analysis-readout">
            <img src={result.analysisPreview} alt="Cleaned vein-field map extracted from the uploaded wing" />
            <div><span>WHAT ENTOWING COMPARED</span><strong>Cleaned vein-field map</strong><small>Darker pixels carry more evidence. The crop boundary, background tone and disconnected captions are removed; no artificial junction points are generated.</small></div>
          </div>

          <div className="idlab-orientation-result">
            <span>{result.orientation.automatic ? "AUTO ORIENTATION" : "MANUAL ORIENTATION"}</span>
            <strong>{orientationText(result.orientation)}</strong>
            <small>{result.orientation.automatic
              ? `${result.orientation.confidence} orientation separation · one global orientation was used for all candidates`
              : "Automatic orientation was off; the displayed manual orientation was used for every candidate."}</small>
          </div>

          <div className="idlab-candidates">
            {result.candidates.map((candidate, index) => <article key={candidate.id} className={index === 0 && !result.noReliableMatch ? "leading" : "nearest"}>
              <div className="idlab-rank"><span>#{index + 1} · {result.noReliableMatch ? "NEAREST ONLY" : "CANDIDATE"}</span><b>{Math.round(candidate.probability * 100)}%</b></div>
              <div className="idlab-candidate-copy">
                <span>{candidate.rank}</span>
                <h2><i>{candidate.taxon}</i></h2>
                <p>{candidate.family} · hybrid fit {Math.round(candidate.similarity * 100)}/100 · aligned globally</p>
              </div>
              <img src={candidate.reference.assetPath} alt={`${candidate.family} reference wing`} />
              <div className="idlab-probability"><i style={{ width: `${candidate.probability * 100}%` }} /></div>
              <div className="idlab-match-reasons"><span>STRONGEST AGREEMENT</span>{candidate.reasons.map((reason) => <small key={reason}>✓ {reason}</small>)}</div>
              <a href={candidate.reference.sourcePage} target="_blank" rel="noreferrer">Reference, author & licence ↗</a>
            </article>)}
          </div>

          <div className="idlab-unknown">
            <span>{result.noReliableMatch ? "KEEP UNIDENTIFIED / FAMILY MAY BE ABSENT" : "NOT REPRESENTED / OTHER TAXON"}</span>
            <strong>{Math.round(result.unknownProbability * 100)}%</strong>
            <div><i style={{ width: `${result.unknownProbability * 100}%` }} /></div>
          </div>

          <div className="idlab-quality">
            <div className="idlab-quality-title"><span>IMAGE QUALITY</span><b>{result.quality.score}/100</b></div>
            <div className="idlab-quality-grid">
              {[['Contrast', result.quality.contrast], ['Sharpness', result.quality.sharpness], ['Wing coverage', result.quality.coverage]].map(([label, value]) => <div key={String(label)}><span>{label}</span><b className={scoreClass(Number(value))}>{value}%</b></div>)}
            </div>
            {!!result.quality.warnings.length && <ul>{result.quality.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          </div>
        </>}
      </div>
    </section>

    {wing && <section className="idlab-handoff">
      <div><span className="section-number">03</span><div><h2>Turn the candidate into examinable evidence.</h2><p>Open this exact photograph in Wing Mapper, align the candidate family geometry, then verify every junction and label on the specimen.</p></div></div>
      <button onClick={openInMapper}>Open oriented photo in Wing Mapper →</button>
    </section>}

    <section className="idlab-method-note">
      <div><span>WHAT THIS VERSION CAN SAY</span><h2>Useful visual ranking. Uncertainty stays visible.</h2></div>
      <p>The current atlas records {atlasReferenceCount} published SVG references, of which {localReferenceCount} can presently be analysed on-device. Atlas artwork and classifier masks are now separate views of the same geometry: clickable vein layers remain untouched, while fills and annotations are excluded from matching. Multiple morphotypes can represent one variable family without producing duplicate family cards. The user-reviewed Eristalis geometry remains the Syrphidae reference. Exact species probabilities still require multiple verified wings per species, sex and population plus an independent validation set.</p>
    </section>
  </>;
}
