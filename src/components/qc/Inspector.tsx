"use client";

import { useActionState, useRef, useState } from "react";
import { Upload, Sparkles, ScanLine, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { analyzeImageData, type QcResult, type QcSpec } from "@/lib/qc-engine";
import { labToCss } from "@/lib/color";
import { recordInspectionAction, describeSampleAction } from "@/app/actions";
import { initial } from "@/lib/action-state";
import { SubmitButton, Feedback, inputClass, labelClass } from "@/components/forms/controls";

interface Props {
  intakeId: string;
  materialId: string;
  materialName: string;
  spec: QcSpec;
  canInspect: boolean;
}

export function Inspector({ intakeId, materialId, materialName, spec, canInspect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<QcResult | null>(null);
  const [llmNote, setLlmNote] = useState<string | null>(null);
  const [llmState, setLlmState] = useState<"idle" | "loading" | "done" | "unavailable">("idle");
  const [override, setOverride] = useState("");
  const [state, action] = useActionState(recordInspectionAction, initial);

  function analyzeCanvas() {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    setResult(analyzeImageData({ data: img.data, width: img.width, height: img.height }, spec));
    setPreview(c.toDataURL("image/jpeg", 0.6));
    setLlmNote(null);
    setLlmState("idle");
  }

  function genSample(kind: "good" | "offcolour" | "contaminated") {
    const c = canvasRef.current!;
    c.width = 240;
    c.height = 240;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const base = labToCss({ L: spec.specL, a: spec.specA, b: spec.specB });
    const off = labToCss({ L: spec.specL + 16, a: spec.specA - 14, b: spec.specB + 12 });

    // base fill with light per-pixel grain
    const img = ctx.createImageData(c.width, c.height);
    const [br, bg, bb] = parseRgb(kind === "offcolour" ? off : base);
    const grain = kind === "good" ? 6 : 9;
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 2 * grain;
      img.data[i] = clampByte(br + n);
      img.data[i + 1] = clampByte(bg + n);
      img.data[i + 2] = clampByte(bb + n);
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    if (kind === "contaminated") {
      // scatter dark foreign-matter specks
      ctx.fillStyle = "rgba(30,20,15,0.95)";
      for (let k = 0; k < 14; k++) {
        const x = Math.random() * c.width;
        const y = Math.random() * c.height;
        const r = 4 + Math.random() * 8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    analyzeCanvas();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const c = canvasRef.current!;
      const max = 256;
      const scale = Math.min(1, max / Math.max(im.width, im.height));
      c.width = Math.max(1, Math.round(im.width * scale));
      c.height = Math.max(1, Math.round(im.height * scale));
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      analyzeCanvas();
    };
    im.src = url;
  }

  async function runLlm() {
    if (!preview || !result) return;
    setLlmState("loading");
    const note = await describeSampleAction(preview, materialId, {
      deltaE: result.deltaE,
      uniformity: result.uniformity,
      defectCount: result.defectCount,
      foreignMatter: result.foreignMatter,
      autoResult: result.autoResult,
    });
    if (note) {
      setLlmNote(note);
      setLlmState("done");
    } else {
      setLlmState("unavailable");
    }
  }

  const refSwatch = labToCss({ L: spec.specL, a: spec.specA, b: spec.specB });
  const measuredSwatch = result
    ? labToCss({ L: result.measuredL, a: result.measuredA, b: result.measuredB })
    : "#fff";

  if (state.ok) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Inspection recorded</p>
            <p className="text-xs text-emerald-700">
              The intake status and audit trail have been updated. View it under Lots & Traceability or the Audit Trail.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      {/* Capture */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> Upload sample
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          <button onClick={() => genSample("good")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-emerald-50">
            In-spec sample
          </button>
          <button onClick={() => genSample("offcolour")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-rose-50">
            Off-colour
          </button>
          <button onClick={() => genSample("contaminated")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-rose-50">
            Contaminated
          </button>
        </div>

        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="QC sample" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <ScanLine className="h-8 w-8" />
              <p className="text-xs">Upload a photo or pick a demo sample to analyse</p>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <Swatch color={refSwatch} label="Reference spec" />
          {result && <Swatch color={measuredSwatch} label="Measured" />}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {!result ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">
            On-device computer vision will measure colour (ΔE2000), uniformity and foreign matter — no internet required.
          </div>
        ) : (
          <>
            <div
              className={`flex items-center justify-between rounded-xl p-4 ${
                result.autoResult === "PASS" ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-rose-50 ring-1 ring-rose-200"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.autoResult === "PASS" ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                ) : (
                  <XCircle className="h-7 w-7 text-rose-600" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${result.autoResult === "PASS" ? "text-emerald-800" : "text-rose-800"}`}>
                    AI verdict: {result.autoResult}
                  </p>
                  <p className="text-xs text-slate-500">{materialName} · {result.sampledPixels.toLocaleString()} px analysed</p>
                </div>
              </div>
            </div>

            <ul className="space-y-1.5">
              {result.checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-100">
                  <span className="flex items-center gap-2">
                    {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                    <span className="text-slate-700">{c.label}</span>
                  </span>
                  <span className={`font-mono text-xs ${c.ok ? "text-slate-500" : "text-rose-600"}`}>{c.value}</span>
                </li>
              ))}
            </ul>

            <div>
              <button
                onClick={runLlm}
                type="button"
                disabled={llmState === "loading"}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60"
              >
                {llmState === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Explain with LLM vision
              </button>
              {llmState === "done" && llmNote && (
                <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800 ring-1 ring-violet-100">{llmNote}</p>
              )}
              {llmState === "unavailable" && (
                <p className="mt-2 text-xs text-slate-400">
                  LLM layer unavailable (no API key) — on-device analysis stands alone.
                </p>
              )}
            </div>

            {/* Record / override */}
            {canInspect ? (
              <form action={action} className="space-y-3 border-t border-slate-100 pt-4">
                <input type="hidden" name="intakeId" value={intakeId} />
                <input type="hidden" name="method" value="ONDEVICE_CV" />
                <input type="hidden" name="measuredL" value={result.measuredL} />
                <input type="hidden" name="measuredA" value={result.measuredA} />
                <input type="hidden" name="measuredB" value={result.measuredB} />
                <input type="hidden" name="deltaE" value={result.deltaE} />
                <input type="hidden" name="uniformity" value={result.uniformity} />
                <input type="hidden" name="defectCount" value={result.defectCount} />
                <input type="hidden" name="foreignMatter" value={String(result.foreignMatter)} />
                <input type="hidden" name="autoResult" value={result.autoResult} />
                <input type="hidden" name="imageData" value={preview ?? ""} />
                <input type="hidden" name="aiNotes" value={llmNote ?? result.notes} />

                <div>
                  <label className={labelClass}>Manual override (optional)</label>
                  <select name="overrideResult" value={override} onChange={(e) => setOverride(e.target.value)} className={inputClass}>
                    <option value="">Accept AI verdict ({result.autoResult})</option>
                    <option value="PASS">Override → PASS</option>
                    <option value="FAIL">Override → FAIL</option>
                  </select>
                </div>
                {override && override !== result.autoResult && (
                  <div>
                    <label className={labelClass}>Override justification (required)</label>
                    <input name="overrideReason" placeholder="Reason for overriding the AI verdict…" className={inputClass} />
                  </div>
                )}
                <Feedback state={state} />
                <SubmitButton className="w-full">Record QC inspection</SubmitButton>
              </form>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                Switch to the QC Officer role to record this inspection.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-md ring-1 ring-slate-200" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function parseRgb(s: string): [number, number, number] {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s);
  if (!m) return [200, 200, 200];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
