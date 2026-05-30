# AromaFlow — 3-Minute Demo Video Script

Goal: show the **prototype running** (not slides), hit the **golden path**, and land the three "wow" beats: **AI QC**, **system-enforced policy (a block)**, and the **tamper-evident audit + traceability**.

**Before recording:** `npm run db:seed` for clean data, then `npm run dev`. Have the login page open. Keep the browser zoom so the sidebar + content are readable. Total ≈ 2:50.

---

### 0:00–0:20 · Hook + problem (login screen)
> "Sima Arome makes natural extracts — but production lives in spreadsheets and people's heads. Data is re-entered across tools, QC waits on a trained eye, and there's no audit trail. This is **AromaFlow** — one source of truth from intake to dispatch."

Show the login screen with the value props. Click **Warehouse Operator** (one-click login).

### 0:20–0:40 · Intake (no double entry)
> "A delivery arrives. The warehouse records it **once**."

Go to **Raw Intake** → fill the form (supplier, material e.g. *Clove Bud Oil*, qty, batch) → **Record intake**. Point out the new GRN appears at the top.

### 0:40–1:15 · AI Quality Control (the wow)
> "Now QC. Instead of eyeballing it, our on-device computer vision grades the sample."

Switch role (top bar) to **QC Officer**. Go to **AI Quality Control** → **Inspect** the new intake.
- Click **In-spec sample** → "ΔE2000 colour match, uniformity, foreign-matter — all in the browser, no internet." → verdict **PASS**.
- Click **Contaminated** → verdict **FAIL**, foreign matter detected. *(optional: click "Explain with LLM vision".)*
- Click **In-spec** again → **Record QC inspection**.

> "Real colour science — the same ΔE2000 metric industrial spectrophotometers use — and it never needs an API key."

### 1:15–1:45 · Policy enforcement (the differentiator)
> "Here's what makes it enterprise-grade: the system enforces the rules."

Switch to **PPIC Planner** → **Production**. In the schedule form, note the **failed dragonfruit intake is not even selectable** — only QC-passed stock is. Schedule the passed lot → **Start run** → **Complete & issue lot** (a lot number is issued).

Switch to **Warehouse** → **Warehouse**. Try to place a cold-chain or flammable lot into the **wrong zone** → show the **red rejection message**.
> "A failed lot can't be scheduled. Hazardous goods can't be mis-stored. It's not a guideline — it's enforced and logged."

Place it correctly; show it appear on the **floor plan**. Point at the **cold-chain cell with the temperature alert**.

### 1:45–2:10 · Dispatch + traceability
Switch to **Dispatch** → **Dispatch** → ship the finished lot to a customer.
Go to **Lots & Traceability** → open the lot → show the **full genealogy timeline**: supplier → intake → QC → production → storage → dispatch.
> "Every lot is traceable end-to-end — export- and audit-ready."

### 2:10–2:40 · Audit trail (enterprise close)
Go to **Audit Trail**.
> "And every single action is in a **tamper-evident hash chain**. The platform re-verifies the whole chain — if anyone edited history, it would say exactly where it broke."

Point at the green **"Integrity verified"** banner and the hash column. Switch to **Admin** → **Users & Roles** → show the **permission matrix**.
> "Role-based access, enforced server-side, on every action."

### 2:40–2:50 · Close
> "AromaFlow — AI quality control, full traceability, and a provable audit trail. One source of truth for Sima Arome, from fruit to dispatch."

---

**Tips**
- Use the **role switcher** in the top bar — it's the fastest way to show RBAC live.
- If you prefer no live typing, the seed already contains passed/failed intakes and finished lots so you can demo any step standalone.
- Record at 1080p; keep the cursor movements deliberate; the whole thing should feel calm, not rushed.
