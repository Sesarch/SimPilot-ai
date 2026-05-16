// Integration tests for the seeded-provision-ping cleanup contract.
//
// These tests verify the safety guarantees promised by the admin
// "Send test webhook" flow:
//
//   1. Seeded evt_provision_ping_* rows are NOT removed until at least one
//      genuine (non-test) Stripe-verified event has been persisted.
//   2. Even with a verified event present, only seed rows older than the
//      configured safety window are removed.
//   3. A real signed admin.test.ping POST to stripe-webhook succeeds
//      (HTTP 2xx), proving the round-trip signature path still works.
//
// The cleanup logic lives in the prune_seeded_provision_pings SQL function
// (called under pg_advisory_xact_lock) which is what admin-payments invokes
// after a successful test delivery.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const haveServiceRole = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const TAG = `it_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const OLD_PING_ID = `evt_provision_ping_${TAG}_old`;
const FRESH_PING_ID = `evt_provision_ping_${TAG}_fresh`;
const VERIFIED_ID = `evt_real_${TAG}`;

async function cleanup() {
  const sb = admin();
  await sb.from("stripe_webhook_events").delete().in("stripe_event_id", [
    OLD_PING_ID,
    FRESH_PING_ID,
    VERIFIED_ID,
  ]);
}

async function seedRow(opts: {
  id: string;
  eventType: string;
  ageMinutes: number;
}) {
  const sb = admin();
  const createdAt = new Date(Date.now() - opts.ageMinutes * 60_000)
    .toISOString();
  const { error } = await sb.from("stripe_webhook_events").insert({
    stripe_event_id: opts.id,
    event_type: opts.eventType,
    livemode: false,
    payload: { id: opts.id, type: opts.eventType, _test: TAG },
    created_at: createdAt,
    processed_at: createdAt,
  });
  if (error) throw error;
}

async function exists(id: string): Promise<boolean> {
  const sb = admin();
  const { data, error } = await sb
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", id)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

Deno.test({
  name: "prune_seeded_provision_pings is a no-op without a verified event",
  ignore: !haveServiceRole,
  async fn() {
    await cleanup();
    try {
      // Seed only provision-ping rows, no real verified event.
      await seedRow({ id: OLD_PING_ID, eventType: "admin.test.ping", ageMinutes: 30 });
      await seedRow({ id: FRESH_PING_ID, eventType: "admin.test.ping", ageMinutes: 1 });

      // We can't guarantee the DB has zero verified events in a shared
      // environment, so this test only asserts that when no verified row
      // is present the RPC reports verified=false AND deletes nothing.
      // To make it deterministic, we temporarily check current state first.
      const sb = admin();
      const { data: anyVerified } = await sb
        .from("stripe_webhook_events")
        .select("stripe_event_id")
        .not("stripe_event_id", "like", "evt_provision_ping_%")
        .not("stripe_event_id", "like", "evt_admin_test_%")
        .neq("event_type", "admin.test.ping")
        .limit(1)
        .maybeSingle();

      if (anyVerified) {
        // Environment already has real Stripe traffic; skip the "no verified"
        // assertion but still confirm safety window protects fresh rows.
        const { data } = await sb.rpc("prune_seeded_provision_pings", {
          _min_age_minutes: 5,
        });
        const row = Array.isArray(data) ? data[0] : data;
        assert(row?.verified_event_exists === true);
        const deleted: string[] = row?.deleted_event_ids ?? [];
        assertEquals(
          deleted.includes(FRESH_PING_ID),
          false,
          "fresh row inside safety window must not be deleted",
        );
      } else {
        const { data } = await sb.rpc("prune_seeded_provision_pings", {
          _min_age_minutes: 5,
        });
        const row = Array.isArray(data) ? data[0] : data;
        assertEquals(row?.verified_event_exists, false);
        const deleted: string[] = row?.deleted_event_ids ?? [];
        assertEquals(deleted.length, 0, "must delete nothing without verified event");
        assertEquals(await exists(OLD_PING_ID), true);
        assertEquals(await exists(FRESH_PING_ID), true);
      }
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name:
    "prune_seeded_provision_pings deletes only aged seed rows after a verified event",
  ignore: !haveServiceRole,
  async fn() {
    await cleanup();
    try {
      await seedRow({ id: OLD_PING_ID, eventType: "admin.test.ping", ageMinutes: 30 });
      await seedRow({ id: FRESH_PING_ID, eventType: "admin.test.ping", ageMinutes: 1 });
      // Seed a verified non-test Stripe event so the safety gate opens.
      await seedRow({
        id: VERIFIED_ID,
        eventType: "checkout.session.completed",
        ageMinutes: 60,
      });

      const sb = admin();
      const { data, error } = await sb.rpc("prune_seeded_provision_pings", {
        _min_age_minutes: 5,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      assertEquals(row?.verified_event_exists, true);

      const deleted: string[] = row?.deleted_event_ids ?? [];
      assert(
        deleted.includes(OLD_PING_ID),
        `expected ${OLD_PING_ID} to be deleted, got ${JSON.stringify(deleted)}`,
      );
      assertEquals(
        deleted.includes(FRESH_PING_ID),
        false,
        "fresh row inside safety window must survive",
      );

      assertEquals(await exists(OLD_PING_ID), false);
      assertEquals(await exists(FRESH_PING_ID), true);
      assertEquals(await exists(VERIFIED_ID), true);
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name:
    "stripe-webhook accepts a signed admin.test.ping (round-trip succeeds)",
  ignore: !haveServiceRole,
  async fn() {
    const sb = admin();
    const { data: secretRow } = await sb
      .from("stripe_webhook_signing_secrets")
      .select("signing_secret, livemode")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!secretRow?.signing_secret) {
      console.warn("No active signing secret configured; skipping signed round-trip test.");
      return;
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!stripeKey) {
      console.warn("No STRIPE_SECRET_KEY available; skipping signed round-trip test.");
      return;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const nowSec = Math.floor(Date.now() / 1000);
    const eventId = `evt_admin_test_${TAG}_${nowSec}`;
    const payloadObj = {
      id: eventId,
      object: "event",
      api_version: "2025-08-27.basil",
      created: nowSec,
      livemode: secretRow.livemode,
      type: "admin.test.ping",
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
      data: {
        object: {
          id: `admin_test_${nowSec}`,
          object: "admin_test",
          note: "Integration test signed ping",
        },
      },
    };
    const payload = JSON.stringify(payloadObj);
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: secretRow.signing_secret,
      timestamp: nowSec,
    });

    const url = `${SUPABASE_URL}/functions/v1/stripe-webhook`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": header,
      },
      body: payload,
    });
    const text = await resp.text();
    assert(
      resp.status >= 200 && resp.status < 300,
      `stripe-webhook rejected signed test: ${resp.status} ${text.slice(0, 200)}`,
    );

    // Clean up any row the webhook may have logged for this synthetic event.
    await sb.from("stripe_webhook_events").delete().eq("stripe_event_id", eventId);
  },
});
