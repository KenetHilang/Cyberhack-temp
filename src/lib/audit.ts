import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { SessionUser } from "./auth";

const GENESIS = "0".repeat(64);

const sha256 = (input: string) => createHash("sha256").update(input).digest("hex");

function payloadFor(e: {
  seq: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: string | null;
  createdAt: Date;
}): string {
  return [
    e.seq,
    e.actorName,
    e.action,
    e.entityType,
    e.entityId,
    e.summary,
    e.metadata ?? "",
    e.createdAt.toISOString(),
  ].join("|");
}

export interface AuditInput {
  actor: SessionUser | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

// Appends one entry to the chain. Must run inside the same transaction as the
// business mutation it records, so the audit log can never drift from reality.
export async function recordAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  const last = await tx.auditLog.findFirst({ orderBy: { seq: "desc" } });
  const seq = (last?.seq ?? 0) + 1;
  const prevHash = last?.hash ?? GENESIS;
  const createdAt = new Date();
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

  const hash = sha256(
    prevHash +
      payloadFor({
        seq,
        actorName: input.actor?.name ?? "system",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        metadata,
        createdAt,
      })
  );

  await tx.auditLog.create({
    data: {
      seq,
      actorId: input.actor?.id ?? null,
      actorName: input.actor?.name ?? "system",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata,
      prevHash,
      hash,
      createdAt,
    },
  });
}

export interface ChainVerification {
  valid: boolean;
  total: number;
  brokenAtSeq: number | null;
}

// Recomputes the entire chain and reports the first tampered/broken link.
export async function verifyChain(): Promise<ChainVerification> {
  const entries = await prisma.auditLog.findMany({ orderBy: { seq: "asc" } });
  let prevHash = GENESIS;
  for (const e of entries) {
    if (e.prevHash !== prevHash) return { valid: false, total: entries.length, brokenAtSeq: e.seq };
    const recomputed = sha256(prevHash + payloadFor(e));
    if (recomputed !== e.hash) return { valid: false, total: entries.length, brokenAtSeq: e.seq };
    prevHash = e.hash;
  }
  return { valid: true, total: entries.length, brokenAtSeq: null };
}
