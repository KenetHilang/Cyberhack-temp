import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, PageHeader, StatusBadge, Th, Td, EmptyState } from "@/components/ui";

export default async function LotsPage() {
  await requireUser();
  const lots = await prisma.lot.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      material: true,
      intake: { include: { supplier: true } },
      placements: { where: { removedAt: null }, include: { location: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Lots & traceability"
        description="Every finished lot is traceable end-to-end: supplier → intake → QC → production → storage → dispatch."
      />
      <Card>
        <CardHeader title="All lots" subtitle={`${lots.length} lots`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Lot</Th>
                <Th>Material</Th>
                <Th>Qty</Th>
                <Th>Status</Th>
                <Th>Source</Th>
                <Th>Location</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lots.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <Td className="font-mono text-xs font-medium text-slate-900">{l.lotNumber}</Td>
                  <Td>{l.material.name}</Td>
                  <Td>
                    {l.quantity}
                    {l.material.unit}
                  </Td>
                  <Td>
                    <StatusBadge status={l.status} />
                  </Td>
                  <Td className="text-slate-500">
                    {l.intake.code} · {l.intake.supplier.name}
                  </Td>
                  <Td className="text-slate-500">{l.placements[0]?.location.code ?? "—"}</Td>
                  <Td>
                    <Link href={`/lots/${l.id}`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                      Trace →
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {lots.length === 0 && <div className="p-5"><EmptyState message="No lots issued yet." /></div>}
        </div>
      </Card>
    </>
  );
}
