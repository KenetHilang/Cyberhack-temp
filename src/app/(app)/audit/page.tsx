import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyChain } from "@/lib/audit";
import { Card, CardHeader, PageHeader, Pill, Th, Td } from "@/components/ui";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export default async function AuditPage() {
  await requireUser();
  const [chain, entries] = await Promise.all([
    verifyChain(),
    prisma.auditLog.findMany({ orderBy: { seq: "desc" }, take: 200 }),
  ]);

  return (
    <>
      <PageHeader
        title="Audit trail"
        description="Every state change is recorded in a tamper-evident, hash-chained log — who did what, when."
      />

      <div
        className={`flex items-center gap-4 rounded-xl border p-5 ${
          chain.valid ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
        }`}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            chain.valid ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
          }`}
        >
          {chain.valid ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
        </span>
        <div>
          <p className={`text-sm font-semibold ${chain.valid ? "text-emerald-800" : "text-rose-800"}`}>
            {chain.valid ? "Integrity verified" : `Chain broken at entry #${chain.brokenAtSeq}`}
          </p>
          <p className="text-xs text-slate-600">
            {chain.total} events · each entry's SHA-256 hash includes the previous entry's hash, so any
            retroactive edit or deletion is detectable on re-verification.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title="Event log" subtitle="Most recent first" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>#</Th>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Summary</Th>
                <Th>Hash</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60">
                  <Td className="font-mono text-xs text-slate-400">{e.seq}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{e.createdAt.toLocaleString("en-GB")}</Td>
                  <Td className="whitespace-nowrap">{e.actorName}</Td>
                  <Td>
                    <Pill tone="slate">{e.action}</Pill>
                  </Td>
                  <Td className="text-slate-600">{e.summary}</Td>
                  <Td className="font-mono text-[10px] text-slate-400">…{e.hash.slice(-12)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
