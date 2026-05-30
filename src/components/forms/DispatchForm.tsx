"use client";

import { useActionState } from "react";
import { dispatchLotAction } from "@/app/actions";
import { initial } from "@/lib/action-state";
import { SubmitButton, Feedback, inputClass, labelClass } from "./controls";

type Lot = { id: string; lotNumber: string; materialName: string; quantity: number; unit: string };

export function DispatchForm({ lots }: { lots: Lot[] }) {
  const [state, action] = useActionState(dispatchLotAction, initial);
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClass}>Finished lot</label>
        <select name="lotId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select a finished, QC-passed lot…
          </option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>
              {l.lotNumber} — {l.materialName} ({l.quantity}
              {l.unit})
            </option>
          ))}
        </select>
        {lots.length === 0 && <p className="mt-1 text-xs text-amber-600">No finished lots available to dispatch.</p>}
      </div>
      <div>
        <label className={labelClass}>Customer</label>
        <input name="customerName" placeholder="e.g. Nusantara Flavours" className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Destination</label>
        <select name="destination" className={inputClass} defaultValue="LOCAL">
          <option value="LOCAL">Local</option>
          <option value="EXPORT">Export</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Quantity</label>
        <input name="quantity" type="number" step="any" min="0" className={inputClass} required />
      </div>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <Feedback state={state} />
        <SubmitButton>Dispatch lot</SubmitButton>
      </div>
    </form>
  );
}
