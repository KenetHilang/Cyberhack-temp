import { PrismaClient } from "@prisma/client";
import {
  createIntake,
  recordInspection,
  createSchedule,
  advanceSchedule,
  placeLot,
  dispatchLot,
} from "../src/lib/services";
import { verifyChain } from "../src/lib/audit";
import type { SessionUser } from "../src/lib/auth";
import type { Role } from "../src/lib/constants";

const prisma = new PrismaClient();
let pass = 0;
let fail = 0;

function ok(name: string) {
  pass++;
  console.log(`  ✓ ${name}`);
}
function bad(name: string, msg: string) {
  fail++;
  console.log(`  ✗ ${name} — ${msg}`);
}

async function expectBlocked(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    bad(name, "expected a policy/authorization error but it succeeded");
  } catch (e) {
    ok(`${name} (blocked: ${(e as Error).message.slice(0, 60)}…)`);
  }
}

async function main() {
  const users = await prisma.user.findMany();
  const by = (r: Role): SessionUser => {
    const u = users.find((x) => x.role === r)!;
    return { id: u.id, name: u.name, email: u.email, role: r };
  };
  const wh = by("WAREHOUSE"), qc = by("QC"), ppic = by("PPIC"), disp = by("DISPATCH");

  const turmeric = await prisma.material.findFirstOrThrow({ where: { sku: "PWD-TUR" } });
  const clove = await prisma.material.findFirstOrThrow({ where: { sku: "EXT-CLV" } }); // flammable
  const supplier = await prisma.supplier.findFirstOrThrow();

  console.log("\nGolden path:");
  const intake = await createIntake(wh, {
    supplierId: supplier.id,
    materialId: turmeric.id,
    quantity: 100,
    supplierBatch: "SMOKE-001",
  });
  ok(`intake created ${intake.code}`);

  await recordInspection(qc, {
    intakeId: intake.id,
    method: "ONDEVICE_CV",
    measuredL: turmeric.specL,
    measuredA: turmeric.specA,
    measuredB: turmeric.specB,
    deltaE: 1.2,
    uniformity: 92,
    defectCount: 0,
    foreignMatter: false,
    autoResult: "PASS",
  });
  ok("QC PASS recorded");

  const sched = await createSchedule(ppic, {
    intakeId: intake.id,
    plannedQty: 100,
    scheduledStart: new Date(),
    scheduledEnd: new Date(Date.now() + 86400000),
  });
  ok(`scheduled ${sched.code}`);

  await advanceSchedule(ppic, sched.id); // PLANNED -> RUNNING
  const done = await advanceSchedule(ppic, sched.id); // RUNNING -> DONE + lot
  ok(`lot issued ${"lotNumber" in done ? done.lotNumber : ""}`);

  const lot = await prisma.lot.findFirstOrThrow({ where: { scheduleId: sched.id } });
  const ambient = await prisma.storageLocation.findFirstOrThrow({ where: { zone: "AMBIENT", placements: { none: { removedAt: null } } } });
  await placeLot(wh, { lotId: lot.id, locationId: ambient.id });
  ok(`placed ${lot.lotNumber} at ${ambient.code}`);

  await dispatchLot(disp, { lotId: lot.id, customerName: "Smoke Test Co", destination: "LOCAL", quantity: 50 });
  ok("dispatched");

  console.log("\nPolicy & RBAC enforcement:");
  // RBAC: warehouse cannot inspect
  await expectBlocked("warehouse cannot run QC", () =>
    recordInspection(wh, {
      intakeId: intake.id, method: "ONDEVICE_CV", measuredL: 1, measuredA: 1, measuredB: 1,
      deltaE: 1, uniformity: 90, defectCount: 0, foreignMatter: false, autoResult: "PASS",
    })
  );

  // Policy: cannot schedule a FAILED intake
  const failed = await prisma.intake.findFirst({ where: { status: "FAILED" } });
  if (failed) {
    await expectBlocked("cannot schedule QC-failed intake", () =>
      createSchedule(ppic, { intakeId: failed.id, plannedQty: 10, scheduledStart: new Date(), scheduledEnd: new Date() })
    );
  }

  // Policy: cannot dispatch a non-finished (already dispatched) lot
  await expectBlocked("cannot re-dispatch a dispatched lot", () =>
    dispatchLot(disp, { lotId: lot.id, customerName: "x", destination: "LOCAL", quantity: 1 })
  );

  // Policy: flammable material cannot go in an ambient cell
  const cloveIntake = await createIntake(wh, { supplierId: supplier.id, materialId: clove.id, quantity: 20, supplierBatch: "SMOKE-CLV" });
  await recordInspection(qc, {
    intakeId: cloveIntake.id, method: "ONDEVICE_CV", measuredL: clove.specL, measuredA: clove.specA, measuredB: clove.specB,
    deltaE: 1, uniformity: 90, defectCount: 0, foreignMatter: false, autoResult: "PASS",
  });
  const cloveSched = await createSchedule(ppic, { intakeId: cloveIntake.id, plannedQty: 20, scheduledStart: new Date(), scheduledEnd: new Date() });
  await advanceSchedule(ppic, cloveSched.id);
  await advanceSchedule(ppic, cloveSched.id);
  const cloveLot = await prisma.lot.findFirstOrThrow({ where: { scheduleId: cloveSched.id } });
  const ambient2 = await prisma.storageLocation.findFirstOrThrow({ where: { zone: "AMBIENT", placements: { none: { removedAt: null } } } });
  await expectBlocked("flammable lot blocked from ambient cell", () =>
    placeLot(wh, { lotId: cloveLot.id, locationId: ambient2.id })
  );

  console.log("\nAudit integrity:");
  const chain = await verifyChain();
  if (chain.valid) ok(`hash chain verified across ${chain.total} events`);
  else bad("hash chain", `broken at #${chain.brokenAtSeq}`);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
