# AromaFlow

**One source of truth for natural-extract manufacturing.**
An integrated operations platform for **Sima Arome** with AI computer-vision quality control, end-to-end lot traceability, role-based access control, and a tamper-evident audit trail.

> Built for **CyberHack 2026** · Challenge: *"How can AI and technology innovate Sima Arome's manufacturing process?"*

AromaFlow combines **all four** focus areas of the challenge into one coherent system:

1. **Integrated Operations System** — supplier intake → QC → PPIC scheduling → lot tracking → warehouse → dispatch, captured once and reused everywhere (kills double entry).
2. **AI for Fruit & Raw-Material QC** and **3. AI for Extract & Powder QC** — an on-device computer-vision engine grades colour, uniformity and foreign matter.
4. **AI-Assisted Warehousing & Cold-Chain** — smart slotting on a floor plan with automatic cold-chain and hazard segregation, plus temperature monitoring.

---

## Why this wins on the rubric

| Judging criterion | Weight | How AromaFlow addresses it |
|---|---|---|
| **Enterprise Readiness** | 30% | RBAC permission matrix enforced server-side; **hash-chained, tamper-evident audit log** with live integrity verification; **system-enforced policy** (a QC-failed lot is physically blocked from scheduling/dispatch); transactional integrity; clean architecture & docs; Postgres-ready for scale. |
| **Problem–Solution Fit** | 20% | Directly eliminates double entry and "production living in people's heads": one record flows through the whole chain with full genealogy. |
| **Innovation & Creativity** | 20% | Real **ΔE2000 colour science** QC running entirely on-device (no API key, never fails at demo), with an optional LLM-vision explanation layer. Tamper-evident audit chain. |
| **User Experience & Design** | 20% | Clean, role-tailored dashboards for every persona (operator, QC, planner, warehouse, dispatch, admin) — not just an end-user view. |
| **Pitch & Presentation** | 10% | Coherent problem → solution → impact story; see `PITCH_DECK.md` and `DEMO_SCRIPT.md`. |

---

## Key features

- **Role-based access control (RBAC).** Five roles (Admin, Warehouse, QC, PPIC, Dispatch) with an explicit capability matrix enforced on **every** server action — not just hidden in the UI.
- **Tamper-evident audit trail.** Every state change is appended to a SHA-256 **hash chain**; each entry's hash includes the previous one. The platform re-verifies the whole chain on demand and reports the exact entry where any tampering occurred.
- **System-enforced policy.** Business rules are guaranteed by the system, e.g.:
  - Production can only be scheduled from **QC-passed** stock.
  - Only **finished, QC-passed** lots can be dispatched.
  - **Cold-chain** goods must go in cold cells; **hazardous** (flammable) goods must go in matching hazmat cells.
- **AI QC engine.** Reference-colour matching in **CIELAB** space using **CIEDE2000**, plus spatial uniformity and foreign-matter (outlier) detection — the same approach industrial spectrophotometers use.
- **Full lot traceability.** Every lot has a complete genealogy timeline: supplier → intake → QC → production order → storage → dispatch.
- **Cold-chain monitoring.** Per-cell temperature readings with automatic excursion alerts.

---

## AI Quality-Control engine

The QC verdict is **deterministic and runs in the browser** (`src/lib/qc-engine.ts` + `src/lib/color.ts`), so the demo works with **no internet and no API key**:

1. The sample image is drawn to a canvas; pixels are converted **sRGB → CIELAB**.
2. The mean colour is compared to the material's reference spec via **ΔE2000** (`deltaE`).
3. The image is split into an 8×8 grid; tile-to-mean colour variation gives a **uniformity** score and flags **defect / foreign-matter** regions (outlier tiles).
4. Verdict = PASS only if colour, uniformity, defect count and cleanliness all pass the material's spec.

An **optional** LLM-vision layer (`src/lib/llm.ts`) adds a natural-language description when `ANTHROPIC_API_KEY` is set. If absent, the on-device engine stands alone — the verdict never depends on it.

---

## Tech stack

- **Next.js 16** (App Router, React Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS v4** + **lucide-react**
- **Prisma 6** ORM with **SQLite** (local-first; one-line swap to PostgreSQL for production)
- Auth via signed HTTP-only cookie sessions; passwords hashed with Node `scrypt` (no native deps)

```
src/
  app/
    (app)/            # authenticated shell + all module pages
    login/  forbidden/
    actions.ts        # "use server" actions → service layer
  components/         # UI primitives, sidebar/topbar, forms, QC Inspector
  lib/
    color.ts          # sRGB→CIELAB, CIEDE2000
    qc-engine.ts      # on-device computer-vision QC
    services.ts       # domain logic: RBAC + policy + audit, transactional
    audit.ts          # hash-chained, tamper-evident audit log + verifier
    rbac.ts auth.ts password.ts errors.ts constants.ts
prisma/
  schema.prisma  seed.ts
scripts/
  smoke.ts            # end-to-end service + policy + RBAC + audit test
  qc-test.ts          # QC engine verdict test
```

---

## Getting started

**Prerequisites:** Node.js 18+ (built on 24), npm.

```bash
npm install
npx prisma migrate dev      # creates the SQLite db + tables
npm run db:seed             # loads demo data (users, materials, intakes, lots, audit history)
npm run dev                 # http://localhost:3000
```

### Demo accounts

All accounts use password **`demo1234`** — or use the **one-click role buttons** on the login screen.

| Role | Email | Can do |
|---|---|---|
| Administrator | `admin@simaarome.com` | Everything + user management |
| Warehouse Operator | `warehouse@simaarome.com` | Record intake, place lots, log temperatures |
| QC Officer | `qc@simaarome.com` | Run AI QC inspections, override verdict |
| PPIC Planner | `ppic@simaarome.com` | Schedule production, issue lots |
| Dispatch Officer | `dispatch@simaarome.com` | Dispatch finished lots |

Use the **role switcher** in the top bar to jump between personas during a demo.

### Demo walkthrough (the golden path)

1. **Warehouse** → *Raw Intake* → record a delivery.
2. **QC** → *AI Quality Control* → open the intake → pick the **In-spec** / **Off-colour** / **Contaminated** sample (or upload a photo) → record the verdict.
3. **PPIC** → *Production* → try to schedule the **failed** intake (blocked!) → schedule a passed one → *Start run* → *Complete & issue lot*.
4. **Warehouse** → *Warehouse* → try placing a cold/flammable lot in the wrong zone (blocked!) → place it correctly.
5. **Dispatch** → *Dispatch* → ship the finished lot.
6. **Lots & Traceability** → open the lot → see the full genealogy. **Audit Trail** → see the verified hash chain.

---

## Testing

```bash
npx tsx scripts/smoke.ts    # golden path + RBAC + policy enforcement + audit integrity
npx tsx scripts/qc-test.ts  # QC engine PASS/FAIL verdicts on synthetic samples
npm run build               # full type-check + production build
```

---

## Deployment

The app is a single Next.js project and deploys to **Vercel**, **BuildPad**, or any Node host.

For a hosted database (recommended for production / live demo URL), switch Prisma to PostgreSQL:

1. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
2. Set `DATABASE_URL` to your Postgres connection string (e.g. Neon, Supabase, RDS).
3. `npx prisma migrate deploy && npm run db:seed`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Database connection (defaults to local SQLite `file:./dev.db`). |
| `SESSION_SECRET` | prod | HMAC secret for session cookies. Set a strong value in production. |
| `ANTHROPIC_API_KEY` | optional | Enables the LLM-vision description layer in QC. |

---

## Security & enterprise notes

- Every privileged operation re-checks authorization **server-side** (`assertCan`) regardless of UI state — server actions are reachable directly, so this is defense-in-depth.
- All mutations run inside a database transaction together with their audit entry, so the audit log can never drift from reality.
- Sessions are HTTP-only, signed cookies; passwords are salted + `scrypt`-hashed.
- The audit hash chain makes retroactive edits/deletions detectable.

_Built for Sima Arome — CyberHack 2026._
