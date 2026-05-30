"use client";

import { useActionState } from "react";
import { createScheduleAction } from "@/app/actions";
import { initial } from "@/lib/action-state";
import { SubmitButton, Feedback, inputClass, labelClass } from "./controls";

type Intake = { id: string; code: string; materialName: string; quantity: number; unit: string };

export function ScheduleForm({ intakes }: { intakes: Intake[] }) {
  const [state, action] = useActionState(createScheduleAction, initial);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClass}>QC-passed intake</label>
        <select name="intakeId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select cleared stock…
          </option>
          {intakes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.code} — {i.materialName} ({i.quantity}
              {i.unit})
            </option>
          ))}
        </select>
        {intakes.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">No QC-passed stock available. Only passed intakes can be scheduled.</p>
        )}
      </div>
      <div>
        <label className={labelClass}>Planned quantity</label>
        <input name="plannedQty" type="number" step="any" min="0" className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Start</label>
          <input name="scheduledStart" type="date" defaultValue={today} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End</label>
          <input name="scheduledEnd" type="date" defaultValue={tomorrow} className={inputClass} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <Feedback state={state} />
        <SubmitButton>Schedule production</SubmitButton>
      </div>
    </form>
  );
}
