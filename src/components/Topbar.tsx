import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { demoLoginAction, logout } from "@/app/actions";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">
        Signed in as <span className="font-medium text-slate-800">{user.name}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Role switcher — demo affordance to show RBAC quickly */}
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <span className="flex h-5 items-center rounded bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-700">
              {ROLE_LABELS[user.role]}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Switch role (demo)
            </p>
            {ROLES.map((role) => (
              <form key={role} action={demoLoginAction}>
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <UserRound className="h-3.5 w-3.5 text-slate-400" />
                  {ROLE_LABELS[role]}
                </button>
              </form>
            ))}
          </div>
        </details>

        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
