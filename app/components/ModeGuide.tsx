"use client";

import { useState } from "react";
import { JOURNEY, journeyStep, JourneyMode } from "../lib/journey";
import { readStoredJson, writeStoredJson } from "../lib/safeStorage";
import JournalDoodle from "./JournalDoodle";

const COLLAPSE_KEY = "entowing-guide-collapsed-v1";

/** "You are here" sticky note shown at the top of every journal page except Start. */
export default function ModeGuide({ mode, onGo, extra }: { mode: JourneyMode; onGo: (mode: JourneyMode) => void; extra?: React.ReactNode }) {
  const step = journeyStep(mode);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readStoredJson<Record<string, boolean>>(COLLAPSE_KEY) ?? {});
  const isCollapsed = collapsed[mode] === true;

  function toggle() {
    const nextState = { ...collapsed, [mode]: !isCollapsed };
    setCollapsed(nextState);
    writeStoredJson(COLLAPSE_KEY, nextState);
  }

  return (
    <aside className={`mode-guide colour-${step.colour} ${isCollapsed ? "is-collapsed" : ""}`} aria-label={`Guide for ${step.tab}`}>
      <div className="mode-guide-head">
        <span className="mode-guide-page" aria-hidden="true"><JournalDoodle name={step.doodle} size={22} /></span>
        <p>
          <small>You are on page {step.page} of {JOURNEY.length}</small>
          <strong>{step.title}</strong>
        </p>
        <button type="button" className="mode-guide-toggle" aria-expanded={!isCollapsed} onClick={toggle}>{isCollapsed ? "Show tips" : "Hide tips"}</button>
      </div>
      {!isCollapsed && <div className="mode-guide-body">
        <ol>{step.canDo.map((line) => <li key={line}>{line}</li>)}</ol>
        {extra}
        <div className="mode-guide-actions">
          <button type="button" className="mode-guide-next" onClick={() => onGo(step.next)}>Next · {step.nextLabel} →</button>
          <button type="button" onClick={() => onGo("start")}>↩ Start page & glossary</button>
        </div>
      </div>}
      <ol className="mode-guide-dots" aria-label="Journal progress">
        {JOURNEY.map((item) => <li key={item.mode} className={`${item.mode === mode ? "is-here" : ""} colour-${item.colour}`}>
          <button type="button" onClick={() => onGo(item.mode)} aria-current={item.mode === mode ? "page" : undefined} title={`${item.page} · ${item.tab}`}><span className="sr-only">Page {item.page}: {item.tab}</span><span aria-hidden="true">{item.page}</span></button>
        </li>)}
      </ol>
    </aside>
  );
}
