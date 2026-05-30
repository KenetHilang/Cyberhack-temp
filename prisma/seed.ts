import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { hexToLab } from "../src/lib/color";
import { recordAudit } from "../src/lib/audit";
import { DEMO_PASSWORD, type Role } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing data…");
  // delete in FK-safe order
  await prisma.auditLog.deleteMany();
  await prisma.tempReading.deleteMany();
  await prisma.placement.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.productionSchedule.deleteMany();
  await prisma.qcInspection.deleteMany();
  await prisma.intake.deleteMany();
  await prisma.material.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding users…");
  const pwd = hashPassword(DEMO_PASSWORD);
  const mkUser = (name: string, email: string, role: string) =>
    prisma.user.create({ data: { name, email, passwordHash: pwd, role } });

  const admin = await mkUser("Dewi Lestari", "admin@simaarome.com", "ADMIN");
  const wh = await mkUser("Budi Santoso", "warehouse@simaarome.com", "WAREHOUSE");
  const qc = await mkUser("Siti Rahma", "qc@simaarome.com", "QC");
  const ppic = await mkUser("Agus Wijaya", "ppic@simaarome.com", "PPIC");
  const dispatch = await mkUser("Rina Kartika", "dispatch@simaarome.com", "DISPATCH");

  const actor = (u: { id: string; name: string; email: string; role: string }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
  });

  console.log("Seeding suppliers…");
  const supA = await prisma.supplier.create({
    data: { name: "Kebun Rempah Nusantara", code: "SUP-KRN", country: "Indonesia" },
  });
  const supB = await prisma.supplier.create({
    data: { name: "Bali Botanicals Co.", code: "SUP-BBC", country: "Indonesia" },
  });
  const supC = await prisma.supplier.create({
    data: { name: "Jaya Fruit Exporters", code: "SUP-JFE", country: "Indonesia" },
  });

  console.log("Seeding materials (with CIELAB colour specs)…");
  const mk = (
    sku: string,
    name: string,
    category: string,
    unit: string,
    hex: string,
    opts: Partial<{
      toleranceDeltaE: number;
      minUniformity: number;
      maxDefects: number;
      requiresColdChain: boolean;
      coldMinC: number;
      coldMaxC: number;
      hazardClass: string;
    }> = {}
  ) => {
    const lab = hexToLab(hex);
    return prisma.material.create({
      data: {
        sku,
        name,
        category,
        unit,
        specL: round(lab.L),
        specA: round(lab.a),
        specB: round(lab.b),
        toleranceDeltaE: opts.toleranceDeltaE ?? 3.0,
        minUniformity: opts.minUniformity ?? 70,
        maxDefects: opts.maxDefects ?? 2,
        requiresColdChain: opts.requiresColdChain ?? false,
        coldMinC: opts.coldMinC ?? null,
        coldMaxC: opts.coldMaxC ?? null,
        hazardClass: opts.hazardClass ?? null,
      },
    });
  };

  const turmeric = await mk("PWD-TUR", "Turmeric Extract Powder", "POWDER", "kg", "#C8821E", {
    toleranceDeltaE: 3.5,
    minUniformity: 75,
  });
  const ginger = await mk("PWD-GIN", "Ginger Extract Powder", "POWDER", "kg", "#D9B68C", {
    toleranceDeltaE: 3.5,
    minUniformity: 72,
  });
  const vanilla = await mk("EXT-VAN", "Vanilla Oleoresin", "EXTRACT", "kg", "#3B2516", {
    toleranceDeltaE: 2.5,
  });
  const clove = await mk("EXT-CLV", "Clove Bud Oil", "EXTRACT", "L", "#6B4A2B", {
    hazardClass: "FLAMMABLE",
  });
  const lime = await mk("EXT-LIM", "Lime Essential Oil", "EXTRACT", "L", "#C9D66B", {
    hazardClass: "FLAMMABLE",
  });
  const dragonfruit = await mk(
    "FRT-DGF",
    "Red Dragonfruit Concentrate",
    "FRUIT",
    "L",
    "#8E1E4B",
    { requiresColdChain: true, coldMinC: -20, coldMaxC: -4, toleranceDeltaE: 4.0 }
  );
  const mango = await mk("FRT-MNG", "Frozen Mango Pulp", "FRUIT", "kg", "#F2B33D", {
    requiresColdChain: true,
    coldMinC: -20,
    coldMaxC: -4,
    toleranceDeltaE: 4.0,
    minUniformity: 68,
  });

  console.log("Seeding warehouse floor plan…");
  // 4 rows (A-D) x 6 cols. A1-A4 cold, D5/D6 hazmat (flammable), rest ambient.
  const rows = ["A", "B", "C", "D"];
  const locations: Record<string, { id: string }> = {};
  for (let r = 0; r < rows.length; r++) {
    for (let c = 1; c <= 6; c++) {
      const code = `${rows[r]}${c}`;
      let zone = "AMBIENT";
      let coldMinC: number | null = null;
      let coldMaxC: number | null = null;
      let hazardClass: string | null = null;
      if (rows[r] === "A" && c <= 4) {
        zone = "COLD";
        coldMinC = -20;
        coldMaxC = -4;
      } else if (rows[r] === "D" && c >= 5) {
        zone = "HAZMAT";
        hazardClass = "FLAMMABLE";
      }
      const loc = await prisma.storageLocation.create({
        data: { code, zone, row: r, col: c - 1, coldMinC, coldMaxC, hazardClass },
      });
      locations[code] = loc;
    }
  }

  console.log("Seeding cold-chain temperature readings…");
  const now = Date.now();
  const coldCells = ["A1", "A2", "A3", "A4"];
  for (const code of coldCells) {
    const loc = locations[code];
    // A4 drifts out of range -> alert
    const drift = code === "A4";
    for (let i = 6; i >= 0; i--) {
      const base = drift && i === 0 ? -2.1 : -12 + (Math.random() * 2 - 1);
      await prisma.tempReading.create({
        data: {
          locationId: loc.id,
          tempC: round(base),
          alert: base < -20 || base > -4,
          recordedAt: new Date(now - i * 30 * 60 * 1000),
        },
      });
    }
  }

  console.log("Seeding intakes, QC, lots, schedules, dispatch + audit chain…");
  let grn = 1;
  let po = 1;
  let lotNo = 1;
  let shp = 1;
  const code = (p: string, n: number) => `${p}-2026-${String(n).padStart(4, "0")}`;

  // Helper: full intake -> passed -> scheduled -> lot -> placed -> (optional) dispatched
  async function passedChain(opts: {
    material: { id: string; name: string; unit: string; requiresColdChain: boolean };
    supplier: { id: string };
    qty: number;
    batch: string;
    placeAt: string;
    measuredHexClose: string;
    refLab: { specL: number; specA: number; specB: number };
    dispatchTo?: { customer: string; destination: string };
  }) {
    const intake = await prisma.intake.create({
      data: {
        code: code("GRN", grn++),
        supplierId: opts.supplier.id,
        materialId: opts.material.id,
        quantity: opts.qty,
        unit: opts.material.unit,
        supplierBatch: opts.batch,
        status: "PASSED",
        receivedById: wh.id,
      },
    });
    await prisma.$transaction((tx) =>
      recordAudit(tx as never, {
        actor: actor(wh),
        action: "INTAKE_RECEIVED",
        entityType: "Intake",
        entityId: intake.id,
        summary: `Received ${opts.qty}${opts.material.unit} of ${opts.material.name} (${intake.code})`,
      })
    );

    const insp = await prisma.qcInspection.create({
      data: {
        intakeId: intake.id,
        inspectedById: qc.id,
        method: "ONDEVICE_CV",
        measuredL: opts.refLab.specL + 0.6,
        measuredA: opts.refLab.specA - 0.4,
        measuredB: opts.refLab.specB + 0.5,
        deltaE: round(1.1 + Math.random()),
        uniformity: round(88 + Math.random() * 8),
        defectCount: 0,
        foreignMatter: false,
        result: "PASS",
        autoResult: "PASS",
        aiNotes: "Colour within spec; uniform texture; no foreign matter detected.",
      },
    });
    await prisma.$transaction((tx) =>
      recordAudit(tx as never, {
        actor: actor(qc),
        action: "QC_PASS",
        entityType: "QcInspection",
        entityId: insp.id,
        summary: `QC PASS for ${intake.code} (ΔE ${insp.deltaE}, uniformity ${insp.uniformity}%)`,
        metadata: { deltaE: insp.deltaE, uniformity: insp.uniformity },
      })
    );

    const sched = await prisma.productionSchedule.create({
      data: {
        code: code("PO", po++),
        intakeId: intake.id,
        materialId: opts.material.id,
        plannedQty: opts.qty,
        scheduledStart: new Date(now - 2 * 86400000),
        scheduledEnd: new Date(now - 1 * 86400000),
        status: "DONE",
        createdById: ppic.id,
      },
    });
    await prisma.$transaction((tx) =>
      recordAudit(tx as never, {
        actor: actor(ppic),
        action: "SCHEDULE_CREATED",
        entityType: "ProductionSchedule",
        entityId: sched.id,
        summary: `Scheduled production ${sched.code} from ${intake.code}`,
      })
    );

    const lot = await prisma.lot.create({
      data: {
        lotNumber: code("LOT", lotNo++),
        intakeId: intake.id,
        materialId: opts.material.id,
        quantity: opts.qty,
        status: opts.dispatchTo ? "DISPATCHED" : "FINISHED",
        scheduleId: sched.id,
        createdById: ppic.id,
      },
    });
    await prisma.$transaction((tx) =>
      recordAudit(tx as never, {
        actor: actor(ppic),
        action: "LOT_ISSUED",
        entityType: "Lot",
        entityId: lot.id,
        summary: `Issued ${lot.lotNumber} (${opts.qty}${opts.material.unit} ${opts.material.name})`,
      })
    );

    const placement = await prisma.placement.create({
      data: {
        lotId: lot.id,
        locationId: locations[opts.placeAt].id,
        placedById: wh.id,
        removedAt: opts.dispatchTo ? new Date(now - 3600000) : null,
      },
    });
    await prisma.$transaction((tx) =>
      recordAudit(tx as never, {
        actor: actor(wh),
        action: "LOT_PLACED",
        entityType: "Placement",
        entityId: placement.id,
        summary: `Placed ${lot.lotNumber} at ${opts.placeAt}`,
      })
    );

    if (opts.dispatchTo) {
      const d = await prisma.dispatch.create({
        data: {
          code: code("SHP", shp++),
          lotId: lot.id,
          customerName: opts.dispatchTo.customer,
          destination: opts.dispatchTo.destination,
          quantity: opts.qty,
          dispatchedById: dispatch.id,
        },
      });
      await prisma.$transaction((tx) =>
        recordAudit(tx as never, {
          actor: actor(dispatch),
          action: "DISPATCHED",
          entityType: "Dispatch",
          entityId: d.id,
          summary: `Dispatched ${lot.lotNumber} to ${opts.dispatchTo!.customer} (${opts.dispatchTo!.destination})`,
        })
      );
    }
    return { intake, lot };
  }

  await passedChain({
    material: turmeric,
    supplier: supA,
    qty: 240,
    batch: "KRN-TUR-2403",
    placeAt: "B1",
    measuredHexClose: "#C8821E",
    refLab: turmeric,
  });

  await passedChain({
    material: mango,
    supplier: supC,
    qty: 500,
    batch: "JFE-MNG-1187",
    placeAt: "A1",
    measuredHexClose: "#F2B33D",
    refLab: mango,
  });

  await passedChain({
    material: ginger,
    supplier: supA,
    qty: 180,
    batch: "KRN-GIN-2210",
    placeAt: "B2",
    measuredHexClose: "#D9B68C",
    refLab: ginger,
    dispatchTo: { customer: "Nusantara Flavours (Jakarta)", destination: "LOCAL" },
  });

  // A FAILED intake — demonstrates the QC block on scheduling/dispatch.
  const failedIntake = await prisma.intake.create({
    data: {
      code: code("GRN", grn++),
      supplierId: supC.id,
      materialId: dragonfruit.id,
      quantity: 120,
      unit: dragonfruit.unit,
      supplierBatch: "JFE-DGF-0922",
      status: "FAILED",
      receivedById: wh.id,
      notes: "Visible browning on arrival.",
    },
  });
  await prisma.$transaction((tx) =>
    recordAudit(tx as never, {
      actor: actor(wh),
      action: "INTAKE_RECEIVED",
      entityType: "Intake",
      entityId: failedIntake.id,
      summary: `Received 120${dragonfruit.unit} of ${dragonfruit.name} (${failedIntake.code})`,
    })
  );
  const failInsp = await prisma.qcInspection.create({
    data: {
      intakeId: failedIntake.id,
      inspectedById: qc.id,
      method: "ONDEVICE_CV",
      measuredL: dragonfruit.specL + 9,
      measuredA: dragonfruit.specA - 12,
      measuredB: dragonfruit.specB + 6,
      deltaE: 7.4,
      uniformity: 54,
      defectCount: 5,
      foreignMatter: true,
      result: "FAIL",
      autoResult: "FAIL",
      aiNotes: "Colour drift beyond ΔE tolerance; low uniformity; foreign matter regions detected.",
    },
  });
  await prisma.$transaction((tx) =>
    recordAudit(tx as never, {
      actor: actor(qc),
      action: "QC_FAIL",
      entityType: "QcInspection",
      entityId: failInsp.id,
      summary: `QC FAIL for ${failedIntake.code} (ΔE ${failInsp.deltaE}, uniformity ${failInsp.uniformity}%)`,
      metadata: { deltaE: failInsp.deltaE, uniformity: failInsp.uniformity, foreignMatter: true },
    })
  );

  // Two RECEIVED intakes awaiting QC — used for the live demo flow.
  for (const [mat, sup, qty, batch] of [
    [clove, supB, 60, "BBC-CLV-5521"],
    [vanilla, supB, 95, "BBC-VAN-3390"],
  ] as const) {
    const it = await prisma.intake.create({
      data: {
        code: code("GRN", grn++),
        supplierId: sup.id,
        materialId: mat.id,
        quantity: qty,
        unit: mat.unit,
        supplierBatch: batch,
        status: "RECEIVED",
        receivedById: wh.id,
      },
    });
    await prisma.$transaction((tx) =>
      recordAudit(tx as never, {
        actor: actor(wh),
        action: "INTAKE_RECEIVED",
        entityType: "Intake",
        entityId: it.id,
        summary: `Received ${qty}${mat.unit} of ${mat.name} (${it.code})`,
      })
    );
  }

  const counts = {
    users: await prisma.user.count(),
    materials: await prisma.material.count(),
    intakes: await prisma.intake.count(),
    lots: await prisma.lot.count(),
    audit: await prisma.auditLog.count(),
  };
  console.log("Seed complete:", counts);
}

const round = (n: number) => Math.round(n * 100) / 100;

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
