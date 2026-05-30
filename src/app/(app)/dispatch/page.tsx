import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardHeader, PageHeader, Pill, Th, Td, EmptyState } from "@/components/ui";
import { DispatchForm } from "@/components/forms/DispatchForm";

export default async function DispatchPage() {
  const user = await requireUser();
  const [finished, dispatches] = await Promise.all([
    prisma.lot.findMany({ where: { status: "FINISHED" }, include: { material: true } }),
    prisma.dispatch.findMany({
      orderBy: { dispatchedAt: "desc" },
      include: { lot: { include: { material: true } }, dispatchedBy: true },
    }),
  ]);

  const canDispatch = can(user, "dispatch:create");

  return (
    <>
      <PageHeader
        title="Dispatch"
        description="Ship finished goods to customers. Only QC-passed, finished lots can be dispatched."
      />

      {canDispatch ? (
        <Card>
          <CardHeader title="New dispatch" subtitle="Local or export shipment" />
          <DispatchForm
            lots={finished.map((l) => ({
              id: l.id,
              lotNumber: l.lotNumber,
              materialName: l.material.name,
              quantity: l.quantity,
              unit: l.material.unit,
            }))}
          />
        </Card>
      ) : (
        <EmptyState message="Only Dispatch Officers can ship lots. Switch role to try it." />
      )}

      <Card>
        <CardHeader title="Dispatch history" subtitle={`${dispatches.length} shipments`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Shipment</Th>
                <Th>Lot</Th>
                <Th>Material</Th>
                <Th>Customer</Th>
                <Th>Destination</Th>
                <Th>Qty</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispatches.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{d.code}</Td>
                  <Td className="font-mono text-xs">{d.lot.lotNumber}</Td>
                  <Td>{d.lot.material.name}</Td>
                  <Td>{d.customerName}</Td>
                  <Td>
                    <Pill tone={d.destination === "EXPORT" ? "violet" : "sky"}>{d.destination}</Pill>
                  </Td>
                  <Td>
                    {d.quantity}
                    {d.lot.material.unit}
                  </Td>
                  <Td className="text-slate-500">{d.dispatchedAt.toLocaleDateString("en-GB")}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {dispatches.length === 0 && <div className="p-5"><EmptyState message="No dispatches yet." /></div>}
        </div>
      </Card>
    </>
  );
}
