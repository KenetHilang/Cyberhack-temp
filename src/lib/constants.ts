// Central enums (SQLite has no native enums) + display metadata.

export const ROLES = ["ADMIN", "WAREHOUSE", "QC", "PPIC", "DISPATCH"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  WAREHOUSE: "Warehouse Operator",
  QC: "QC Officer",
  PPIC: "PPIC Planner",
  DISPATCH: "Dispatch Officer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access · user management · audit oversight",
  WAREHOUSE: "Receives raw materials & places finished goods",
  QC: "Runs AI quality inspections & releases lots",
  PPIC: "Plans & schedules production from cleared stock",
  DISPATCH: "Ships QC-passed lots to customers",
};

export const INTAKE_STATUS = {
  RECEIVED: "RECEIVED",
  IN_QC: "IN_QC",
  PASSED: "PASSED",
  FAILED: "FAILED",
  QUARANTINED: "QUARANTINED",
} as const;

export const LOT_STATUS = {
  CREATED: "CREATED",
  IN_PRODUCTION: "IN_PRODUCTION",
  FINISHED: "FINISHED",
  DISPATCHED: "DISPATCHED",
} as const;

export const SCHEDULE_STATUS = {
  PLANNED: "PLANNED",
  RUNNING: "RUNNING",
  DONE: "DONE",
} as const;

export const MATERIAL_CATEGORIES = ["FRUIT", "BOTANICAL", "EXTRACT", "POWDER"] as const;
export const ZONES = ["AMBIENT", "COLD", "HAZMAT"] as const;
export type Zone = (typeof ZONES)[number];

export const QC_METHOD = {
  ONDEVICE_CV: "ONDEVICE_CV",
  LLM_VISION: "LLM_VISION",
  MANUAL: "MANUAL",
} as const;

// Tailwind badge classes per status — kept here so UI stays consistent.
export const STATUS_STYLES: Record<string, string> = {
  RECEIVED: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_QC: "bg-amber-100 text-amber-800 ring-amber-200",
  PASSED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  FAILED: "bg-rose-100 text-rose-800 ring-rose-200",
  QUARANTINED: "bg-rose-100 text-rose-800 ring-rose-200",
  CREATED: "bg-sky-100 text-sky-800 ring-sky-200",
  IN_PRODUCTION: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  FINISHED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  DISPATCHED: "bg-violet-100 text-violet-800 ring-violet-200",
  PLANNED: "bg-sky-100 text-sky-800 ring-sky-200",
  RUNNING: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  DONE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  PASS: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  FAIL: "bg-rose-100 text-rose-800 ring-rose-200",
};

export const DEMO_PASSWORD = "demo1234";
