"use client";

import { ReactNode } from "react";
import {
  BASIS_LABEL,
  FieldBasis,
  IMAGE_TYPE_LABEL,
  metadataCompleteness,
  REFERENCE_STATUS_LABEL,
  UNKNOWN,
  WingReferenceRecord,
} from "../lib/referenceModel";

function Value({ value, basis }: { value: ReactNode; basis?: FieldBasis }) {
  const unknown = value === UNKNOWN || value === "" || value === null || value === undefined;
  return (
    <dd>
      {unknown ? <span className="meta-unknown">unknown</span> : value}
      {basis && !unknown && basis !== "manifest" && <small className={`meta-basis basis-${basis}`} title={BASIS_LABEL[basis]}>{basis === "rule" ? "rule" : basis === "curation" ? "curated" : ""}</small>}
    </dd>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a>;
}

export default function ReferenceMetadataCard({ record, slot, actions }: { record: WingReferenceRecord; slot?: "A" | "B"; actions?: ReactNode }) {
  const completeness = metadataCompleteness(record);
  const licenseLabel = record.license.name === UNKNOWN ? "unknown" : record.license.name;
  const orientation = record.orientation.baseSide === UNKNOWN && record.orientation.anteriorEdge === UNKNOWN
    ? UNKNOWN
    : `base ${record.orientation.baseSide} · anterior ${record.orientation.anteriorEdge}`;
  return (
    <article className="ref-meta-card" aria-label={`${slot ? `Plate ${slot}: ` : ""}${record.family} reference metadata`}>
      <header>
        {slot && <b className={`ref-meta-slot slot-${slot.toLowerCase()}`} aria-hidden="true">{slot}</b>}
        <div>
          <span>{record.family}</span>
          <strong>{record.taxon !== UNKNOWN ? <i>{record.taxon}</i> : record.plateTitle}</strong>
        </div>
      </header>

      <div className="ref-meta-attribution">
        <p><span>Author</span>{record.author === UNKNOWN ? <span className="meta-unknown">unknown</span> : record.author}</p>
        <p><span>Licence</span>{record.license.url !== UNKNOWN ? <ExternalLink href={record.license.url}>{licenseLabel}</ExternalLink> : licenseLabel}</p>
        <p><span>Credit</span>{record.credit === UNKNOWN ? <span className="meta-unknown">unknown</span> : record.credit}</p>
        <p><span>Source</span><ExternalLink href={record.source.page}>{record.plateTitle}</ExternalLink></p>
      </div>

      <details className="ref-meta-details">
        <summary>Scientific record · {completeness.known}/{completeness.total} provenance fields known</summary>
        <dl>
          <div><dt>Taxon</dt><Value value={record.taxon} basis={record.basis.taxon} /></div>
          <div><dt>Rank</dt><Value value={record.taxonomicRank} basis={record.basis.taxonomicRank} /></div>
          <div><dt>Morphotype</dt><Value value={record.morphotype} basis={record.basis.morphotype} /></div>
          <div><dt>Specimen</dt><Value value={record.specimen} basis={record.basis.specimen} /></div>
          <div><dt>Status</dt><Value value={record.referenceStatus === UNKNOWN ? UNKNOWN : REFERENCE_STATUS_LABEL[record.referenceStatus]} basis={record.basis.referenceStatus} /></div>
          <div><dt>Image type</dt><Value value={record.imageType === UNKNOWN ? UNKNOWN : IMAGE_TYPE_LABEL[record.imageType]} basis={record.basis.imageType} /></div>
          <div><dt>Terminology</dt><Value value={record.terminologySystem} basis={record.basis.terminologySystem} /></div>
          <div><dt>Orientation</dt><Value value={orientation} basis={record.basis.orientation} /></div>
          <div><dt>Scale</dt><Value value={record.scaleKnown === UNKNOWN ? UNKNOWN : record.scaleKnown ? "known" : "not available"} basis={record.basis.scaleKnown} /></div>
          <div><dt>Review</dt><Value value={record.review.status === "not-recorded" ? "no review recorded" : record.review.status} basis={record.basis.review} /></div>
          <div><dt>Reviewer</dt><Value value={record.review.reviewer} /></div>
          <div><dt>Last checked</dt><Value value={record.review.lastChecked} /></div>
          <div><dt>DOI</dt><Value value={record.publication.doi !== UNKNOWN ? <ExternalLink href={`https://doi.org/${record.publication.doi}`}>{record.publication.doi}</ExternalLink> : UNKNOWN} basis={record.basis.publication} /></div>
          <div><dt>File</dt><dd>{record.asset.width} × {record.asset.height} px · {record.asset.local ? "stored locally" : "remote"}</dd></div>
        </dl>
        {!!record.notes.length && <ul className="ref-meta-notes">{record.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
        <small className="ref-meta-legend">“rule” = derived from the manifest by a documented rule · “curated” = recorded with a written basis in reference-curation.json · “unknown” = not recorded, not guessed.</small>
      </details>
      {actions && <div className="ref-meta-actions">{actions}</div>}
    </article>
  );
}
