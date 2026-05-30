"use client";

import { useActionState } from "react";
import { advanceScheduleAction } from "@/app/actions";
import { initial } from "@/lib/action-state";
import { useFormStatus } from "react-dom";

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function AdvanceButton({ scheduleId, status }: { scheduleId: string; status: string }) {
  const [state, action] = useActionState(advanceScheduleAction, initial);
  if (status === "DONE") return <span className="text-xs text-slate-400">Completed</span>;
  const label = status === "PLANNED" ? "Start run" : "Complete & issue lot";
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <Btn label={label} />
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
      {state.ok && state.message && <span className="text-xs text-emerald-600">{state.message}</span>}
    </form>
  );
}
