import { prisma } from "./db";
import { recordAudit } from "./audit";
import { assertCan } from "./rbac";
import { PolicyError } from "./errors";
import { hashPassword } from "./password";
import type { SessionUser } from "./auth";
import type { Role } from "./constants";

const pad = (n: number) => String(n).padStart(4, "0");
const round = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------
export async function createIntake(
  user: SessionUser,
  input: { supplierId: string; materialId: string; quantity: number; supplierBatch: string; notes?: string }
) {
  assertCan(user, "intake:create");
  if (!input.supplierId || !input.materialId) throw new PolicyError("Supplier and material are required.");
  if (!(input.quantity > 0)) throw new PolicyError("Quantity must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    const material = await tx.material.findUniqueOrThrow({ where: { id: input.materialId } });
    const n = (await tx.intake.count()) + 1;
    const intake = await tx.intake.create({
      data: {
        code: `GRN-2026-${pad(n)}`,
        supplierId: input.supplierId,
        materialId: input.materialId,
        quantity: input.quantity,
        unit: material.unit,
        supplierBatch: input.supplierBatch,
        status: "RECEIVED",
        receivedById: user.id,
        notes: input.notes || null,
      },
    });
    await recordAudit(tx, {
      actor: user,
      action: "INTAKE_RECEIVED",
      entityType: "Intake",
      entityId: intake.id,
      summary: `Received ${input.quantity}${material.unit} of ${material.name} (${intake.code})`,
      metadata: { supplierBatch: input.supplierBatch },
    });
    return intake;
  });
}

// ---------------------------------------------------------------------------
// QC inspection (records the AI engine verdict; supports manual override)
// ---------------------------------------------------------------------------
export async function recordInspection(
  user: SessionUser,
  input: {
    intakeId: string;
    method: string;
    measuredL: number;
    measuredA: number;
    measuredB: number;
    deltaE: number;
    uniformity: number;
    defectCount: number;
    foreignMatter: boolean;
    autoResult: "PASS" | "FAIL";
    imageData?: string;
    aiNotes?: string;
    overrideResult?: "PASS" | "FAIL" | "";
    overrideReason?: string;
  }
) {
  assertCan(user, "qc:inspect");

  return prisma.$transaction(async (tx) => {
    const intake = await tx.intake.findUniqueOrThrow({
      where: { id: input.intakeId },
      include: { material: true },
    });
    if (!["RECEIVED", "IN_QC"].includes(intake.status)) {
      throw new PolicyError(`Intake ${intake.code} is already ${intake.status}; it cannot be inspected again.`);
    }

    let finalResult: "PASS" | "FAIL" = input.autoResult;
    let overridden = false;
    if (input.overrideResult && input.overrideResult !== input.autoResult) {
      assertCan(user, "qc:override");
      if (!input.overrideReason?.trim()) {
        throw new PolicyError("A justification is required to override the AI QC verdict.");
      }
      finalResult = input.overrideResult;
      overridden = true;
    }

    const insp = await tx.qcInspection.create({
      data: {
        intakeId: intake.id,
        inspectedById: user.id,
        method: input.method,
        imageData: input.imageData ?? null,
        measuredL: round(input.measuredL),
        measuredA: round(input.measuredA),
        measuredB: round(input.measuredB),
        deltaE: round(input.deltaE),
        uniformity: round(input.uniformity),
        defectCount: input.defectCount,
        foreignMatter: input.foreignMatter,
        result: finalResult,
        autoResult: input.autoResult,
        overridden,
        overrideReason: overridden ? input.overrideReason : null,
        aiNotes: input.aiNotes ?? null,
      },
    });

    await tx.intake.update({
      where: { id: intake.id },
      data: { status: finalResult === "PASS" ? "PASSED" : "FAILED" },
    });

    await recordAudit(tx, {
      actor: user,
      action: finalResult === "PASS" ? "QC_PASS" : "QC_FAIL",
      entityType: "QcInspection",
      entityId: insp.id,
      summary:
        `QC ${finalResult} for ${intake.code} ` +
        `(ΔE ${round(input.deltaE)}, uniformity ${round(input.uniformity)}%, defects ${input.defectCount})` +
        (overridden ? ` — manual override of AI verdict (${input.autoResult})` : ""),
      metadata: {
        deltaE: round(input.deltaE),
        uniformity: round(input.uniformity),
        defectCount: input.defectCount,
        foreignMatter: input.foreignMatter,
        method: input.method,
        overridden,
      },
    });
    return insp;
  });
}

// ---------------------------------------------------------------------------
// PPIC scheduling — BLOCKS production unless intake is QC-PASSED
// ---------------------------------------------------------------------------
export async function createSchedule(
  user: SessionUser,
  input: { intakeId: string; plannedQty: number; scheduledStart: Date; scheduledEnd: Date }
) {
  assertCan(user, "schedule:create");

  return prisma.$transaction(async (tx) => {
    const intake = await tx.intake.findUniqueOrThrow({
      where: { id: input.intakeId },
      include: { material: true },
    });
    if (intake.status !== "PASSED") {
      throw new PolicyError(
        `Cannot schedule production from ${intake.code}: it is ${intake.status}. ` +
          `Only QC-PASSED stock may enter production.`
      );
    }
    const existing = await tx.productionSchedule.findFirst({ where: { intakeId: input.intakeId } });
    if (existing) throw new PolicyError(`${intake.code} is already scheduled under ${existing.code}.`);
    if (!(input.plannedQty > 0)) throw new PolicyError("Planned quantity must be greater than zero.");

    const n = (await tx.productionSchedule.count()) + 1;
    const sched = await tx.productionSchedule.create({
      data: {
        code: `PO-2026-${pad(n)}`,
        intakeId: intake.id,
        materialId: intake.materialId,
        plannedQty: input.plannedQty,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        status: "PLANNED",
        createdById: user.id,
      },
    });
    await recordAudit(tx, {
      actor: user,
      action: "SCHEDULE_CREATED",
      entityType: "ProductionSchedule",
      entityId: sched.id,
      summary: `Scheduled production ${sched.code} for ${intake.material.name} from ${intake.code}`,
    });
    return sched;
  });
}

export async function advanceSchedule(user: SessionUser, scheduleId: string) {
  assertCan(user, "schedule:advance");

  return prisma.$transaction(async (tx) => {
    const sched = await tx.productionSchedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: { material: true },
    });

    if (sched.status === "PLANNED") {
      await tx.productionSchedule.update({ where: { id: scheduleId }, data: { status: "RUNNING" } });
      await recordAudit(tx, {
        actor: user,
        action: "SCHEDULE_STARTED",
        entityType: "ProductionSchedule",
        entityId: sched.id,
        summary: `Started production run ${sched.code}`,
      });
      return { status: "RUNNING" as const };
    }

    if (sched.status === "RUNNING") {
      await tx.productionSchedule.update({ where: { id: scheduleId }, data: { status: "DONE" } });
      const n = (await tx.lot.count()) + 1;
      const lot = await tx.lot.create({
        data: {
          lotNumber: `LOT-2026-${pad(n)}`,
          intakeId: sched.intakeId,
          materialId: sched.materialId,
          quantity: sched.plannedQty,
          status: "FINISHED",
          scheduleId: sched.id,
          createdById: user.id,
        },
      });
      await recordAudit(tx, {
        actor: user,
        action: "LOT_ISSUED",
        entityType: "Lot",
        entityId: lot.id,
        summary: `Completed ${sched.code}; issued ${lot.lotNumber} (${sched.plannedQty}${sched.material.unit} ${sched.material.name})`,
      });
      return { status: "DONE" as const, lotNumber: lot.lotNumber };
    }

    throw new PolicyError(`Schedule ${sched.code} is already complete.`);
  });
}

// ---------------------------------------------------------------------------
// Warehouse placement — enforces cold-chain & hazard segregation
// ---------------------------------------------------------------------------
export async function placeLot(user: SessionUser, input: { lotId: string; locationId: string }) {
  assertCan(user, "lot:place");

  return prisma.$transaction(async (tx) => {
    const lot = await tx.lot.findUniqueOrThrow({ where: { id: input.lotId }, include: { material: true } });
    if (lot.status === "DISPATCHED") {
      throw new PolicyError(`${lot.lotNumber} has been dispatched and can no longer be placed.`);
    }
    const loc = await tx.storageLocation.findUniqueOrThrow({ where: { id: input.locationId } });
    const active = await tx.placement.count({ where: { locationId: loc.id, removedAt: null } });
    if (active >= loc.capacity) throw new PolicyError(`Location ${loc.code} is already occupied.`);

    const mat = lot.material;
    if (mat.hazardClass) {
      if (loc.zone !== "HAZMAT" || loc.hazardClass !== mat.hazardClass) {
        throw new PolicyError(
          `${lot.lotNumber} is ${mat.hazardClass}; it must go in a HAZMAT cell rated for ${mat.hazardClass}. ${loc.code} is ${loc.zone}.`
        );
      }
    } else if (mat.requiresColdChain) {
      if (loc.zone !== "COLD") {
        throw new PolicyError(
          `${lot.lotNumber} needs cold-chain storage (${mat.coldMinC}°C to ${mat.coldMaxC}°C); ${loc.code} is a ${loc.zone} cell.`
        );
      }
    } else if (loc.zone !== "AMBIENT") {
      throw new PolicyError(
        `${lot.lotNumber} is a standard good and belongs in an AMBIENT cell, not ${loc.zone} (${loc.code}).`
      );
    }

    await tx.placement.updateMany({ where: { lotId: lot.id, removedAt: null }, data: { removedAt: new Date() } });
    const placement = await tx.placement.create({
      data: { lotId: lot.id, locationId: loc.id, placedById: user.id },
    });
    await recordAudit(tx, {
      actor: user,
      action: "LOT_PLACED",
      entityType: "Placement",
      entityId: placement.id,
      summary: `Placed ${lot.lotNumber} at ${loc.code} (${loc.zone})`,
    });
    return placement;
  });
}

// ---------------------------------------------------------------------------
// Dispatch — only QC-passed, FINISHED lots can ship
// ---------------------------------------------------------------------------
export async function dispatchLot(
  user: SessionUser,
  input: { lotId: string; customerName: string; destination: string; quantity: number }
) {
  assertCan(user, "dispatch:create");

  return prisma.$transaction(async (tx) => {
    const lot = await tx.lot.findUniqueOrThrow({
      where: { id: input.lotId },
      include: { material: true, intake: true },
    });
    if (lot.status !== "FINISHED") {
      throw new PolicyError(`${lot.lotNumber} is ${lot.status}; only FINISHED lots can be dispatched.`);
    }
    if (lot.intake.status !== "PASSED") {
      throw new PolicyError(
        `${lot.lotNumber} traces back to intake ${lot.intake.code}, which is ${lot.intake.status}. Dispatch is blocked.`
      );
    }
    if (!input.customerName?.trim()) throw new PolicyError("Customer name is required.");
    if (!(input.quantity > 0) || input.quantity > lot.quantity) {
      throw new PolicyError(`Quantity must be between 0 and ${lot.quantity}${lot.material.unit}.`);
    }

    const n = (await tx.dispatch.count()) + 1;
    const d = await tx.dispatch.create({
      data: {
        code: `SHP-2026-${pad(n)}`,
        lotId: lot.id,
        customerName: input.customerName,
        destination: input.destination,
        quantity: input.quantity,
        dispatchedById: user.id,
      },
    });
    await tx.lot.update({ where: { id: lot.id }, data: { status: "DISPATCHED" } });
    await tx.placement.updateMany({ where: { lotId: lot.id, removedAt: null }, data: { removedAt: new Date() } });
    await recordAudit(tx, {
      actor: user,
      action: "DISPATCHED",
      entityType: "Dispatch",
      entityId: d.id,
      summary: `Dispatched ${input.quantity}${lot.material.unit} of ${lot.lotNumber} to ${input.customerName} (${input.destination})`,
    });
    return d;
  });
}

// ---------------------------------------------------------------------------
// Cold-chain sensor logging
// ---------------------------------------------------------------------------
export async function recordTemperature(user: SessionUser, input: { locationId: string; tempC: number }) {
  if (!["WAREHOUSE", "ADMIN"].includes(user.role)) {
    throw new PolicyError("Only warehouse staff may log temperature readings.");
  }
  return prisma.$transaction(async (tx) => {
    const loc = await tx.storageLocation.findUniqueOrThrow({ where: { id: input.locationId } });
    if (loc.zone !== "COLD") throw new PolicyError(`${loc.code} is not a cold-chain cell.`);
    const alert =
      (loc.coldMinC != null && input.tempC < loc.coldMinC) ||
      (loc.coldMaxC != null && input.tempC > loc.coldMaxC);
    const reading = await tx.tempReading.create({
      data: { locationId: loc.id, tempC: round(input.tempC), alert },
    });
    if (alert) {
      await recordAudit(tx, {
        actor: user,
        action: "COLDCHAIN_ALERT",
        entityType: "StorageLocation",
        entityId: loc.id,
        summary: `Cold-chain excursion at ${loc.code}: ${round(input.tempC)}°C (limit ${loc.coldMinC}°C to ${loc.coldMaxC}°C)`,
        metadata: { tempC: round(input.tempC) },
      });
    }
    return reading;
  });
}

// ---------------------------------------------------------------------------
// Admin: user management
// ---------------------------------------------------------------------------
export async function createUser(
  user: SessionUser,
  input: { name: string; email: string; role: Role; password: string }
) {
  assertCan(user, "user:manage");
  if (!input.name?.trim() || !input.email?.trim()) throw new PolicyError("Name and email are required.");
  const dup = await prisma.user.findUnique({ where: { email: input.email } });
  if (dup) throw new PolicyError(`A user with email ${input.email} already exists.`);

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: hashPassword(input.password || "demo1234"),
      },
    });
    await recordAudit(tx, {
      actor: user,
      action: "USER_CREATED",
      entityType: "User",
      entityId: created.id,
      summary: `Created user ${created.name} with role ${created.role}`,
    });
    return created;
  });
}

export async function setUserActive(user: SessionUser, input: { userId: string; active: boolean }) {
  assertCan(user, "user:manage");
  if (input.userId === user.id) throw new PolicyError("You cannot deactivate your own account.");

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.update({ where: { id: input.userId }, data: { active: input.active } });
    await recordAudit(tx, {
      actor: user,
      action: input.active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entityType: "User",
      entityId: target.id,
      summary: `${input.active ? "Activated" : "Deactivated"} user ${target.name}`,
    });
    return target;
  });
}
