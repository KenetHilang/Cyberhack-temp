import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyChain } from "@/lib/audit";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/lib/rbac";
import { Card, CardHeader, StatCard, PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";
import {
  ScanLine,
  PackageCheck,
  Snowflake,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default async function Dashboard() {
  const user = await requireUser();

  const [awaitingQc, passed, failed, finishedLots, running, dispatched, totalIntakes, coldLocs, chain, recent] =
    await Promise.all([
      prisma.intake.count({ where: { status: { in: ["RECEIVED", "IN_QC"] } } }),
      prisma.intake.count({ where: { status: "PASSED" } }),
      prisma.intake.count({ where: { status: "FAILED" } }),
      prisma.lot.count({ where: { status: "FINISHED" } }),
      prisma.productionSchedule.count({ where: { status: "RUNNING" } }),
      prisma.lot.count({ where: { status: "DISPATCHED" } }),
      prisma.intake.count(),
      prisma.storageLocation.findMany({
        where: { zone: "COLD" },
        include: { temps: { orderBy: { recordedAt: "desc" }, take: 1 } },
      }),
      verifyChain(),
      prisma.auditLog.findMany({ orderBy: { seq: "desc" }, take: 7 }),
    ]);

  const coldAlerts = coldLocs.filter((l) => l.temps[0]?.alert).length;
  const myPerms = (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
    (PERMISSIONS[p] as readonly string[]).includes(user.role)
  );

  const pipeline = [
    { label: "Intake", value: totalIntakes, href: "/intake" },
    { label: "Awaiting QC", value: awaitingQc, href: "/qc" },
    { label: "QC Passed", value: passed, href: "/qc" },
    { label: "In Production", value: running, href: "/schedule" },
    { label: "Finished", value: finishedLots, href: "/lots" },
    { label: "Dispatched", value: dispatched, href: "/dispatch" },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`${ROLE_LABELS[user.role]} · Sima Arome production operations at a glance.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Awaiting QC" value={awaitingQc} hint="raw intakes pending inspection" tone="amber" icon={<ScanLine className="h-4 w-4" />} />
        <StatCard label="Cleared for production" value={passed} hint="QC-passed intakes" tone="emerald" icon={<PackageCheck className="h-4 w-4" />} />
        <StatCard
          label="Cold-chain alerts"
          value={coldAlerts}
          hint={`${coldLocs.length} cold cells monitored`}
          tone={coldAlerts > 0 ? "rose" : "sky"}
          icon={<Snowflake className="h-4 w-4" />}
        />
        <StatCard
          label="Audit chain"
          value={chain.valid ? "Verified" : "Broken"}
          hint={`${chain.total} hash-chained events`}
          tone={chain.valid ? "emerald" : "rose"}
          icon={chain.valid ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        />
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader title="Production pipeline" subtitle="One source of truth across the chain — no double entry." />
        <div className="flex flex-wrap items-center gap-2 p-5">
          {pipeline.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-2">
              <Link
                href={stage.href}
                className="flex min-w-[110px] flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-xl font-semibold text-slate-900">{stage.value}</span>
                <span className="text-xs text-slate-500">{stage.label}</span>
              </Link>
              {i < pipeline.length - 1 && <ArrowRight className="h-4 w-4 text-slate-300" />}
            </div>
          ))}
          {failed > 0 && (
            <div className="ml-auto flex flex-col rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <span className="text-xl font-semibold text-rose-700">{failed}</span>
              <span className="text-xs text-rose-600">QC-failed · blocked</span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            subtitle="From the tamper-evident audit trail"
            action={
              <Link href="/audit" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                View all →
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {recent.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                  #{e.seq}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{e.summary}</p>
                  <p className="text-xs text-slate-400">
                    {e.actorName} · {e.createdAt.toLocaleString("en-GB")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Role capabilities */}
        <Card>
          <CardHeader title="Your permissions" subtitle={ROLE_LABELS[user.role]} />
          <div className="space-y-2 p-5">
            {myPerms.length === 0 && <EmptyState message="View-only access." />}
            {myPerms.map((p) => (
              <div key={p} className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {PERMISSION_LABELS[p]}
              </div>
            ))}
            <p className="pt-2 text-xs text-slate-400">
              Actions outside these permissions are blocked server-side and logged.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
