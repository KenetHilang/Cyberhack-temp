import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardHeader, PageHeader, StatusBadge, Th, Td, EmptyState } from "@/components/ui";
import { IntakeForm } from "@/components/forms/IntakeForm";

export default async function IntakePage() {
  const user = await requireUser();
  const [intakes, suppliers, materials] = await Promise.all([
    prisma.intake.findMany({
      orderBy: { receivedAt: "desc" },
      include: { supplier: true, material: true, receivedBy: true, inspections: true },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.material.findMany({ orderBy: { name: "asc" } }),
  ]);

  const canCreate = can(user, "intake:create");

  return (
    <>
      <PageHeader
        title="Raw-material intake"
        description="Single point of entry for incoming deliveries — captured once, used everywhere."
      />

      {canCreate ? (
        <Card>
          <CardHeader title="Record new intake" subtitle="Generates a goods-received note (GRN) and starts the QC queue." />
          <IntakeForm
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
            materials={materials.map((m) => ({ id: m.id, name: m.name, unit: m.unit }))}
          />
        </Card>
      ) : (
        <EmptyState message="Only Warehouse Operators can record intakes. Switch role to try it." />
      )}

      <Card>
        <CardHeader title="All intakes" subtitle={`${intakes.length} records`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>GRN</Th>
                <Th>Material</Th>
                <Th>Supplier</Th>
                <Th>Qty</Th>
                <Th>Batch</Th>
                <Th>Status</Th>
                <Th>Received</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {intakes.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{it.code}</Td>
                  <Td>{it.material.name}</Td>
                  <Td>{it.supplier.name}</Td>
                  <Td>
                    {it.quantity}
                    {it.unit}
                  </Td>
                  <Td className="text-slate-500">{it.supplierBatch}</Td>
                  <Td>
                    <StatusBadge status={it.status} />
                  </Td>
                  <Td className="text-slate-500">{it.receivedAt.toLocaleDateString("en-GB")}</Td>
                  <Td>
                    {["RECEIVED", "IN_QC"].includes(it.status) && (
                      <Link href={`/qc/${it.id}`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                        Inspect →
                      </Link>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {intakes.length === 0 && <div className="p-5"><EmptyState message="No intakes yet." /></div>}
        </div>
      </Card>
    </>
  );
}
