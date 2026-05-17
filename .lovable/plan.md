# SimPilot.AI — Pricing + T&C Overhaul (Staged)

## Scope confirmation needed before I build

This spec is large and touches several systems that are currently wired differently than the spec assumes. I want to lock the approach before writing code so we don't waste a cycle. Two important callouts up front:

### A. Stripe products: how to create them
The current pricing UI is **driven dynamically** by Stripe via `list-plans` edge function + `useStripePlans` hook (Student / Pro Pilot / Gold Seal / Flight School are real Stripe products today). The spec says "create new price IDs `price_pilot_monthly_39` etc." — Stripe does not let us name price IDs; it auto-generates `price_xxx`. I will:

1. Create three new Stripe **products** (Pilot Monthly, Pilot Annual, Checkride Lifetime) + a 4th product for the **$9 / 250 conversations overage credit** using the `stripe--create_stripe_product_and_price` tool.
2. Tag them with metadata (`plan_key=pilot_monthly | pilot_annual | checkride_lifetime | overage_250`) so the new pricing page selects them by `plan_key`, not by Stripe-generated ID.
3. Leave the existing Student / Pro / Gold / School products in Stripe untouched (archiving them is a separate decision — confirm if you want them archived).

### B. Conversation caps + overage billing (Stage 2)
The spec includes:
- 500 / 1,000 / 1,500 monthly conversation caps
- An overage modal at cap
- $9 / 250 extra conversations purchase flow
- Checkride Lifetime "until target rating + 90 days, max 24 months" access window
- Pass-the-checkride guarantee refund workflow (4 conditions, FAA doc upload)

These are **substantial backend features** (new tables, cap-enforcement middleware in `ai-orchestrator` call path, a new Stripe checkout flow for one-off credits, an admin refund-review queue). The spec also says "do not modify the AI orchestrator." Those two constraints conflict — cap enforcement needs *some* hook in the chat call path.

**My recommendation:** ship Stage 1 now (content, schema, UI, signup gating, draft banners, Stripe products), and ship Stage 2 (cap enforcement + overage + guarantee workflow) as a follow-up so we can scope/design it properly. Stage 1 alone is what the attorney needs to review.

If you want Stage 2 in this same loop, say so and I'll expand.

---

## Stage 1 — What I will ship now

### 1. Stripe products (via tool)
Create 4 products with metadata `plan_key`:
- Pilot Monthly — $39/mo recurring → `plan_key=pilot_monthly`
- Pilot Annual — $299/yr recurring → `plan_key=pilot_annual`
- Checkride Lifetime — $399 one-time → `plan_key=checkride_lifetime`
- Conversation Overage — $9 one-time → `plan_key=overage_250`

### 2. Database migration
```text
ALTER TABLE profiles
  ADD COLUMN terms_accepted_at timestamptz,
  ADD COLUMN terms_accepted_ip text,
  ADD COLUMN terms_version text,
  ADD COLUMN target_rating text,             -- for Checkride Lifetime
  ADD COLUMN lifetime_access_started_at timestamptz,
  ADD COLUMN lifetime_target_passed_at timestamptz;
```
Keep existing `terms_agreed_at` column for backward compat; new column is the source of truth going forward. `terms_version` constant = `"2026-05-17"`.

### 3. Pricing page rewrite
- Replace `PricingSection.tsx` plan array + `PlanComparisonTable` + `PlanQuickCompare` with a **new 3-tier layout** keyed by `plan_key` returned from `list-plans`.
- Annual column: teal border + "MOST POPULAR" ribbon, `$24.92/mo equiv` small text, "Save $169/yr" badge.
- Identical 11-item feature list per plan (multi-brain AI, DPE sim, weather, tracking, POH, vision, sim bridge, FAR/AIM citations, safety review, history, PWA).
- Mobile: stacked cards.
- New `PricingFAQ` content with the 6 questions from spec.
- Remove `ForSchoolsSection` from pricing page; replace with one-line link: "Flight school or training organization? [Contact sales →](mailto:sales@simpilot.ai)".
- Admin-only yellow draft banner at top (uses existing `useAuth` + `has_role('admin')` check).

### 4. T&C page rewrite
- Preserve verbatim: red CRITICAL DISCLAIMER box + Sections 1–7 + final acknowledgment shell.
- Replace Sections 8, 9, 10, 11.
- Add Sections 12, 13, 14.
- Renumber old Section 12 (Changes) → 15, old Section 13 (Governing Law) → 16.
- Add Section 17 (Contact).
- Update final acknowledgment box with the 5 new bullets (a–e).
- Update "Last updated" date to today.
- Admin-only yellow draft banner at top with the 4 attorney-flag items.
- Bump `terms_version` constant to `"2026-05-17"`.

### 5. Signup flow update
- Replace `TermsAgreement.tsx` component to render the **full T&C body** in a scrollable container (not just a summary). Existing scroll-to-bottom gate is preserved and re-used.
- On signup submit: capture `terms_accepted_at = now()`, `terms_version`, and `terms_accepted_ip` (fetched via a tiny `/whoami-ip` edge function or from request headers in an existing function — I'll add a 20-line `get-client-ip` edge function returning `req.headers['x-forwarded-for']`).
- For Checkride Lifetime purchases specifically: post-checkout onboarding screen requires a second checkbox + target rating dropdown (9 options) before chat access unlocks. Save to `profiles.target_rating` + `lifetime_access_started_at`.

### 6. Admin draft banner component
New `<DraftReviewBanner items={[...]} />` shown only when `useAuth().isAdmin === true`. Used on `/pricing` and `/terms`.

---

## Files touched

**New**
- `src/components/DraftReviewBanner.tsx`
- `src/components/pricing/PricingTiersV2.tsx` (3-tier layout)
- `src/components/pricing/CheckrideTargetRatingPicker.tsx`
- `src/lib/termsVersion.ts` (single source of truth)
- `supabase/functions/get-client-ip/index.ts`
- Migration: add 6 columns to `profiles`

**Modified**
- `src/components/PricingSection.tsx` — swap to new tiers, drop For Schools
- `src/components/PricingFAQ.tsx` — replace with 6 new Q&A
- `src/pages/TermsPage.tsx` — sections 8–17 + final ack + draft banner
- `src/components/TermsAgreement.tsx` — render full T&C, persist version/IP
- `src/components/auth/SignUpForm.tsx` — pass version/IP through to insert
- `src/hooks/useAuth.tsx` — write `terms_accepted_at` / `terms_version` / `terms_accepted_ip` on signup

**Not touched** (per spec)
- `supabase/functions/stripe-webhook`, `ai-orchestrator`, `admin-payments`, signing-secret table, admin dashboard
- T&C Sections 1–7 and CRITICAL DISCLAIMER box

---

## Explicitly deferred to Stage 2 (need your go-ahead)

- Live conversation-cap counter + cap-reached modal
- Overage purchase Stripe Checkout flow + credit ledger
- Checkride Lifetime 24-month expiry job + "rating passed" admin action
- Pass-the-checkride guarantee refund intake form + admin review queue
- Archiving the old Stripe products (Student / Pro / Gold / School)

---

## Acceptance check (Stage 1 only)

1. Four new Stripe prices created — IDs reported to you
2. `/pricing` shows 3 tiers, FAQ, sales link, admin-only banner
3. `/terms` shows preserved 1–7, new 8–17, admin-only banner, updated ack
4. Signup captures `terms_accepted_at`, `terms_version`, `terms_accepted_ip`
5. `profiles` has the 6 new columns
6. Nothing deploys to production — preview URL only (Lovable preview is already non-prod)

---

**Reply "go stage 1"** to ship the above, or **"go stage 1+2"** if you want cap enforcement + overage + guarantee workflow in this loop (≈2–3× the change surface).