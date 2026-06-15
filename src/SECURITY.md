# OrderFlow — Security Notes & Hardening Plan

Status of the security model and a phased plan to fix it. **Read the deploy
warnings before touching Firebase rules** — a wrong ruleset takes the whole app
down (this already happened on 2026-04-17 with an expired test rule).

## Current state (the gaps)

1. **Firebase rules are fully open** (`".read": true`, `".write": true`). Anyone
   with the public web config (which ships in the client bundle, by design) can
   read and overwrite the entire database: all ~1,347 buyers, every order, and
   `settings/adminPassword`.
2. **There is no Firebase Authentication.** The app reads/writes the RTDB
   anonymously. The Staff/Admin `PasswordGate` is a **client-side check only** —
   it gates the UI, not the data. Bypassing it (or hitting the REST API
   directly) gives full access.
3. **Passwords are plaintext** in the DB (`settings/adminPassword`,
   `users/{id}.password`) and the admin password is **read by the client** to
   run the gate.

### Why we can't just "tighten the rules"
Because there is no auth, every request is unauthenticated. A rule like
`".read": "auth != null"` would reject **every** request the app makes today →
instant, total outage. Real role scoping is impossible until the app
authenticates. So the order of operations matters.

## Phased plan (each phase shippable + testable on its own)

### Phase A — Authenticate (prerequisite for everything else)
- Add Firebase Auth. Minimum viable: **Anonymous Auth** (`signInAnonymously`
  on app load) so every request carries a token and App Check can be enforced.
  Better: real per-user identity (email/password or a custom-token mint per
  staff/admin login) so rules can tell staff from admin.
- Turn on **Firebase App Check** (reCAPTCHA / Play Integrity) to block requests
  that don't originate from the real app.
- Mark admins server-side, not by a shared password — e.g. an `/admins/{uid}:true`
  node or a custom claim `auth.token.admin`.

### Phase B — Move secrets out of the client
- Stop storing/reading plaintext passwords. With real auth the Admin gate is
  redundant (identity comes from the token); `settings/adminPassword` and
  `users/{id}.password` can be removed.
- If a PIN-style gate is still wanted, store only a salted hash and verify it in
  a Cloud Function, never client-side.

### Phase C — Scoped rules (only after Phase A is live and tested)
- Master data (`buyers`, `skus`, `categories`, `buyerGroups`, `users`,
  `settings`) → **read for any authed client, write admin-only**.
- `orders` → read/write for any authed client (staff create & fulfil), plus
  shape validation.
- Target ruleset is in **`database.rules.target.json`** (next to this file).
- **Seeding caveat:** today the client seeds empty master-data nodes from the
  JSON on first load. Under admin-only writes, seeding must be done by an admin
  session or via the Firebase console / a one-off script — otherwise a fresh DB
  won't seed.

### Phase D — Server-side purge
- Move the 7-day billed / 1-day historical purge (currently client-side
  `purgeOldOrders`) into a scheduled Cloud Function so it runs regardless of
  client activity.

## Deploy rules SAFELY (every time)
- **Never** use a rule with an expiration timestamp in production.
- Test in the Firebase **Rules Playground** and against **both** the Staff and
  Admin flows end-to-end in a staging project before publishing.
- Keep the previous ruleset handy to roll back instantly.
- Roll out auth (Phase A) **before** publishing the scoped rules (Phase C), or
  they will reject the app's own traffic.

## Already done (code side, 2026-06-15)
- Firebase writes now go through `dbSet`/`dbRemove` wrappers that catch failures
  and alert instead of failing silently — so a too-strict rule deploy will be
  visibly noticed rather than silently dropping writes.
