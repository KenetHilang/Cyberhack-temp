"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, createSession, destroySession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { PolicyError } from "@/lib/errors";
import { AuthorizationError } from "@/lib/rbac";
import {
  createIntake,
  recordInspection,
  createSchedule,
  advanceSchedule,
  placeLot,
  dispatchLot,
  recordTemperature,
  createUser,
  setUserActive,
} from "@/lib/services";
import { describeSample } from "@/lib/llm";
import type { Role } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

function errMsg(e: unknown): string {
  if (e instanceof PolicyError || e instanceof AuthorizationError) return e.message;
  console.error(e);
  return "Something went wrong. Please try again.";
}

const str = (fd: FormData, k: string) => (fd.get(k) ?? "").toString();
const num = (fd: FormData, k: string) => Number(fd.get(k) ?? 0);

function revalidateAll() {
  for (const p of ["/", "/intake", "/qc", "/lots", "/schedule", "/warehouse", "/dispatch", "/audit"]) {
    revalidatePath(p);
  }
}

// ----- Auth -----
export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").trim().toLowerCase();
  const password = str(fd, "password");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect("/");
}

export async function demoLoginAction(fd: FormData): Promise<void> {
  const role = str(fd, "role");
  const user = await prisma.user.findFirst({ where: { role, active: true } });
  if (user) await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ----- Intake -----
export async function createIntakeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    await createIntake(user, {
      supplierId: str(fd, "supplierId"),
      materialId: str(fd, "materialId"),
      quantity: num(fd, "quantity"),
      supplierBatch: str(fd, "supplierBatch"),
      notes: str(fd, "notes"),
    });
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
  revalidateAll();
  redirect("/intake");
}

// ----- QC -----
export async function recordInspectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    const auto = str(fd, "autoResult") as "PASS" | "FAIL";
    await recordInspection(user, {
      intakeId: str(fd, "intakeId"),
      method: str(fd, "method") || "ONDEVICE_CV",
      measuredL: num(fd, "measuredL"),
      measuredA: num(fd, "measuredA"),
      measuredB: num(fd, "measuredB"),
      deltaE: num(fd, "deltaE"),
      uniformity: num(fd, "uniformity"),
      defectCount: num(fd, "defectCount"),
      foreignMatter: str(fd, "foreignMatter") === "true",
      autoResult: auto,
      imageData: str(fd, "imageData") || undefined,
      aiNotes: str(fd, "aiNotes") || undefined,
      overrideResult: (str(fd, "overrideResult") || "") as "PASS" | "FAIL" | "",
      overrideReason: str(fd, "overrideReason") || undefined,
    });
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
  revalidateAll();
  return { ok: true, message: "QC inspection recorded." };
}

export async function describeSampleAction(
  imageData: string,
  materialId: string,
  cv: { deltaE: number; uniformity: number; defectCount: number; foreignMatter: boolean; autoResult: string }
): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return null;
  return describeSample(imageData, material.name, material.category, cv);
}

// ----- PPIC scheduling -----
export async function createScheduleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    const start = new Date(str(fd, "scheduledStart"));
    const end = new Date(str(fd, "scheduledEnd"));
    await createSchedule(user, {
      intakeId: str(fd, "intakeId"),
      plannedQty: num(fd, "plannedQty"),
      scheduledStart: isNaN(+start) ? new Date() : start,
      scheduledEnd: isNaN(+end) ? new Date(Date.now() + 86400000) : end,
    });
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
  revalidateAll();
  redirect("/schedule");
}

export async function advanceScheduleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    const res = await advanceSchedule(user, str(fd, "scheduleId"));
    revalidateAll();
    return {
      ok: true,
      message: res.status === "DONE" ? `Production complete — ${res.lotNumber} issued.` : "Production run started.",
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ----- Warehouse -----
export async function placeLotAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    await placeLot(user, { lotId: str(fd, "lotId"), locationId: str(fd, "locationId") });
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
  revalidateAll();
  return { ok: true, message: "Lot placed." };
}

export async function recordTemperatureAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    const r = await recordTemperature(user, { locationId: str(fd, "locationId"), tempC: num(fd, "tempC") });
    revalidateAll();
    return { ok: true, message: r.alert ? "Reading logged — excursion alert raised." : "Reading logged." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ----- Dispatch -----
export async function dispatchLotAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    await dispatchLot(user, {
      lotId: str(fd, "lotId"),
      customerName: str(fd, "customerName"),
      destination: str(fd, "destination") || "LOCAL",
      quantity: num(fd, "quantity"),
    });
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
  revalidateAll();
  redirect("/dispatch");
}

// ----- Admin -----
export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    await createUser(user, {
      name: str(fd, "name"),
      email: str(fd, "email").trim().toLowerCase(),
      role: str(fd, "role") as Role,
      password: str(fd, "password"),
    });
    revalidateAll();
    return { ok: true, message: "User created." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function setUserActiveAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  try {
    await setUserActive(user, { userId: str(fd, "userId"), active: str(fd, "active") === "true" });
    revalidateAll();
    return { ok: true, message: "User updated." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
