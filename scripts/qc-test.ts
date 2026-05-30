import { analyzeImageData, type QcSpec } from "../src/lib/qc-engine";
import { hexToLab, labToCss } from "../src/lib/color";

const W = 240, H = 240;

function parseRgb(s: string): [number, number, number] {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s)!;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function field([r, g, b]: [number, number, number], grain: number, speckles = 0) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 2 * grain;
    data[i] = clamp(r + n); data[i + 1] = clamp(g + n); data[i + 2] = clamp(b + n); data[i + 3] = 255;
  }
  for (let s = 0; s < speckles; s++) {
    const cx = Math.random() * W, cy = Math.random() * H, rad = 5 + Math.random() * 7;
    for (let y = Math.max(0, cy - rad); y < Math.min(H, cy + rad); y++)
      for (let x = Math.max(0, cx - rad); x < Math.min(W, cx + rad); x++) {
        const i = (Math.floor(y) * W + Math.floor(x)) * 4;
        data[i] = 30; data[i + 1] = 20; data[i + 2] = 15;
      }
  }
  return { data, width: W, height: H };
}
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

// Turmeric spec
const lab = hexToLab("#C8821E");
const spec: QcSpec = { specL: lab.L, specA: lab.a, specB: lab.b, toleranceDeltaE: 3.5, minUniformity: 75, maxDefects: 2 };

const base = parseRgb(labToCss(lab));
const off = parseRgb(labToCss({ L: lab.L + 16, a: lab.a - 14, b: lab.b + 12 }));

let fail = 0;
function check(name: string, got: string, want: string) {
  if (got === want) console.log(`  ✓ ${name} → ${got}`);
  else { fail++; console.log(`  ✗ ${name} → got ${got}, expected ${want}`); }
}

console.log("QC engine verdicts:");
check("in-spec sample", analyzeImageData(field(base, 6), spec).autoResult, "PASS");
check("off-colour sample", analyzeImageData(field(off, 9), spec).autoResult, "FAIL");
const cont = analyzeImageData(field(base, 9, 14), spec);
check("contaminated sample", cont.autoResult, "FAIL");
console.log(`    (contaminated: ΔE=${cont.deltaE}, uniformity=${cont.uniformity}%, defects=${cont.defectCount}, foreign=${cont.foreignMatter})`);

console.log(`\nRESULT: ${fail === 0 ? "all engine checks passed" : fail + " failed"}`);
process.exit(fail === 0 ? 0 : 1);
