"use client";

import { useActionState } from "react";
import { placeLotAction, recordTemperatureAction } from "@/app/actions";
import { initial } from "@/lib/action-state";
import { SubmitButton, Feedback, inputClass, labelClass } from "./controls";

type Lot = { id: string; lotNumber: string; materialName: string; tag: string };
type Loc = { id: string; code: string; zone: string };

export function PlaceLotForm({ lots, locations }: { lots: Lot[]; locations: Loc[] }) {
  const [state, action] = useActionState(placeLotAction, initial);
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Lot</label>
        <select name="lotId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select lot…
          </option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>
              {l.lotNumber} — {l.materialName} {l.tag}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Location</label>
        <select name="locationId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select cell…
          </option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code} ({l.zone})
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <Feedback state={state} />
        <SubmitButton>Place lot</SubmitButton>
      </div>
      <p className="sm:col-span-2 -mt-2 text-xs text-slate-400">
        Cold-chain and hazard-segregation rules are enforced automatically — incompatible placements are rejected.
      </p>
    </form>
  );
}

export function TempForm({ coldLocations }: { coldLocations: Loc[] }) {
  const [state, action] = useActionState(recordTemperatureAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 p-5">
      <div className="min-w-[140px]">
        <label className={labelClass}>Cold cell</label>
        <select name="locationId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Cell…
          </option>
          {coldLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label className={labelClass}>Temp °C</label>
        <input name="tempC" type="number" step="any" placeholder="-12" className={inputClass} required />
      </div>
      <SubmitButton intent="neutral">Log reading</SubmitButton>
      <div className="w-full">
        <Feedback state={state} />
      </div>
    </form>
  );
}
