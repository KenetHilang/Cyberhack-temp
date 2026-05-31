import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { demoLoginAction } from "@/app/actions";
import { LoginForm } from "@/components/LoginForm";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/constants";
import { Leaf, ShieldCheck, ScanLine, ClipboardCheck } from "lucide-react";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / value prop */}
      <div className="relative hidden bg-cover bg-center p-10 text-white lg:block bg-[url('/warehouse.webp')]">
        
        {/* The Greenish Overlay */}
        <div className="absolute inset-0 bg-emerald-950/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-emerald-900/60" />

        {/* Content Wrapper (z-10 ensures it sits above the overlay) */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight">AromaFlow</span>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold leading-tight">
              One source of truth for natural-extract manufacturing.
            </h1>
            <p className="mt-4 max-w-md text-emerald-100">
              From supplier intake to AI quality control, lot traceability and customer dispatch —
              with role-based access and a tamper-evident audit trail on every action.
            </p>
            <div className="mt-8 space-y-3 text-sm text-emerald-50">
              <Feature icon={<ScanLine className="h-4 w-4" />} text="AI computer-vision QC (ΔE2000 colour science)" />
              <Feature icon={<ClipboardCheck className="h-4 w-4" />} text="Full lot genealogy: supplier → dispatch" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} text="RBAC + hash-chained audit log" />
            </div>
          </div>
          
          <p className="text-xs text-emerald-200">Built for Sima Arome · CyberHack 2026</p>
        </div>
      </div>

      {/* Auth */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* ... Rest of your right-side auth code stays exactly the same ... */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Leaf className="h-6 w-6 text-emerald-600" />
            <span className="text-lg font-semibold text-slate-900">AromaFlow</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use the demo credentials below, or jump in as any role.</p>

          <div className="mt-6">
            <LoginForm />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            quick demo login
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 gap-2">
            {ROLES.map((role) => (
              <form key={role} action={demoLoginAction}>
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                >
                  <span>
                    <span className="font-medium text-slate-800">{ROLE_LABELS[role]}</span>
                    <span className="block text-xs text-slate-500">{ROLE_DESCRIPTIONS[role]}</span>
                  </span>
                  <span className="text-xs font-medium text-emerald-600">Enter →</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">{icon}</span>
      {text}
    </div>
  );
}