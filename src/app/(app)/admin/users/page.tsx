import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, PageHeader, Pill, Th, Td } from "@/components/ui";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/lib/rbac";
import { UserForm, ToggleUser } from "@/components/forms/UserForms";

export default async function UsersPage() {
  const me = await requireRole("ADMIN");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const perms = Object.keys(PERMISSIONS) as Permission[];

  return (
    <>
      <PageHeader title="Users & roles" description="Role-based access control. Only administrators can manage users." />

      <Card>
        <CardHeader title="Users" subtitle={`${users.length} accounts`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{u.name}</Td>
                  <Td className="text-slate-500">{u.email}</Td>
                  <Td>
                    <Pill tone="sky">{ROLE_LABELS[u.role as Role]}</Pill>
                  </Td>
                  <Td>
                    <Pill tone={u.active ? "emerald" : "rose"}>{u.active ? "Active" : "Inactive"}</Pill>
                  </Td>
                  <Td>{u.id !== me.id && <ToggleUser userId={u.id} active={u.active} />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Add user" subtitle="New accounts are recorded in the audit trail" />
        <UserForm />
      </Card>

      <Card>
        <CardHeader title="Permission matrix" subtitle="Capabilities enforced server-side on every action" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th>Capability</Th>
                {(["ADMIN", "WAREHOUSE", "QC", "PPIC", "DISPATCH"] as Role[]).map((r) => (
                  <Th key={r} className="text-center">
                    {ROLE_LABELS[r].split(" ")[0]}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perms.map((p) => (
                <tr key={p}>
                  <Td>{PERMISSION_LABELS[p]}</Td>
                  {(["ADMIN", "WAREHOUSE", "QC", "PPIC", "DISPATCH"] as Role[]).map((r) => (
                    <Td key={r} className="text-center">
                      {(PERMISSIONS[p] as readonly string[]).includes(r) ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-slate-300">·</span>
                      )}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
