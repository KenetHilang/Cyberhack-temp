"use client";

import { useActionState } from "react";
import { createIntakeAction } from "@/app/actions";
import { initial } from "@/lib/action-state";
import { SubmitButton, Feedback, inputClass, labelClass } from "./controls";

type Option = { id: string; name: string; code?: string; unit?: string };

export function IntakeForm({
  suppliers,
  materials,
}: {
  suppliers: Option[];
  materials: Option[];
}) {
  const [state, action] = useActionState(createIntakeAction, initial);
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Supplier</label>
        <select name="supplierId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select supplier…
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Material</label>
        <select name="materialId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select material…
          </option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Quantity</label>
        <input name="quantity" type="number" step="any" min="0" placeholder="e.g. 240" className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Supplier batch no.</label>
        <input name="supplierBatch" placeholder="e.g. KRN-TUR-2403" className={inputClass} required />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Notes (optional)</label>
        <input name="notes" placeholder="Condition on arrival…" className={inputClass} />
      </div>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <Feedback state={state} />
        <SubmitButton>Record intake</SubmitButton>
      </div>
    </form>
  );
}
