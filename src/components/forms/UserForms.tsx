"use client";

import { useActionState } from "react";
import { createUserAction, setUserActiveAction } from "@/app/actions";
import { initial } from "@/lib/action-state";
import { useFormStatus } from "react-dom";
import { SubmitButton, Feedback, inputClass, labelClass } from "./controls";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export function UserForm() {
  const [state, action] = useActionState(createUserAction, initial);
  return (
    <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Name</label>
        <input name="name" className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input name="email" type="email" className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Role</label>
        <select name="role" className={inputClass} defaultValue="WAREHOUSE">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Temp. password</label>
        <input name="password" placeholder="demo1234" className={inputClass} />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <Feedback state={state} />
        <SubmitButton>Create user</SubmitButton>
      </div>
    </form>
  );
}

function ToggleBtn({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset disabled:opacity-60 ${
        active
          ? "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
      }`}
    >
      {pending ? "…" : active ? "Deactivate" : "Activate"}
    </button>
  );
}

export function ToggleUser({ userId, active }: { userId: string; active: boolean }) {
  const [, action] = useActionState(setUserActiveAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={String(!active)} />
      <ToggleBtn active={active} />
    </form>
  );
}
