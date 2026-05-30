import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { Inspector } from "@/components/qc/Inspector";
import { ArrowLeft } from "lucide-react";

export default async function InspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const intake = await prisma.intake.findUnique({
    where: { id },
    include: { material: true, supplier: true, inspections: { orderBy: { inspectedAt: "desc" } } },
  });
  if (!intake) notFound();

  const m = intake.material;
  const open = ["RECEIVED", "IN_QC"].includes(intake.status);
  const canInspect = can(user, "qc:inspect");

  return (
    <>
      <div>
        <Link href="/qc" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
        </Link>
        <PageHeader title={`Inspect ${intake.code}`} description={`${m.name} · ${intake.quantity}${intake.unit} from ${intake.supplier.name}`}>
          <StatusBadge status={intake.status} />
        </PageHeader>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SpecItem label="Reference ΔE tolerance" value={`≤ ${m.toleranceDeltaE}`} />
        <SpecItem label="Min uniformity" value={`${m.minUniformity}%`} />
        <SpecItem label="Max defect regions" value={`${m.maxDefects}`} />
      </div>

      <Card>
        <CardHeader
          title="Computer-vision inspection"
          subtitle="On-device ΔE2000 colour matching + spatial uniformity & foreign-matter analysis"
        />
        {open ? (
          <Inspector
            intakeId={intake.id}
            materialId={m.id}
            materialName={m.name}
            canInspect={canInspect}
            spec={{
              specL: m.specL,
              specA: m.specA,
              specB: m.specB,
              toleranceDeltaE: m.toleranceDeltaE,
              minUniformity: m.minUniformity,
              maxDefects: m.maxDefects,
            }}
          />
        ) : (
          <div className="space-y-3 p-5">
            <p className="text-sm text-slate-500">
              This intake has already been inspected and is now <StatusBadge status={intake.status} />.
            </p>
            {intake.inspections[0] && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-100">
                <p className="font-medium text-slate-800">
                  {intake.inspections[0].result} — ΔE {intake.inspections[0].deltaE}, uniformity {intake.inspections[0].uniformity}%, {intake.inspections[0].defectCount} defects
                </p>
                <p className="mt-1 text-xs text-slate-500">{intake.inspections[0].aiNotes}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
