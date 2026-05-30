"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/action-state";

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50";

export const labelClass = "mb-1 block text-xs font-medium text-slate-600";

export function SubmitButton({
  children,
  className,
  intent = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  intent?: "primary" | "neutral" | "danger";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    neutral: "bg-slate-800 text-white hover:bg-slate-900",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
        styles[intent],
        className
      )}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function Feedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
        {state.error}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
        {state.message}
      </p>
    );
  return null;
}
