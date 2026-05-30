import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, PageHeader, StatusBadge, Pill, Th, Td, EmptyState } from "@/components/ui";
import { ScanLine } from "lucide-react";

export default async function QcQueuePage() {
  await requireUser();
  const [queue, recent] = await Promise.all([
    prisma.intake.findMany({
      where: { status: { in: ["RECEIVED", "IN_QC"] } },
      orderBy: { receivedAt: "asc" },
      include: { material: true, supplier: true },
    }),
    prisma.qcInspection.findMany({
      orderBy: { inspectedAt: "desc" },
      take: 10,
      include: { intake: { include: { material: true } }, inspectedBy: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="AI Quality Control"
        description="Computer-vision inspection of incoming fruit, botanicals & extract powders — colour, uniformity, foreign matter."
      />

      <Card>
        <CardHeader title="Inspection queue" subtitle={`${queue.length} intakes awaiting QC`} />
        {queue.length === 0 ? (
          <div className="p-5">
            <EmptyState message="Queue is clear — no intakes awaiting inspection." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <ScanLine className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {it.material.name} <span className="text-slate-400">· {it.code}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {it.quantity}
                      {it.unit} · {it.supplier.name} · batch {it.supplierBatch}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/qc/${it.id}`}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Inspect
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent inspections" subtitle="Auditable QC history" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Intake</Th>
                <Th>Material</Th>
                <Th>Method</Th>
                <Th>ΔE2000</Th>
                <Th>Uniformity</Th>
                <Th>Defects</Th>
                <Th>Verdict</Th>
                <Th>Inspector</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{i.intake.code}</Td>
                  <Td>{i.intake.material.name}</Td>
                  <Td>
                    <Pill tone={i.method === "ONDEVICE_CV" ? "sky" : i.method === "LLM_VISION" ? "violet" : "slate"}>
                      {i.method === "ONDEVICE_CV" ? "On-device CV" : i.method === "LLM_VISION" ? "LLM vision" : "Manual"}
                    </Pill>
                  </Td>
                  <Td className="font-mono text-xs">{i.deltaE}</Td>
                  <Td className="font-mono text-xs">{i.uniformity}%</Td>
                  <Td className="font-mono text-xs">{i.defectCount}{i.foreignMatter ? " ⚠" : ""}</Td>
                  <Td>
                    <StatusBadge status={i.result} />
                    {i.overridden && <span className="ml-1 text-[10px] text-amber-600">(override)</span>}
                  </Td>
                  <Td className="text-slate-500">{i.inspectedBy.name}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <div className="p-5"><EmptyState message="No inspections recorded yet." /></div>}
        </div>
      </Card>
    </>
  );
}
