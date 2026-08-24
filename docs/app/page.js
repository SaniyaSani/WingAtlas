"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import reviewedEristalisPayload from "./Eristalis-reference.entowing-template.js";
import PhyloAtlas, { familyMorphotypes } from "./PhyloAtlas.js";
const referenceImage = "https://www.bugguide.net/images/raw/HSN/QV0/HSNQV0EQO08QB0HKV0RK2KGQD08Q108QC0HKB0SKEKHKBKGKZS4KHSVQZSAQD0HKAK8KOKWQV04QT0.jpg";
const presets = [
    { id: "C", label: "C", fullName: "Costa", symbolMeaning: "C = Costa", plainMeaning: "the leading-edge vein", group: "costal", color: "#d4a72c", note: "Costa runs along the anterior margin of the wing and is usually the easiest landmark for deciding which side is the leading edge." },
    { id: "Sc", label: "Sc", fullName: "Subcosta", symbolMeaning: "Sc = Subcosta", plainMeaning: "the vein just behind the costa", group: "subcostal", color: "#4f9ca4", note: "Subcosta is a longitudinal vein immediately posterior to the costa. The prefix sub- is a useful reminder that it lies behind the costal system." },
    { id: "R1", label: "R1", fullName: "First branch of Radius", symbolMeaning: "R = Radius · 1 = first branch", plainMeaning: "an anterior branch of the radial system", group: "radial", color: "#c85d48", note: "Radius is one of the major longitudinal vein systems. Its branches are numbered from anterior toward posterior; R1 is the anterior radial branch." },
    { id: "R2+3", label: "R2+3", fullName: "Fused radial branches R2 + R3", symbolMeaning: "R = Radius · 2+3 = fused branches", plainMeaning: "two radial branches travelling as one vein", group: "radial", color: "#c85d48", note: "In many Diptera, branches that are separate in the generalized venation are fused. R2+3 denotes a single visible vein representing radial branches 2 and 3 together." },
    { id: "R4+5", label: "R4+5", fullName: "Fused radial branches R4 + R5", symbolMeaning: "R = Radius · 4+5 = fused branches", plainMeaning: "a posterior branch of the radial system", group: "radial", color: "#c85d48", note: "R4+5 is a major radial landmark in many flies. It lies posterior to R2+3 and often helps define the shape of radial and medial cells." },
    { id: "Rs", label: "Rs", fullName: "Radial sector", symbolMeaning: "Rs = radial sector", plainMeaning: "the radial stem that gives rise to the distal radial branches", group: "radial", color: "#c85d48", note: "Used in the Bombyliidae morphotypes as the shared radial sector before the distal branches split." },
    { id: "R4+5 stem", label: "R4+5 stem", fullName: "Common stem of R4 and R5", symbolMeaning: "R4+5 = shared stem before R4 and R5 divide", plainMeaning: "the short common radial segment before two separate branches", group: "radial", color: "#c85d48", note: "Bombyliidae retain separate R4 and R5 distally; this segment keeps their common stem explicit and independently selectable." },
    { id: "R4", label: "R4", fullName: "Fourth radial branch", symbolMeaning: "R = Radius · 4 = fourth branch", plainMeaning: "the anterior branch of the distal R4/R5 pair", group: "radial", color: "#c85d48", note: "In the Bombyliidae reference morphotypes R4 and R5 are separate distally, unlike the fused R4+5 label used in the Eristalis anchor." },
    { id: "R5", label: "R5", fullName: "Fifth radial branch", symbolMeaning: "R = Radius · 5 = fifth branch", plainMeaning: "the posterior branch of the distal R4/R5 pair", group: "radial", color: "#c85d48", note: "R5 is a key Bombyliidae morphotype character: it may end free or converge distally with M1." },
    { id: "M1", label: "M1", fullName: "Vein M1 · modern Syrphidae", symbolMeaning: "M = Media · 1 = first branch", plainMeaning: "the branch of M that joins R4+5", group: "medial", color: "#7a6bb0", note: "Van Steenis et al. (2023): M1 is the branch of Media that joins R4+5; its apical direction varies among syrphid groups.", legacyAlias: "older Eristalis plates may place M3/M1+2 labels differently" },
    { id: "M4", label: "M4", fullName: "Vein M4 · modern Syrphidae", symbolMeaning: "M = Media · 4 = fourth medial vein", plainMeaning: "the posterior medial boundary of cell dm", group: "medial", color: "#7a6bb0", note: "Van Steenis et al. (2023) treats this as M4. In the older McAlpine system this structure was called CuA1.", legacyAlias: "CuA1 in the older system" },
    { id: "CuA", label: "CuA", fullName: "Vein CuA · modern Syrphidae", symbolMeaning: "Cu = Cubitus · A = anterior branch", plainMeaning: "the anterior cubital vein in the modern system", group: "cubital", color: "#63875f", note: "Van Steenis et al. (2023) uses CuA for the structure called CuA2 in the older system.", legacyAlias: "CuA2 in the older system" },
    { id: "CuP", label: "CuP", fullName: "Vein CuP · modern Syrphidae", symbolMeaning: "Cu = Cubitus · P = posterior branch", plainMeaning: "the posterior cubital vein", group: "cubital", color: "#63875f", note: "Van Steenis et al. (2023) uses CuP for the structure called A1 in the older system.", legacyAlias: "A1 in the older system" },
    { id: "A1", label: "A1", fullName: "Vein A1 · modern Syrphidae", symbolMeaning: "A = Anal · 1 = first anal vein", plainMeaning: "the first anal vein in the modern system", group: "anal", color: "#5c7fa0", note: "Van Steenis et al. (2023) uses A1 for the structure called A2 in the older system.", legacyAlias: "A2 in the older system" },
    { id: "r-m", label: "r-m", fullName: "Radial–medial crossvein", symbolMeaning: "r-m = Radius ↔ Media", plainMeaning: "a short crossvein joining radial and medial systems", group: "crossvein", color: "#d97941", note: "Unlike R and M, r-m is not a longitudinal vein. It is a short crossvein connecting the radial and medial systems; in many Diptera it links R4+5 with M1." },
    { id: "m-cu", label: "m-cu", fullName: "Medial–cubital crossvein · modern Syrphidae", symbolMeaning: "m-cu = Media ↔ Cubitus", plainMeaning: "the crossvein connecting the medial and cubital systems", group: "crossvein", color: "#b76f4e", note: "Modern Syrphidae terminology uses m-cu here; the 2023 glossary replaces the older name bm-cu with m-cu.", legacyAlias: "bm-cu in the older system" },
    { id: "dm-m", label: "dm-m", fullName: "Discal medial crossvein · modern Syrphidae", symbolMeaning: "dm-m = discal medial crossvein", plainMeaning: "the distal crossvein closing cell dm", group: "crossvein", color: "#d97941", note: "Van Steenis et al. (2023) uses dm-m for the crossvein called dm-cu in the older system.", legacyAlias: "dm-cu in the older system" },
    { id: "sv", label: "vena spuria", fullName: "Vena spuria · spurious vein", symbolMeaning: "vena spuria = the characteristic syrphid false vein", plainMeaning: "a vein-like longitudinal thickening rather than a standard true vein", group: "landmark", color: "#db7d87", note: "The vena spuria is a characteristic wing landmark of most Syrphidae. It is kept separate from the true longitudinal veins in EntoWing.", legacyAlias: "s or sv on older plates" },
    { id: "h", label: "h", fullName: "Humeral crossvein", symbolMeaning: "h = humeral crossvein", plainMeaning: "the basal crossvein near the costal region", group: "crossvein", color: "#b76f4e", note: "Modern Diptera/Syrphidae terminology treats h as the humeral crossvein." },
    { id: "M2", label: "M2", fullName: "Second medial branch", symbolMeaning: "M = Media · 2 = second branch", plainMeaning: "a medial branch retained in some fly lineages", group: "medial", color: "#7a6bb0", note: "M2 is important in the Bombyliidae morphotype set: the Bombylius- and Anthrax-types retain three medial branches, while the Usiinae-type shown here is reduced." },
    { id: "M3+4", label: "M3+4", fullName: "Fused medial branches M3 + M4", symbolMeaning: "M = Media · 3+4 = fused posterior branches", plainMeaning: "the posterior medial branch in the Bombyliidae reference diagrams", group: "medial", color: "#7a6bb0", note: "The Bombyliidae reference diagrams label the posterior medial branch M3+4. It is kept separate from the Syrphidae-specific modern M4 nomenclature used by the Eristalis anchor." },
    { id: "m-m", label: "m-m", fullName: "Medial crossvein", symbolMeaning: "m-m = Media ↔ Media", plainMeaning: "a crossvein joining medial branches", group: "crossvein", color: "#d97941", note: "Used in the Bombyliidae reference morphotypes; its exact endpoints shift when M2 is absent." },
    { id: "R5+M1", label: "R5+M1", fullName: "Common distal stem of R5 and M1", symbolMeaning: "R5 + M1 = convergent distal stem", plainMeaning: "two longitudinal systems sharing a short terminal stem", group: "fusion", color: "#9c665c", note: "Used in the Bombylius-type Bombyliidae morphotype to encode the diagnostic distal convergence without making R4+5 and M1 one unclickable path." },
    { id: "CuA+A1", label: "CuA+A1", fullName: "Common distal stem of CuA and A1", symbolMeaning: "CuA + A1 = convergent distal stem", plainMeaning: "cubital and anal veins sharing a terminal stem", group: "fusion", color: "#66817c", note: "Used in the Usiinae-type Bombyliidae morphotype. The two parent veins remain independently selectable before their shared terminal segment." },
    { id: "R4+5 app.", label: "R4+5 app.", fullName: "Appendix of vein R4+5", symbolMeaning: "R4+5 app. = short appendicular branch", plainMeaning: "a short incomplete branch projecting from R4+5 into cell r4+5", group: "radial appendix", color: "#c85d48", note: "The 2023 Syrphidae glossary recognizes an appendix of R4+5; it occurs in some syrphid groups and is useful as a morphotype-level character." },
];
const generalizedDipteraNodes = {
    cBase: { x: 70, y: 195 }, scStart: { x: 105, y: 150 }, scMid: { x: 205, y: 103 }, scEnd: { x: 305, y: 78 },
    rBase: { x: 88, y: 200 }, rStem: { x: 190, y: 158 }, rFork: { x: 335, y: 145 }, r1Mid: { x: 360, y: 92 }, r1End: { x: 505, y: 66 },
    r23Mid: { x: 545, y: 108 }, r23End: { x: 735, y: 73 }, rmR: { x: 475, y: 180 }, r45Mid: { x: 680, y: 148 }, r45End: { x: 875, y: 103 },
    mBase: { x: 95, y: 230 }, mFork: { x: 275, y: 220 }, rmM: { x: 475, y: 221 }, dmTop: { x: 655, y: 220 }, m1End: { x: 910, y: 205 },
    m4Mid: { x: 478, y: 258 }, dmBottom: { x: 655, y: 282 }, m4End: { x: 850, y: 310 },
    cuBase: { x: 105, y: 262 }, cuMid1: { x: 300, y: 282 }, cuMid2: { x: 520, y: 317 }, cuEnd: { x: 735, y: 350 },
    aBase: { x: 100, y: 294 }, aMid: { x: 300, y: 342 }, aEnd: { x: 555, y: 380 },
    svStart: { x: 210, y: 198 }, svMid1: { x: 405, y: 202 }, svMid2: { x: 610, y: 218 }, svEnd: { x: 790, y: 242 },
};
const generalizedDipteraPaths = [
    { veinId: "C", nodeIds: ["cBase", "scEnd", "r1End", "r23End", "r45End"] },
    { veinId: "Sc", nodeIds: ["scStart", "scMid", "scEnd"] },
    { veinId: "R1", nodeIds: ["rBase", "rStem", "r1Mid", "r1End"] },
    { veinId: "R2+3", nodeIds: ["rBase", "rStem", "rFork", "r23Mid", "r23End"] },
    { veinId: "R4+5", nodeIds: ["rBase", "rStem", "rFork", "rmR", "r45Mid", "r45End"] },
    { veinId: "M1", nodeIds: ["mBase", "mFork", "rmM", "dmTop", "m1End"] },
    { veinId: "M4", nodeIds: ["mBase", "mFork", "m4Mid", "dmBottom", "m4End"] },
    { veinId: "CuA", nodeIds: ["cuBase", "cuMid1", "cuMid2", "cuEnd"] },
    { veinId: "A1", nodeIds: ["aBase", "aMid", "aEnd"] },
    { veinId: "r-m", nodeIds: ["rmR", "rmM"] },
    { veinId: "dm-m", nodeIds: ["dmTop", "dmBottom"] },
];
const reviewedEristalisTemplate = {
    id: "eristalis-reviewed",
    name: "Eristalis · reviewed · 2023 nomenclature",
    taxon: "Syrphidae · Eristalis · geometry user-reviewed · terminology van Steenis et al. 2023",
    note: "Primary EntoWing template: the user's hand-reviewed geometry on Eristalis-reference.jpg, labelled with the modern Syrphidae terminology of van Steenis et al. (2023).",
    referenceSize: {
        width: reviewedEristalisPayload.sourceImage.width,
        height: reviewedEristalisPayload.sourceImage.height,
    },
    nodes: reviewedEristalisPayload.nodes,
    paths: reviewedEristalisPayload.paths.map((path) => path.veinId === "Cu1" ? { ...path, veinId: "m-cu" } : path),
};
const atlasMorphotypeTemplates = [
    ...familyMorphotypes.bombyliidae,
    ...familyMorphotypes.syrphidae.filter((wing) => wing.morphotypeId !== "eristalis"),
].map((wing) => ({
    id: wing.id,
    name: wing.name,
    taxon: wing.taxon,
    note: wing.note,
    referenceSize: wing.referenceSize,
    nodes: Object.fromEntries(Object.entries(wing.nodes).map(([id, point]) => [id, { ...point }])),
    paths: wing.paths.map((path) => ({ veinId: path.veinId, nodeIds: [...path.nodeIds] })),
}));
const builtInTemplates = [
    reviewedEristalisTemplate,
    ...atlasMorphotypeTemplates,
    {
        id: "diptera-general",
        name: "Generalized Diptera",
        taxon: "Diptera · alignment archetype",
        note: "A topology-aware starting network. It is a placement aid, not a family or species identification.",
        nodes: generalizedDipteraNodes,
        paths: generalizedDipteraPaths,
    },
    {
        id: "syrphidae-like",
        name: "Hover-fly type",
        taxon: "Syrphidae-like · alignment archetype",
        note: "Adds vena spuria as an editable landmark. Verify every homology against the specimen and your chosen nomenclature.",
        nodes: { ...generalizedDipteraNodes, m1End: { x: 900, y: 216 }, r45End: { x: 884, y: 122 } },
        paths: [...generalizedDipteraPaths, { veinId: "sv", nodeIds: ["svStart", "svMid1", "svMid2", "svEnd"] }],
    },
    {
        id: "muscoid-like",
        name: "Muscoid type",
        taxon: "Calyptrate-like · alignment archetype",
        note: "A starting geometry with a more apically curved medial/radial region. Use it only as an editable alignment guide.",
        nodes: { ...generalizedDipteraNodes, r45End: { x: 900, y: 128 }, m1End: { x: 885, y: 155 }, dmTop: { x: 660, y: 218 }, dmBottom: { x: 650, y: 286 } },
        paths: generalizedDipteraPaths,
    },
];
function clampControlVector(vector, maxLength) {
    const length = Math.hypot(vector.x, vector.y);
    if (!length || length <= maxLength)
        return vector;
    const scale = maxLength / length;
    return { x: vector.x * scale, y: vector.y * scale };
}
function smoothPath(points, nodeIds, curve) {
    if (points.length === 0)
        return "";
    if (points.length === 1)
        return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2)
        return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
        const p0 = points[i - 1] ?? points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;
        const segmentLength = Math.max(1, distance(p1, p2));
        const id1 = nodeIds?.[i];
        const id2 = nodeIds?.[i + 1];
        const control1 = id1 ? curve?.[id1] : undefined;
        const control2 = id2 ? curve?.[id2] : undefined;
        let out = clampControlVector({ x: (p2.x - p0.x) / 6, y: (p2.y - p0.y) / 6 }, segmentLength * .38);
        let incoming = clampControlVector({ x: (p1.x - p3.x) / 6, y: (p1.y - p3.y) / 6 }, segmentLength * .38);
        if (control1?.mode === "corner")
            out = { x: (p2.x - p1.x) / 3, y: (p2.y - p1.y) / 3 };
        if (control2?.mode === "corner")
            incoming = { x: (p1.x - p2.x) / 3, y: (p1.y - p2.y) / 3 };
        if (control1?.mode === "bezier" && control1.out)
            out = { x: control1.out.dx, y: control1.out.dy };
        if (control2?.mode === "bezier" && control2.in)
            incoming = { x: control2.in.dx, y: control2.in.dy };
        const cp1x = p1.x + out.x;
        const cp1y = p1.y + out.y;
        const cp2x = p2.x + incoming.x;
        const cp2y = p2.y + incoming.y;
        d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
}
function withSharedJunctionCorners(template) {
    const referenceCounts = new Map();
    template.paths.forEach((path) => path.nodeIds.forEach((nodeId) => referenceCounts.set(nodeId, (referenceCounts.get(nodeId) ?? 0) + 1)));
    return {
        ...template,
        paths: template.paths.map((path) => {
            const curve = { ...(path.curve ?? {}) };
            path.nodeIds.forEach((nodeId) => {
                if ((referenceCounts.get(nodeId) ?? 0) > 1 && !curve[nodeId])
                    curve[nodeId] = { mode: "corner" };
            });
            return { ...path, nodeIds: [...path.nodeIds], curve };
        }),
    };
}
function scaleCurveHandles(template, factor) {
    if (Math.abs(factor - 1) < .0001)
        return template;
    return {
        ...template,
        paths: template.paths.map((path) => ({
            ...path,
            curve: path.curve ? Object.fromEntries(Object.entries(path.curve).map(([nodeId, control]) => [nodeId, {
                    ...control,
                    in: control.in ? { dx: control.in.dx * factor, dy: control.in.dy * factor } : undefined,
                    out: control.out ? { dx: control.out.dx * factor, dy: control.out.dy * factor } : undefined,
                }])) : undefined,
        })),
    };
}
function readCurveControls(value, allowedNodeIds) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const allowed = new Set(allowedNodeIds);
    const result = {};
    Object.entries(value).forEach(([nodeId, raw]) => {
        if (!allowed.has(nodeId) || !raw || typeof raw !== "object" || Array.isArray(raw))
            return;
        const candidate = raw;
        if (candidate.mode !== "smooth" && candidate.mode !== "corner" && candidate.mode !== "bezier")
            return;
        const readHandle = (handle) => {
            if (!handle || typeof handle !== "object" || Array.isArray(handle))
                return undefined;
            const dx = Number(handle.dx);
            const dy = Number(handle.dy);
            return Number.isFinite(dx) && Number.isFinite(dy) ? { dx, dy } : undefined;
        };
        result[nodeId] = { mode: candidate.mode, in: readHandle(candidate.in), out: readHandle(candidate.out) };
    });
    return Object.keys(result).length ? result : undefined;
}
function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
function escapeXml(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function pointLineDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0)
        return Math.hypot(point.x - start.x, point.y - start.y);
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}
function simplifyPoints(points, epsilon) {
    if (points.length < 3)
        return points;
    let maxDistance = 0;
    let index = 0;
    for (let i = 1; i < points.length - 1; i += 1) {
        const distance = pointLineDistance(points[i], points[0], points[points.length - 1]);
        if (distance > maxDistance) {
            index = i;
            maxDistance = distance;
        }
    }
    if (maxDistance <= epsilon)
        return [points[0], points[points.length - 1]];
    const left = simplifyPoints(points.slice(0, index + 1), epsilon);
    const right = simplifyPoints(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
}
function thinBinaryMask(input, width, height) {
    const mask = new Uint8Array(input);
    const remove = new Uint8Array(mask.length);
    const p = (x, y) => mask[y * width + x];
    let changed = true;
    let iteration = 0;
    while (changed && iteration < 22) {
        changed = false;
        iteration += 1;
        for (let pass = 0; pass < 2; pass += 1) {
            remove.fill(0);
            let found = false;
            for (let y = 1; y < height - 1; y += 1) {
                for (let x = 1; x < width - 1; x += 1) {
                    const idx = y * width + x;
                    if (!mask[idx])
                        continue;
                    const n = [p(x, y - 1), p(x + 1, y - 1), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1), p(x - 1, y + 1), p(x - 1, y), p(x - 1, y - 1)];
                    const count = n.reduce((sum, value) => sum + value, 0);
                    if (count < 2 || count > 6)
                        continue;
                    let transitions = 0;
                    for (let i = 0; i < 8; i += 1)
                        if (n[i] === 0 && n[(i + 1) % 8] === 1)
                            transitions += 1;
                    if (transitions !== 1)
                        continue;
                    const passRule = pass === 0
                        ? n[0] * n[2] * n[4] === 0 && n[2] * n[4] * n[6] === 0
                        : n[0] * n[2] * n[6] === 0 && n[0] * n[4] * n[6] === 0;
                    if (!passRule)
                        continue;
                    remove[idx] = 1;
                    found = true;
                }
            }
            if (found) {
                changed = true;
                for (let i = 0; i < mask.length; i += 1)
                    if (remove[i])
                        mask[i] = 0;
            }
        }
    }
    return mask;
}
function skeletonSegments(mask, width, height) {
    const total = width * height;
    const offsets = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    const neighbors = (idx) => {
        const x = idx % width;
        const y = Math.floor(idx / width);
        const result = [];
        for (const [dx, dy] of offsets) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const next = ny * width + nx;
                if (mask[next])
                    result.push(next);
            }
        }
        return result;
    };
    const edgeKey = (a, b) => a < b ? a * total + b : b * total + a;
    const visited = new Set();
    const segments = [];
    for (let start = 0; start < total; start += 1) {
        if (!mask[start])
            continue;
        const startNeighbors = neighbors(start);
        if (startNeighbors.length === 0 || startNeighbors.length === 2)
            continue;
        for (const first of startNeighbors) {
            if (visited.has(edgeKey(start, first)))
                continue;
            const indices = [start];
            let previous = start;
            let current = first;
            visited.add(edgeKey(previous, current));
            indices.push(current);
            while (true) {
                const options = neighbors(current).filter((item) => item !== previous);
                if (options.length !== 1)
                    break;
                const next = options[0];
                const key = edgeKey(current, next);
                if (visited.has(key))
                    break;
                visited.add(key);
                previous = current;
                current = next;
                indices.push(current);
            }
            let length = 0;
            const points = indices.map((idx) => ({ x: idx % width, y: Math.floor(idx / width) }));
            for (let i = 1; i < points.length; i += 1)
                length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
            if (length >= Math.max(5, width * 0.008))
                segments.push({ points, length });
        }
    }
    return segments.sort((a, b) => b.length - a.length).slice(0, 96);
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
function templateFitScale(template, width, height) {
    if (template.referenceSize?.width && template.referenceSize?.height) {
        return Math.min(width / template.referenceSize.width, height / template.referenceSize.height);
    }
    const points = Object.values(template.nodes);
    if (!points.length)
        return 1;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const sourceWidth = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const sourceHeight = Math.max(1, Math.max(...ys) - Math.min(...ys));
    return Math.min((width * .84) / sourceWidth, (height * .78) / sourceHeight);
}
function fitTemplateNodes(template, width, height) {
    const entries = Object.entries(template.nodes);
    if (!entries.length)
        return {};
    if (template.referenceSize?.width && template.referenceSize?.height) {
        const scale = Math.min(width / template.referenceSize.width, height / template.referenceSize.height);
        const offsetX = (width - template.referenceSize.width * scale) / 2;
        const offsetY = (height - template.referenceSize.height * scale) / 2;
        return Object.fromEntries(entries.map(([id, point]) => [id, {
                x: offsetX + point.x * scale,
                y: offsetY + point.y * scale,
            }]));
    }
    const xs = entries.map(([, point]) => point.x);
    const ys = entries.map(([, point]) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const sourceWidth = Math.max(1, maxX - minX);
    const sourceHeight = Math.max(1, maxY - minY);
    const scale = Math.min((width * .84) / sourceWidth, (height * .78) / sourceHeight);
    const offsetX = (width - sourceWidth * scale) / 2;
    const offsetY = (height - sourceHeight * scale) / 2;
    return Object.fromEntries(entries.map(([id, point]) => [id, {
            x: offsetX + (point.x - minX) * scale,
            y: offsetY + (point.y - minY) * scale,
        }]));
}
function transformTemplateNodes(nodes, transform) {
    const values = Object.values(nodes);
    if (!values.length)
        return nodes;
    const center = {
        x: values.reduce((sum, point) => sum + point.x, 0) / values.length,
        y: values.reduce((sum, point) => sum + point.y, 0) / values.length,
    };
    return Object.fromEntries(Object.entries(nodes).map(([id, point]) => [id, transform(point, center)]));
}
function stitchCandidates(candidates) {
    if (!candidates.length)
        return [];
    const remaining = candidates.map((candidate) => [...candidate.points]).filter((points) => points.length > 1);
    if (!remaining.length)
        return [];
    let chain = remaining.shift();
    while (remaining.length) {
        const chainStart = chain[0];
        const chainEnd = chain[chain.length - 1];
        let best = { index: 0, mode: 0, gap: Number.POSITIVE_INFINITY };
        remaining.forEach((points, index) => {
            const start = points[0];
            const end = points[points.length - 1];
            const options = [
                distance(chainEnd, start),
                distance(chainEnd, end),
                distance(chainStart, end),
                distance(chainStart, start),
            ];
            options.forEach((gap, mode) => {
                if (gap < best.gap)
                    best = { index, mode, gap };
            });
        });
        const next = remaining.splice(best.index, 1)[0];
        if (best.mode === 0)
            chain = [...chain, ...next];
        if (best.mode === 1)
            chain = [...chain, ...next.slice().reverse()];
        if (best.mode === 2)
            chain = [...next, ...chain];
        if (best.mode === 3)
            chain = [...next.slice().reverse(), ...chain];
    }
    return chain;
}
function candidateEnds(candidate) {
    const points = candidate.points;
    if (points.length < 2)
        return [];
    const look = Math.min(2, points.length - 1);
    const startVector = { x: points[0].x - points[look].x, y: points[0].y - points[look].y };
    const endVector = { x: points[points.length - 1].x - points[points.length - 1 - look].x, y: points[points.length - 1].y - points[points.length - 1 - look].y };
    const normalize = (vector) => {
        const length = Math.hypot(vector.x, vector.y) || 1;
        return { x: vector.x / length, y: vector.y / length };
    };
    return [
        { point: points[0], direction: normalize(startVector) },
        { point: points[points.length - 1], direction: normalize(endVector) },
    ];
}
function growCandidateSelection(ids, candidates, maxGap) {
    const selected = new Set(ids);
    if (!selected.size)
        return ids;
    let changed = true;
    let passes = 0;
    while (changed && passes < 8) {
        changed = false;
        passes += 1;
        const selectedEnds = candidates.filter((candidate) => selected.has(candidate.id)).flatMap(candidateEnds);
        for (const candidate of candidates) {
            if (selected.has(candidate.id))
                continue;
            const isContinuation = candidateEnds(candidate).some((candidateEnd) => selectedEnds.some((selectedEnd) => {
                if (distance(candidateEnd.point, selectedEnd.point) > maxGap)
                    return false;
                const dot = candidateEnd.direction.x * selectedEnd.direction.x + candidateEnd.direction.y * selectedEnd.direction.y;
                return dot < -0.5;
            }));
            if (isContinuation) {
                selected.add(candidate.id);
                changed = true;
            }
        }
    }
    return candidates.filter((candidate) => selected.has(candidate.id)).map((candidate) => candidate.id);
}
async function makeAutoTrace(src, naturalWidth, naturalHeight, sensitivity) {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not read this image."));
        img.src = src;
    });
    const scale = Math.min(1, 640 / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(8, Math.round(naturalWidth * scale));
    const height = Math.max(8, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
        throw new Error("Image processing is not available in this browser.");
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i += 1) {
        const offset = i * 4;
        gray[i] = Math.round(pixels[offset] * .299 + pixels[offset + 1] * .587 + pixels[offset + 2] * .114);
    }
    const integral = new Uint32Array((width + 1) * (height + 1));
    for (let y = 1; y <= height; y += 1) {
        let row = 0;
        for (let x = 1; x <= width; x += 1) {
            row += gray[(y - 1) * width + (x - 1)];
            integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + row;
        }
    }
    const radius = Math.max(3, Math.round(width / 150));
    const threshold = 25 - sensitivity * .18;
    const mask = new Uint8Array(width * height);
    for (let y = radius; y < height - radius; y += 1) {
        for (let x = radius; x < width - radius; x += 1) {
            const x0 = x - radius;
            const y0 = y - radius;
            const x1 = x + radius;
            const y1 = y + radius;
            const stride = width + 1;
            const sum = integral[(y1 + 1) * stride + (x1 + 1)] - integral[y0 * stride + (x1 + 1)] - integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
            const area = (x1 - x0 + 1) * (y1 - y0 + 1);
            const localMean = sum / area;
            if (localMean - gray[y * width + x] > threshold)
                mask[y * width + x] = 1;
        }
    }
    const skeleton = thinBinaryMask(mask, width, height);
    const rawSegments = skeletonSegments(skeleton, width, height);
    return rawSegments.map((segment, index) => {
        const simplified = simplifyPoints(segment.points, 1.6).map((point) => ({ x: point.x / scale, y: point.y / scale }));
        return { id: `auto-${index + 1}`, points: simplified, length: segment.length / scale };
    });
}
function approximateWholeWingDraft(candidates, width, height, anteriorAtTop, baseSide) {
    const used = new Set();
    const chains = [];
    const byLength = [...candidates].sort((a, b) => b.length - a.length);
    for (const seed of byLength) {
        if (used.has(seed.id))
            continue;
        const grownIds = growCandidateSelection([seed.id], candidates, Math.max(8, width * .018)).filter((id) => !used.has(id));
        const members = candidates.filter((candidate) => grownIds.includes(candidate.id));
        if (!members.length)
            continue;
        members.forEach((candidate) => used.add(candidate.id));
        const points = stitchCandidates(members);
        if (points.length < 2)
            continue;
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        let length = 0;
        for (let i = 1; i < points.length; i += 1)
            length += distance(points[i - 1], points[i]);
        chains.push({
            ids: members.map((candidate) => candidate.id),
            points,
            length,
            xSpan: Math.max(...xs) - Math.min(...xs),
            ySpan: Math.max(...ys) - Math.min(...ys),
            centerX: xs.reduce((sum, value) => sum + value, 0) / xs.length,
            centerY: ys.reduce((sum, value) => sum + value, 0) / ys.length,
        });
    }
    const orientedY = (chain) => anteriorAtTop ? chain.centerY : height - chain.centerY;
    const longitudinal = chains
        .filter((chain) => chain.length > width * .055 && chain.xSpan > Math.max(width * .045, chain.ySpan * .9))
        .sort((a, b) => b.length - a.length)
        .slice(0, 9)
        .sort((a, b) => orientedY(a) - orientedY(b));
    const longitudinalIds = ["C", "Sc", "R1", "R2+3", "R4+5", "M1", "M4", "CuA", "A1"];
    const assignments = longitudinal.map((chain, index) => {
        const labelIndex = longitudinal.length <= 1 ? 4 : Math.round(index * (longitudinalIds.length - 1) / (longitudinal.length - 1));
        const straightness = chain.xSpan / Math.max(1, chain.xSpan + chain.ySpan);
        const spanScore = Math.min(1, chain.length / Math.max(1, width * .45));
        return { veinId: longitudinalIds[labelIndex], points: simplifyPoints(chain.points, Math.max(1.5, width / 420)), confidence: Math.min(.78, .28 + straightness * .24 + spanScore * .26), candidateIds: chain.ids };
    });
    const usedLongitudinal = new Set(assignments.flatMap((assignment) => assignment.candidateIds));
    const crossCandidates = chains
        .filter((chain) => !chain.ids.some((id) => usedLongitudinal.has(id)))
        .filter((chain) => chain.length > width * .018 && chain.length < width * .28 && chain.ySpan > chain.xSpan * .55)
        .filter((chain) => chain.centerX > width * .12 && chain.centerX < width * .9 && chain.centerY > height * .08 && chain.centerY < height * .92)
        .sort((a, b) => b.length - a.length)
        .slice(0, 5)
        .sort((a, b) => baseSide === "left" ? a.centerX - b.centerX : b.centerX - a.centerX)
        .slice(0, 2);
    const crossIds = ["r-m", "dm-m"];
    crossCandidates.forEach((chain, index) => assignments.push({
        veinId: crossIds[index],
        points: simplifyPoints(chain.points, Math.max(1.5, width / 420)),
        confidence: Math.min(.58, .26 + Math.min(1, chain.length / (width * .15)) * .24),
        candidateIds: chain.ids,
    }));
    const assignedCandidateIds = new Set(assignments.flatMap((assignment) => assignment.candidateIds));
    return { assignments, leftovers: candidates.filter((candidate) => !assignedCandidateIds.has(candidate.id)) };
}
async function traceBetweenAnchors(src, naturalWidth, naturalHeight, start, end) {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not read this image."));
        img.src = src;
    });
    const scale = Math.min(1, 480 / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(12, Math.round(naturalWidth * scale));
    const height = Math.max(12, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
        throw new Error("Image processing is not available in this browser.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i += 1) {
        const offset = i * 4;
        gray[i] = Math.round(pixels[offset] * .299 + pixels[offset + 1] * .587 + pixels[offset + 2] * .114);
    }
    const integral = new Uint32Array((width + 1) * (height + 1));
    for (let y = 1; y <= height; y += 1) {
        let row = 0;
        for (let x = 1; x <= width; x += 1) {
            row += gray[(y - 1) * width + x - 1];
            integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + row;
        }
    }
    const radius = Math.max(2, Math.round(width / 120));
    const score = new Float32Array(width * height);
    const stride = width + 1;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const x0 = Math.max(0, x - radius);
            const y0 = Math.max(0, y - radius);
            const x1 = Math.min(width - 1, x + radius);
            const y1 = Math.min(height - 1, y + radius);
            const sum = integral[(y1 + 1) * stride + x1 + 1] - integral[y0 * stride + x1 + 1] - integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
            const mean = sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
            const idx = y * width + x;
            const localDark = Math.max(0, Math.min(1, (mean - gray[idx]) / 52));
            const absoluteDark = (255 - gray[idx]) / 255;
            score[idx] = Math.min(1, localDark * .78 + absoluteDark * .22);
        }
    }
    const toAnalysis = (point) => ({ x: Math.max(0, Math.min(width - 1, Math.round(point.x * scale))), y: Math.max(0, Math.min(height - 1, Math.round(point.y * scale))) });
    const snap = (point) => {
        const radiusPx = Math.max(4, Math.round(width * .014));
        let best = { ...point, value: -1 };
        for (let y = Math.max(0, point.y - radiusPx); y <= Math.min(height - 1, point.y + radiusPx); y += 1) {
            for (let x = Math.max(0, point.x - radiusPx); x <= Math.min(width - 1, point.x + radiusPx); x += 1) {
                const d = Math.hypot(x - point.x, y - point.y) / radiusPx;
                if (d > 1)
                    continue;
                const value = score[y * width + x] - d * .08;
                if (value > best.value)
                    best = { x, y, value };
            }
        }
        return { x: best.x, y: best.y };
    };
    const routeStart = snap(toAnalysis(start));
    const routeEnd = snap(toAnalysis(end));
    const startIndex = routeStart.y * width + routeStart.x;
    const endIndex = routeEnd.y * width + routeEnd.x;
    const distances = new Float32Array(width * height);
    distances.fill(Number.POSITIVE_INFINITY);
    const previous = new Int32Array(width * height);
    previous.fill(-1);
    const closed = new Uint8Array(width * height);
    const heap = [];
    const heapPush = (item) => {
        heap.push(item);
        let cursor = heap.length - 1;
        while (cursor > 0) {
            const parent = Math.floor((cursor - 1) / 2);
            if (heap[parent].priority <= heap[cursor].priority)
                break;
            [heap[parent], heap[cursor]] = [heap[cursor], heap[parent]];
            cursor = parent;
        }
    };
    const heapPop = () => {
        const first = heap[0];
        const last = heap.pop();
        if (!heap.length || !last)
            return first;
        heap[0] = last;
        let cursor = 0;
        while (true) {
            const left = cursor * 2 + 1;
            const right = left + 1;
            let smallest = cursor;
            if (left < heap.length && heap[left].priority < heap[smallest].priority)
                smallest = left;
            if (right < heap.length && heap[right].priority < heap[smallest].priority)
                smallest = right;
            if (smallest === cursor)
                break;
            [heap[cursor], heap[smallest]] = [heap[smallest], heap[cursor]];
            cursor = smallest;
        }
        return first;
    };
    const anchorDistance = Math.max(20, distance(routeStart, routeEnd));
    const heuristic = (x, y) => Math.hypot(routeEnd.x - x, routeEnd.y - y);
    const neighbors = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    distances[startIndex] = 0;
    heapPush({ index: startIndex, priority: heuristic(routeStart.x, routeStart.y) });
    while (heap.length) {
        const current = heapPop();
        if (!current || closed[current.index])
            continue;
        closed[current.index] = 1;
        if (current.index === endIndex)
            break;
        const x = current.index % width;
        const y = Math.floor(current.index / width);
        for (const [dx, dy] of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height)
                continue;
            const next = ny * width + nx;
            if (closed[next])
                continue;
            const darknessCost = 1 + Math.pow(1 - score[next], 2) * 8.5;
            const corridor = pointLineDistance({ x: nx, y: ny }, routeStart, routeEnd) / anchorDistance;
            const stepCost = darknessCost * (dx && dy ? 1.414 : 1) + Math.min(4, corridor * corridor * 3);
            const nextDistance = distances[current.index] + stepCost;
            if (nextDistance >= distances[next])
                continue;
            distances[next] = nextDistance;
            previous[next] = current.index;
            heapPush({ index: next, priority: nextDistance + heuristic(nx, ny) });
        }
    }
    if (endIndex !== startIndex && previous[endIndex] < 0)
        throw new Error("No stable route found between these anchors. Try placing them closer to the visible vein.");
    const route = [];
    let cursor = endIndex;
    let guard = width * height;
    while (guard > 0) {
        route.push({ x: cursor % width, y: Math.floor(cursor / width) });
        if (cursor === startIndex)
            break;
        cursor = previous[cursor];
        if (cursor < 0)
            break;
        guard -= 1;
    }
    route.reverse();
    const averageScore = route.reduce((sum, point) => sum + score[Math.round(point.y) * width + Math.round(point.x)], 0) / Math.max(1, route.length);
    const simplified = simplifyPoints(route, 1.35).map((point) => ({ x: point.x / scale, y: point.y / scale }));
    const confidence = averageScore >= .38 ? "high" : averageScore >= .22 ? "medium" : "low";
    return { points: simplified, confidence, score: averageScore };
}
export default function Home() {
    const [mode, setMode] = useState("atlas");
    const [visualTheme, setVisualTheme] = useState("scientific");
    const [wingImage, setWingImage] = useState({ src: referenceImage, name: "Eristalis-reference.jpg", width: 560, height: 246, isLocal: false });
    const [map, setMap] = useState({});
    const [customVeins, setCustomVeins] = useState([]);
    const [customName, setCustomName] = useState("");
    const [activeVeinId, setActiveVeinId] = useState("R4+5");
    const [selectedVeinId, setSelectedVeinId] = useState(null);
    const [hoveredVeinId, setHoveredVeinId] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [mapperPreview, setMapperPreview] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [quizTarget, setQuizTarget] = useState(null);
    const [quizMessage, setQuizMessage] = useState("Map at least two veins to start a quiz.");
    const [autoCandidates, setAutoCandidates] = useState([]);
    const [selectedAutoIds, setSelectedAutoIds] = useState([]);
    const [autoSensitivity, setAutoSensitivity] = useState(55);
    const [autoRunning, setAutoRunning] = useState(false);
    const [autoStatus, setAutoStatus] = useState("Upload your own wing photo to create an automatic SVG draft.");
    const [manualAddMode, setManualAddMode] = useState(true);
    const [guidedMode, setGuidedMode] = useState(false);
    const [guidedAnchors, setGuidedAnchors] = useState([]);
    const [guidedRunning, setGuidedRunning] = useState(false);
    const [guidedStatus, setGuidedStatus] = useState("Choose a vein, then let the photo guide the route between two anchors.");
    const [wholeDraftRunning, setWholeDraftRunning] = useState(false);
    const [wholeDraftStatus, setWholeDraftStatus] = useState("Let EntoWing propose a rough whole-wing topology, then review every label.");
    const [anteriorAtTop, setAnteriorAtTop] = useState(true);
    const [baseSide, setBaseSide] = useState("left");
    const [draftHypotheses, setDraftHypotheses] = useState({});
    const [customTemplates, setCustomTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("eristalis-reviewed");
    const [placedTemplate, setPlacedTemplate] = useState(null);
    const [templateNodes, setTemplateNodes] = useState({});
    const [templateOpacity, setTemplateOpacity] = useState(.72);
    const [templateEditMode, setTemplateEditMode] = useState(true);
    const [templateDraggingNode, setTemplateDraggingNode] = useState(null);
    const [selectedTemplateNodeId, setSelectedTemplateNodeId] = useState(null);
    const [templateDraggingHandle, setTemplateDraggingHandle] = useState(null);
    const [templateEditTool, setTemplateEditTool] = useState("drag");
    const [templateJoinNodeId, setTemplateJoinNodeId] = useState(null);
    const [templateCrossveinNodeId, setTemplateCrossveinNodeId] = useState(null);
    const [templateCrossveinLabel, setTemplateCrossveinLabel] = useState("");
    const [templateUndoStack, setTemplateUndoStack] = useState([]);
    const [templateMagneticRunning, setTemplateMagneticRunning] = useState(false);
    const [templateStatus, setTemplateStatus] = useState("Choose an anatomical archetype, place it over the photo, then drag shared junctions into position.");
    const [templateSaveName, setTemplateSaveName] = useState("");
    const [canvasView, setCanvasView] = useState({ x: 0, y: 0, width: 560, height: 246 });
    const svgRef = useRef(null);
    const touchPointersRef = useRef(new Map());
    const touchTapRef = useRef(new Map());
    const touchWasPinchRef = useRef(false);
    const templateDragSnapshotTakenRef = useRef(false);
    const pinchStartRef = useRef(null);
    useEffect(() => {
        const savedTheme = window.localStorage.getItem("entowing-visual-theme-v1");
        if (savedTheme === "scientific" || savedTheme === "nocturnal")
            setVisualTheme(savedTheme);
    }, []);
    useEffect(() => {
        document.documentElement.dataset.entowingTheme = visualTheme;
        window.localStorage.setItem("entowing-visual-theme-v1", visualTheme);
    }, [visualTheme]);
    useEffect(() => {
        try {
            const saved = window.localStorage.getItem("entowing-custom-templates-v1");
            if (!saved)
                return;
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed))
                return;
            const restoreTimer = window.setTimeout(() => setCustomTemplates(parsed), 0);
            return () => window.clearTimeout(restoreTimer);
        }
        catch {
            // A damaged local preference must never block the mapper.
        }
    }, []);
    const allVeins = useMemo(() => [...presets, ...customVeins], [customVeins]);
    const allTemplates = useMemo(() => [...builtInTemplates, ...customTemplates], [customTemplates]);
    const selectedTemplate = allTemplates.find((template) => template.id === selectedTemplateId) ?? allTemplates[0];
    const activeVein = allVeins.find((vein) => vein.id === activeVeinId) ?? allVeins[0];
    const selectedVein = allVeins.find((vein) => vein.id === selectedVeinId) ?? null;
    const mappedVeins = useMemo(() => allVeins.filter((vein) => (map[vein.id]?.length ?? 0) >= 2), [allVeins, map]);
    const canvasZoom = Math.max(1, wingImage.width / Math.max(1, canvasView.width));
    const activeTemplatePath = placedTemplate?.paths.find((path) => path.veinId === activeVeinId) ?? null;
    const selectedCurveMode = selectedTemplateNodeId && activeTemplatePath?.nodeIds.includes(selectedTemplateNodeId)
        ? activeTemplatePath.curve?.[selectedTemplateNodeId]?.mode ?? "smooth"
        : "smooth";
    useEffect(() => {
        const handleUndoShortcut = (event) => {
            if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z")
                return;
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable))
                return;
            if (templateEditMode && placedTemplate && templateUndoStack.length) {
                event.preventDefault();
                undoTemplateAction();
            }
            else if (!templateEditMode && (map[activeVeinId]?.length ?? 0) > 0) {
                event.preventDefault();
                undoPoint();
            }
        };
        window.addEventListener("keydown", handleUndoShortcut);
        return () => window.removeEventListener("keydown", handleUndoShortcut);
    }, [templateUndoStack, templateEditMode, placedTemplate, map, activeVeinId]);
    function rememberTemplateState() {
        const snapshot = {
            template: placedTemplate,
            nodes: templateNodes,
            customVeins,
            activeVeinId,
        };
        setTemplateUndoStack((current) => [...current.slice(-79), snapshot]);
    }
    function undoTemplateAction() {
        const snapshot = templateUndoStack[templateUndoStack.length - 1];
        if (!snapshot) {
            setTemplateStatus("Nothing to undo yet.");
            return;
        }
        setPlacedTemplate(snapshot.template);
        setTemplateNodes(snapshot.nodes);
        setCustomVeins(snapshot.customVeins);
        setActiveVeinId(snapshot.activeVeinId);
        setTemplateUndoStack((current) => current.slice(0, -1));
        setTemplateDraggingNode(null);
        setTemplateDraggingHandle(null);
        setSelectedTemplateNodeId(null);
        setTemplateJoinNodeId(null);
        setTemplateCrossveinNodeId(null);
        setTemplateEditTool("drag");
        setTemplateStatus("Undid the last template edit. Ctrl/Cmd + Z works here too.");
    }
    function screenToWing(clientX, clientY) {
        const svg = svgRef.current;
        if (!svg)
            return null;
        const ctm = svg.getScreenCTM();
        if (!ctm)
            return null;
        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        const transformed = point.matrixTransform(ctm.inverse());
        return {
            x: Math.max(0, Math.min(wingImage.width, transformed.x)),
            y: Math.max(0, Math.min(wingImage.height, transformed.y)),
        };
    }
    function clampView(view) {
        const width = Math.min(wingImage.width, Math.max(wingImage.width / 12, view.width));
        const height = Math.min(wingImage.height, Math.max(wingImage.height / 12, view.height));
        return {
            x: Math.max(0, Math.min(wingImage.width - width, view.x)),
            y: Math.max(0, Math.min(wingImage.height - height, view.y)),
            width,
            height,
        };
    }
    function resetCanvasZoom() {
        setCanvasView({ x: 0, y: 0, width: wingImage.width, height: wingImage.height });
    }
    function zoomCanvas(factor) {
        setCanvasView((current) => {
            const currentZoom = wingImage.width / Math.max(1, current.width);
            const nextZoom = Math.max(1, Math.min(12, currentZoom * factor));
            const width = wingImage.width / nextZoom;
            const height = wingImage.height / nextZoom;
            const center = { x: current.x + current.width / 2, y: current.y + current.height / 2 };
            return clampView({ x: center.x - width / 2, y: center.y - height / 2, width, height });
        });
    }
    function beginTouchGesture(pointerId, clientX, clientY, pointerType) {
        if (pointerType !== "touch")
            return;
        touchPointersRef.current.set(pointerId, { x: clientX, y: clientY });
        if (touchPointersRef.current.size !== 2)
            return;
        touchWasPinchRef.current = true;
        touchTapRef.current.clear();
        setDragging(null);
        setTemplateDraggingNode(null);
        setTemplateDraggingHandle(null);
        const points = [...touchPointersRef.current.values()];
        const distancePx = Math.max(1, distance(points[0], points[1]));
        const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
        const svg = svgRef.current;
        if (!svg)
            return;
        const rect = svg.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (midpoint.x - rect.left) / Math.max(1, rect.width)));
        const ny = Math.max(0, Math.min(1, (midpoint.y - rect.top) / Math.max(1, rect.height)));
        pinchStartRef.current = {
            distance: distancePx,
            zoom: wingImage.width / Math.max(1, canvasView.width),
            focus: { x: canvasView.x + nx * canvasView.width, y: canvasView.y + ny * canvasView.height },
        };
    }
    function moveTouchGesture(pointerId, clientX, clientY, pointerType) {
        if (pointerType !== "touch" || !touchPointersRef.current.has(pointerId))
            return;
        touchPointersRef.current.set(pointerId, { x: clientX, y: clientY });
        const start = pinchStartRef.current;
        if (!start || touchPointersRef.current.size < 2)
            return;
        const points = [...touchPointersRef.current.values()].slice(0, 2);
        const distancePx = Math.max(1, distance(points[0], points[1]));
        const nextZoom = Math.max(1, Math.min(12, start.zoom * distancePx / start.distance));
        const width = wingImage.width / nextZoom;
        const height = wingImage.height / nextZoom;
        const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
        const svg = svgRef.current;
        if (!svg)
            return;
        const rect = svg.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (midpoint.x - rect.left) / Math.max(1, rect.width)));
        const ny = Math.max(0, Math.min(1, (midpoint.y - rect.top) / Math.max(1, rect.height)));
        setCanvasView(clampView({ x: start.focus.x - nx * width, y: start.focus.y - ny * height, width, height }));
    }
    function registerCanvasTouchTap(pointerId, clientX, clientY, pointerType) {
        if (pointerType !== "touch" || touchWasPinchRef.current)
            return;
        touchTapRef.current.set(pointerId, { x: clientX, y: clientY });
    }
    function endTouchGesture(pointerId, clientX, clientY, pointerType, cancelled = false) {
        if (pointerType !== "touch")
            return;
        const start = touchTapRef.current.get(pointerId);
        const shouldTap = !cancelled && !touchWasPinchRef.current && start && distance(start, { x: clientX, y: clientY }) < 10;
        touchTapRef.current.delete(pointerId);
        touchPointersRef.current.delete(pointerId);
        if (shouldTap)
            handleCanvasPointerDown(clientX, clientY);
        if (touchPointersRef.current.size < 2)
            pinchStartRef.current = null;
        if (touchPointersRef.current.size === 0)
            touchWasPinchRef.current = false;
    }
    function persistCustomTemplate(template) {
        setCustomTemplates((current) => {
            const next = [...current.filter((item) => item.id !== template.id), template];
            try {
                window.localStorage.setItem("entowing-custom-templates-v1", JSON.stringify(next));
            }
            catch { /* local storage can be unavailable in private contexts */ }
            return next;
        });
    }
    function currentReusableTemplate(name) {
        if (placedTemplate && templateEditMode && placedTemplate.paths.length) {
            const usedNodeIds = new Set(placedTemplate.paths.flatMap((path) => path.nodeIds));
            const nodes = Object.fromEntries(Object.entries(templateNodes).filter(([id]) => usedNodeIds.has(id)).map(([id, point]) => [id, { ...point }]));
            return {
                id: `saved-${Date.now()}`,
                name,
                taxon: `${placedTemplate.taxon} · user-edited tracing`,
                note: `User-edited EntoWing topology from ${wingImage.name}. The source photograph is not included.`,
                referenceSize: { width: wingImage.width, height: wingImage.height },
                nodes,
                paths: placedTemplate.paths.map((path) => ({ ...path, nodeIds: [...path.nodeIds] })),
            };
        }
        if (!mappedVeins.length)
            return null;
        const nodes = {};
        const paths = [];
        const mergeRadius = Math.max(2, wingImage.width * .006);
        let nodeCounter = 0;
        const nodeForPoint = (point) => {
            const existing = Object.entries(nodes).find(([, candidate]) => distance(candidate, point) <= mergeRadius);
            if (existing)
                return existing[0];
            nodeCounter += 1;
            const id = `saved-node-${nodeCounter}`;
            nodes[id] = { ...point };
            return id;
        };
        mappedVeins.forEach((vein) => {
            const points = map[vein.id] ?? [];
            if (points.length < 2)
                return;
            paths.push({ veinId: vein.id, nodeIds: points.map(nodeForPoint) });
        });
        return {
            id: `saved-${Date.now()}`,
            name,
            taxon: "My reviewed EntoWing tracing",
            note: `${paths.length} reviewed paths saved from ${wingImage.name}. The source photograph is not included.`,
            referenceSize: { width: wingImage.width, height: wingImage.height },
            nodes,
            paths,
        };
    }
    function saveTracingAsTemplate() {
        const fallbackName = wingImage.name.replace(/\.[^.]+$/, "") || "My wing";
        const name = templateSaveName.trim() || fallbackName;
        const template = currentReusableTemplate(name);
        if (!template) {
            setTemplateStatus("Trace at least one complete vein, or edit a placed template, before saving it.");
            return;
        }
        persistCustomTemplate(template);
        setSelectedTemplateId(template.id);
        setTemplateSaveName("");
        setTemplateStatus(`“${name}” saved to My Templates on this device. It is now selected and ready to place on another wing.`);
    }
    function exportReusableTemplate() {
        const fallbackName = wingImage.name.replace(/\.[^.]+$/, "") || "My wing";
        const name = templateSaveName.trim() || fallbackName;
        const template = currentReusableTemplate(name);
        if (!template) {
            setTemplateStatus("Trace at least one complete vein, or edit a placed template, before exporting it.");
            return;
        }
        const veinIds = new Set(template.paths.map((path) => path.veinId));
        const veinDefinitions = allVeins.filter((vein) => veinIds.has(vein.id));
        const payload = {
            schema: "entowing-template/1.0",
            kind: "wing-template",
            name: template.name,
            taxon: template.taxon,
            note: template.note,
            sourceImage: { fileName: wingImage.name, width: wingImage.width, height: wingImage.height, embedded: false },
            nodes: template.nodes,
            paths: template.paths,
            veins: veinDefinitions,
        };
        const safeName = name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "entowing-template";
        downloadText(`${safeName}.entowing-template.json`, JSON.stringify(payload, null, 2), "application/json");
        setTemplateStatus(`Template file downloaded: ${safeName}.entowing-template.json. You can send this small JSON file to me; it contains the editable topology, not the wing photo.`);
    }
    function addPoint(clientX, clientY) {
        if (mapperPreview || dragging || !manualAddMode || (placedTemplate && templateEditMode))
            return;
        const point = screenToWing(clientX, clientY);
        if (!point)
            return;
        setMap((current) => ({ ...current, [activeVeinId]: [...(current[activeVeinId] ?? []), point] }));
        setDraftHypotheses((current) => {
            if (!(activeVeinId in current))
                return current;
            const next = { ...current };
            delete next[activeVeinId];
            return next;
        });
    }
    function startGuidedTrace() {
        if (!wingImage.isLocal) {
            setGuidedStatus("Load your own wing photo first — Guided Trace needs local pixel access.");
            return;
        }
        if (guidedRunning)
            return;
        setGuidedMode(true);
        setGuidedAnchors([]);
        setSelectedAutoIds([]);
        setManualAddMode(false);
        setMapperPreview(false);
        setGuidedStatus(`Tap approximately at the START of ${activeVein.label}.`);
    }
    function cancelGuidedTrace() {
        if (guidedRunning)
            return;
        setGuidedMode(false);
        setGuidedAnchors([]);
        setManualAddMode(true);
        setGuidedStatus("Guided Trace cancelled. Existing annotation was not changed.");
    }
    function handleCanvasPointerDown(clientX, clientY) {
        if (placedTemplate && templateEditMode && !guidedMode)
            return;
        if (!guidedMode) {
            addPoint(clientX, clientY);
            return;
        }
        if (guidedRunning)
            return;
        const point = screenToWing(clientX, clientY);
        if (!point)
            return;
        if (!guidedAnchors.length) {
            setGuidedAnchors([point]);
            setGuidedStatus(`START set for ${activeVein.label}. Now tap approximately at the END of the same vein.`);
            return;
        }
        const start = guidedAnchors[0];
        const end = point;
        if (distance(start, end) < Math.max(10, wingImage.width * .012)) {
            setGuidedStatus("END is too close to START. Tap farther along the same vein — the first anchor is still saved.");
            return;
        }
        const veinId = activeVeinId;
        const veinLabel = activeVein.label;
        setGuidedAnchors([start, end]);
        setGuidedRunning(true);
        setGuidedStatus(`Following visible line evidence from START to END for ${veinLabel}…`);
        window.setTimeout(async () => {
            try {
                const result = await traceBetweenAnchors(wingImage.src, wingImage.width, wingImage.height, start, end);
                setMap((current) => ({ ...current, [veinId]: result.points }));
                setDraftHypotheses((current) => {
                    const next = { ...current };
                    delete next[veinId];
                    return next;
                });
                setGuidedStatus(`${veinLabel} routed with ${result.confidence} image confidence · ${result.points.length} editable control points. Drag any point to correct it.`);
            }
            catch (error) {
                setGuidedStatus(error instanceof Error ? error.message : "Guided Trace could not follow this vein.");
            }
            finally {
                setGuidedRunning(false);
                setGuidedMode(false);
                setGuidedAnchors([]);
                setManualAddMode(true);
            }
        }, 35);
    }
    function moveDraggedPoint(clientX, clientY) {
        if (!dragging)
            return;
        const point = screenToWing(clientX, clientY);
        if (!point)
            return;
        setMap((current) => {
            const nextPoints = [...(current[dragging.veinId] ?? [])];
            nextPoints[dragging.pointIndex] = point;
            return { ...current, [dragging.veinId]: nextPoints };
        });
        setDraftHypotheses((current) => {
            if (!(dragging.veinId in current))
                return current;
            const next = { ...current };
            delete next[dragging.veinId];
            return next;
        });
    }
    function moveTemplateNode(clientX, clientY) {
        if (!templateDraggingNode || templateEditTool !== "drag")
            return;
        const point = screenToWing(clientX, clientY);
        if (!point)
            return;
        if (!templateDragSnapshotTakenRef.current) {
            rememberTemplateState();
            templateDragSnapshotTakenRef.current = true;
        }
        setTemplateNodes((current) => ({ ...current, [templateDraggingNode]: point }));
    }
    function setSelectedPointCurveMode(mode) {
        if (!placedTemplate || !selectedTemplateNodeId) {
            setTemplateStatus("Tap a point first, then choose Smooth, Corner, or Handles.");
            return;
        }
        const path = placedTemplate.paths.find((item) => item.veinId === activeVeinId && item.nodeIds.includes(selectedTemplateNodeId));
        if (!path) {
            setTemplateStatus("Tap the coloured vein first, then select one of its points.");
            return;
        }
        const index = path.nodeIds.indexOf(selectedTemplateNodeId);
        const point = templateNodes[selectedTemplateNodeId];
        if (!point)
            return;
        const previous = index > 0 ? templateNodes[path.nodeIds[index - 1]] : undefined;
        const next = index < path.nodeIds.length - 1 ? templateNodes[path.nodeIds[index + 1]] : undefined;
        const control = mode === "bezier"
            ? {
                mode,
                in: previous ? { dx: (previous.x - point.x) / 3, dy: (previous.y - point.y) / 3 } : undefined,
                out: next ? { dx: (next.x - point.x) / 3, dy: (next.y - point.y) / 3 } : undefined,
            }
            : { mode };
        rememberTemplateState();
        setPlacedTemplate((current) => current ? {
            ...current,
            paths: current.paths.map((item) => item.veinId === path.veinId ? { ...item, curve: { ...(item.curve ?? {}), [selectedTemplateNodeId]: control } } : item),
        } : current);
        setTemplateEditTool("drag");
        setTemplateStatus(mode === "corner"
            ? `${activeVein.label}: this point is now a Corner. The curve cannot overshoot through the junction.`
            : mode === "bezier"
                ? `${activeVein.label}: Bézier handles are active. Drag either little handle to shape the bend without adding more points.`
                : `${activeVein.label}: this point is Smooth again. EntoWing uses a clamped automatic tangent here.`);
    }
    function moveTemplateHandle(clientX, clientY) {
        if (!templateDraggingHandle || !placedTemplate)
            return;
        const point = screenToWing(clientX, clientY);
        const anchor = templateNodes[templateDraggingHandle.nodeId];
        if (!point || !anchor)
            return;
        const vector = { dx: point.x - anchor.x, dy: point.y - anchor.y };
        const { veinId, nodeId, side } = templateDraggingHandle;
        setPlacedTemplate((current) => current ? {
            ...current,
            paths: current.paths.map((path) => {
                if (path.veinId !== veinId)
                    return path;
                const existing = path.curve?.[nodeId] ?? { mode: "bezier" };
                return { ...path, curve: { ...(path.curve ?? {}), [nodeId]: { ...existing, mode: "bezier", [side]: vector } } };
            }),
        } : current);
    }
    function transformPlacedCurveHandles(transform) {
        setPlacedTemplate((current) => current ? {
            ...current,
            paths: current.paths.map((path) => ({
                ...path,
                curve: path.curve ? Object.fromEntries(Object.entries(path.curve).map(([nodeId, control]) => [nodeId, {
                        ...control,
                        in: control.in ? transform(control.in) : undefined,
                        out: control.out ? transform(control.out) : undefined,
                    }])) : undefined,
            })),
        } : current);
    }
    function placeSelectedTemplate() {
        if (!selectedTemplate)
            return;
        const prepared = withSharedJunctionCorners(selectedTemplate);
        const placed = scaleCurveHandles(prepared, templateFitScale(prepared, wingImage.width, wingImage.height));
        setPlacedTemplate(placed);
        setTemplateNodes(fitTemplateNodes(prepared, wingImage.width, wingImage.height));
        setTemplateEditMode(true);
        setTemplateEditTool("drag");
        setSelectedTemplateNodeId(null);
        setTemplateDraggingHandle(null);
        setTemplateJoinNodeId(null);
        setTemplateCrossveinNodeId(null);
        setTemplateUndoStack([]);
        setMapperPreview(false);
        setGuidedMode(false);
        setSelectedAutoIds([]);
        setManualAddMode(false);
        setTemplateStatus(`${selectedTemplate.name} placed. Move/scale/rotate the whole graph, then drag the junction handles onto the specimen.`);
    }
    function chooseTemplateEditTool(tool) {
        setTemplateEditMode(true);
        setMapperPreview(false);
        setManualAddMode(false);
        setTemplateEditTool(tool);
        if (tool !== "join")
            setTemplateJoinNodeId(null);
        if (tool !== "crossvein")
            setTemplateCrossveinNodeId(null);
        if (tool === "drag")
            setTemplateStatus("Drag any template point. Dark points are shared junctions; pale points bend one vein locally.");
        if (tool === "insert")
            setTemplateStatus("Insert point: tap directly on any coloured template vein. A new control point is inserted between its neighbours.");
        if (tool === "delete")
            setTemplateStatus("Delete: choose a vein, then tap its unwanted point. If a vein has only two endpoints, deleting either endpoint removes that vein from this template; points still used by neighbouring veins are preserved.");
        if (tool === "join")
            setTemplateStatus("Join points: tap the first point, then a point on another vein. They become one shared junction.");
        if (tool === "crossvein")
            setTemplateStatus(templateCrossveinLabel.trim()
                ? `Crossvein ${templateCrossveinLabel.trim()}: tap its first endpoint, then a point on another vein. The endpoints will stay separate.`
                : "Name the new crossvein first (for example h, x, or m-cu), then tap its two endpoints.");
    }
    function insertTemplatePoint(path, clientX, clientY) {
        if (!placedTemplate)
            return;
        const point = screenToWing(clientX, clientY);
        if (!point)
            return;
        const pathPoints = path.nodeIds.map((id) => templateNodes[id]).filter((value) => Boolean(value));
        if (pathPoints.length < 2)
            return;
        let bestSegment = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < pathPoints.length - 1; index += 1) {
            const candidateDistance = pointLineDistance(point, pathPoints[index], pathPoints[index + 1]);
            if (candidateDistance < bestDistance) {
                bestDistance = candidateDistance;
                bestSegment = index;
            }
        }
        const nodeId = `edit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const nextNodeIds = [...path.nodeIds];
        nextNodeIds.splice(bestSegment + 1, 0, nodeId);
        rememberTemplateState();
        setTemplateNodes((current) => ({ ...current, [nodeId]: point }));
        setPlacedTemplate((current) => current ? { ...current, paths: current.paths.map((item) => item.veinId === path.veinId ? { ...item, nodeIds: nextNodeIds } : item) } : current);
        setActiveVeinId(path.veinId);
        setTemplateStatus(`Added a new control point to ${path.veinId}. Switch to Drag and pull it onto the exact bend.`);
    }
    function deleteTemplatePoint(nodeId) {
        if (!placedTemplate)
            return;
        const owners = placedTemplate.paths.filter((path) => path.nodeIds.includes(nodeId));
        const owner = owners.find((path) => path.veinId === activeVeinId) ?? (owners.length === 1 ? owners[0] : null);
        if (!owner) {
            setTemplateStatus(`This is a shared junction used by ${owners.map((path) => path.veinId).join(", ")}. Tap the vein you want to edit first, then tap the junction again.`);
            return;
        }
        if (owner.nodeIds.length <= 2) {
            rememberTemplateState();
            const nextPaths = placedTemplate.paths.filter((path) => path.veinId !== owner.veinId);
            const referencedNodeIds = new Set(nextPaths.flatMap((path) => path.nodeIds));
            const nextNodes = Object.fromEntries(Object.entries(templateNodes).filter(([id]) => referencedNodeIds.has(id)));
            const remainingOwner = nextPaths.find((path) => path.nodeIds.includes(nodeId));
            setPlacedTemplate({ ...placedTemplate, paths: nextPaths });
            setTemplateNodes(nextNodes);
            if (!presets.some((vein) => vein.id === owner.veinId)) {
                setCustomVeins((current) => current.filter((vein) => vein.id !== owner.veinId));
            }
            if (remainingOwner)
                setActiveVeinId(remainingOwner.veinId);
            else if (nextPaths.length)
                setActiveVeinId(nextPaths[0].veinId);
            setTemplateJoinNodeId(null);
            setTemplateCrossveinNodeId(null);
            setTemplateStatus(`${owner.veinId} removed from this template because it only had two endpoints.${remainingOwner ? ` This junction is still used by ${remainingOwner.veinId}; tap it again if you also want to remove that control point.` : ""} Undo will restore it.`);
            return;
        }
        rememberTemplateState();
        const nextPaths = placedTemplate.paths.map((path) => path.veinId === owner.veinId ? { ...path, nodeIds: path.nodeIds.filter((id) => id !== nodeId) } : path);
        setPlacedTemplate({ ...placedTemplate, paths: nextPaths });
        if (!nextPaths.some((path) => path.nodeIds.includes(nodeId))) {
            setTemplateNodes((current) => { const next = { ...current }; delete next[nodeId]; return next; });
        }
        setTemplateStatus(`${nodeId && owners.length > 1 ? "Detached" : "Deleted"} point from ${owner.veinId}. The rest of the vein stays connected.`);
    }
    function joinTemplatePoint(nodeId) {
        if (!placedTemplate)
            return;
        if (!templateJoinNodeId) {
            setTemplateJoinNodeId(nodeId);
            setTemplateStatus("First point selected. Now tap the point on another vein that this one should join.");
            return;
        }
        if (templateJoinNodeId === nodeId) {
            setTemplateJoinNodeId(null);
            setTemplateStatus("Join cancelled. Choose two different points.");
            return;
        }
        const samePath = placedTemplate.paths.some((path) => path.nodeIds.includes(templateJoinNodeId) && path.nodeIds.includes(nodeId));
        if (samePath) {
            setTemplateStatus("Those points already belong to the same vein. Choose a point on another vein to create a junction.");
            return;
        }
        const sourceId = templateJoinNodeId;
        rememberTemplateState();
        const nextPaths = placedTemplate.paths.map((path) => {
            const replaced = path.nodeIds.map((id) => id === sourceId ? nodeId : id);
            return { ...path, nodeIds: replaced.filter((id, index) => index === 0 || id !== replaced[index - 1]) };
        });
        setPlacedTemplate({ ...placedTemplate, paths: nextPaths });
        setTemplateNodes((current) => { const next = { ...current }; delete next[sourceId]; return next; });
        setTemplateJoinNodeId(null);
        setTemplateEditTool("drag");
        setTemplateStatus("Junction created. The connected veins now share this point; dragging it moves the connection together.");
    }
    function createCrossveinToPoint(nodeId) {
        if (!placedTemplate)
            return;
        const label = templateCrossveinLabel.trim();
        if (!label) {
            setTemplateStatus("Give the new crossvein a name first, then tap its two endpoint points.");
            return;
        }
        if (!templateCrossveinNodeId) {
            setTemplateCrossveinNodeId(nodeId);
            setTemplateStatus(`First endpoint selected for ${label}. Now tap its endpoint on the other vein.`);
            return;
        }
        if (templateCrossveinNodeId === nodeId) {
            setTemplateCrossveinNodeId(null);
            setTemplateStatus(`First endpoint for ${label} cleared. Choose two different points.`);
            return;
        }
        const sourceId = templateCrossveinNodeId;
        const sourceOwners = placedTemplate.paths.filter((path) => path.nodeIds.includes(sourceId)).map((path) => path.veinId);
        const targetOwners = placedTemplate.paths.filter((path) => path.nodeIds.includes(nodeId)).map((path) => path.veinId);
        if (sourceOwners.some((owner) => targetOwners.includes(owner))) {
            setTemplateStatus("Those two points already belong to the same vein. Choose endpoints on two different veins for a crossvein.");
            return;
        }
        const knownDefinition = allVeins.find((vein) => vein.id.toLowerCase() === label.toLowerCase() || vein.label.toLowerCase() === label.toLowerCase());
        const base = knownDefinition?.id ?? (label.replace(/[^a-zA-Z0-9+_-]/g, "-") || "crossvein");
        let id = base;
        let suffix = 2;
        while (placedTemplate.paths.some((path) => path.veinId === id) || (!knownDefinition && allVeins.some((vein) => vein.id === id))) {
            id = `${base}-${suffix}`;
            suffix += 1;
        }
        const newVein = knownDefinition ? null : {
            id,
            label,
            fullName: `${label} · user-defined crossvein`,
            symbolMeaning: `${label} = user-defined crossvein`,
            plainMeaning: "a user-added transverse vein connecting two existing veins",
            group: "crossvein",
            color: "#b76f4e",
            note: "Added manually from this specimen. Verify its homology and name against the nomenclature used for your taxon.",
        };
        rememberTemplateState();
        if (newVein)
            setCustomVeins((current) => [...current, newVein]);
        setPlacedTemplate({ ...placedTemplate, paths: [...placedTemplate.paths, { veinId: id, nodeIds: [sourceId, nodeId] }] });
        setActiveVeinId(id);
        setTemplateCrossveinNodeId(null);
        setTemplateCrossveinLabel("");
        setTemplateEditTool("drag");
        setTemplateStatus(`Crossvein ${label} created. Its endpoints stay on their original veins instead of being merged; it will be included when you export this template.`);
    }
    function shiftTemplate(dx, dy) {
        rememberTemplateState();
        setTemplateNodes((current) => Object.fromEntries(Object.entries(current).map(([id, point]) => [id, { x: point.x + dx, y: point.y + dy }])));
    }
    function scaleTemplate(factor) {
        rememberTemplateState();
        setTemplateNodes((current) => transformTemplateNodes(current, (point, center) => ({
            x: center.x + (point.x - center.x) * factor,
            y: center.y + (point.y - center.y) * factor,
        })));
        transformPlacedCurveHandles((handle) => ({ dx: handle.dx * factor, dy: handle.dy * factor }));
    }
    function rotateTemplate(degrees) {
        rememberTemplateState();
        const radians = degrees * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        setTemplateNodes((current) => transformTemplateNodes(current, (point, center) => {
            const dx = point.x - center.x;
            const dy = point.y - center.y;
            return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
        }));
        transformPlacedCurveHandles((handle) => ({ dx: handle.dx * cos - handle.dy * sin, dy: handle.dx * sin + handle.dy * cos }));
    }
    function mirrorTemplate() {
        rememberTemplateState();
        setTemplateNodes((current) => transformTemplateNodes(current, (point, center) => ({ x: center.x - (point.x - center.x), y: point.y })));
        transformPlacedCurveHandles((handle) => ({ dx: -handle.dx, dy: handle.dy }));
    }
    function resetTemplateFit() {
        if (!placedTemplate)
            return;
        rememberTemplateState();
        setTemplateNodes(fitTemplateNodes(placedTemplate, wingImage.width, wingImage.height));
        setTemplateEditTool("drag");
        setTemplateJoinNodeId(null);
        setTemplateCrossveinNodeId(null);
        setTemplateStatus("Template fit reset. Use Undo if you want the previous fit back.");
    }
    function applyTemplateToMap() {
        if (!placedTemplate)
            return;
        const pathsToAdd = placedTemplate.paths.filter((path) => (map[path.veinId]?.length ?? 0) < 2);
        setMap((current) => {
            const next = { ...current };
            pathsToAdd.forEach((path) => {
                if ((current[path.veinId]?.length ?? 0) >= 2)
                    return;
                const points = path.nodeIds.map((id) => templateNodes[id]).filter((point) => Boolean(point));
                if (points.length >= 2) {
                    next[path.veinId] = points;
                }
            });
            return next;
        });
        setTemplateEditMode(false);
        setManualAddMode(true);
        setTemplateStatus(`Template transferred to ${pathsToAdd.length} empty annotation paths. Existing manual veins were preserved. Edit any control point, or magnetically refine one vein at a time.`);
    }
    async function magneticFitActiveTemplateVein() {
        if (!placedTemplate || !wingImage.isLocal || templateMagneticRunning) {
            if (!wingImage.isLocal)
                setTemplateStatus("Magnetic fitting needs a photo loaded from your device; template placement itself still works on the reference plate.");
            return;
        }
        const path = placedTemplate.paths.find((item) => item.veinId === activeVeinId);
        if (!path) {
            setTemplateStatus(`${activeVein.label} is not present in this template. Choose a mapped template vein first.`);
            return;
        }
        const anchors = path.nodeIds.map((id) => templateNodes[id]).filter((point) => Boolean(point));
        if (anchors.length < 2)
            return;
        setTemplateMagneticRunning(true);
        setTemplateStatus(`Following local image evidence around the ${activeVein.label} template corridor…`);
        try {
            const routed = [];
            const confidenceScores = [];
            for (let index = 1; index < anchors.length; index += 1) {
                const result = await traceBetweenAnchors(wingImage.src, wingImage.width, wingImage.height, anchors[index - 1], anchors[index]);
                confidenceScores.push(result.score);
                routed.push(...(index === 1 ? result.points : result.points.slice(1)));
            }
            const points = simplifyPoints(routed, Math.max(1.1, wingImage.width / 650));
            setMap((current) => ({ ...current, [activeVeinId]: points }));
            setDraftHypotheses((current) => { const next = { ...current }; delete next[activeVeinId]; return next; });
            const mean = confidenceScores.reduce((sum, score) => sum + score, 0) / Math.max(1, confidenceScores.length);
            setTemplateStatus(`${activeVein.label} magnetically refined near its template path · ${Math.round(mean * 100)}% local image score · ${points.length} editable points.`);
            setTemplateEditMode(false);
            setManualAddMode(true);
        }
        catch (error) {
            setTemplateStatus(error instanceof Error ? error.message : "Magnetic fitting could not follow this template vein.");
        }
        finally {
            setTemplateMagneticRunning(false);
        }
    }
    function loadTemplateMap(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const payload = JSON.parse(String(reader.result));
                if (payload?.schema === "entowing-template/1.0" && payload?.nodes && Array.isArray(payload?.paths)) {
                    const nodes = {};
                    Object.entries(payload.nodes).forEach(([id, point]) => {
                        const x = Number(point?.x);
                        const y = Number(point?.y);
                        if (Number.isFinite(x) && Number.isFinite(y))
                            nodes[id] = { x, y };
                    });
                    const paths = payload.paths.flatMap((path) => {
                        if (typeof path?.veinId !== "string" || !Array.isArray(path.nodeIds))
                            return [];
                        const nodeIds = path.nodeIds.filter((id) => typeof id === "string" && Boolean(nodes[id]));
                        const veinId = path.veinId === "Cu1" ? "m-cu" : path.veinId;
                        return nodeIds.length >= 2 ? [{ veinId, nodeIds, curve: readCurveControls(path.curve, nodeIds) }] : [];
                    });
                    if (!paths.length)
                        throw new Error("This EntoWing template does not contain reusable vein paths.");
                    const importedDefinitions = Array.isArray(payload.veins) ? payload.veins : [];
                    importedDefinitions.forEach((vein) => {
                        if (vein.id === "Cu1")
                            return;
                        if (!vein.id || presets.some((preset) => preset.id === vein.id))
                            return;
                        setCustomVeins((current) => current.some((item) => item.id === vein.id) ? current : [...current, {
                                id: vein.id,
                                label: vein.label || vein.id,
                                fullName: vein.fullName || "Imported custom structure",
                                symbolMeaning: vein.symbolMeaning || `${vein.id} · imported label`,
                                plainMeaning: vein.plainMeaning || "custom structure imported from a reviewed EntoWing template",
                                group: vein.group || "custom",
                                color: vein.color || "#7b6f5d",
                                note: vein.note || "Imported from a user-reviewed EntoWing template; verify terminology against its source.",
                            }]);
                    });
                    const template = {
                        id: `custom-${Date.now()}`,
                        name: String(payload.name || file.name.replace(/\.entowing-template\.json$|\.json$/i, "")),
                        taxon: String(payload.taxon || "User-supplied EntoWing template"),
                        note: String(payload.note || "Portable reviewed template. Shared junctions and editable control points are preserved."),
                        referenceSize: Number(payload?.sourceImage?.width) > 0 && Number(payload?.sourceImage?.height) > 0
                            ? { width: Number(payload.sourceImage.width), height: Number(payload.sourceImage.height) }
                            : undefined,
                        nodes,
                        paths,
                    };
                    persistCustomTemplate(template);
                    setSelectedTemplateId(template.id);
                    setTemplateStatus(`${template.name} imported with ${paths.length} paths and its shared topology intact. Press “Place template” to use it.`);
                    return;
                }
                if (!Array.isArray(payload?.veins) || !payload.veins.length)
                    throw new Error("This JSON does not contain EntoWing vein paths.");
                const nodes = {};
                const paths = [];
                payload.veins.forEach((vein, veinIndex) => {
                    if (!Array.isArray(vein.points) || vein.points.length < 2 || !vein.id)
                        return;
                    const nodeIds = vein.points.map((point, pointIndex) => {
                        const nodeId = `import-${veinIndex}-${pointIndex}`;
                        nodes[nodeId] = { x: Number(point.x), y: Number(point.y) };
                        return nodeId;
                    });
                    const modernVeinId = vein.id === "Cu1" ? "m-cu" : vein.id;
                    paths.push({ veinId: modernVeinId, nodeIds });
                    if (!presets.some((preset) => preset.id === modernVeinId)) {
                        setCustomVeins((current) => current.some((item) => item.id === modernVeinId) ? current : [...current, {
                                id: modernVeinId,
                                label: vein.label || modernVeinId,
                                fullName: vein.fullName || "Imported custom structure",
                                symbolMeaning: vein.symbolMeaning || `${modernVeinId} · imported label`,
                                plainMeaning: vein.plainMeaning || "custom structure imported from a previous EntoWing map",
                                group: vein.group || "custom",
                                color: vein.color || "#7b6f5d",
                                note: vein.note || "Imported from a user-reviewed EntoWing map; verify terminology against its original source.",
                            }]);
                    }
                });
                if (!paths.length)
                    throw new Error("No reusable vein paths were found in this map.");
                const template = { id: `custom-${Date.now()}`, name: file.name.replace(/\.entowing\.json$|\.json$/i, ""), taxon: "Your reusable EntoWing map", note: "Imported from a previous annotation. Its labels and homologies are preserved as user-supplied data.", nodes, paths };
                persistCustomTemplate(template);
                setSelectedTemplateId(template.id);
                setTemplateStatus(`${template.name} added to the template library. Press “Place template” to fit it over this wing.`);
            }
            catch (error) {
                setTemplateStatus(error instanceof Error ? error.message : "Could not read this template map.");
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    }
    function loadImage(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            const src = String(reader.result);
            const img = new Image();
            img.onload = () => {
                setWingImage({ src, name: file.name, width: img.naturalWidth, height: img.naturalHeight, isLocal: true });
                setCanvasView({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
                touchPointersRef.current.clear();
                touchTapRef.current.clear();
                pinchStartRef.current = null;
                setMap({});
                setSelectedVeinId(null);
                setMapperPreview(false);
                setAutoCandidates([]);
                setSelectedAutoIds([]);
                setManualAddMode(true);
                setGuidedMode(false);
                setGuidedAnchors([]);
                setGuidedRunning(false);
                setGuidedStatus("Choose a vein, then place two anchors for Guided Trace.");
                setDraftHypotheses({});
                setPlacedTemplate(null);
                setTemplateNodes({});
                setTemplateUndoStack([]);
                setTemplateEditMode(true);
                setTemplateDraggingNode(null);
                setTemplateStatus("Photo ready. Choose a template and place its shared junctions over the specimen.");
                setWholeDraftStatus("Ready to propose a rough whole-wing topology.");
                setAutoStatus("Ready to make an automatic SVG draft.");
                setMode("mapper");
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
        event.target.value = "";
    }
    function resetToReference() {
        setWingImage({ src: referenceImage, name: "Eristalis-reference.jpg", width: 560, height: 246, isLocal: false });
        setSelectedTemplateId("eristalis-reviewed");
        setCanvasView({ x: 0, y: 0, width: 560, height: 246 });
        touchPointersRef.current.clear();
        touchTapRef.current.clear();
        pinchStartRef.current = null;
        setMap({});
        setSelectedVeinId(null);
        setMapperPreview(false);
        setAutoCandidates([]);
        setSelectedAutoIds([]);
        setManualAddMode(true);
        setGuidedMode(false);
        setGuidedAnchors([]);
        setGuidedRunning(false);
        setGuidedStatus("Guided Trace works on photos you load from your device.");
        setDraftHypotheses({});
        setPlacedTemplate(null);
        setTemplateNodes({});
        setTemplateUndoStack([]);
        setTemplateEditMode(true);
        setTemplateDraggingNode(null);
        setTemplateStatus("Choose an anatomical archetype, place it over the reference, then drag shared junctions into position.");
        setWholeDraftStatus("Whole-wing draft works on photos you load from your device.");
        setAutoStatus("Auto Trace works on photos you load from your device.");
        setMode("mapper");
    }
    function runAutoTrace() {
        if (!wingImage.isLocal || autoRunning || wholeDraftRunning) {
            if (!wingImage.isLocal)
                setAutoStatus("Load your own JPG, PNG or WEBP first — the reference plate stays read-only for Auto Trace.");
            return;
        }
        setAutoRunning(true);
        setSelectedAutoIds([]);
        setManualAddMode(false);
        setGuidedMode(false);
        setGuidedAnchors([]);
        setAutoStatus("Looking for dark linear structures…");
        window.setTimeout(async () => {
            try {
                const candidates = await makeAutoTrace(wingImage.src, wingImage.width, wingImage.height, autoSensitivity);
                setAutoCandidates(candidates);
                setAutoStatus(candidates.length ? `${candidates.length} SVG draft pieces found. Click every piece that belongs to one vein, then join them.` : "No stable line segments found. Try higher sensitivity or a higher-contrast wing image.");
            }
            catch (error) {
                setAutoCandidates([]);
                setAutoStatus(error instanceof Error ? error.message : "Auto Trace could not process this image.");
            }
            finally {
                setAutoRunning(false);
            }
        }, 40);
    }
    function runWholeWingDraft() {
        if (!wingImage.isLocal || wholeDraftRunning) {
            if (!wingImage.isLocal)
                setWholeDraftStatus("Load your own wing photo first. Whole-wing reconstruction needs local pixel access.");
            return;
        }
        setWholeDraftRunning(true);
        setSelectedAutoIds([]);
        setGuidedMode(false);
        setGuidedAnchors([]);
        setMapperPreview(false);
        setManualAddMode(false);
        setWholeDraftStatus("Detecting the network, grouping likely continuations, and proposing vein identities…");
        window.setTimeout(async () => {
            try {
                const candidates = await makeAutoTrace(wingImage.src, wingImage.width, wingImage.height, autoSensitivity);
                const draft = approximateWholeWingDraft(candidates, wingImage.width, wingImage.height, anteriorAtTop, baseSide);
                const applied = draft.assignments.filter((assignment) => (map[assignment.veinId]?.length ?? 0) < 2);
                setMap((current) => {
                    const next = { ...current };
                    applied.forEach((assignment) => { next[assignment.veinId] = assignment.points; });
                    return next;
                });
                setDraftHypotheses((current) => ({ ...current, ...Object.fromEntries(applied.map((assignment) => [assignment.veinId, assignment.confidence])) }));
                setAutoCandidates(draft.leftovers);
                if (applied[0])
                    setActiveVeinId(applied[0].veinId);
                setWholeDraftStatus(applied.length ? `${applied.length} editable vein hypotheses placed. ≈ means “machine suggestion”: drag a point or retrace a vein to mark it as reviewed. ${draft.leftovers.length} unassigned fragments remain available.` : "No new stable vein hypotheses could be placed. Try higher sensitivity or check the wing orientation controls.");
                setManualAddMode(true);
            }
            catch (error) {
                setWholeDraftStatus(error instanceof Error ? error.message : "Whole-wing reconstruction could not process this image.");
                setManualAddMode(true);
            }
            finally {
                setWholeDraftRunning(false);
            }
        }, 40);
    }
    function toggleAutoCandidate(id) {
        setSelectedAutoIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
        setMapperPreview(false);
    }
    function growAutoSelection() {
        if (!selectedAutoIds.length)
            return;
        const grown = growCandidateSelection(selectedAutoIds, autoCandidates, Math.max(8, wingImage.width * .022));
        setSelectedAutoIds(grown);
        setAutoStatus(grown.length > selectedAutoIds.length ? `Extended selection from ${selectedAutoIds.length} to ${grown.length} likely continuation pieces. Tap any wrong piece to remove it.` : "No confident continuation found. Select the next piece manually.");
    }
    function acceptAutoCandidates() {
        const selected = autoCandidates.filter((item) => selectedAutoIds.includes(item.id));
        if (!selected.length)
            return;
        const stitched = stitchCandidates(selected);
        setMap((current) => ({ ...current, [activeVeinId]: stitched }));
        setDraftHypotheses((current) => {
            const next = { ...current };
            delete next[activeVeinId];
            return next;
        });
        setAutoCandidates((current) => current.filter((item) => !selectedAutoIds.includes(item.id)));
        if (autoCandidates.length === selected.length)
            setManualAddMode(true);
        setSelectedAutoIds([]);
        setMapperPreview(false);
        setAutoStatus(`${selected.length} draft ${selected.length === 1 ? "piece" : "pieces"} joined as ${activeVein.label}. Every control point can now be dragged.`);
    }
    function discardAutoCandidates() {
        if (!selectedAutoIds.length)
            return;
        if (autoCandidates.length === selectedAutoIds.length)
            setManualAddMode(true);
        setAutoCandidates((current) => current.filter((item) => !selectedAutoIds.includes(item.id)));
        setSelectedAutoIds([]);
    }
    function undoPoint() {
        setMap((current) => ({ ...current, [activeVeinId]: (current[activeVeinId] ?? []).slice(0, -1) }));
    }
    function clearVein() {
        setMap((current) => ({ ...current, [activeVeinId]: [] }));
        setDraftHypotheses((current) => {
            const next = { ...current };
            delete next[activeVeinId];
            return next;
        });
    }
    function finishVein() {
        const currentIndex = allVeins.findIndex((vein) => vein.id === activeVeinId);
        const following = [...allVeins.slice(currentIndex + 1), ...allVeins.slice(0, currentIndex)].find((vein) => (map[vein.id]?.length ?? 0) < 2);
        if (following)
            setActiveVeinId(following.id);
    }
    function addCustomVein() {
        const trimmed = customName.trim();
        if (!trimmed)
            return;
        const base = trimmed.replace(/[^a-zA-Z0-9+_-]/g, "-") || "custom";
        let id = base;
        let suffix = 2;
        while (allVeins.some((vein) => vein.id === id)) {
            id = `${base}-${suffix}`;
            suffix += 1;
        }
        const newVein = { id, label: trimmed, fullName: trimmed, symbolMeaning: `${trimmed} = custom structure`, plainMeaning: "a user-defined structure", group: "custom", color: "#526a58", note: "Custom structure annotated on this specimen." };
        setCustomVeins((current) => [...current, newVein]);
        setActiveVeinId(id);
        setCustomName("");
    }
    function enterAtlas() {
        setMapperPreview(false);
        setSelectedVeinId(mappedVeins[0]?.id ?? null);
        setMode("atlas");
    }
    function enterLearn() {
        const first = mappedVeins[0];
        setMode("learn");
        setSelectedVeinId(null);
        if (first) {
            setQuizTarget(first.id);
            setQuizMessage(`Find ${first.label} on the wing.`);
        }
        else {
            setQuizTarget(null);
            setQuizMessage("Map at least two veins to start a quiz.");
        }
    }
    function chooseAtlasVein(id) {
        if (mode === "learn" && quizTarget) {
            if (id === quizTarget) {
                const alternatives = mappedVeins.filter((vein) => vein.id !== id);
                const next = alternatives.length ? alternatives[Math.floor(Math.random() * alternatives.length)] : mappedVeins[0];
                setQuizTarget(next?.id ?? null);
                setQuizMessage(next ? `Correct! Now find ${next.label}.` : `Correct — ${id}.`);
            }
            else {
                setQuizMessage(`That was ${id}. Try again: find ${quizTarget}.`);
            }
            return;
        }
        setSelectedVeinId(id);
    }
    function exportJson() {
        const payload = {
            schema: "entowing-wing-map/0.2",
            image: { fileName: wingImage.name, width: wingImage.width, height: wingImage.height },
            veins: mappedVeins.map((vein) => ({ ...vein, points: map[vein.id], path: smoothPath(map[vein.id]) })),
        };
        downloadText(`${wingImage.name.replace(/\.[^.]+$/, "") || "wing"}.entowing.json`, JSON.stringify(payload, null, 2), "application/json");
    }
    function exportSvg() {
        const paths = mappedVeins.map((vein) => `  <path id="${escapeXml(vein.id)}" data-label="${escapeXml(vein.label)}" d="${smoothPath(map[vein.id])}" fill="none" stroke="${vein.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join("\n");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wingImage.width} ${wingImage.height}" width="${wingImage.width}" height="${wingImage.height}">\n  <image href="${escapeXml(wingImage.src)}" x="0" y="0" width="${wingImage.width}" height="${wingImage.height}"/>\n  <g id="entowing-venation">\n${paths}\n  </g>\n</svg>`;
        downloadText(`${wingImage.name.replace(/\.[^.]+$/, "") || "wing"}-annotated.svg`, svg, "image/svg+xml");
    }
    function openFamilyWingInMapper(familyId, familyWing) {
        // Use the exact morphotype selected in the atlas. v0.34 forced every Syrphidae
        // selection back to Eristalis here, which defeated the new family variation.
        const source = {
            ...familyWing,
            paths: familyWing.paths.map((path) => ({ ...path, veinId: path.veinId === "vena spuria" ? "sv" : path.veinId, nodeIds: [...path.nodeIds] })),
            nodes: Object.fromEntries(Object.entries(familyWing.nodes).map(([id, point]) => [id, { ...point }])),
        };
        const prepared = withSharedJunctionCorners(source);
        if (familyId !== "syrphidae" || familyWing.morphotypeId !== "eristalis")
            persistCustomTemplate(prepared);
        setSelectedTemplateId(prepared.id);
        setPlacedTemplate(prepared);
        setTemplateNodes(fitTemplateNodes(prepared, wingImage.width, wingImage.height));
        setActiveVeinId(prepared.paths[0]?.veinId ?? "R4+5");
        setSelectedTemplateNodeId(null);
        setTemplateEditTool("drag");
        setTemplateEditMode(true);
        setTemplateUndoStack([]);
        setTemplateStatus(`${prepared.name} loaded from the evolutionary atlas. Upload a matching specimen or edit this working morphotype directly.`);
        setMapperPreview(false);
        setMode("mapper");
        window.setTimeout(() => document.querySelector(".mapper-shell")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
    return (_jsxs("main", { className: "atlas-shell", "data-visual-theme": visualTheme, children: [_jsxs("header", { className: "topbar", children: [_jsxs("button", { className: "brand brand-button", onClick: () => setMode("atlas"), "aria-label": "EntoWing atlas home", children: [_jsx("span", { className: "brand-mark", "aria-hidden": "true", children: "EW" }), _jsxs("span", { children: [_jsx("strong", { children: "EntoWing" }), _jsx("small", { children: "Interactive Diptera Wing Atlas" })] })] }), _jsxs("nav", { className: "nav-pills", "aria-label": "EntoWing modes", children: [_jsx("button", { className: mode === "atlas" ? "active" : "", onClick: enterAtlas, children: "Atlas" }), _jsx("button", { className: mode === "mapper" ? "active" : "", onClick: () => setMode("mapper"), children: "Wing Mapper" }), _jsx("button", { className: mode === "learn" ? "active" : "", onClick: enterLearn, children: "Learn" }), _jsxs("button", { className: "soft-disabled", title: "Planned next", children: ["Compare ", _jsx("sup", { children: "soon" })] })] }), _jsxs("div", { className: "topbar-meta", children: [_jsxs("div", { className: "theme-toggle", role: "group", "aria-label": "Atlas visual theme", children: [_jsxs("button", { type: "button", className: visualTheme === "scientific" ? "active" : "", "aria-pressed": visualTheme === "scientific", onClick: () => setVisualTheme("scientific"), children: [_jsx("span", { "aria-hidden": "true", children: "\u2301" }), " Scientific"] }), _jsxs("button", { type: "button", className: visualTheme === "nocturnal" ? "active" : "", "aria-pressed": visualTheme === "nocturnal", onClick: () => setVisualTheme("nocturnal"), children: [_jsx("span", { "aria-hidden": "true", children: "\u2726" }), " Nocturnal"] })] }), _jsx("div", { className: "version-chip", children: "Research atlas \u00B7 v0.35" })] })] }), mode === "atlas" ? (_jsx(PhyloAtlas, { onOpenMapper: openFamilyWingInMapper })) : mode === "mapper" ? (_jsxs(_Fragment, { children: [_jsxs("section", { className: "intro mapper-intro", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "WING MAPPER \u00B7 SPECIMEN-TRUE OVERLAYS" }), _jsx("h1", { children: "Trace what is really there." })] }), _jsx("p", { className: "intro-copy", children: "Align a topology-aware wing template to the real specimen, warp shared junctions, then refine individual veins from the photograph. Anatomy guides the pixels \u2014 not the other way around." })] }), _jsxs("section", { className: "mapper-shell", "aria-label": "Wing annotation editor", children: [_jsxs("aside", { className: "mapper-sidebar mapper-preflight", id: "mapper-setup", children: [_jsxs("div", { className: "mapper-setup-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "tool-kicker", children: "SETUP & TRACE" }), _jsx("strong", { children: "Prepare the wing once." }), _jsx("p", { children: "Load, place a template, and trace here. When you are ready to refine the venation, scroll down \u2014 this whole setup area stays behind." })] }), _jsx("a", { href: "#wing-workspace", children: "WORKSPACE \u2193" })] }), _jsxs("div", { className: "mapper-side-section image-source", children: [_jsx("span", { className: "tool-kicker", children: "01 \u00B7 IMAGE" }), _jsxs("label", { className: "primary-upload", children: [_jsx("input", { type: "file", accept: "image/png,image/jpeg,image/webp", onChange: loadImage }), _jsx("span", { className: "upload-icon", children: "\uFF0B" }), _jsxs("span", { children: [_jsx("strong", { children: "Load wing photo" }), _jsx("small", { children: "JPG \u00B7 PNG \u00B7 WEBP" })] })] }), _jsx("button", { className: "text-button", onClick: resetToReference, children: "Use Eristalis reference plate" }), _jsxs("div", { className: "template-card", children: [_jsxs("div", { className: "template-title", children: [_jsx("span", { children: "TEMPLATE MAPPER \u00B7 v0.18" }), _jsx("b", { children: "2023 NOMENCLATURE" })] }), _jsx("p", { children: "Start from known wing topology instead of asking pixels to invent anatomy. Align the graph first; refine the specimen second." }), _jsxs("label", { className: "template-select-label", children: [_jsx("span", { children: "Alignment archetype" }), _jsxs("select", { value: selectedTemplateId, onChange: (event) => setSelectedTemplateId(event.target.value), children: [_jsx("optgroup", { label: "Built-in templates", children: builtInTemplates.map((template) => _jsx("option", { value: template.id, children: template.name }, template.id)) }), !!customTemplates.length && _jsx("optgroup", { label: "My Templates \u00B7 this device", children: customTemplates.map((template) => _jsx("option", { value: template.id, children: template.name }, template.id)) })] })] }), _jsxs("div", { className: "template-meta", children: [_jsx("strong", { children: selectedTemplate.taxon }), _jsx("span", { children: selectedTemplate.note })] }), _jsx("button", { className: "template-place-button", onClick: placeSelectedTemplate, children: "\u25C7 Place template over wing" }), _jsxs("label", { className: "template-import", children: [_jsx("input", { type: "file", accept: "application/json,.json", onChange: loadTemplateMap }), "\uFF0B Import .entowing-template.json or map"] }), placedTemplate && _jsxs("div", { className: "template-controls", children: [_jsxs("div", { className: "template-control-title", children: [_jsxs("span", { children: ["ALIGN \u00B7 ", placedTemplate.name] }), _jsx("b", { children: templateEditMode ? "JUNCTION EDIT" : "ANNOTATION EDIT" })] }), _jsxs("div", { className: "template-nudge", "aria-label": "Template alignment controls", children: [_jsx("button", { "aria-label": "Move template left", onClick: () => shiftTemplate(-wingImage.width * .02, 0), children: "\u2190" }), _jsx("button", { "aria-label": "Move template up", onClick: () => shiftTemplate(0, -wingImage.height * .035), children: "\u2191" }), _jsx("button", { "aria-label": "Move template down", onClick: () => shiftTemplate(0, wingImage.height * .035), children: "\u2193" }), _jsx("button", { "aria-label": "Move template right", onClick: () => shiftTemplate(wingImage.width * .02, 0), children: "\u2192" }), _jsx("button", { "aria-label": "Scale template down", onClick: () => scaleTemplate(.94), children: "\u2212 size" }), _jsx("button", { "aria-label": "Scale template up", onClick: () => scaleTemplate(1.06), children: "\uFF0B size" }), _jsx("button", { "aria-label": "Rotate template counter-clockwise", onClick: () => rotateTemplate(-2), children: "\u21B6 2\u00B0" }), _jsx("button", { "aria-label": "Rotate template clockwise", onClick: () => rotateTemplate(2), children: "\u21B7 2\u00B0" })] }), _jsxs("div", { className: "template-secondary-actions", children: [_jsx("button", { onClick: mirrorTemplate, children: "\u21CB Mirror" }), _jsx("button", { onClick: resetTemplateFit, children: "Reset fit" })] }), _jsxs("label", { className: "template-opacity", children: [_jsx("span", { children: "Overlay opacity" }), _jsx("input", { type: "range", min: "20", max: "100", value: Math.round(templateOpacity * 100), onChange: (event) => setTemplateOpacity(Number(event.target.value) / 100) })] }), _jsxs("div", { className: "template-point-editor", children: [_jsxs("div", { className: "point-editor-title", children: [_jsx("span", { children: "POINT EDITOR" }), _jsx("b", { children: activeVein.label })] }), _jsxs("div", { className: "point-tool-grid", children: [_jsx("button", { className: templateEditTool === "drag" ? "active" : "", onClick: () => chooseTemplateEditTool("drag"), children: "\u2194 Drag" }), _jsx("button", { className: templateEditTool === "insert" ? "active" : "", onClick: () => chooseTemplateEditTool("insert"), children: "\uFF0B Insert" }), _jsx("button", { className: templateEditTool === "delete" ? "active" : "", onClick: () => chooseTemplateEditTool("delete"), children: "\u2212 Delete" }), _jsx("button", { className: templateEditTool === "join" ? "active" : "", onClick: () => chooseTemplateEditTool("join"), children: "\u2301 Join" })] }), _jsx("small", { children: templateEditTool === "drag" ? "Drag any dot to shape the vein." : templateEditTool === "insert" ? "Tap a coloured vein to add a bend point." : templateEditTool === "delete" ? "Tap an unwanted point. A 2-endpoint vein is removed as a whole; shared nodes stay on neighbouring veins." : templateJoinNodeId ? "1/2 selected · tap the point it should connect to." : "Tap two points on different veins to connect them." })] }), _jsx("button", { className: `template-warp-button ${templateEditMode ? "active" : ""}`, onClick: () => { const next = !templateEditMode; setTemplateEditMode(next); setManualAddMode(!next); setTemplateEditTool("drag"); setTemplateJoinNodeId(null); setTemplateCrossveinNodeId(null); }, children: templateEditMode ? "◇ Editing template points" : "✎ Editing final annotation" }), _jsx("button", { className: "template-apply-button", onClick: applyTemplateToMap, children: "Use aligned template as annotation" }), _jsx("button", { className: "template-magnet-button", disabled: !wingImage.isLocal || templateMagneticRunning, onClick: magneticFitActiveTemplateVein, children: templateMagneticRunning ? "Following the photograph…" : `⌁ Magnetic fit selected ${activeVein.label}` })] }), _jsxs("div", { className: "template-save-box", children: [_jsx("span", { children: "SAVE / SHARE YOUR TRACING" }), _jsxs("div", { children: [_jsx("input", { value: templateSaveName, onChange: (event) => setTemplateSaveName(event.target.value), placeholder: "Template name\u2026", "aria-label": "Template name" }), _jsx("button", { onClick: saveTracingAsTemplate, disabled: !mappedVeins.length && !(placedTemplate && Object.keys(templateNodes).length), children: "Save" })] }), _jsx("button", { className: "template-download-button", onClick: exportReusableTemplate, disabled: !mappedVeins.length && !(placedTemplate && Object.keys(templateNodes).length), children: "\u2193 Download template file" }), _jsx("small", { children: "Save keeps it on this device. Download creates a small shareable file with points, vein labels and connections \u2014 never the wing photo. Send that file to me and I can build your reviewed tracing into EntoWing." })] }), _jsx("small", { children: templateStatus }), _jsx("em", { children: "Template names constrain geometry; they do not identify your specimen. Shared junctions stay connected while you warp the overlay." })] }), _jsxs("details", { className: "legacy-auto", children: [_jsx("summary", { children: "Advanced \u00B7 pixel-only Auto Trace" }), _jsxs("div", { className: "auto-trace-card", children: [_jsxs("div", { className: "auto-trace-title", children: [_jsx("span", { children: "FREE AUTO TRACE \u00B7 LEGACY" }), _jsx("b", { children: "PIXELS ONLY" })] }), _jsx("p", { children: "Find likely dark linear structures, select all pieces of one vein, then join them into one editable SVG path." }), _jsxs("label", { className: "sensitivity-row", children: [_jsxs("span", { children: ["Sensitivity ", _jsx("b", { children: autoSensitivity })] }), _jsx("input", { type: "range", min: "20", max: "90", value: autoSensitivity, onChange: (event) => setAutoSensitivity(Number(event.target.value)), disabled: autoRunning || wholeDraftRunning })] }), _jsx("button", { className: "auto-trace-button", onClick: runAutoTrace, disabled: !wingImage.isLocal || autoRunning || wholeDraftRunning, children: autoRunning ? "Tracing…" : "✦ Make SVG draft" }), _jsx("small", { className: "auto-status", children: autoStatus }), !!autoCandidates.length && _jsx("button", { className: "clear-auto", onClick: () => { setAutoCandidates([]); setSelectedAutoIds([]); setManualAddMode(true); setAutoStatus("Draft cleared. Manual point editing is active."); }, children: "Clear draft network" })] })] }), _jsx("p", { className: "privacy-note", children: "Your image stays in this browser session unless you export it." })] }), _jsxs("div", { className: "mapper-side-section vein-palette", children: [_jsxs("div", { className: "tool-title-row", children: [_jsx("span", { className: "tool-kicker", children: "02 \u00B7 CHOOSE STRUCTURE" }), _jsxs("span", { children: [mappedVeins.length, "/", allVeins.length] })] }), _jsx("div", { className: "vein-grid", children: allVeins.map((vein) => {
                                                    const count = map[vein.id]?.length ?? 0;
                                                    return (_jsxs("button", { title: vein.symbolMeaning, className: activeVeinId === vein.id ? "active" : "", disabled: guidedRunning || wholeDraftRunning, onClick: () => { setActiveVeinId(vein.id); setMapperPreview(false); setGuidedMode(false); setGuidedAnchors([]); setManualAddMode(true); }, children: [_jsx("i", { style: { background: vein.color } }), _jsx("span", { children: vein.label }), _jsx("small", { className: draftHypotheses[vein.id] !== undefined ? "hypothesis" : count >= 2 ? "complete" : "", children: draftHypotheses[vein.id] !== undefined ? "≈" : count >= 2 ? "✓" : count || "–" })] }, vein.id));
                                                }) }), _jsxs("div", { className: "custom-vein-row", children: [_jsx("input", { value: customName, onChange: (event) => setCustomName(event.target.value), onKeyDown: (event) => { if (event.key === "Enter")
                                                            addCustomVein(); }, placeholder: "Custom label\u2026", "aria-label": "Custom vein label" }), _jsx("button", { onClick: addCustomVein, children: "Add" })] }), _jsxs("details", { className: "notation-key", children: [_jsx("summary", { children: "Modern Syrphidae nomenclature \u00B7 2023" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "C" }), _jsxs("dd", { children: [_jsx("b", { children: "Costa" }), _jsx("span", { children: "leading-edge vein" })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Sc" }), _jsxs("dd", { children: [_jsx("b", { children: "Subcosta" }), _jsx("span", { children: "vein just behind Costa" })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "R" }), _jsxs("dd", { children: [_jsx("b", { children: "Radius" }), _jsx("span", { children: "major longitudinal system behind Sc; a vein-system name, not \u201Cradial symmetry\u201D" })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "M" }), _jsxs("dd", { children: [_jsx("b", { children: "Media" }), _jsx("span", { children: "middle longitudinal system behind Radius" })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Cu" }), _jsxs("dd", { children: [_jsx("b", { children: "Cubitus" }), _jsx("span", { children: "longitudinal system behind Media" })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "A" }), _jsxs("dd", { children: [_jsx("b", { children: "Anal" }), _jsx("span", { children: "veins of the posterior/anal region" })] })] })] }), _jsxs("small", { children: ["Primary terminology: van Steenis, Miranda, Tot, Mengual & Skevington (2023), following the modern wing system adopted from Cumming & Wood. Older names are shown as aliases instead of silently mixed into the template. ", _jsx("a", { href: "https://doi.org/10.55710/1.AIMS1978", target: "_blank", rel: "noreferrer", children: "Source \u2197" })] })] })] }), _jsxs("div", { className: "mapper-side-section current-tool", children: [_jsx("span", { className: "tool-kicker", children: "03 \u00B7 TRACE" }), _jsxs("div", { className: "active-vein-name", children: [_jsx("i", { style: { background: activeVein.color } }), _jsxs("div", { children: [_jsx("strong", { children: activeVein.label }), _jsx("small", { children: activeVein.fullName })] })] }), _jsxs("div", { className: "vein-meaning-card", children: [_jsx("strong", { children: activeVein.symbolMeaning }), _jsx("span", { children: activeVein.plainMeaning }), activeVein.legacyAlias && _jsxs("em", { children: ["Historical alias: ", activeVein.legacyAlias] }), _jsx("p", { children: activeVein.note }), draftHypotheses[activeVein.id] !== undefined && _jsxs("div", { className: "active-hypothesis", children: [_jsxs("span", { children: ["\u2248 suggested \u00B7 ", Math.round(draftHypotheses[activeVein.id] * 100), "% geometric confidence"] }), _jsx("button", { onClick: () => setDraftHypotheses((current) => { const next = { ...current }; delete next[activeVein.id]; return next; }), children: "\u2713 Accept label as reviewed" })] })] }), _jsxs("div", { className: `guided-trace-card ${guidedMode ? "active" : ""}`, children: [_jsxs("div", { className: "guided-title", children: [_jsx("span", { children: "GUIDED TRACE \u00B7 NEW" }), _jsxs("b", { children: [guidedAnchors.length, "/2 anchors"] })] }), _jsx("p", { children: guidedStatus }), !guidedMode ? (_jsx("button", { className: "guided-start", onClick: startGuidedTrace, disabled: !wingImage.isLocal || guidedRunning || wholeDraftRunning, children: guidedRunning ? "Following vein…" : `◎ Start → End for ${activeVein.label}` })) : (_jsxs("div", { className: "guided-actions", children: [_jsx("span", { className: guidedAnchors.length >= 1 ? "done" : "", children: "1 \u00B7 START" }), _jsx("span", { className: guidedAnchors.length >= 2 ? "done" : "", children: "2 \u00B7 END" }), _jsx("button", { onClick: cancelGuidedTrace, disabled: guidedRunning, children: "Cancel" })] }))] }), selectedAutoIds.length ? (_jsxs("div", { className: "auto-selection", children: [_jsx("span", { children: "BUILD ONE WHOLE VEIN" }), _jsxs("strong", { children: [selectedAutoIds.length, " ", selectedAutoIds.length === 1 ? "piece" : "pieces", " selected"] }), _jsxs("p", { children: ["Tap more green pieces that belong to ", _jsx("b", { children: activeVein.label }), ". Orange pieces will be joined into one path."] }), _jsxs("div", { className: "auto-selection-actions", children: [_jsxs("button", { onClick: acceptAutoCandidates, children: ["Join & use as ", activeVein.label] }), _jsx("button", { onClick: growAutoSelection, children: "Grow selection" }), _jsx("button", { onClick: () => setSelectedAutoIds([]), children: "Unselect" }), _jsx("button", { onClick: discardAutoCandidates, children: "Discard pieces" })] })] })) : _jsx("p", { children: autoCandidates.length ? "Tap the first green piece of a vein. Then add its other pieces — you are no longer limited to one fragment." : "Click along the centre of the vein. Existing control points can always be dragged to a better position." }), _jsxs("div", { className: "edit-actions", children: [_jsx("button", { onClick: undoPoint, disabled: !map[activeVeinId]?.length || guidedMode, children: "\u21B6 Undo point" }), _jsx("button", { onClick: clearVein, disabled: !map[activeVeinId]?.length || guidedMode, children: "Clear vein" })] }), !guidedMode && _jsx("button", { className: `manual-mode-button ${manualAddMode ? "active" : ""}`, onClick: () => setManualAddMode((current) => !current), children: manualAddMode ? "＋ Manual point add · ON" : "✦ Auto-piece selection · ON" }), _jsx("button", { className: "finish-button", onClick: finishVein, disabled: (map[activeVeinId]?.length ?? 0) < 2 || guidedMode, children: "Finish vein \u2192" })] })] }), _jsxs("div", { className: "mapper-main", id: "wing-workspace", children: [_jsxs("aside", { className: "active-vein-dock", "aria-label": `Currently editing ${activeVein.label}`, children: [_jsxs("div", { className: "active-vein-dock-title", children: [_jsx("span", { className: "tool-kicker", children: "ACTIVE VEIN" }), _jsx("small", { children: "changes when you tap a vein" })] }), _jsxs("div", { className: "active-vein-name active-vein-name-dock", children: [_jsx("i", { style: { background: activeVein.color } }), _jsxs("div", { children: [_jsx("strong", { children: activeVein.label }), _jsx("small", { children: activeVein.fullName })] })] }), _jsxs("div", { className: "vein-meaning-card vein-dock-meaning", children: [_jsx("strong", { children: activeVein.symbolMeaning }), _jsx("span", { children: activeVein.plainMeaning }), activeVein.legacyAlias && _jsxs("em", { children: ["Historical alias: ", activeVein.legacyAlias] }), _jsx("p", { children: activeVein.note })] }), _jsxs("div", { className: "vein-dock-stats", children: [_jsxs("div", { children: [_jsx("span", { children: "PATH" }), _jsxs("b", { children: [activeTemplatePath?.nodeIds.length ?? map[activeVeinId]?.length ?? 0, " points"] })] }), _jsxs("div", { children: [_jsx("span", { children: "CURVE" }), _jsx("b", { children: selectedTemplateNodeId ? selectedCurveMode : "tap a point" })] })] }), selectedTemplateNodeId && _jsxs("div", { className: "selected-point-note", children: [_jsx("span", { children: "SELECTED POINT" }), _jsx("b", { children: selectedTemplateNodeId }), _jsx("small", { children: "Use Smooth / Corner / Handles in the toolbar above the wing." })] }), _jsx("div", { className: "vein-dock-hint", children: "Tap any coloured vein on the wing to make it active. Its name and anatomical meaning will stay here while you edit." }), _jsx("a", { className: "back-to-setup", href: "#mapper-setup", children: "\u2191 Setup & tracing" })] }), _jsxs("div", { className: "mapper-toolbar", children: [_jsxs("div", { className: "image-meta", children: [_jsx("strong", { children: wingImage.name }), _jsxs("span", { children: [wingImage.width, " \u00D7 ", wingImage.height, " px \u00B7 ", Math.round(canvasZoom * 100), "%"] })] }), _jsxs("div", { className: "zoom-controls", "aria-label": "Wing canvas zoom", children: [_jsx("button", { onClick: () => zoomCanvas(.8), disabled: canvasZoom <= 1.01, "aria-label": "Zoom out", children: "\u2212" }), _jsxs("span", { children: [Math.round(canvasZoom * 100), "%"] }), _jsx("button", { onClick: () => zoomCanvas(1.25), disabled: canvasZoom >= 11.9, "aria-label": "Zoom in", children: "\uFF0B" }), _jsx("button", { onClick: resetCanvasZoom, disabled: canvasZoom <= 1.01, children: "Fit" })] }), _jsxs("div", { className: "mapper-toolbar-actions", children: [_jsx("button", { className: mapperPreview ? "active" : "", disabled: guidedMode || guidedRunning, onClick: () => setMapperPreview((current) => !current), children: mapperPreview ? "Edit points" : "Preview" }), _jsx("button", { onClick: exportJson, disabled: !mappedVeins.length, children: "Export map" }), _jsx("button", { onClick: exportSvg, disabled: !mappedVeins.length, children: "Export SVG" }), _jsx("button", { className: "atlas-button", onClick: enterAtlas, disabled: !mappedVeins.length, children: "Use in Atlas \u2192" })] })] }), placedTemplate && _jsxs("div", { className: "canvas-edit-strip", "aria-label": "Template editing tools", children: [_jsxs("div", { className: "canvas-tool-group edit-group", children: [_jsxs("span", { children: ["EDIT \u00B7 ", _jsx("b", { children: activeVein.label })] }), _jsxs("div", { children: [_jsx("button", { className: "undo-edit", disabled: !templateUndoStack.length, title: "Undo last edit \u00B7 Ctrl/Cmd + Z", "aria-label": "Undo last template edit", onClick: undoTemplateAction, children: "\u21B6 Undo" }), _jsx("button", { className: templateEditTool === "drag" && templateEditMode ? "active" : "", onClick: () => chooseTemplateEditTool("drag"), children: "\u2194 Drag" }), _jsx("button", { className: templateEditTool === "insert" && templateEditMode ? "active" : "", onClick: () => chooseTemplateEditTool("insert"), children: "\uFF0B Insert" }), _jsx("button", { className: templateEditTool === "delete" && templateEditMode ? "active danger" : "", onClick: () => chooseTemplateEditTool("delete"), children: "\u2212 Delete" }), _jsx("button", { className: templateEditTool === "join" && templateEditMode ? "active" : "", onClick: () => chooseTemplateEditTool("join"), children: "\u2301 Join" })] })] }), _jsxs("div", { className: "canvas-tool-group curve-group", children: [_jsx("span", { children: selectedTemplateNodeId ? "CURVE · SELECTED POINT" : "CURVE · TAP A POINT" }), _jsxs("div", { children: [_jsx("button", { disabled: !selectedTemplateNodeId, className: selectedTemplateNodeId && selectedCurveMode === "smooth" ? "active" : "", onClick: () => setSelectedPointCurveMode("smooth"), children: "\u223F Smooth" }), _jsx("button", { disabled: !selectedTemplateNodeId, className: selectedTemplateNodeId && selectedCurveMode === "corner" ? "active" : "", onClick: () => setSelectedPointCurveMode("corner"), children: "\u231E Corner" }), _jsx("button", { disabled: !selectedTemplateNodeId, className: selectedTemplateNodeId && selectedCurveMode === "bezier" ? "active" : "", onClick: () => setSelectedPointCurveMode("bezier"), children: "\u25C7 Handles" })] })] }), _jsxs("div", { className: "canvas-crossvein-tool", children: [_jsx("span", { children: "NEW CROSSVEIN" }), _jsxs("div", { children: [_jsx("input", { "aria-label": "New crossvein name", value: templateCrossveinLabel, onChange: (event) => setTemplateCrossveinLabel(event.target.value), onKeyDown: (event) => { if (event.key === "Enter")
                                                                    chooseTemplateEditTool("crossvein"); }, placeholder: "name \u00B7 e.g. h" }), _jsx("button", { className: templateEditTool === "crossvein" && templateEditMode ? "active" : "", onClick: () => chooseTemplateEditTool("crossvein"), children: "\u2197 Crossvein" })] }), _jsx("small", { children: templateEditTool === "crossvein" && templateCrossveinNodeId ? "1 / 2 · tap the second point" : "name → tap two existing points" })] }), _jsxs("div", { className: "canvas-tool-group move-group", children: [_jsx("span", { children: "MOVE TEMPLATE" }), _jsxs("div", { children: [_jsx("button", { "aria-label": "Move template left", onClick: () => shiftTemplate(-wingImage.width * .02, 0), children: "\u2190" }), _jsx("button", { "aria-label": "Move template up", onClick: () => shiftTemplate(0, -wingImage.height * .035), children: "\u2191" }), _jsx("button", { "aria-label": "Move template down", onClick: () => shiftTemplate(0, wingImage.height * .035), children: "\u2193" }), _jsx("button", { "aria-label": "Move template right", onClick: () => shiftTemplate(wingImage.width * .02, 0), children: "\u2192" })] })] }), _jsxs("div", { className: "canvas-tool-group shape-group", children: [_jsx("span", { children: "SHAPE" }), _jsxs("div", { children: [_jsx("button", { onClick: () => scaleTemplate(.94), children: "\u2212 size" }), _jsx("button", { onClick: () => scaleTemplate(1.06), children: "\uFF0B size" }), _jsx("button", { onClick: () => rotateTemplate(-2), children: "\u21B6 2\u00B0" }), _jsx("button", { onClick: () => rotateTemplate(2), children: "\u21B7 2\u00B0" }), _jsx("button", { onClick: mirrorTemplate, children: "\u21CB Mirror" }), _jsx("button", { onClick: resetTemplateFit, children: "Reset" })] })] }), _jsxs("label", { className: "canvas-opacity", children: [_jsxs("span", { children: ["OPACITY \u00B7 ", Math.round(templateOpacity * 100), "%"] }), _jsx("input", { "aria-label": "Template overlay opacity", type: "range", min: "20", max: "100", value: Math.round(templateOpacity * 100), onChange: (event) => setTemplateOpacity(Number(event.target.value) / 100) })] }), _jsxs("div", { className: "canvas-tool-actions", children: [_jsx("button", { className: "magnet", disabled: !wingImage.isLocal || templateMagneticRunning, onClick: magneticFitActiveTemplateVein, children: templateMagneticRunning ? "Following…" : `⌁ Fit ${activeVein.label}` }), _jsx("button", { className: "apply", onClick: applyTemplateToMap, children: "Use as annotation \u2192" })] })] }), _jsxs("div", { className: `mapper-canvas-wrap ${mapperPreview ? "is-preview" : ""} ${guidedMode ? "is-guided" : ""}`, children: [_jsxs("svg", { ref: svgRef, className: "mapper-svg", viewBox: `${canvasView.x} ${canvasView.y} ${canvasView.width} ${canvasView.height}`, onPointerDownCapture: (event) => beginTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType), onPointerMoveCapture: (event) => moveTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType), onPointerUpCapture: (event) => endTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType), onPointerCancelCapture: (event) => endTouchGesture(event.pointerId, event.clientX, event.clientY, event.pointerType, true), onPointerDown: (event) => event.pointerType === "touch" ? registerCanvasTouchTap(event.pointerId, event.clientX, event.clientY, event.pointerType) : handleCanvasPointerDown(event.clientX, event.clientY), onPointerMove: (event) => { moveDraggedPoint(event.clientX, event.clientY); moveTemplateNode(event.clientX, event.clientY); moveTemplateHandle(event.clientX, event.clientY); }, onPointerUp: () => { setDragging(null); setTemplateDraggingNode(null); setTemplateDraggingHandle(null); templateDragSnapshotTakenRef.current = false; }, onPointerLeave: () => { setDragging(null); setTemplateDraggingNode(null); setTemplateDraggingHandle(null); templateDragSnapshotTakenRef.current = false; }, role: "img", "aria-label": "Wing image annotation canvas", children: [_jsx("image", { href: wingImage.src, x: "0", y: "0", width: wingImage.width, height: wingImage.height, preserveAspectRatio: "xMidYMid meet" }), placedTemplate && placedTemplate.paths.map((templatePath) => {
                                                        const points = templatePath.nodeIds.map((id) => templateNodes[id]).filter((point) => Boolean(point));
                                                        if (points.length < 2)
                                                            return null;
                                                        const vein = allVeins.find((item) => item.id === templatePath.veinId);
                                                        const isActive = activeVeinId === templatePath.veinId;
                                                        const labelPoint = vein?.group === "crossvein"
                                                            ? { x: (points[0].x + points[points.length - 1].x) / 2, y: (points[0].y + points[points.length - 1].y) / 2 }
                                                            : points[Math.max(0, points.length - 2)];
                                                        return _jsxs("g", { className: `template-path-group ${isActive ? "active" : ""}`, style: { opacity: templateOpacity }, children: [_jsx("path", { d: smoothPath(points, templatePath.nodeIds, templatePath.curve), fill: "none", className: "template-path-halo", vectorEffect: "non-scaling-stroke" }), _jsx("path", { d: smoothPath(points, templatePath.nodeIds, templatePath.curve), fill: "none", stroke: vein?.color ?? "#8d7044", className: "template-path-line", vectorEffect: "non-scaling-stroke" }), !mapperPreview && _jsx("path", { d: smoothPath(points, templatePath.nodeIds, templatePath.curve), fill: "none", stroke: "transparent", strokeWidth: "16", vectorEffect: "non-scaling-stroke", className: "template-path-hit", onPointerDown: (event) => {
                                                                        event.stopPropagation();
                                                                        if (event.pointerType === "touch" && touchPointersRef.current.size > 1)
                                                                            return;
                                                                        setActiveVeinId(templatePath.veinId);
                                                                        if (templateEditMode && templateEditTool === "insert")
                                                                            insertTemplatePoint(templatePath, event.clientX, event.clientY);
                                                                    } }), !mapperPreview && templateEditMode && _jsx("text", { x: labelPoint.x + 5 / canvasZoom, y: labelPoint.y - 5 / canvasZoom, style: { fontSize: `${10 / canvasZoom}px` }, className: "template-vein-label", children: vein?.label ?? templatePath.veinId })] }, `template-${templatePath.veinId}`);
                                                    }), placedTemplate && !mapperPreview && templateEditMode && selectedTemplateNodeId && activeTemplatePath?.nodeIds.includes(selectedTemplateNodeId) && (() => {
                                                        const control = activeTemplatePath.curve?.[selectedTemplateNodeId];
                                                        const anchor = templateNodes[selectedTemplateNodeId];
                                                        const index = activeTemplatePath.nodeIds.indexOf(selectedTemplateNodeId);
                                                        if (!anchor || control?.mode !== "bezier")
                                                            return null;
                                                        const handles = [
                                                            index > 0 && control.in ? { side: "in", point: { x: anchor.x + control.in.dx, y: anchor.y + control.in.dy } } : null,
                                                            index < activeTemplatePath.nodeIds.length - 1 && control.out ? { side: "out", point: { x: anchor.x + control.out.dx, y: anchor.y + control.out.dy } } : null,
                                                        ].filter((item) => Boolean(item));
                                                        return _jsx("g", { className: "template-bezier-controls", children: handles.map((handle) => _jsxs("g", { children: [_jsx("line", { x1: anchor.x, y1: anchor.y, x2: handle.point.x, y2: handle.point.y, vectorEffect: "non-scaling-stroke" }), _jsx("circle", { cx: handle.point.x, cy: handle.point.y, r: 5.5 / canvasZoom, className: "template-bezier-handle", vectorEffect: "non-scaling-stroke", onPointerDown: (event) => {
                                                                            event.stopPropagation();
                                                                            if (event.pointerType === "touch" && touchPointersRef.current.size > 1)
                                                                                return;
                                                                            event.currentTarget.setPointerCapture(event.pointerId);
                                                                            rememberTemplateState();
                                                                            setTemplateDraggingHandle({ veinId: activeTemplatePath.veinId, nodeId: selectedTemplateNodeId, side: handle.side });
                                                                        } })] }, `handle-${handle.side}`)) });
                                                    })(), placedTemplate && !mapperPreview && templateEditMode && Object.entries(templateNodes).map(([nodeId, point]) => {
                                                        const ownerPaths = placedTemplate.paths.filter((path) => path.nodeIds.includes(nodeId));
                                                        const references = ownerPaths.length;
                                                        const shared = references > 1;
                                                        return _jsxs("g", { "data-template-node-id": nodeId, className: `${templateJoinNodeId === nodeId ? "join-source" : templateCrossveinNodeId === nodeId ? "crossvein-source" : ""} ${selectedTemplateNodeId === nodeId ? "curve-selected" : ""}`, onPointerDown: (event) => {
                                                                event.stopPropagation();
                                                                if (event.pointerType === "touch" && touchPointersRef.current.size > 1)
                                                                    return;
                                                                if (templateEditTool === "delete") {
                                                                    deleteTemplatePoint(nodeId);
                                                                    return;
                                                                }
                                                                if (templateEditTool === "join") {
                                                                    joinTemplatePoint(nodeId);
                                                                    return;
                                                                }
                                                                if (templateEditTool === "crossvein") {
                                                                    createCrossveinToPoint(nodeId);
                                                                    return;
                                                                }
                                                                if (templateEditTool === "insert") {
                                                                    setTemplateStatus("Tap the coloured vein line between points to insert a new bend point.");
                                                                    return;
                                                                }
                                                                setSelectedTemplateNodeId(nodeId);
                                                                if (!ownerPaths.some((path) => path.veinId === activeVeinId) && ownerPaths[0])
                                                                    setActiveVeinId(ownerPaths[0].veinId);
                                                                event.currentTarget.setPointerCapture(event.pointerId);
                                                                templateDragSnapshotTakenRef.current = false;
                                                                setTemplateDraggingNode(nodeId);
                                                            }, children: [_jsx("circle", { cx: point.x, cy: point.y, r: 11 / canvasZoom, className: "template-node-hit" }), _jsx("circle", { cx: point.x, cy: point.y, r: Math.max(shared ? 4.4 : 2.6, wingImage.width / (shared ? 175 : 260)) / canvasZoom, className: `template-node ${shared ? "shared" : "control"}`, vectorEffect: "non-scaling-stroke", pointerEvents: "none" })] }, `template-node-${nodeId}`);
                                                    }), !mapperPreview && !guidedMode && autoCandidates.map((candidate) => {
                                                        const isSelected = selectedAutoIds.includes(candidate.id);
                                                        const draftPath = smoothPath(candidate.points);
                                                        return (_jsxs("g", { className: `auto-candidate-group ${isSelected ? "selected" : ""}`, children: [_jsx("path", { d: draftPath, fill: "none", vectorEffect: "non-scaling-stroke", className: "auto-candidate-visible" }), _jsx("path", { d: draftPath, fill: "none", stroke: "transparent", strokeWidth: "18", vectorEffect: "non-scaling-stroke", className: "auto-candidate-hit", onPointerDown: (event) => { event.stopPropagation(); if (event.pointerType === "touch" && touchPointersRef.current.size > 1)
                                                                        return; toggleAutoCandidate(candidate.id); } })] }, candidate.id));
                                                    }), allVeins.map((vein) => {
                                                        const points = map[vein.id] ?? [];
                                                        if (!points.length)
                                                            return null;
                                                        const isActive = vein.id === activeVeinId;
                                                        return (_jsxs("g", { className: `mapper-path-group ${isActive ? "active" : ""}`, children: [_jsx("path", { d: smoothPath(points), fill: "none", stroke: vein.color, vectorEffect: "non-scaling-stroke", className: "mapped-path" }), !mapperPreview && !guidedMode && _jsx("path", { d: smoothPath(points), fill: "none", stroke: "transparent", strokeWidth: "15", vectorEffect: "non-scaling-stroke", className: "mapped-path-hit", onPointerDown: (event) => { event.stopPropagation(); if (event.pointerType === "touch" && touchPointersRef.current.size > 1)
                                                                        return; setActiveVeinId(vein.id); } }), !mapperPreview && !guidedMode && points.map((point, pointIndex) => (_jsx("circle", { cx: point.x, cy: point.y, r: Math.max(isActive ? 4 : 3, wingImage.width / (isActive ? 175 : 220)) / canvasZoom, vectorEffect: "non-scaling-stroke", className: `mapper-node ${isActive ? "active" : "inactive"}`, onPointerDown: (event) => {
                                                                        event.stopPropagation();
                                                                        if (event.pointerType === "touch" && touchPointersRef.current.size > 1)
                                                                            return;
                                                                        event.currentTarget.setPointerCapture(event.pointerId);
                                                                        setActiveVeinId(vein.id);
                                                                        setDragging({ veinId: vein.id, pointIndex });
                                                                    } }, `${vein.id}-${pointIndex}`)))] }, vein.id));
                                                    }), !mapperPreview && guidedAnchors.map((anchor, index) => (_jsxs("g", { className: `guided-anchor anchor-${index + 1}`, pointerEvents: "none", children: [_jsx("circle", { cx: anchor.x, cy: anchor.y, r: Math.max(7, wingImage.width / 115) / canvasZoom, vectorEffect: "non-scaling-stroke" }), _jsx("circle", { cx: anchor.x, cy: anchor.y, r: Math.max(2.5, wingImage.width / 360) / canvasZoom, vectorEffect: "non-scaling-stroke", className: "guided-anchor-core" }), _jsx("text", { x: anchor.x, y: anchor.y - Math.max(12, wingImage.width / 70) / canvasZoom, textAnchor: "middle", fontSize: Math.max(10, wingImage.width / 95) / canvasZoom, children: index === 0 ? "START" : "END" })] }, `guided-${index}`)))] }), !mapperPreview && _jsxs("div", { className: `canvas-hint ${guidedMode ? "guided-hint" : placedTemplate && templateEditMode ? "template-hint" : autoCandidates.length && !manualAddMode ? "auto-hint" : ""}`, children: [_jsx("span", { children: guidedMode ? "◎" : placedTemplate && templateEditMode ? "◇" : autoCandidates.length && !manualAddMode ? "✦" : "+" }), guidedMode ? guidedRunning ? ` Finding the likely route for ${activeVein.label}…` : guidedAnchors.length ? ` START set · tap the END of ${activeVein.label}` : ` Tap approximately at the START of ${activeVein.label}` : placedTemplate && templateEditMode ? " Template warp · drag circles onto the real junctions; shared nodes keep connected veins together" : selectedAutoIds.length ? ` ${selectedAutoIds.length} pieces selected · tap more or Join & use as ${activeVein.label}` : autoCandidates.length && !manualAddMode ? " Auto selection mode · tap green pieces without accidentally creating points" : " Drag any existing point · click empty wing area to extend the active vein"] }), mapperPreview && _jsxs("div", { className: "canvas-hint preview-hint", children: [_jsx("span", { children: "\uD83D\uDC41" }), " Preview \u00B7 nodes hidden"] })] }), _jsxs("div", { className: "mapper-statusbar", children: [_jsxs("span", { children: [_jsx("i", { className: "status-dot" }), " Same coordinate system: image + SVG"] }), _jsx("span", { className: "pinch-status", children: "\u2194 2-finger pinch \u00B7 zoom + pan" }), _jsxs("span", { children: [mappedVeins.length, " structures mapped"] }), !!Object.keys(draftHypotheses).length && _jsxs("span", { children: ["\u2248 ", Object.keys(draftHypotheses).length, " unreviewed hypotheses"] }), placedTemplate && _jsxs("span", { children: ["\u25C7 ", placedTemplate.name, " template"] }), !!autoCandidates.length && _jsxs("span", { children: [autoCandidates.length, " draft segments"] }), _jsxs("span", { children: [Object.values(map).reduce((sum, points) => sum + points.length, 0), " control points"] })] })] })] }), _jsxs("section", { className: "mapper-explainer", children: [_jsx("span", { className: "section-number", children: "02" }), _jsxs("div", { children: [_jsx("h2", { children: "Why this one cannot drift." }), _jsxs("p", { children: ["The photograph sits inside the same SVG ", _jsx("code", { children: "viewBox" }), " as every point you place. Resize the browser, open it on a phone, or export the file: the path coordinates remain tied to the original image pixels."] })] }), _jsxs("div", { className: "mini-flow", children: [_jsx("span", { children: "PHOTO" }), _jsx("b", { children: "\u2192" }), _jsx("span", { children: "POINTS" }), _jsx("b", { children: "\u2192" }), _jsx("span", { children: "SVG PATH" }), _jsx("b", { children: "\u2192" }), _jsx("span", { children: "ATLAS" })] })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("section", { className: "intro", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: mode === "learn" ? "LEARN · YOUR OWN ANNOTATION" : "ATLAS · SPECIMEN-TRUE OVERLAY" }), _jsx("h1", { children: mode === "learn" ? "Find it on the real wing." : "The image is the map." })] }), _jsx("p", { className: "intro-copy", children: mode === "learn" ? quizMessage : "Hover the real wing. Only the paths you traced in Wing Mapper become interactive — no invented geometry, no second schematic underneath." })] }), _jsxs("section", { className: "atlas-workbench", children: [_jsxs("div", { className: "atlas-image-panel", children: [_jsxs("div", { className: "atlas-toolbar", children: [_jsxs("div", { children: [_jsx("span", { className: "tool-kicker", children: "CURRENT WING" }), _jsx("strong", { children: wingImage.name })] }), _jsxs("div", { className: "atlas-toolbar-actions", children: [mode === "atlas" && _jsxs("label", { className: "overlay-toggle", children: [_jsx("input", { type: "checkbox", checked: showAll, onChange: (event) => setShowAll(event.target.checked) }), " Show all mapped veins"] }), _jsx("button", { onClick: () => setMode("mapper"), children: "Edit map" })] })] }), _jsxs("div", { className: "atlas-svg-wrap", children: [_jsxs("svg", { className: "atlas-photo-svg", viewBox: `0 0 ${wingImage.width} ${wingImage.height}`, role: "img", "aria-label": "Mapped wing with interactive vein overlay", children: [_jsx("image", { href: wingImage.src, x: "0", y: "0", width: wingImage.width, height: wingImage.height }), mappedVeins.map((vein) => {
                                                        const isHot = hoveredVeinId === vein.id || (mode === "atlas" && selectedVeinId === vein.id);
                                                        return (_jsxs("g", { className: `atlas-vein ${isHot ? "hot" : ""}`, children: [_jsx("path", { d: smoothPath(map[vein.id]), fill: "none", stroke: vein.color, vectorEffect: "non-scaling-stroke", className: "atlas-vein-visible", style: { opacity: showAll || isHot ? 1 : 0 } }), _jsx("path", { d: smoothPath(map[vein.id]), fill: "none", stroke: "transparent", strokeWidth: "18", vectorEffect: "non-scaling-stroke", className: "atlas-vein-hit", role: "button", tabIndex: 0, "aria-label": `${vein.label}: ${vein.fullName}`, onMouseEnter: () => setHoveredVeinId(vein.id), onMouseLeave: () => setHoveredVeinId(null), onFocus: () => setHoveredVeinId(vein.id), onBlur: () => setHoveredVeinId(null), onClick: () => chooseAtlasVein(vein.id), onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ")
                                                                        chooseAtlasVein(vein.id); } })] }, vein.id));
                                                    })] }), !mappedVeins.length && (_jsxs("div", { className: "no-map-callout", children: [_jsx("span", { children: "NO OVERLAY YET" }), _jsx("strong", { children: "This is the real image. Now tell EntoWing where its veins are." }), _jsx("button", { onClick: () => setMode("mapper"), children: "Open Wing Mapper \u2192" })] })), mode === "learn" && quizTarget && _jsxs("div", { className: "quiz-float", children: [_jsx("span", { children: "FIND" }), _jsx("strong", { children: quizTarget }), _jsx("small", { children: quizMessage })] })] }), _jsxs("div", { className: "atlas-legend", children: [_jsxs("span", { children: [mappedVeins.length, " mapped structures"] }), _jsx("span", { className: "legend-tip", children: "Hover directly over a real vein to reveal your SVG trace." })] })] }), _jsxs("aside", { className: "atlas-info-panel", children: [selectedVein && mode === "atlas" ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "atlas-selected-head", children: [_jsx("i", { style: { background: selectedVein.color } }), _jsxs("div", { children: [_jsx("span", { children: selectedVein.group }), _jsx("h2", { children: selectedVein.label })] })] }), _jsx("h3", { children: selectedVein.fullName }), _jsxs("div", { className: "atlas-symbol-card", children: [_jsx("strong", { children: selectedVein.symbolMeaning }), _jsx("span", { children: selectedVein.plainMeaning })] }), _jsx("p", { children: selectedVein.note }), draftHypotheses[selectedVein.id] !== undefined && _jsxs("div", { className: "hypothesis-warning", children: [_jsx("span", { children: "\u2248 WHOLE-WING DRAFT \u00B7 VERIFY" }), _jsxs("strong", { children: [Math.round(draftHypotheses[selectedVein.id] * 100), "% geometric confidence"] }), _jsx("small", { children: "This label was proposed from image geometry and position, not taxonomically identified. Review it before scientific use." })] }), _jsxs("div", { className: "coordinate-card", children: [_jsx("span", { children: "YOUR TRACE" }), _jsxs("strong", { children: [map[selectedVein.id]?.length ?? 0, " control points"] }), _jsx("small", { children: "Stored in the natural pixel coordinates of this wing image." })] })] })) : mode === "learn" ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "tool-kicker", children: "LEARN MODE" }), _jsx("h2", { className: "learn-title", children: "No labels. Just the wing." }), _jsx("p", { children: "Move over the photograph and click the structure you think is correct. The invisible hit area follows your own trace." }), _jsxs("div", { className: "coordinate-card", children: [_jsx("span", { children: "CURRENT TARGET" }), _jsx("strong", { children: quizTarget ?? "Map more veins" }), _jsx("small", { children: quizMessage })] })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "tool-kicker", children: "WING MAP" }), _jsx("h2", { className: "learn-title", children: "Your atlas starts with your specimen." }), _jsx("p", { children: "Open Wing Mapper, align an anatomical template to the specimen, then correct its junctions and paths. The template is a tracing scaffold, never a taxonomic determination." })] })), _jsxs("div", { className: "mapped-list", children: [_jsxs("div", { className: "tool-title-row", children: [_jsx("span", { className: "tool-kicker", children: "MAPPED" }), _jsx("span", { children: mappedVeins.length })] }), mappedVeins.map((vein) => _jsxs("button", { onClick: () => { setSelectedVeinId(vein.id); setMode("atlas"); }, children: [_jsx("i", { style: { background: vein.color } }), vein.label, _jsxs("span", { children: [map[vein.id].length, " pts"] })] }, vein.id))] })] })] }), _jsxs("section", { className: "science-note", children: [_jsxs("div", { children: [_jsx("span", { className: "section-number", children: "01" }), _jsx("h2", { children: "A template is a scaffold, not an identification." })] }), _jsxs("div", { className: "science-copy", children: [_jsx("p", { children: "Template Mapper preserves known connectivity while you align shared junctions to the real wing. Magnetic fitting then searches locally around one chosen template vein, so image evidence can refine geometry without inventing the whole anatomy from dark pixels." }), _jsx("p", { className: "method-note", children: "Wing-vein nomenclature follows the familiar Diptera systems C (Costa), Sc (Subcosta), R (Radius), M (Media), Cu (Cubitus) and A (Anal). Homologies and retained branches vary among fly groups: verify the selected archetype and every final label against the specimen and an appropriate taxonomic source." }), _jsx("a", { href: "https://www.bugguide.net/node/view/240586", target: "_blank", rel: "noreferrer", children: "Open reference source \u2197" })] })] })] })), _jsxs("footer", { children: [_jsxs("div", { children: [_jsx("strong", { children: "EntoWing" }), _jsx("span", { children: "Specimen image \u2192 your annotation \u2192 interactive atlas." })] }), _jsxs("div", { className: "footer-roadmap", children: [_jsx("span", { className: "done", children: "01 \u00B7 IMAGE" }), _jsx("span", { className: "done", children: "02 \u00B7 MAP" }), _jsx("span", { className: mappedVeins.length ? "done" : "", children: "03 \u00B7 ATLAS" }), _jsx("span", { children: "04 \u00B7 CELLS" }), _jsx("span", { children: "05 \u00B7 COMPARE" })] })] })] }));
}
