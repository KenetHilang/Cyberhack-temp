import { rgbToLab, deltaE2000, type Lab } from "./color";

// On-device computer-vision QC engine. Operates purely on pixel data, so it
// runs entirely in the browser with no API key and no network — the inspection
// can never fail at demo time. It mirrors how real food/cosmetic QC works:
// reference-colour matching in CIELAB space (ΔE2000) plus spatial uniformity
// and foreign-matter (outlier) analysis.

export interface QcSpec {
  specL: number;
  specA: number;
  specB: number;
  toleranceDeltaE: number;
  minUniformity: number;
  maxDefects: number;
}

export interface QcCheck {
  label: string;
  value: string;
  ok: boolean;
}

export interface QcResult {
  measuredL: number;
  measuredA: number;
  measuredB: number;
  deltaE: number;
  uniformity: number;
  defectCount: number;
  foreignMatter: boolean;
  autoResult: "PASS" | "FAIL";
  sampledPixels: number;
  checks: QcCheck[];
  notes: string;
}

interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const GRID = 8; // 8x8 = 64 tiles for spatial analysis
const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

function isBackground(r: number, g: number, b: number, a: number): boolean {
  if (a < 50) return true;
  return r > 235 && g > 235 && b > 235; // near-white backdrop
}

export function analyzeImageData(img: RawImage, spec: QcSpec): QcResult {
  const { data, width, height } = img;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 200)); // downsample large images

  // tile accumulators
  const tileSum = Array.from({ length: GRID * GRID }, () => ({ L: 0, a: 0, b: 0, n: 0 }));
  let gL = 0, gA = 0, gB = 0, gN = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], al = data[i + 3];
      if (isBackground(r, g, b, al)) continue;
      const lab = rgbToLab(r, g, b);
      gL += lab.L; gA += lab.a; gB += lab.b; gN++;
      const tx = Math.min(GRID - 1, Math.floor((x / width) * GRID));
      const ty = Math.min(GRID - 1, Math.floor((y / height) * GRID));
      const t = tileSum[ty * GRID + tx];
      t.L += lab.L; t.a += lab.a; t.b += lab.b; t.n++;
    }
  }

  // Fallback: image is mostly background — sample everything.
  if (gN < 50) {
    gL = gA = gB = gN = 0;
    for (let i = 0; i < data.length; i += 4 * step) {
      const lab = rgbToLab(data[i], data[i + 1], data[i + 2]);
      gL += lab.L; gA += lab.a; gB += lab.b; gN++;
    }
  }

  const mean: Lab = { L: gL / gN, a: gA / gN, b: gB / gN };
  const spec_: Lab = { L: spec.specL, a: spec.specA, b: spec.specB };

  const deltaE = deltaE2000(mean, spec_);

  // Spatial uniformity + foreign-matter detection across tiles.
  let tileDeltaSum = 0;
  let tileCount = 0;
  let defectCount = 0;
  let foreignMatter = false;
  const defectThreshold = Math.max(spec.toleranceDeltaE * 2, 5);
  const foreignThreshold = Math.max(spec.toleranceDeltaE * 3.2, 9);

  for (const t of tileSum) {
    if (t.n < 4) continue;
    const tileMean: Lab = { L: t.L / t.n, a: t.a / t.n, b: t.b / t.n };
    const d = deltaE2000(tileMean, mean);
    tileDeltaSum += d;
    tileCount++;
    if (d > defectThreshold) defectCount++;
    if (d > foreignThreshold) foreignMatter = true;
  }

  const avgTileDelta = tileCount ? tileDeltaSum / tileCount : 0;
  const uniformity = clamp(100 - avgTileDelta * 6);

  const colourOk = deltaE <= spec.toleranceDeltaE;
  const uniformOk = uniformity >= spec.minUniformity;
  const defectsOk = defectCount <= spec.maxDefects;
  const cleanOk = !foreignMatter;
  const autoResult: "PASS" | "FAIL" = colourOk && uniformOk && defectsOk && cleanOk ? "PASS" : "FAIL";

  const checks: QcCheck[] = [
    { label: "Colour match (ΔE2000)", value: `${round(deltaE)} ≤ ${spec.toleranceDeltaE}`, ok: colourOk },
    { label: "Uniformity", value: `${round(uniformity)}% ≥ ${spec.minUniformity}%`, ok: uniformOk },
    { label: "Defect regions", value: `${defectCount} ≤ ${spec.maxDefects}`, ok: defectsOk },
    { label: "Foreign matter", value: foreignMatter ? "Detected" : "None", ok: cleanOk },
  ];

  const failed = checks.filter((c) => !c.ok).map((c) => c.label.split(" (")[0].toLowerCase());
  const notes =
    autoResult === "PASS"
      ? "Sample is within specification: colour, uniformity and cleanliness all pass."
      : `Out of specification — flagged on: ${failed.join(", ")}.`;

  return {
    measuredL: round(mean.L),
    measuredA: round(mean.a),
    measuredB: round(mean.b),
    deltaE: round(deltaE),
    uniformity: round(uniformity),
    defectCount,
    foreignMatter,
    autoResult,
    sampledPixels: gN,
    checks,
    notes,
  };
}
