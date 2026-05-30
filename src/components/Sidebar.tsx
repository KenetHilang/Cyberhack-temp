"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackagePlus,
  ScanLine,
  Boxes,
  CalendarClock,
  Warehouse,
  Truck,
  FileClock,
  Users,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/constants";

type Item = { href: string; label: string; icon: React.ElementType; roles?: Role[] };

const NAV: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/intake", label: "Raw Intake", icon: PackagePlus },
  { href: "/qc", label: "AI Quality Control", icon: ScanLine },
  { href: "/lots", label: "Lots & Traceability", icon: Boxes },
  { href: "/schedule", label: "Production (PPIC)", icon: CalendarClock },
  { href: "/warehouse", label: "Warehouse & Cold-Chain", icon: Warehouse },
  { href: "/dispatch", label: "Dispatch", icon: Truck },
  { href: "/audit", label: "Audit Trail", icon: FileClock },
  { href: "/admin/users", label: "Users & Roles", icon: Users, roles: ["ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const path = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-5">
        <Leaf className="h-6 w-6 text-emerald-600" />
        <span className="text-base font-semibold tracking-tight text-slate-900">AromaFlow</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.filter((i) => !i.roles || i.roles.includes(role)).map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-emerald-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3 text-[11px] leading-relaxed text-slate-400">
        Sima Arome · CyberHack 2026
        <br />
        Enterprise edition
      </div>
    </aside>
  );
}
