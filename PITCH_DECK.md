# AromaFlow — Pitch Deck Content

Use this as the script/content for your slides (PDF). Keep each slide **visual and tight** — one idea per slide, screenshots over text. Suggested 10 slides per the CyberHack outline.

---

## Slide 1 — Title
**AromaFlow**
*One source of truth for natural-extract manufacturing.*
Built for Sima Arome · CyberHack 2026 · [your team name]
> Visual: logo + the dashboard screenshot.

---

## Slide 2 — Problem
**Production lives in people's heads, not in software.**
Sima Arome runs an end-to-end extract operation, but today:
- **Fragmented systems** — the same data is re-entered across notebooks, spreadsheets and apps.
- **Manual QC bottleneck** — colour/powder checks depend on a trained pair of eyes; throughput stalls.
- **Storage by spreadsheet** — drum placement, hazard segregation and cold-chain (−4 to −20°C) tracked in files.
- **Production opacity** — schedules, lot histories and dispatches scattered across chats.

*Result: slowdowns, rework, missed batches, and no audit trail when something goes wrong.*

---

## Slide 3 — The Solution
**AromaFlow: one connected system from intake to dispatch.**
A single record flows through the whole chain — captured once, used everywhere:

`Supplier intake → AI QC → PPIC scheduling → Lot issue → Warehouse & cold-chain → Dispatch`

…with **role-based access**, **AI quality control**, and a **tamper-evident audit trail** on every action.
> Visual: the pipeline strip from the dashboard.

---

## Slide 4 — Value Proposition
**Why AromaFlow beats spreadsheets + point tools:**
- **No double entry.** One source of truth; data is entered once.
- **AI QC anyone can run** — consistent, objective, in seconds, no specialist required.
- **The system enforces the rules.** A QC-failed lot *cannot* be scheduled or shipped. Cold-chain & hazardous goods *cannot* be mis-stored. It's not a guideline — it's enforced.
- **Provable traceability.** Full lot genealogy + a cryptographically tamper-evident audit log → audit- and export-ready.

---

## Slide 5 — Product Demo
**Live walkthrough (see demo video):**
1. Warehouse records an incoming delivery.
2. QC runs an **AI colour/contamination inspection** → automatic PASS/FAIL.
3. PPIC is **blocked** from scheduling a failed lot; schedules a passed one and issues a lot number.
4. Warehouse places it — **wrong-zone placements are rejected**.
5. Dispatch ships it. The **lot's full genealogy** and the **verified audit chain** are one click away.
> Visual: 3–4 key screenshots (QC verdict, blocked policy toast, traceability timeline, audit chain "Verified").

---

## Slide 6 — Technical Architecture
- **Next.js 16** (Server Components + Server Actions) · **TypeScript** · **Tailwind v4**
- **Prisma** ORM · **SQLite** locally → **PostgreSQL** in production
- **AI QC engine:** on-device computer vision — **sRGB→CIELAB + ΔE2000** colour matching, 8×8 spatial uniformity, foreign-matter outlier detection. **No API key, no network** → demo never fails. Optional **LLM-vision** layer for natural-language descriptions.
- **Enterprise core:** central service layer where every mutation = **RBAC check + policy enforcement + audit append**, all in one DB transaction. Audit log is a **SHA-256 hash chain**.
> Visual: simple architecture diagram (UI → Server Actions → Service layer → DB + Audit chain).

---

## Slide 7 — Target Audience & Impact
**Users:** warehouse operators, QC officers, PPIC planners, dispatch officers, plant managers — *every* persona has a tailored view.
**Impact for Sima Arome:**
- Eliminates re-keying across 3+ tools → fewer errors, faster throughput.
- QC throughput no longer gated on one specialist.
- Zero mis-shipped out-of-spec lots (system-enforced).
- Instant traceability & audit for export compliance.
*Scales from one plant to many; built for natural-extracts but applicable to any batch manufacturer.*

---

## Slide 8 — Business Viability
- **Model:** B2B SaaS, per-seat + per-plant licensing; AI-QC as a usage add-on.
- **Why it sells:** enterprise readiness (RBAC, audit, compliance) is exactly what manufacturers must have for export/quality certifications.
- **Low cost to run:** on-device QC means no per-inspection inference cost; serverless deploy.
- **Expansion:** more material specs, ERP/MES connectors, IoT cold-chain sensors, multi-site.

---

## Slide 9 — Future Roadmap
- **Now (MVP):** integrated ops + AI QC + RBAC + audit + cold-chain (this prototype).
- **Next:** live IoT temperature sensors; barcode/QR lot scanning; mobile capture; ERP/accounting connectors.
- **Then:** trend analytics & supplier scorecards; model-based defect classification; multi-plant + offline-first.
- **Compliance:** export e-certificates generated straight from the lot genealogy.

---

## Slide 10 — Team & Call to Action
**Team:** [names + one-line strengths].
**Try it:** [live demo URL] · log in with one click as any role (password `demo1234`).
**Code:** [GitHub URL].
> CTA: "Give Sima Arome a single source of truth — from fruit to dispatch."

---

### Talking points / Q&A prep
- *"Is the AI real?"* Yes — it's CIEDE2000 colour science (industrial standard), computed per-pixel in the browser. Deterministic, explainable, and it runs offline. The LLM layer is an optional enrichment, not the decision-maker.
- *"How is this enterprise-ready?"* RBAC enforced server-side, every action in the tamper-evident audit chain, policy guaranteed by the system, transactional integrity, Postgres-ready.
- *"What stops a bad lot shipping?"* The system, structurally — dispatch checks the lot is FINISHED and its source intake is QC-PASSED, or it refuses.
