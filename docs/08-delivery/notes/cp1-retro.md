# CP-1 Retro — what went wrong and what changed because of it

> Written Fri Aug 29 (post-checkpoint action, issue #19). Items 1–8 came from the sprint;
> item 9 was found the same afternoon by the end-to-end gate this retro recommends. The rule is "agent failures →
> update AGENTS.md traps sections same day", so every item below names the file that
> changed. A retro that only lists regrets is a diary; this one is a diff.

---

## 1. The Day-3 backend never got built, and nothing said so

**What happened.** `cp1-day-plan.md` put property-gis, funeral-cases and
scheduling-resources on Wednesday. They were not built. The checkpoint ran on Thursday with
modules D, G, H and I demoing against fixtures, and the day plan's own EOD gate — "scenario F
and scenario H both run end-to-end" — could not have passed. Issues #4–#7 stayed open with no
comment. The services landed on Friday, a day after the checkpoint they were required for.

**Why it survived a whole day.** Fixtures-first worked *too* well. Gab's screens looked
finished, the demo script walked through them, and nothing in the repo distinguished
"module D works" from "module D looks like it works". The nightly scope check the day plan
mandates would have caught it; there is no evidence it ran.

**Changed:** `platform/tests/e2e-ops.sh` now proves scenarios F and H over real events, and
runs in CI. A module is finished when its e2e passes, not when its screens render.

---

## 2. CI never ran a single service's tests

**What happened.** `template-checks` ran the *service template's* suite. Every service
generated from it — identity-access through accounting — shipped without CI executing its own
unit, contract or integration tests even once. Seven services, four merged PRs, zero test
runs in CI.

**Why it survived.** The job name reads like coverage. "Template checks green" was taken as
"the services are green".

**And it is worse than that.** Pushing this branch produced the repository's **first two
GitHub Actions runs, ever**. Both failed in five seconds with zero steps executed:

> The job was not started because recent account payments have failed or your spending limit
> needs to be increased.

CI has never run in this repo. Not for PR #25, #26, #27 or #28; not for the Wave-0 gates the
day plan calls "a first-class CI target, not documentation". Every "CI enforces this" claim in
every AGENTS.md — the merge-blocker rules, the nightly fixture↔contract drift check — has been
describing a system that has never executed. The workflow file is careful and detailed and has
never run once.

This is an account-billing setting, not a code problem, and it is the single highest-leverage
fix on the list: every other guard in this retro is enforced by a CI that cannot start.

**Changed:** `.github/workflows/ci.yml` gained a `service-suites` matrix over all ten
services and now runs `e2e-ops.sh`. `platform/AGENTS.md` traps: *"Assuming CI ran a service's
tests."* **Still open:** the billing block itself — nothing in CI is real until it clears.

---

## 3. The dedicated profile was empty the entire sprint

**What happened.** `deploy/vm-dedicated/compose.yml` held a gateway, a verifier, and a
comment: *"Attach services below as they come online."* Nothing was ever attached. The CP-1
DoD says every flow runs **on the dedicated single-tenant profile**; issue #17 says the demo
happens there. That was not possible on any day of the sprint.

**Why it survived.** The `dedicated-profile` CI job asserted the gateway was healthy and that
an unauthenticated call got a 401. Both pass with zero services behind the gateway. The test
was green and meaningless.

**Changed:** the profile now contains db + all ten services + web. Traps entry added.
**Still open:** the CI job should assert a real flow, not just fail-closed at the edge.

---

## 4. The service generator was broken on macOS and lied about it

**What happened.** `tools/generate-service.sh` used `sed -i "s/.../"` — GNU syntax. BSD sed on
macOS reads the next argument as a backup-file suffix, so every substitution failed. Services
generated on a Mac came out with `__SERVICE_NAME__` placeholders intact. The failure exit code
was swallowed by the surrounding pipeline, so the script printed nothing and looked like it
had worked.

Its "next steps" text also still said `npm install` and `src/domain/example.ts`, three days
after ADR-007 moved the backend to Rails.

**Changed:** `perl -pi` (identical on both platforms), `.rb`/`.ru`/`Rakefile` added to the
substitution set, and a hard failure if any placeholder survives. Next-steps text rewritten
for Rails. Traps entry: *"Generator scripts must be portable."*

---

## 5. A frozen contract named an event the frozen envelope cannot express

**What happened.** Issue #7 specifies `case.stage.changed`. Envelope v1 freezes `event_type`
to `{aggregate}.{action}` — pattern `^[a-z_]+\.[a-z_]+$` — enforced in both
`Events::Envelope` and the shipped JSON Schema. Three segments raise. The event name and the
envelope could not both be honoured.

**Resolution:** the envelope wins; it is frozen and shipped. The event is
`case.stage_changed`. Nothing consumed the old name, so the cost was zero — but only because
the service did not exist yet. Had funeral-cases shipped Wednesday as planned, this would
have been a breaking rename.

**Changed:** a test in funeral-cases pins *both* directions — the underscore form builds, the
dotted form raises — so nobody "corrects" the name back. Traps entry in the template.

---

## 6. Tests that cannot fail

Two flavours found:

- **`minitest/mock` does not exist in minitest 6.** Any test reaching for `Object#stub` fails
  at load time and takes the entire suite down. Since no service suite ran in CI, this would
  have surfaced only on someone's laptop.
- **`commerce-ordering`'s checkout integration test is defined inside
  `if CATALOG_AVAILABLE`.** Without `CATALOG_INTERNAL_URL` set, the test does not exist — the
  runner reports 10 passing tests and never mentions it. A green suite that silently omits
  the money path is worse than a red one.

**Changed:** outbox tests rewritten around a recording subclass; traps entries for both in
`service-template/AGENTS.md`. **Still open:** convert the conditional test to an in-test
`skip` so the runner reports it (left alone here — it is another owner's service and the
change is not urgent).

---

## 7. Fixtures became contracts by default

**What happened.** Gab wrote `Lot` and `Case` TypeScript types, and `hr:read` /
`documents:read` scopes, ahead of any freeze — correctly, per fixtures-first, and honestly
flagged in file headers and the limitations list. But four days later those shapes were
shipped, merged and demoed, so freezing anything else would have meant rewriting working
screens. The contracts written on Aug 29 ratify Gab's shapes essentially unchanged.

That is not a bad outcome — the shapes were good — but it happened by momentum rather than
by decision. A worse shape would have won the same way.

**Changed:** `web/AGENTS.md` traps: flag an invented shape in the file header **and** open a
contract question the same day.

---

## 8. Stale docs outlived their subject

- `platform/AGENTS.md` self-check commands were Node-era (`npm run check`, `npx vitest`,
  `docker-compose.platform.yml`) four days after ADR-007 re-based the backend to Rails.
- `august-september-schedule.md` describes a three-person team including Jawi (who appears in
  no issue and no commit), an Aug 31 client demo, and a calendar superseded by
  `checkpoint-delivery-plan.md` on Aug 24. It is still the first schedule a reader finds.

**Changed:** platform self-check block rewritten for Rails.
**Still open:** mark or delete the superseded schedule — it will mislead someone.

---

## 9. Two bugs that only an end-to-end run could find

Both were caught by `e2e-ops.sh` on its first real execution, and neither was reachable from
any unit or integration test — each service was individually correct.

- **The edge gateway dropped every query string.** `proxy_pass` with a variable URI does not
  re-append `$args`, so `?status=available` reached property-gis as an unfiltered list and
  came back 200 with all 12 lots. This had been true since Wave 0 for *every* filtered
  endpoint behind the gateway — catalog filters, audit `?limit`, everything. No service test
  could see it; the gateway auth matrix only checks status codes.
- **Seeded demo cases squatted on real order numbers.** funeral-cases seeded
  `ORD-2026-00001..3` — exactly what commerce-ordering issues from a fresh sequence — so a
  seeded case and a genuinely event-created case both answered to the same order, and the
  e2e matched the wrong one. Demo data now uses an out-of-band 9xxxx band.

Both are in `platform/AGENTS.md` traps.

## Pattern across all nine

Every item is the same failure: **a green signal that measured nothing.** Template tests
standing in for service tests. A gateway healthcheck standing in for a deployment. Rendered
screens standing in for working modules. A generator's silence standing in for success.

The cheapest guard is the one CP-1 already had written down and did not enforce: an end-to-end
gate per day, run against the profile the demo runs on. `e2e.sh` existed and was honest.
`e2e-ops.sh` now exists too. Neither is optional going into Phase 2.

And the guard behind all the others — CI — has never started. Until the Actions billing block
clears, every gate in this document is a gate somebody has to remember to run by hand.

---

## Addendum — Sat Aug 29 evening, from the carryover work (#8, #12, #13)

Three more instances of the same pattern, found by running things that had never been run.

- **identity-access's suite had been red since Day 1.** Its tests sign in as a seeded
  persona; the CI recipe migrates the test database and never seeds it. Nobody saw it
  because CI has never started (#43) and the production image excludes dev/test gems, so
  there was no way to run a service suite locally at all. `platform/tests/service-suite.sh`
  now provides one, and the recipe seeds. **Changed:** `.github/workflows/ci.yml`,
  `platform/tests/service-suite.sh`.

- **The JWKS served two `kid` members per key.** `JWT::JWK#export` returns symbol keys
  including its own RFC7638 thumbprint `:kid`; the code merged a string `"kid"` on top and
  left both. Which one a consumer honours is parser-dependent, and json 3.0 raises on it.
  This is the trust anchor for every service in the platform. The regression test counts
  `"kid"` occurrences in the RAW document, because parsed JSON silently collapses
  duplicates — a parsed assertion would have passed throughout.
  **Changed:** `identity-access/app/lib/identity/token_issuer.rb` + test.

- **The first security-smoke script reported all 12 services failing while all 12 were
  clean.** It decided pass/fail by grepping output for "No warnings found"; passing
  `--summary` changed brakeman's wording. Verdicts now come from exit codes, and the gate
  was proved able to go red by injecting `eval(params[:expr])` into a scratch copy
  (brakeman exit 3). A gate nobody has seen fail is not known to work.

### Reported, deliberately NOT fixed (they are the tech lead's call)

- **Every service commits `config/master.key`, and they are all the same key.**
  `.gitignore` carries the rule; the files are tracked anyway. Nothing currently reads
  Rails credentials, so the exposure is limited to the generated `secret_key_base` in
  each `credentials.yml.enc` — but rotating 12 keys and untracking them is a decision, not
  a drive-by edit.
- **`OutboxPublisher#publish_once` calls `find_each` on an ordered scope.** Rails ignores
  the custom order and batches by primary key ("Scoped order is ignored" in every service's
  logs). Insert order and id order coincide today, so the documented `(occurred_at, id)`
  guarantee holds in practice — but the comment above it promises something the code does
  not do, in every service and in the template.
