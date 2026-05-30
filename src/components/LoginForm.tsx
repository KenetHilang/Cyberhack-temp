"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { initial } from "@/lib/action-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
        <input
          name="email"
          type="email"
          defaultValue="admin@simaarome.com"
          autoComplete="username"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
        <input
          name="password"
          type="password"
          defaultValue="demo1234"
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
