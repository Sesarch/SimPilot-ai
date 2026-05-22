
# Support Inbox Dashboard

A unified inbox at **/admin/inbox** (admin-only) that merges every customer touchpoint into one queue, lets you reply via email from the dashboard, and threads inbound replies back into the same conversation.

---

## 1. Data model (new migration)

### `inbox_threads`
One row per conversation, regardless of origin source.
- `source` — `contact_form` | `support_chat` | `school_inquiry` | `lead_email` | `inbound_email`
- `source_id` — FK to the originating row (uuid)
- `subject`, `from_email`, `from_name`
- `status` — `new` | `open` | `pending` | `resolved` | `archived` (default `new`)
- `assigned_to` — admin user_id (nullable)
- `priority` — `low` | `normal` | `high`
- `last_message_at`, `unread_count`
- `tags` — text[]

### `inbox_messages`
Every inbound + outbound message in a thread.
- `thread_id` → `inbox_threads`
- `direction` — `inbound` | `outbound` | `note`
- `body_text`, `body_html`
- `from_email`, `to_email`, `cc`, `bcc`
- `email_message_id` (RFC Message-ID for threading), `in_reply_to`, `references`
- `delivery_status` — `pending` | `sent` | `failed` (for outbound)
- `attachments` jsonb

### `inbox_notes`
Internal admin-only notes attached to a thread.
- `thread_id`, `admin_user_id`, `body`

### Auto-seeding via triggers
Triggers on `contact_submissions`, `support_chats`, `school_inquiries`, `lead_emails` automatically create an `inbox_threads` row + first `inbox_messages` row on insert. **Existing rows are backfilled by the migration.**

### RLS
Admin-only (`has_role(auth.uid(), 'admin')`) for all 3 new tables, plus service-role writes for the inbound webhook.

---

## 2. Outbound reply (Lovable Emails)

New edge function `inbox-send-reply`:
- Auth: verifies caller is admin
- Sends via existing `send-transactional-email` infra from `support@notify.simpilot.ai`
- Sets `Reply-To: support@simpilot.ai` so customer replies land in the inbound webhook
- Records the sent message in `inbox_messages` with `direction=outbound`
- Sets RFC `Message-ID`, `In-Reply-To`, `References` headers for proper threading
- Updates thread `status` → `pending` (waiting on customer)

---

## 3. Inbound email webhook

New edge function `inbox-inbound-webhook` (public, HMAC-verified):
- Parses inbound payload (provider-agnostic shape — works with CloudMailin or Postmark Inbound)
- Looks up thread by `In-Reply-To` / `References` headers, else by sender email
- Creates new `inbox_messages` row with `direction=inbound`
- Bumps thread `status` → `open`, increments `unread_count`, updates `last_message_at`

**⚠️ Your action required (one-time setup):** Migadu doesn't expose inbound webhooks. You'll need to pick a provider and set MX/forwarding:

- **Option A — CloudMailin** ($9/mo, easiest): give me the webhook URL after deploy → you point an address like `support-in@simpilot.ai` MX to CloudMailin, then set up a Migadu forward from `support@` to it.
- **Option B — Postmark Inbound** (free up to 100/mo, then paid): same idea.
- **Option C — defer**: ship everything except inbound now; add the webhook later.

I'll build the webhook receiver in a provider-agnostic way so you can switch later.

---

## 4. Frontend — `/admin/inbox`

Layout: **3-pane** (Gmail/Front style)
- **Left rail**: filters — All / New / Open / Pending / Resolved / Archived, by source (chips), by assignee, search
- **Middle list**: thread list with sender, subject preview, source badge, time, unread dot, priority flag
- **Right pane** (selected thread):
  - Header: subject, from, status dropdown, assignee picker, priority, tags, source link
  - Message timeline (inbound vs outbound visually distinct, internal notes pinned with yellow background)
  - Reply composer (rich text → plain+HTML), "Send" button
  - Internal note composer (yellow, admin-only, never emailed)
  - Right sidebar: customer context — subscription tier, trial status, prior threads count, link to profile

Cockpit aesthetic: Orbitron headings, teal accents, dark theme. Mobile: collapses to single-pane drill-down.

Realtime: subscribe to `inbox_threads` + `inbox_messages` via Supabase Realtime so new mail/replies appear without refresh.

---

## 5. Admin nav

Add **Inbox** tab to existing `/admin` shell with an unread-count badge (red dot showing total `new` threads across all sources).

---

## Files

**New:**
- `supabase/migrations/<ts>_inbox.sql` — tables, triggers, backfill, RLS, realtime publication
- `supabase/functions/inbox-send-reply/index.ts`
- `supabase/functions/inbox-inbound-webhook/index.ts`
- `src/pages/admin/Inbox.tsx`
- `src/components/admin/inbox/ThreadList.tsx`
- `src/components/admin/inbox/ThreadView.tsx`
- `src/components/admin/inbox/ReplyComposer.tsx`
- `src/components/admin/inbox/NoteComposer.tsx`
- `src/components/admin/inbox/InboxFilters.tsx`
- `src/components/admin/inbox/CustomerContext.tsx`
- `src/hooks/useInboxThreads.ts`
- `src/hooks/useInboxThread.ts`

**Edited:**
- `src/App.tsx` — add `/admin/inbox` route
- `src/components/admin/AdminNav.tsx` (or equivalent) — add Inbox link + badge

---

## Build order (so you see progress fast)

1. Migration (tables + triggers + backfill + RLS + realtime)
2. `/admin/inbox` UI reading existing data — already useful from minute one
3. Status workflow + notes + filters
4. `inbox-send-reply` edge function + composer wired up
5. `inbox-inbound-webhook` edge function (you can deploy without an inbound provider, then connect one whenever)

---

## Reply with one of:
- ✅ **Go** — I'll build everything in the order above
- 🔧 **Skip inbound for now** — ship 1–4 only, add webhook later
- ✏️ Any changes (different layout, drop a source, etc.)
