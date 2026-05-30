import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardHeader, PageHeader, StatusBadge, Th, Td, EmptyState } from "@/components/ui";
import { ScheduleForm } from "@/components/forms/ScheduleForm";
import { AdvanceButton } from "@/components/forms/AdvanceButton";

export default async function SchedulePage() {
  const user = await requireUser();
  const [available, schedules] = await Promise.all([
    prisma.intake.findMany({
      where: { status: "PASSED", schedules: { none: {} } },
      include: { material: true },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.productionSchedule.findMany({
      orderBy: { createdAt: "desc" },
      include: { material: true, intake: true, createdBy: true, lots: true },
    }),
  ]);

  const canCreate = can(user, "schedule:create");
  const canAdvance = can(user, "schedule:advance");

  return (
    <>
      <PageHeader
        title="Production planning (PPIC)"
        description="Schedule production only from QC-passed stock. The system blocks anything that hasn't cleared QC."
      />

      {canCreate ? (
        <Card>
          <CardHeader title="Schedule production" subtitle="Pick cleared stock and issue a production order." />
          <ScheduleForm
            intakes={available.map((i) => ({
              id: i.id,
              code: i.code,
              materialName: i.material.name,
              quantity: i.quantity,
              unit: i.unit,
            }))}
          />
        </Card>
      ) : (
        <EmptyState message="Only PPIC Planners can schedule production. Switch role to try it." />
      )}

      <Card>
        <CardHeader title="Production orders" subtitle={`${schedules.length} orders`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>PO</Th>
                <Th>Material</Th>
                <Th>From intake</Th>
                <Th>Planned</Th>
                <Th>Status</Th>
                <Th>Lot issued</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{s.code}</Td>
                  <Td>{s.material.name}</Td>
                  <Td className="text-slate-500">{s.intake.code}</Td>
                  <Td>{s.plannedQty}</Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td className="font-mono text-xs text-slate-600">{s.lots[0]?.lotNumber ?? "—"}</Td>
                  <Td>{canAdvance && <AdvanceButton scheduleId={s.id} status={s.status} />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {schedules.length === 0 && <div className="p-5"><EmptyState message="No production orders yet." /></div>}
        </div>
      </Card>
    </>
  );
}
