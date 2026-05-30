import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, PageHeader, StatusBadge, Pill } from "@/components/ui";
import {
  ArrowLeft,
  Truck,
  ScanLine,
  CalendarClock,
  Boxes,
  Warehouse,
  PackagePlus,
  ShieldCheck,
} from "lucide-react";

export default async function TracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      material: true,
      intake: { include: { supplier: true, receivedBy: true, inspections: { include: { inspectedBy: true } } } },
      schedule: { include: { createdBy: true } },
      placements: { include: { location: true, placedBy: true }, orderBy: { placedAt: "asc" } },
      dispatches: { include: { dispatchedBy: true } },
      createdBy: true,
    },
  });
  if (!lot) notFound();

  const ids = [
    lot.intake.id,
    ...lot.intake.inspections.map((i) => i.id),
    lot.schedule?.id,
    lot.id,
    ...lot.placements.map((p) => p.id),
    ...lot.dispatches.map((d) => d.id),
  ].filter(Boolean) as string[];

  const audit = await prisma.auditLog.findMany({ where: { entityId: { in: ids } }, orderBy: { seq: "asc" } });

  type Event = { icon: React.ElementType; tone: string; title: string; detail: string; who: string; when: Date };
  const events: Event[] = [];

  events.push({
    icon: PackagePlus,
    tone: "sky",
    title: `Received from ${lot.intake.supplier.name}`,
    detail: `${lot.intake.code} · ${lot.intake.quantity}${lot.intake.unit} · supplier batch ${lot.intake.supplierBatch}`,
    who: lot.intake.receivedBy.name,
    when: lot.intake.receivedAt,
  });

  for (const insp of lot.intake.inspections) {
    events.push({
      icon: ScanLine,
      tone: insp.result === "PASS" ? "emerald" : "rose",
      title: `QC ${insp.result}${insp.overridden ? " (manual override)" : ""}`,
      detail: `${insp.method === "ONDEVICE_CV" ? "On-device CV" : insp.method} · ΔE ${insp.deltaE}, uniformity ${insp.uniformity}%, ${insp.defectCount} defects${insp.foreignMatter ? ", foreign matter" : ""}`,
      who: insp.inspectedBy.name,
      when: insp.inspectedAt,
    });
  }

  if (lot.schedule) {
    events.push({
      icon: CalendarClock,
      tone: "violet",
      title: `Production scheduled (${lot.schedule.code})`,
      detail: `Planned ${lot.schedule.plannedQty}${lot.material.unit} · status ${lot.schedule.status}`,
      who: lot.schedule.createdBy.name,
      when: lot.schedule.createdAt,
    });
  }

  events.push({
    icon: Boxes,
    tone: "emerald",
    title: `Lot ${lot.lotNumber} issued`,
    detail: `${lot.quantity}${lot.material.unit} of ${lot.material.name}`,
    who: lot.createdBy.name,
    when: lot.createdAt,
  });

  for (const p of lot.placements) {
    events.push({
      icon: Warehouse,
      tone: "sky",
      title: `${p.removedAt ? "Was stored" : "Stored"} at ${p.location.code} (${p.location.zone})`,
      detail: p.removedAt ? `Removed ${p.removedAt.toLocaleString("en-GB")}` : "Currently in storage",
      who: p.placedBy.name,
      when: p.placedAt,
    });
  }

  for (const d of lot.dispatches) {
    events.push({
      icon: Truck,
      tone: "violet",
      title: `Dispatched to ${d.customerName}`,
      detail: `${d.code} · ${d.destination} · ${d.quantity}${lot.material.unit}`,
      who: d.dispatchedBy.name,
      when: d.dispatchedAt,
    });
  }

  events.sort((a, b) => a.when.getTime() - b.when.getTime());

  const toneText: Record<string, string> = {
    sky: "bg-sky-100 text-sky-600",
    emerald: "bg-emerald-100 text-emerald-600",
    violet: "bg-violet-100 text-violet-600",
    rose: "bg-rose-100 text-rose-600",
  };

  return (
    <>
      <div>
        <Link href="/lots" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to lots
        </Link>
        <PageHeader title={lot.lotNumber} description={`${lot.material.name} · ${lot.quantity}${lot.material.unit}`}>
          <StatusBadge status={lot.status} />
        </PageHeader>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Full genealogy" subtitle="Supplier → intake → QC → production → storage → dispatch" />
          <ol className="relative space-y-5 p-5 pl-8">
            <span className="absolute left-[1.85rem] top-7 bottom-7 w-px bg-slate-200" />
            {events.map((e, i) => {
              const Icon = e.icon;
              return (
                <li key={i} className="relative flex gap-3">
                  <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneText[e.tone]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-slate-900">{e.title}</p>
                    <p className="text-xs text-slate-500">{e.detail}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {e.who} · {e.when.toLocaleString("en-GB")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card>
          <CardHeader
            title="Audit chain"
            subtitle="Hash-chained events for this lot"
            action={
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" /> verified
              </span>
            }
          />
          <ul className="space-y-2 p-5">
            {audit.map((a) => (
              <li key={a.id} className="rounded-lg bg-slate-50 p-2.5 text-xs ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <Pill tone="slate">#{a.seq}</Pill>
                  <span className="font-mono text-[10px] text-slate-400">…{a.hash.slice(-10)}</span>
                </div>
                <p className="mt-1 text-slate-600">{a.action}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
