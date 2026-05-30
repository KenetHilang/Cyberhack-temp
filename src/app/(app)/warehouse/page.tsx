import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/cn";
import { Card, CardHeader, PageHeader, Pill, EmptyState } from "@/components/ui";
import { PlaceLotForm, TempForm } from "@/components/forms/WarehouseForms";
import { Snowflake, Flame, Package, AlertTriangle } from "lucide-react";

const zoneCell: Record<string, string> = {
  AMBIENT: "border-slate-200 bg-white",
  COLD: "border-sky-200 bg-sky-50",
  HAZMAT: "border-amber-300 bg-amber-50",
};

export default async function WarehousePage() {
  const user = await requireUser();
  const [locations, placeable, coldLocs] = await Promise.all([
    prisma.storageLocation.findMany({
      orderBy: [{ row: "asc" }, { col: "asc" }],
      include: {
        placements: { where: { removedAt: null }, include: { lot: { include: { material: true } } } },
        temps: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    }),
    prisma.lot.findMany({ where: { status: "FINISHED" }, include: { material: true } }),
    prisma.storageLocation.findMany({ where: { zone: "COLD" }, orderBy: { code: "asc" } }),
  ]);

  const canPlace = can(user, "lot:place");
  const rows = [...new Set(locations.map((l) => l.row))].sort((a, b) => a - b);
  const cols = Math.max(...locations.map((l) => l.col)) + 1;

  return (
    <>
      <PageHeader
        title="Warehouse & cold-chain"
        description="Smart slotting with automatic cold-chain and hazard segregation, plus live temperature monitoring."
      />

      <Card>
        <CardHeader
          title="Floor plan"
          subtitle="Live occupancy & zone map"
          action={
            <div className="flex items-center gap-2 text-xs">
              <Pill tone="slate">Ambient</Pill>
              <Pill tone="sky">
                <Snowflake className="h-3 w-3" /> Cold
              </Pill>
              <Pill tone="amber">
                <Flame className="h-3 w-3" /> Hazmat
              </Pill>
            </div>
          }
        />
        <div className="overflow-x-auto p-5">
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r} className="flex gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {locations
                  .filter((l) => l.row === r)
                  .map((l) => {
                    const occ = l.placements[0];
                    const temp = l.temps[0];
                    const alert = temp?.alert;
                    return (
                      <div
                        key={l.id}
                        className={cn(
                          "flex h-24 w-28 shrink-0 flex-col rounded-lg border p-2 text-xs",
                          zoneCell[l.zone],
                          alert && "ring-2 ring-rose-400"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">{l.code}</span>
                          {l.zone === "COLD" && <Snowflake className="h-3 w-3 text-sky-500" />}
                          {l.zone === "HAZMAT" && <Flame className="h-3 w-3 text-amber-600" />}
                        </div>
                        {occ ? (
                          <div className="mt-1 flex flex-1 flex-col justify-center rounded bg-white/70 px-1.5 py-1 ring-1 ring-slate-200">
                            <span className="flex items-center gap-1 font-mono text-[10px] font-medium text-emerald-700">
                              <Package className="h-3 w-3" />
                              {occ.lot.lotNumber.replace("LOT-2026-", "L-")}
                            </span>
                            <span className="truncate text-[10px] text-slate-500">{occ.lot.material.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-1 items-center justify-center text-[10px] text-slate-300">empty</div>
                        )}
                        {l.zone === "COLD" && (
                          <span className={cn("mt-0.5 text-[10px] font-medium", alert ? "text-rose-600" : "text-sky-600")}>
                            {temp ? `${temp.tempC}°C` : "—"} {alert && "⚠"}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Place a lot" subtitle="Slot a finished lot into the warehouse" />
          {canPlace ? (
            <PlaceLotForm
              lots={placeable.map((l) => ({
                id: l.id,
                lotNumber: l.lotNumber,
                materialName: l.material.name,
                tag: l.material.hazardClass
                  ? `(${l.material.hazardClass})`
                  : l.material.requiresColdChain
                  ? "(cold-chain)"
                  : "",
              }))}
              locations={locations.map((l) => ({ id: l.id, code: l.code, zone: l.zone }))}
            />
          ) : (
            <div className="p-5">
              <EmptyState message="Only Warehouse Operators can place lots." />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Cold-chain monitor" subtitle="Log a sensor reading (−4°C to −20°C range)" />
          {canPlace ? (
            <TempForm coldLocations={coldLocs.map((l) => ({ id: l.id, code: l.code, zone: l.zone }))} />
          ) : (
            <div className="p-5">
              <EmptyState message="Only Warehouse Operators can log readings." />
            </div>
          )}
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {locations
              .filter((l) => l.zone === "COLD")
              .map((l) => {
                const t = l.temps[0];
                return (
                  <li key={l.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Snowflake className="h-3.5 w-3.5 text-sky-500" /> {l.code}
                      <span className="text-xs text-slate-400">
                        ({l.coldMinC}°C to {l.coldMaxC}°C)
                      </span>
                    </span>
                    {t ? (
                      <span className={cn("flex items-center gap-1 font-mono text-xs", t.alert ? "text-rose-600" : "text-slate-600")}>
                        {t.alert && <AlertTriangle className="h-3.5 w-3.5" />}
                        {t.tempC}°C
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">no data</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </Card>
      </div>
    </>
  );
}
