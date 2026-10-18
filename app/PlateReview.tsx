"use client";

import { useEffect, useMemo, useState } from "react";
import {
  effectiveEdges,
  emptyReview,
  groupPlateIndex,
  LabelReview,
  LabelStatus,
  modernHint,
  PlateIndexEntry,
  PlateLabel,
  PlateReview as Review,
  PlateVectors,
  plateKind,
  plateUsesOlderNames,
  reviewedNames,
  pointsToPath,
  REVIEW_STORAGE_PREFIX,
  reviewProgress,
  sanitizeReview,
  SYSTEM_COLOUR,
  systemOf,
} from "./lib/plateVectors";
import { readStoredJson, writeStoredJson } from "./lib/safeStorage";
import { publishedReviewFor } from "./lib/reviewStore";

const STATUS_LABEL: Record<LabelStatus, string> = { unreviewed: "not checked", confirmed: "✓ correct", corrected: "✎ corrected", rejected: "✕ wrong / not a vein" };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function PlateReview({ initialId, onUseReviewed }: { initialId?: string | null; onUseReviewed?: (referenceId: string, target: "mapper" | "learn") => void }) {
  const [index, setIndex] = useState<PlateIndexEntry[]>([]);
  const [plateId, setPlateId] = useState<string | null>(initialId ?? null);
  const [plate, setPlate] = useState<PlateVectors | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [showPlate, setShowPlate] = useState(true);
  const [plateOpacity, setPlateOpacity] = useState(35);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/plate-vectors/index.json").then((response) => response.json()).then((data) => {
      if (cancelled) return;
      const plates = Array.isArray(data?.plates) ? (data.plates as PlateIndexEntry[]) : [];
      setIndex(plates);
      setPlateId((current) => current && plates.some((entry) => entry.referenceId === current) ? current : plates[0]?.referenceId ?? null);
    }).catch(() => !cancelled && setError("The list of extracted plates could not be loaded."));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!plateId) return;
    let cancelled = false;
    fetch(`/plate-vectors/${plateId}.json`).then((response) => response.json()).then((data: PlateVectors) => {
      if (cancelled) return;
      const local = sanitizeReview(readStoredJson(REVIEW_STORAGE_PREFIX + data.referenceId), data);
      setPlate(data);
      setReview(local);
      setBaseline(null);
      setSelected(data.labels.find((label) => label.kind === "vein")?.id ?? null);
      setEditing(false);
      // Start from a published review when this browser has none of its own.
      if (!reviewedNames(data, local).length && !Object.keys(local.labels).length && !local.userLabels.length) {
        void publishedReviewFor(data).then((published) => {
          if (cancelled || !published || !reviewedNames(data, published).length) return;
          setReview(published);
          setBaseline(published.reviewer || "an EntoWing reviewer");
        });
      }
    }).catch(() => !cancelled && setError(`Vectors for ${plateId} could not be loaded.`));
    return () => { cancelled = true; };
  }, [plateId]);

  const olderNames = useMemo(() => (plate ? plateUsesOlderNames(plate.labels) : false), [plate]);
  const reviewable = useMemo(() => plate?.labels.filter((label) => label.kind === "vein" || label.kind === "crossvein" || label.kind === "landmark") ?? [], [plate]);
  const cells = useMemo(() => plate?.labels.filter((label) => label.kind === "cell") ?? [], [plate]);

  if (error) return <section className="plate-review"><p className="review-error" role="alert">{error}</p></section>;
  if (!plate || !review) return <section className="plate-review"><p className="journal-note">Loading extracted plates…</p></section>;

  const progress = reviewProgress(plate, review);
  const selectedLabel = plate.labels.find((label) => label.id === selected) ?? null;
  const selectedUser = review.userLabels.find((label) => label.id === selected) ?? null;
  const selectedReview: LabelReview | undefined = selectedLabel ? review.labels[selectedLabel.id] : undefined;
  const selectedEdges = selectedLabel ? effectiveEdges(selectedLabel, selectedReview) : selectedUser?.edgeIds ?? [];
  const suggested = selectedLabel && (!selectedReview || selectedReview.status === "unreviewed") ? selectedLabel.suggestedEdgeIds ?? [] : [];

  const edgeOwner = new Map<string, { text: string; colour: string; reviewed: boolean }>();
  for (const label of plate.labels) {
    const edges = effectiveEdges(label, review.labels[label.id]);
    for (const id of edges) if (!edgeOwner.has(id)) edgeOwner.set(id, { text: label.text, colour: SYSTEM_COLOUR[systemOf(label.text)], reviewed: (review.labels[label.id]?.status ?? "unreviewed") !== "unreviewed" });
  }
  for (const label of review.userLabels) for (const id of label.edgeIds) if (!edgeOwner.has(id)) edgeOwner.set(id, { text: label.text, colour: SYSTEM_COLOUR[systemOf(label.text)], reviewed: true });

  function save(next: Review) {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setReview(stamped);
    writeStoredJson(REVIEW_STORAGE_PREFIX + stamped.referenceId, stamped);
  }

  function setStatus(label: PlateLabel, status: LabelStatus, edges?: string[]) {
    const current = review!.labels[label.id];
    const edgeIds = edges ?? (current && current.status !== "unreviewed" ? current.edgeIds : label.edgeIds ?? []);
    save({ ...review!, labels: { ...review!.labels, [label.id]: { status, edgeIds: status === "rejected" ? [] : edgeIds, note: current?.note ?? "" } } });
  }

  function toggleEdge(edgeId: string) {
    if (selectedLabel) {
      const current = effectiveEdges(selectedLabel, selectedReview);
      const next = current.includes(edgeId) ? current.filter((id) => id !== edgeId) : [...current, edgeId];
      const original = [...(selectedLabel.edgeIds ?? [])].sort().join(",");
      setStatus(selectedLabel, next.slice().sort().join(",") === original ? "confirmed" : "corrected", next);
    } else if (selectedUser) {
      const next = selectedUser.edgeIds.includes(edgeId) ? selectedUser.edgeIds.filter((id) => id !== edgeId) : [...selectedUser.edgeIds, edgeId];
      save({ ...review!, userLabels: review!.userLabels.map((label) => label.id === selectedUser.id ? { ...label, edgeIds: next } : label) });
    }
  }

  function acceptSuggestion() {
    if (!selectedLabel) return;
    setStatus(selectedLabel, "corrected", [...new Set([...(selectedLabel.edgeIds ?? []), ...(selectedLabel.suggestedEdgeIds ?? [])])]);
  }

  function setNote(note: string) {
    if (selectedLabel) {
      const current = review!.labels[selectedLabel.id] ?? { status: "unreviewed" as LabelStatus, edgeIds: selectedLabel.edgeIds ?? [], note: "" };
      save({ ...review!, labels: { ...review!.labels, [selectedLabel.id]: { ...current, note } } });
    } else if (selectedUser) {
      save({ ...review!, userLabels: review!.userLabels.map((label) => label.id === selectedUser.id ? { ...label, note } : label) });
    }
  }

  function addUserLabel() {
    const text = newLabel.trim();
    if (!text) return;
    const id = `u${Date.now().toString(36)}`;
    save({ ...review!, userLabels: [...review!.userLabels, { id, text, edgeIds: [], note: "" }] });
    setSelected(id);
    setEditing(true);
    setNewLabel("");
  }

  function removeUserLabel(id: string) {
    save({ ...review!, userLabels: review!.userLabels.filter((label) => label.id !== id) });
    if (selected === id) setSelected(null);
  }

  function exportReview() {
    const payload = {
      ...review!,
      plate: { referenceId: plate!.referenceId, family: plate!.family, plateTitle: plate!.plateTitle, source: plate!.source, generatedOn: plate!.derivative.generatedOn },
      labels: plate!.labels.filter((label) => label.kind !== "cell" && label.kind !== "other").map((label) => ({
        id: label.id,
        text: label.text,
        printedOnPlate: true,
        extraction: { method: label.method, anchorEdges: label.edgeIds ?? [], suggestedEdges: label.suggestedEdgeIds ?? [], flag: label.review ?? null },
        review: review!.labels[label.id] ?? { status: "unreviewed", edgeIds: label.edgeIds ?? [], note: "" },
      })),
      userLabels: review!.userLabels.map((label) => ({ ...label, printedOnPlate: false })),
    };
    download(`${plate!.referenceId}.entowing-plate-review.json`, JSON.stringify(payload, null, 2));
  }

  function importReview(file: File) {
    file.text().then((text) => {
      const parsed = JSON.parse(text);
      const labels = Array.isArray(parsed?.labels)
        ? Object.fromEntries(parsed.labels.filter((entry: { id?: string; review?: unknown }) => entry?.id && entry.review).map((entry: { id: string; review: LabelReview }) => [entry.id, entry.review]))
        : parsed?.labels;
      if (parsed?.referenceId && parsed.referenceId !== plate!.referenceId) throw new Error(`This review belongs to ${parsed.referenceId}, not ${plate!.referenceId}.`);
      save(sanitizeReview({ ...parsed, labels }, plate!));
    }).catch((failure) => setError(failure instanceof Error ? failure.message : "This review file could not be read."));
  }

  const { width, height } = plate.box;
  const traced = plateKind(plate) === "raster-tracing";
  const provenance = plate.provenance;
  const strokeBase = Math.max(width, height) / 330;

  return (
    <section className="plate-review" aria-labelledby="review-title">
      <header className="review-head journal-page">
        <span className="page-number">vein review · {traced ? "public-domain tracing" : "pilot"}</span>
        <h1 id="review-title">Check the veins, one plate at a time</h1>
        {traced ? <>
          <p className="journal-note">This wing was traced automatically from a scanned page of an old, public-domain book. The lines follow the printed drawing, but nobody has named them yet — and the tracer can miss faint veins or add short spurs. Your job: name the veins you can recognise, and note anything the tracing got wrong.</p>
          <ol className="review-steps">
            <li>Keep <b>Original scan underneath</b> on and compare the red lines with the print.</li>
            <li>Type a vein name (for example <b>R4+5</b>) under <b>Add a name</b>, then click the line pieces it covers.</li>
            <li>Write what is wrong in the note: a missing vein, an extra spur, a broken costa.</li>
            <li>Download your review — it becomes the reviewed EntoWing version of this tracing.</li>
          </ol>
        </> : <>
          <p className="journal-note">These lines are taken directly from the author’s own vector drawing — nothing is redrawn. Every name is copied exactly as printed on the plate and attached where the author’s leader line touches the wing. Your job: confirm each name, fix the lines it covers, and flag anything that is not right.</p>
          <ol className="review-steps">
            <li>Pick a name in the list. Its lines light up on the wing.</li>
            <li>Press <b>✓ correct</b>, or <b>Edit lines</b> and click line pieces on the wing to add or remove them.</li>
            <li>Dashed pieces are a suggestion for how far the vein runs. Accept them only if they are right.</li>
            <li>Download your review and send it to me — it becomes the reviewed EntoWing version of this plate.</li>
          </ol>
        </>}
      </header>

      <nav className="review-plate-groups" aria-label="Plates to review">
        {groupPlateIndex(index).map((group) => <details key={group.title} className="review-plate-group" open={group.plates.some((entry) => entry.referenceId === plate.referenceId) || group.title === "Labelled vector plates"}>
          <summary><b>{group.title}</b> <small>{group.plates.length} plate{group.plates.length === 1 ? "" : "s"}</small></summary>
          <div className="review-plates">
        {group.plates.map((entry) => {
          const stored = readStoredJson(REVIEW_STORAGE_PREFIX + entry.referenceId) as Review | null;
          const done = stored ? Object.values(stored.labels ?? {}).filter((item) => item && item.status !== "unreviewed").length : 0;
          return <button key={entry.referenceId} type="button" className={entry.referenceId === plate.referenceId ? "active" : ""} aria-pressed={entry.referenceId === plate.referenceId} onClick={() => setPlateId(entry.referenceId)}>
            <b>{entry.family}</b><span>{entry.plateTitle.replace(/ wing veins$/i, "")}</span>
            <small>{entry.veinLabels ? `${Math.min(done, entry.veinLabels)}/${entry.veinLabels} checked · ${entry.flagged} flagged` : plateKind(entry) === "raster-tracing" ? `tracing · ${entry.quality ?? "unrated"}${stored?.userLabels?.length ? ` · ${stored.userLabels.length} named by you` : " · not named yet"}` : "no printed names"}</small>
          </button>;
        })}
          </div>
        </details>)}
      </nav>

      <div className="review-workbench">
        <div className="review-canvas journal-page">
          <div className="review-toolbar">
            <label className="cmp-check"><input type="checkbox" checked={showPlate} onChange={(event) => setShowPlate(event.target.checked)} /><span>{traced ? "Original scan underneath" : "Original plate underneath"}</span></label>
            {showPlate && <label className="cmp-range"><span>Opacity <b>{plateOpacity}%</b></span><input type="range" min="10" max="90" value={plateOpacity} onChange={(event) => setPlateOpacity(Number(event.target.value))} /></label>}
            <label className="cmp-check"><input type="checkbox" checked={showSuggestions} onChange={(event) => setShowSuggestions(event.target.checked)} /><span>Show suggestions</span></label>
          </div>
          <svg className={`review-svg ${editing ? "is-editing" : ""}`} viewBox={`${plate.box.x} ${plate.box.y} ${width} ${height}`} role="group" aria-label={`${plate.family} plate, extracted veins`}>
            <rect x={plate.box.x} y={plate.box.y} width={width} height={height} fill="#fff" />
            {showPlate && <image href={plate.source.file} x={plate.box.x} y={plate.box.y} width={width} height={height} opacity={plateOpacity / 100} preserveAspectRatio="xMidYMid meet" />}
            {plate.faintLines.map((line) => <path key={line.id} d={pointsToPath(line.points)} className="review-faint" strokeWidth={strokeBase * .6} />)}
            {plate.edges.map((edge) => {
              const owner = edgeOwner.get(edge.id);
              const isSelected = selectedEdges.includes(edge.id);
              const isSuggested = showSuggestions && suggested.includes(edge.id);
              return <g key={edge.id}>
                <path d={pointsToPath(edge.points)} className={`review-edge ${owner ? "owned" : ""} ${isSelected ? "is-selected" : ""} ${isSuggested ? "is-suggested" : ""} ${hoverEdge === edge.id ? "is-hover" : ""}`} style={{ stroke: isSelected ? "#e5398f" : owner ? owner.colour : undefined }} strokeWidth={strokeBase * (isSelected ? 2.2 : owner ? 1.4 : 1)} strokeDasharray={isSuggested && !isSelected ? `${strokeBase * 3} ${strokeBase * 2}` : undefined} />
                <path d={pointsToPath(edge.points)} className="review-edge-hit" strokeWidth={strokeBase * 7} onPointerEnter={() => setHoverEdge(edge.id)} onPointerLeave={() => setHoverEdge(null)} onClick={() => editing ? toggleEdge(edge.id) : setSelected(plate.labels.find((label) => effectiveEdges(label, review.labels[label.id]).includes(edge.id))?.id ?? review.userLabels.find((label) => label.edgeIds.includes(edge.id))?.id ?? selected)}>
                  <title>{owner ? `${owner.text} · ${edge.id}` : `unlabelled line · ${edge.id}`}{editing ? " — click to add/remove" : ""}</title>
                </path>
              </g>;
            })}
            {plate.labels.filter((label) => label.kind !== "cell" && label.kind !== "other").map((label) => {
              const point = label.anchorOnVein ?? label.anchor;
              const active = label.id === selected;
              return <g key={label.id} className={`review-anchor ${active ? "is-active" : ""} ${label.review ? "is-flagged" : ""}`} onClick={() => { setSelected(label.id); setEditing(false); }}>
                <circle cx={point[0]} cy={point[1]} r={strokeBase * (active ? 3.2 : 2.2)} />
                {active && <text x={point[0] + strokeBase * 4} y={point[1] - strokeBase * 3} style={{ fontSize: strokeBase * 9 }}>{label.text}</text>}
              </g>;
            })}
          </svg>
          <p className="review-legend"><span><i className="sw sw-owned" /> named line</span><span><i className="sw sw-selected" /> selected name</span><span><i className="sw sw-suggested" /> suggestion</span><span><i className="sw sw-free" /> no name</span><span><i className="sw sw-flag" /> needs a look</span></p>
        </div>

        <aside className="review-panel journal-page" aria-label="Names on this plate">
          {traced && provenance ? <div className="review-provenance">
            <p><b>{provenance.genusAsPrinted}</b> · {plate.source.author}, fig. {provenance.figure}</p>
            <p>Family in the book: <i>{provenance.familyAsPrinted}</i> → today <b>{provenance.modernFamily}</b>. <small>{provenance.familyBasis}</small></p>
            <p className={`review-quality q-${provenance.quality}`}>Tracing quality: <b>{provenance.quality}</b>{provenance.mirrored ? " · mirrored so the base is on the left" : ""}</p>
            {provenance.notes.map((note) => <p key={note} className="review-system">{note}</p>)}
            {plate.printedLettering && <p className="review-system">The printed figure carries its own vein and cell names ({provenance.letteringSystem ?? "an older system"}). They are visible in the scan underneath but were not copied into EntoWing — if you add them as your labels, say so in the note, because these old names do not always match modern ones.</p>}
          </div> : <div className="review-progress"><b>{progress.done}/{progress.total}</b> names checked{progress.complete && " · plate complete ✓"}</div>}
          {olderNames && <p className="review-system">This plate uses older vein names (for example CuA1, dm-cu). They stay exactly as printed; the possible modern name is only a hint (system of Cumming & Wood 2017, adopted by van Steenis et al. 2023 for hover flies) — check it for this family.</p>}
          {!reviewable.length && <p className="review-system">{traced ? "No names have been attached to this tracing." : "This plate has no printed vein names."} Add names yourself below; they will be stored as <b>your</b> labels, never as the author’s.</p>}
          <ul className="review-labels">
            {reviewable.map((label) => {
              const status = review.labels[label.id]?.status ?? "unreviewed";
              const hint = modernHint(label.text, olderNames);
              return <li key={label.id}>
                <button type="button" className={`${selected === label.id ? "active" : ""} status-${status}`} aria-pressed={selected === label.id} onClick={() => { setSelected(label.id); setEditing(false); }}>
                  <i style={{ background: SYSTEM_COLOUR[systemOf(label.text)] }} aria-hidden="true" />
                  <b>{label.text}</b>
                  {hint && <small className="hint">≈ {hint}?</small>}
                  {label.review && status === "unreviewed" && <small className="flag" title={label.review}>needs a look</small>}
                  <em>{STATUS_LABEL[status]}</em>
                </button>
              </li>;
            })}
            {review.userLabels.map((label) => <li key={label.id}>
              <button type="button" className={`${selected === label.id ? "active" : ""} status-user`} aria-pressed={selected === label.id} onClick={() => setSelected(label.id)}>
                <i style={{ background: SYSTEM_COLOUR[systemOf(label.text)] }} aria-hidden="true" /><b>{label.text}</b><em>your label · {label.edgeIds.length} lines</em>
              </button>
            </li>)}
          </ul>

          {selectedLabel && <div className="review-detail" aria-live="polite">
            <h2>{selectedLabel.text}{modernHint(selectedLabel.text, olderNames) && <small> · possible modern name {modernHint(selectedLabel.text, olderNames)}</small>}</h2>
            <p className="review-why">{selectedLabel.method === "leader" ? "Printed on the plate and connected by the author’s leader line" : selectedLabel.method === "proximity" ? "Printed on the plate without a leader; attached to the nearest line" : "Printed on the plate; no line found"}{selectedLabel.anchorRule ? ` · ${selectedLabel.anchorRule}` : ""}.</p>
            {selectedLabel.review && <p className="review-flag">⚑ {selectedLabel.review}</p>}
            <p className="review-count">{selectedEdges.length} line piece{selectedEdges.length === 1 ? "" : "s"} selected{suggested.length ? ` · ${suggested.length} suggested` : ""}</p>
            <div className="review-actions">
              <button type="button" className="go" onClick={() => setStatus(selectedLabel, "confirmed", effectiveEdges(selectedLabel, selectedReview))}>✓ correct</button>
              {!!suggested.length && <button type="button" onClick={acceptSuggestion}>＋ accept dashed suggestion</button>}
              <button type="button" className={editing ? "active" : ""} aria-pressed={editing} onClick={() => setEditing((value) => !value)}>{editing ? "Done editing" : "✎ Edit lines"}</button>
              <button type="button" onClick={() => setStatus(selectedLabel, "rejected")}>✕ wrong</button>
              {selectedReview && selectedReview.status !== "unreviewed" && <button type="button" onClick={() => { const next = { ...review.labels }; delete next[selectedLabel.id]; save({ ...review, labels: next }); }}>↺ reset</button>}
            </div>
            {editing && <p className="review-editing">Editing: click line pieces on the wing to add or remove them from <b>{selectedLabel.text}</b>.</p>}
            <label className="review-note"><span>Note (optional)</span><textarea value={selectedReview?.note ?? ""} onChange={(event) => setNote(event.target.value)} placeholder="e.g. ends at the margin, not at R4+5" /></label>
          </div>}
          {selectedUser && <div className="review-detail">
            <h2>{selectedUser.text} <small>· your label</small></h2>
            <div className="review-actions">
              <button type="button" className={editing ? "active" : ""} aria-pressed={editing} onClick={() => setEditing((value) => !value)}>{editing ? "Done editing" : "✎ Choose lines"}</button>
              <button type="button" onClick={() => removeUserLabel(selectedUser.id)}>Delete label</button>
            </div>
            <label className="review-note"><span>Note</span><textarea value={selectedUser.note} onChange={(event) => setNote(event.target.value)} /></label>
          </div>}

          <div className="review-add">
            <label><span>Add a name that is missing</span><input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addUserLabel(); }} placeholder="e.g. R4+5" /></label>
            <button type="button" onClick={addUserLabel} disabled={!newLabel.trim()}>Add</button>
          </div>

          {!!cells.length && <p className="review-cells"><b>Cells printed on the plate:</b> {cells.map((cell) => cell.text).join(", ")} — not reviewed here.</p>}

          {baseline && <p className="review-system">Started from the published review by <b>{baseline}</b>. Your changes are saved as your own review in this browser.</p>}
          {onUseReviewed && (() => {
            const count = reviewedNames(plate, review).length;
            return <div className="review-use">
              <p><b>{count}</b> checked name{count === 1 ? "" : "s"} on this plate{count ? " — use them elsewhere in EntoWing:" : ". Confirm or add names to use them in Wing Mapper and Learn."}</p>
              <div>
                <button type="button" disabled={!count} onClick={() => onUseReviewed(plate.referenceId, "mapper")}>Open in Wing Mapper →</button>
                <button type="button" disabled={!count} onClick={() => onUseReviewed(plate.referenceId, "learn")}>Quiz me in Learn →</button>
              </div>
            </div>;
          })()}

          <div className="review-export">
            <label><span>Reviewer (optional)</span><input value={review.reviewer} onChange={(event) => save({ ...review, reviewer: event.target.value })} placeholder="your name" /></label>
            <div>
              <button type="button" className="go" onClick={exportReview}>↓ Download review</button>
              <label className="review-import">↑ Load review<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) importReview(file); event.target.value = ""; }} /></label>
              <button type="button" onClick={() => { if (window.confirm(`Clear your review of ${plate.family}?`)) save(emptyReview(plate.referenceId)); }}>Clear review</button>
            </div>
            <small>Saved automatically in this browser. Source: <a href={plate.source.page} target="_blank" rel="noreferrer">{plate.source.author} · {plate.source.license} ↗</a>. {traced ? "The book is in the public domain; a licence for the EntoWing tracing itself has not been chosen yet (recorded as unknown)." : "The extracted graph is a derivative and carries the same licence."}</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
