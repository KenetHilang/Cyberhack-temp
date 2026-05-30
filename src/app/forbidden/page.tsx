import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Your role does not have permission to view this page. This restriction is enforced by
        role-based access control and recorded in the audit trail.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
