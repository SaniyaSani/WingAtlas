"use client";

import { useMemo, useState } from "react";
import reviewed from "./Eristalis-reference.entowing-template.json";
import JournalDoodle from "./components/JournalDoodle";
import { JOURNEY, JourneyMode } from "./lib/journey";
import { LOCAL_REFERENCE_RECORDS, REFERENCE_RECORDS } from "./lib/referenceIndex";

type Point = { x: number; y: number };
type SystemId = "C" | "Sc" | "R" | "M" | "Cu" | "A" | "cross" | "sv";

const SYSTEMS: Array<{ id: SystemId; label: string; name: string; colour: string; text: string }> = [
  { id: "C", label: "C", name: "Costa", colour: "#d49a1f", text: "Runs along the front (leading) edge of the wing. Finding it first tells you which edge is anterior and which end is the base." },
  { id: "Sc", label: "Sc", name: "Subcosta", colour: "#3f93a0", text: "The vein just behind the costa. In many flies it is short and ends on the costa." },
  { id: "R", label: "R", name: "Radius", colour: "#c8503b", text: "The main branched system behind Sc. Flies often have fused branches, written with a plus sign: R2+3, R4+5." },
  { id: "M", label: "M", name: "Media", colour: "#6f5fb0", text: "The middle system. Where its branches run and bend is a key character, for example in hover flies." },
  { id: "Cu", label: "Cu", name: "Cubitus", colour: "#4f8a50", text: "Lies behind the media, toward the rear of the wing." },
  { id: "A", label: "A", name: "Anal", colour: "#4f78a0", text: "Veins of the rear, basal (anal) region of the wing." },
  { id: "cross", label: "x-v", name: "Crossveins", colour: "#d9702c", text: "Short veins that link two longitudinal systems. They are named after what they join: r-m joins radius and media, m-cu joins media and cubitus; h is the humeral crossvein near the base." },
  { id: "sv", label: "sv", name: "Vena spuria", colour: "#d4607a", text: "A vein-like thickening typical of most hover flies (Syrphidae). It is not counted as a true vein." },
];

function systemOf(veinId: string): SystemId {
  if (veinId === "C") return "C";
  if (veinId === "Sc") return "Sc";
  if (veinId === "sv") return "sv";
  if (/^[a-z]/.test(veinId) || veinId === "Cu1") return "cross";
  if (veinId.startsWith("R")) return "R";
  if (veinId.startsWith("M")) return "M";
  if (veinId.startsWith("Cu")) return "Cu";
  if (veinId.startsWith("A")) return "A";
  return "cross";
}

function smooth(points: Point[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

const WING_PATHS = (reviewed.paths as Array<{ veinId: string; nodeIds: string[] }>).map((path) => ({
  veinId: path.veinId === "Cu1" ? "m-cu" : path.veinId,
  system: systemOf(path.veinId),
  d: smooth(path.nodeIds.map((id) => (reviewed.nodes as Record<string, Point>)[id]).filter(Boolean)),
}));

const GLOSSARY: Array<[string, string]> = [
  ["Vein", "A hollow, stiff tube in the wing membrane. Veins are named in systems: C, Sc, R, M, Cu, A."],
  ["Cell", "An area of membrane enclosed by veins, e.g. the discal medial cell (dm)."],
  ["Crossvein", "A short vein joining two longitudinal veins, named after both: r-m, m-cu."],
  ["Homology", "The same structure inherited from a common ancestor. A picture or overlay alone cannot prove it."],
  ["Morphotype", "A representative wing form used as an example. Not every species in the family looks like it."],
  ["Reference plate", "A published drawing of a wing, kept with its author, source and licence."],
  ["Scaffold", "An editable starting graph. In the Atlas it is borrowed from Eristalis and is not that family’s real venation."],
  ["Landmark", "A point you place yourself, such as the wing base or apex, to align two wings."],
  ["Nomenclature", "A naming system for veins. Older and modern systems can give the same vein different names (e.g. CuA1 vs M4)."],
];

const QUESTIONS: Array<{ q: string; mode: JourneyMode; why: string }> = [
  { q: "What is this vein called?", mode: "start", why: "Use the example wing above, then quiz yourself in Learn." },
  { q: "How are fly families related?", mode: "atlas", why: "Browse the family tree and open each family’s wing." },
  { q: "How do two wings differ?", mode: "compare", why: "Overlay, blink or difference two published plates." },
  { q: "Which reference looks like my photo?", mode: "identify", why: "Get three look-alikes — or an honest “no match”." },
  { q: "Can I draw the veins on my own specimen?", mode: "mapper", why: "Trace and label a photo, then export it." },
  { q: "Do I remember the names?", mode: "learn", why: "Click the vein the bubble asks for." },
];

export default function StartGuide({ onGo, visited }: { onGo: (mode: JourneyMode | "review") => void; visited: JourneyMode[] }) {
  const [system, setSystem] = useState<SystemId>("C");
  const active = SYSTEMS.find((item) => item.id === system) ?? SYSTEMS[0];
  const stepFor = useMemo(() => new Map(JOURNEY.map((step) => [step.mode, step])), []);
  const families = new Set(REFERENCE_RECORDS.map((record) => record.family)).size;

  return (
    <div className="start-page">
      <section className="start-hero" aria-labelledby="start-title">
        <img className="start-sticker s1" src="/journal/sticker-dragonfly.svg" alt="" aria-hidden="true" />
        <img className="start-sticker s2" src="/journal/sticker-flower.svg" alt="" aria-hidden="true" />
        <img className="start-sticker s3" src="/journal/sticker-star.svg" alt="" aria-hidden="true" />
        <div className="start-hero-copy">
          <p className="start-kicker">EntoWing · field journal of fly wings</p>
          <h1 id="start-title"><span>Diptera wings,</span> <span>one page at a time.</span></h1>
          <p className="start-lede">A friendly atlas of fly-wing veins: learn the names, explore {families} families with published plates, compare two wings, and trace your own specimen.</p>
          <div className="start-bubble" role="note">New here? Start with the wing below, then follow the path — every stop is one page of this journal.</div>
          <div className="start-hero-actions">
            <a className="start-cta" href="#meet-the-wing">① Meet the wing ↓</a>
            <button type="button" className="start-cta ghost" onClick={() => onGo("atlas")}>Skip to the Atlas →</button>
          </div>
        </div>
      </section>

      <section className="journal-spread start-anatomy" id="meet-the-wing" aria-labelledby="anatomy-title">
        <div className="journal-page">
          <span className="page-number">p. 1</span>
          <h2 id="anatomy-title">Meet the wing</h2>
          <p className="journal-note">A fly has one pair of working wings. Their veins are grouped into a few systems, read from the front edge backwards. Tap a system to highlight it.</p>
          <div className="anatomy-chips" role="group" aria-label="Vein systems">
            {SYSTEMS.map((item) => <button key={item.id} type="button" className={system === item.id ? "active" : ""} aria-pressed={system === item.id} style={{ "--chip": item.colour } as React.CSSProperties} onClick={() => setSystem(item.id)}><b>{item.label}</b> {item.name}</button>)}
          </div>
          <div className="anatomy-card" aria-live="polite">
            <strong><b style={{ background: active.colour }}>{active.label}</b> {active.name}</strong>
            <p>{active.text}</p>
          </div>
          <small className="journal-source">Example: <i>Eristalis</i> (Syrphidae), user-reviewed tracing, labelled in the van Steenis et al. (2023) system. Names and branching differ between families and between naming systems.</small>
        </div>
        <div className="journal-page anatomy-plate">
          <span className="washi washi-a" aria-hidden="true" />
          <span className="washi washi-b" aria-hidden="true" />
          <svg viewBox="0 0 560 246" role="img" aria-label={`Eristalis wing with the ${active.name} highlighted`}>
            {WING_PATHS.map((path) => <path key={path.veinId} d={path.d} className={`anatomy-vein ${path.system === system ? "is-on" : ""}`} style={{ stroke: path.system === system ? active.colour : undefined }} />)}
          </svg>
          <div className="anatomy-axis" aria-hidden="true"><span>← base</span><span>front edge (anterior) ↑</span><span>apex →</span></div>
        </div>
      </section>

      <section className="journal-spread start-path" aria-labelledby="path-title">
        <div className="journal-page wide">
          <span className="page-number">the route</span>
          <h2 id="path-title">Follow the path</h2>
          <p className="journal-note">Six stops, about ten minutes. Stamps appear on the pages you have already visited.</p>
          <ol className="path-board">
            {JOURNEY.map((step) => {
              const done = visited.includes(step.mode);
              return <li key={step.mode} className={`path-stop colour-${step.colour} ${done ? "is-done" : ""}`}>
                <button type="button" onClick={() => (step.mode === "start" ? document.getElementById("meet-the-wing")?.scrollIntoView({ behavior: "smooth" }) : onGo(step.mode))}>
                  <span className="path-die" aria-hidden="true">{step.page}</span>
                  <span className="path-icon" aria-hidden="true"><JournalDoodle name={step.doodle} size={30} /></span>
                  <strong>{step.title}</strong>
                  <small>{step.hint}</small>
                  {done && <em className="path-stamp">visited ✓</em>}
                </button>
              </li>;
            })}
          </ol>
        </div>
      </section>

      <section className="journal-spread start-questions" aria-labelledby="questions-title">
        <div className="journal-page">
          <span className="page-number">which page?</span>
          <h2 id="questions-title">What do you want to find out?</h2>
          <ul className="question-cards">
            {QUESTIONS.map((item) => {
              const step = stepFor.get(item.mode)!;
              return <li key={item.q} className={`colour-${step.colour}`}>
                <button type="button" onClick={() => (item.mode === "start" ? document.getElementById("meet-the-wing")?.scrollIntoView({ behavior: "smooth" }) : onGo(item.mode))}>
                  <span className="bubble-q">{item.q}</span>
                  <span className="bubble-a">{item.why}</span>
                  <b>{item.mode === "start" ? "See the wing ↑" : `Open ${step.tab} →`}</b>
                </button>
              </li>;
            })}
          </ul>
        </div>
        <div className="journal-page glossary">
          <span className="page-number">glossary</span>
          <h2>Words you will meet</h2>
          <dl>{GLOSSARY.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl>
        </div>
      </section>

      <section className="journal-spread start-review" aria-labelledby="review-cta-title">
        <div className="journal-page wide">
          <span className="page-number">help wanted</span>
          <h2 id="review-cta-title">Help check the veins</h2>
          <p className="journal-note">Seven published plates have been converted into exact, clickable vein maps: the lines come straight from the authors’ drawings and every name is copied from the plate. Before they are used in the atlas, each name needs a human check.</p>
          <p className="journal-note">40 wings traced from old public-domain books (Williston 1908, Comstock 1918, Walker 1853) — 27 of them for families that had no picture before. Their veins have no names yet: compare the lines with the scan underneath and name what you recognise. Names you check can then be used in Wing Mapper and in the Learn quiz.</p>
          <button type="button" className="start-cta" onClick={() => onGo("review")}>Open the vein review →</button>
        </div>
      </section>

      <section className="journal-spread start-honest" aria-labelledby="honest-title">
        <div className="journal-page wide lined">
          <span className="page-number">read me</span>
          <h2 id="honest-title">What EntoWing can and cannot tell you</h2>
          <div className="honest-grid">
            <div><h3>It can</h3><ul><li>show published wing plates with author, source and licence ({LOCAL_REFERENCE_RECORDS.length} stored locally);</li><li>help you compare shapes and learn vein names;</li><li>help you trace and export your own specimen.</li></ul></div>
            <div><h3>It cannot</h3><ul><li>identify a species for certain from a photo;</li><li>prove that two veins are homologous because they overlap;</li><li>tell you a wing’s real size — no plate has a recorded scale.</li></ul></div>
          </div>
          <p className="journal-note">When something is not recorded, EntoWing says <span className="meta-unknown">unknown</span> instead of guessing.</p>
        </div>
      </section>
    </div>
  );
}
