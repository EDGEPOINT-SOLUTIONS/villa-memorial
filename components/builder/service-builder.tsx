"use client";

import { useCallback, useState } from "react";
import type { ContactInfo } from "@/lib/api-client/landing";
import { formatMinorUnits } from "@/lib/money";
import { BuilderEstimatePanel } from "@/components/builder/builder-estimate";
import {
  CHAPEL_MAX_DAYS,
  CHAPEL_MIN_DAYS,
  EMBALMING_MAX_DAYS,
  EMBALMING_MIN_DAYS,
  INITIAL_SELECTION,
  builderEstimate,
  casketOptionOf,
  chapelStay,
  embalmingPriceCents,
  planRateCents,
  type BuilderCatalog,
  type BuilderSelection,
} from "@/lib/service-builder";

/**
 * The Smart Service Builder (`/builder`, F-05) — the public configurator.
 *
 * THE SCREEN'S JOB: a family arrives with a situation (a plan held for years, a
 * casket already chosen, a lot, or nothing at all), works out the arrangement in
 * plain questions, and watches a running total build from the client's published
 * 2026 figures. Arriving with something already decided REDUCES the total — a
 * held plan's package lines leave the one-time sum and are listed as covered,
 * not re-priced.
 *
 * WHAT IT IS NOT: a quote, and not a rules engine. No pricing/availability
 * service exists (see lib/service-builder.ts), so every figure comes from the
 * catalog the server resolved from the sheets and the pricing store, the total
 * is one-time items only (the plan's instalment amount is printed separately),
 * and the panel one screen away says plainly that the office confirms the final
 * figures. The hand-over is the existing /contact request path with the
 * arrangement written in — nothing is reserved, ordered or sent to a service.
 *
 * INTERACTION / A11Y: every control is a native radio, checkbox, select, number
 * or button inside its own fieldset+legend, so the whole flow is keyboard
 * operable with the app's single focus ring. Each step header repeats the
 * running total — on a phone the sticky desktop rail is not available, so the
 * figure stays in view as the family scrolls. The total itself is a polite live
 * region (see builder-estimate.tsx).
 */
export function ServiceBuilder({
  catalog,
  contact,
}: {
  catalog: BuilderCatalog;
  contact: ContactInfo;
}) {
  const [selection, setSelection] = useState<BuilderSelection>(INITIAL_SELECTION);
  const update = useCallback(
    (patch: Partial<BuilderSelection>) => setSelection((prev) => ({ ...prev, ...patch })),
    [],
  );
  const reset = useCallback(() => setSelection(INITIAL_SELECTION), []);

  const estimate = builderEstimate(catalog, selection);
  const total = formatMinorUnits(estimate.totalCents);
  const planApplies = estimate.planApplies;
  const casket = casketOptionOf(catalog, selection.casketModel);
  const servicesSelected = selection.services.length;
  const allServicesSelected = servicesSelected === catalog.services.length;
  // The sheet's ladder ends at 9 days; anything past it uses the "+1,500/day" line.
  const ladderMax = catalog.embalming[catalog.embalming.length - 1]?.days ?? CHAPEL_MAX_DAYS;
  const moreDays = selection.embalmingDays !== null && selection.embalmingDays > ladderMax;
  const embalmingCents =
    selection.embalmingDays === null ? null : embalmingPriceCents(catalog, selection.embalmingDays);
  const chapel = catalog.chapels.find((entry) => entry.id === selection.chapelId) ?? null;
  const stay = chapel ? chapelStay(chapel, selection.chapelDays) : null;
  const planCents = planRateCents(catalog, selection.planTier, selection.planTerm, selection.senior);

  // Functional update: two service boxes can be toggled in the same task (a
  // fast double tap), and each toggle must read the previous selection.
  const toggleService = (label: string) =>
    setSelection((prev) => ({
      ...prev,
      services: prev.services.includes(label)
        ? prev.services.filter((entry) => entry !== label)
        : [...prev.services, label],
    }));

  return (
    <div className="sb-layout">
      <div className="sb-main">
        <p className="sb-jump">
          <a href="#estimate">Your estimate: {total}</a>
        </p>

        {/* 01 — the situation first: who this is for, and what is already in place. */}
        <section className="card capture-section sb-step" aria-labelledby="sb-step-situation">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              01
            </span>
            <div className="sb-step__head">
              <h2 className="capture-section__title" id="sb-step-situation">
                Your situation
              </h2>
              <p className="capture-section__blurb">
                Who this is for, and what is already in place.
              </p>
            </div>
            <span className="sb-step__sofar">
              So far <strong>{total}</strong>
            </span>
          </div>
          <div className="capture-section__body">
            <fieldset className="sb-group">
              <legend className="sb-legend">Rates</legend>
              <div className="sb-choices sb-choices--2">
                <label className="sb-choice">
                  <input
                    type="radio"
                    name="sb-senior"
                    checked={!selection.senior}
                    onChange={() => update({ senior: false })}
                  />
                  <span className="sb-choice__text">
                    <span className="sb-choice__title">Standard rates</span>
                    <span className="sb-choice__meta">The sheet&rsquo;s regular columns</span>
                  </span>
                </label>
                <label className="sb-choice">
                  <input
                    type="radio"
                    name="sb-senior"
                    checked={selection.senior}
                    onChange={() => update({ senior: true })}
                  />
                  <span className="sb-choice__text">
                    <span className="sb-choice__title">Senior-citizen rates</span>
                    <span className="sb-choice__meta">61&ndash;100, no insurance benefit</span>
                  </span>
                </label>
              </div>
                <p className="sb-note">Senior rates apply where the 2026 sheets print a senior column.</p>
            </fieldset>

            <fieldset className="sb-group">
              <legend className="sb-legend">Already in place</legend>
              <div className="sb-choices sb-choices--2">
                <label className="sb-choice">
                  <input
                    type="checkbox"
                    checked={selection.hasPlan}
                    onChange={(e) => update({ hasPlan: e.target.checked })}
                  />
                  <span className="sb-choice__text">
                    <span className="sb-choice__title">A Villa Memorial Plan</span>
                    <span className="sb-choice__meta">Covers the package lines</span>
                  </span>
                </label>
                <label className="sb-choice">
                  <input
                    type="checkbox"
                    checked={selection.hasCasket}
                    onChange={(e) => update({ hasCasket: e.target.checked })}
                  />
                  <span className="sb-choice__text">
                    <span className="sb-choice__title">A casket</span>
                    <span className="sb-choice__meta">You already have it</span>
                  </span>
                </label>
                <label className="sb-choice">
                  <input
                    type="checkbox"
                    checked={selection.hasLot}
                    onChange={(e) => update({ hasLot: e.target.checked })}
                  />
                  <span className="sb-choice__text">
                    <span className="sb-choice__title">A burial lot</span>
                    <span className="sb-choice__meta">No lot cost in this estimate</span>
                  </span>
                </label>
                <label className="sb-choice">
                  <input
                    type="checkbox"
                    checked={selection.alreadyArranged}
                    onChange={(e) => update({ alreadyArranged: e.target.checked })}
                  />
                  <span className="sb-choice__text">
                    <span className="sb-choice__title">An arrangement with the office</span>
                    <span className="sb-choice__meta">The office holds the file</span>
                  </span>
                </label>
              </div>
            </fieldset>
          </div>
        </section>

        {selection.alreadyArranged ? (
          <section className="card sb-arranged" aria-labelledby="sb-arranged-title">
            <h2 className="sb-arranged__title" id="sb-arranged-title">
              Already arranged
            </h2>
            <p className="sb-arranged__text">
              The office already holds your arrangement — call to change anything.
            </p>
            <p className="sb-arranged__text">This screen does not price an arrangement on file.</p>
            <div className="sb-estimate__actions">
              <a className="btn btn--primary" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
              <a className="btn btn--secondary" href="/contact">
                Message the office
              </a>
            </div>
          </section>
        ) : (
          <>
            {/* 02 — the casket, from the sheet's own 24-model catalogue. */}
            <section className="card capture-section sb-step" aria-labelledby="sb-step-casket">
              <div className="capture-section__head">
                <span className="capture-section__num" aria-hidden="true">
                  02
                </span>
                <div className="sb-step__head">
                  <h2 className="capture-section__title" id="sb-step-casket">
                    The casket
                  </h2>
                  <p className="capture-section__blurb">
                    24 models from the 2026 casket catalogue.
                  </p>
                </div>
                <span className="sb-step__sofar">
                  So far <strong>{total}</strong>
                </span>
              </div>
              <div className="capture-section__body">
                {selection.hasCasket ? (
                  <p className="sb-note">You already have a casket — nothing to add here.</p>
                ) : planApplies ? (
                  <p className="sb-note">
                    Your plan covers the casket — the package&rsquo;s casket follows the plan
                    tier.
                  </p>
                ) : (
                  <>
                    <div className="sb-field">
                      <label htmlFor="sb-casket">Choose a model</label>
                      {/* Both columns the sheet prints, on every row: a family
                          arranging for a senior sees the senior price before it
                          picks, exactly as the sheet's own table reads. */}
                      <select
                        id="sb-casket"
                        className="select"
                        value={selection.casketModel ?? ""}
                        onChange={(e) =>
                          update({ casketModel: e.target.value === "" ? null : e.target.value })
                        }
                      >
                        <option value="">Not chosen yet</option>
                        {catalog.collections.map((collection) => (
                          <optgroup key={collection} label={collection}>
                            {catalog.caskets
                              .filter((option) => option.collection === collection)
                              .map((option) => (
                                <option key={option.model} value={option.model}>
                                  {option.model} — {formatMinorUnits(option.priceCents)} · senior{" "}
                                  {formatMinorUnits(option.seniorPriceCents)}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    {casket ? (
                      <div className="sb-picked">
                        <p className="sb-picked__title">
                          {casket.model}
                          <span className="sb-picked__price">
                            {formatMinorUnits(
                              selection.senior ? casket.seniorPriceCents : casket.priceCents,
                            )}
                            {selection.senior ? " senior rate" : ""}
                          </span>
                        </p>
                        {casket.includes.length > 0 ? (
                          <ul className="sb-chips">
                            {casket.includes.map((include) => (
                              <li key={include}>{include}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="sb-note">This model&rsquo;s sheet row lists no extras.</p>
                        )}
                        {selection.senior ? (
                          <p className="sb-note">
                            Standard price: {formatMinorUnits(casket.priceCents)}
                          </p>
                        ) : casket.seniorPriceCents > 0 ? (
                          <p className="sb-note">
                            Senior-citizen price: {formatMinorUnits(casket.seniorPriceCents)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="sb-note">{catalog.substitutionNote}</p>
                  </>
                )}
              </div>
            </section>

            {/* 03 — the service and its days: the sheet's per-day preparation ladder. */}
            <section className="card capture-section sb-step" aria-labelledby="sb-step-service">
              <div className="capture-section__head">
                <span className="capture-section__num" aria-hidden="true">
                  03
                </span>
                <div className="sb-step__head">
                  <h2 className="capture-section__title" id="sb-step-service">
                    The service and its days
                  </h2>
                  <p className="capture-section__blurb">
                    Preparation &amp; casketing, priced by the day.
                  </p>
                </div>
                <span className="sb-step__sofar">
                  So far <strong>{total}</strong>
                </span>
              </div>
              <div className="capture-section__body">
                {planApplies ? (
                  <p className="sb-note">
                    Your plan includes preparation &amp; casketing — the office confirms the
                    days it covers.
                  </p>
                ) : (
                  <>
                    <fieldset className="sb-group">
                      <legend className="sb-legend">Days</legend>
                      <div className="sb-days">
                        {catalog.embalming.map((row) => (
                          <label key={row.days} className="sb-day">
                            <input
                              type="radio"
                              name="sb-embalming-days"
                              checked={selection.embalmingDays === row.days}
                              onChange={() => update({ embalmingDays: row.days })}
                            />
                            <span className="sb-day__text">
                              <span className="sb-day__figure">{row.days} days</span>
                              <span className="sb-day__price">
                                {formatMinorUnits(row.priceCents)}
                              </span>
                            </span>
                          </label>
                        ))}
                        <label className="sb-day">
                          <input
                            type="radio"
                            name="sb-embalming-days"
                            checked={moreDays}
                            onChange={() =>
                              update({
                                embalmingDays:
                                  selection.embalmingDays !== null && moreDays
                                    ? selection.embalmingDays
                                    : ladderMax + 1,
                              })
                            }
                          />
                          <span className="sb-day__text">
                            <span className="sb-day__figure">More</span>
                            <span className="sb-day__price">
                              {catalog.embalmingExtraDayCents === null
                                ? "ask the office"
                                : `+${formatMinorUnits(catalog.embalmingExtraDayCents)} / day`}
                            </span>
                          </span>
                        </label>
                      </div>
                    </fieldset>
                    {moreDays ? (
                      <div className="sb-field">
                        <label htmlFor="sb-embalming-more">
                          Days of preparation ({ladderMax + 1}&ndash;{EMBALMING_MAX_DAYS})
                        </label>
                        <input
                          id="sb-embalming-more"
                          className="input"
                          type="number"
                          inputMode="numeric"
                          min={ladderMax + 1}
                          max={EMBALMING_MAX_DAYS}
                          value={selection.embalmingDays ?? ladderMax + 1}
                          onChange={(e) => {
                            const next = Number.parseInt(e.target.value, 10);
                            update({
                              embalmingDays: Number.isFinite(next)
                                ? Math.min(Math.max(next, ladderMax + 1), EMBALMING_MAX_DAYS)
                                : ladderMax + 1,
                            });
                          }}
                        />
                      </div>
                    ) : null}
                    {embalmingCents !== null ? (
                      <p className="sb-amount">
                        Preparation, {selection.embalmingDays} days —{" "}
                        <strong>{formatMinorUnits(embalmingCents)}</strong>
                      </p>
                    ) : (
                      <p className="sb-note">
                        Fewer than {EMBALMING_MIN_DAYS} days is not on the 2026 sheet — ask the
                        office.
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* 04 — the chapel, from sheet III's own 3–9 day schedule. */}
            <section className="card capture-section sb-step" aria-labelledby="sb-step-chapel">
              <div className="capture-section__head">
                <span className="capture-section__num" aria-hidden="true">
                  04
                </span>
                <div className="sb-step__head">
                  <h2 className="capture-section__title" id="sb-step-chapel">
                    The chapel
                  </h2>
                  <p className="capture-section__blurb">
                    Common or private, {CHAPEL_MIN_DAYS} to {CHAPEL_MAX_DAYS} days.
                  </p>
                </div>
                <span className="sb-step__sofar">
                  So far <strong>{total}</strong>
                </span>
              </div>
              <div className="capture-section__body">
                <fieldset className="sb-group">
                  <legend className="sb-legend">Chapel</legend>
                  <div className="sb-choices sb-choices--2">
                    {catalog.chapels.map((option) => (
                      <label key={option.id} className="sb-choice">
                        <input
                          type="radio"
                          name="sb-chapel"
                          checked={selection.chapelId === option.id}
                          onChange={() =>
                            update({
                              chapelId: selection.chapelId === option.id ? null : option.id,
                            })
                          }
                        />
                        <span className="sb-choice__text">
                          <span className="sb-choice__title">{option.label}</span>
                          <span className="sb-choice__meta">
                            {formatMinorUnits(option.perDayCents)} / day
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {chapel ? (
                  <div className="sb-field">
                    <label htmlFor="sb-chapel-days">Days of stay</label>
                    <select
                      id="sb-chapel-days"
                      className="select"
                      value={String(selection.chapelDays)}
                      onChange={(e) => update({ chapelDays: Number.parseInt(e.target.value, 10) })}
                    >
                      {(chapel.stays.length > 0
                        ? chapel.stays
                        : [
                            {
                              days: CHAPEL_MIN_DAYS,
                              regularCents: 0,
                              seniorCents: 0,
                            },
                          ]
                      ).map((row) => (
                        <option key={row.days} value={String(row.days)}>
                          {row.days} days —{" "}
                          {formatMinorUnits(selection.senior ? row.seniorCents : row.regularCents)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {chapel && stay ? (
                  <p className="sb-amount">
                    {chapel.label}, {stay.days} days —{" "}
                    <strong>
                      {formatMinorUnits(selection.senior ? stay.seniorCents : stay.regularCents)}
                    </strong>
                    {selection.senior ? " senior rate" : ""}
                  </p>
                ) : null}
                {chapel && stay ? (
                  <p className="sb-note">
                    {selection.senior ? "Standard" : "Senior-citizen"} rate for this stay:{" "}
                    {formatMinorUnits(selection.senior ? stay.regularCents : stay.seniorCents)}
                  </p>
                ) : null}
                <p className="sb-note">{catalog.chapelScopeNote}</p>
                <p className="sb-note">{catalog.chapelMiscFeeNote}</p>
              </div>
            </section>

            {/* 05 — the extras: the five fees the sheet prices a-la-carte. */}
            <section className="card capture-section sb-step" aria-labelledby="sb-step-extras">
              <div className="capture-section__head">
                <span className="capture-section__num" aria-hidden="true">
                  05
                </span>
                <div className="sb-step__head">
                  <h2 className="capture-section__title" id="sb-step-extras">
                    The extras
                  </h2>
                  <p className="capture-section__blurb">
                    The five at-need fees the 2026 sheet prices.
                  </p>
                </div>
                <span className="sb-step__sofar">
                  So far <strong>{total}</strong>
                </span>
              </div>
              <div className="capture-section__body">
                {planApplies ? (
                  <p className="sb-note">Your plan includes these service lines.</p>
                ) : (
                  <>
                    <fieldset className="sb-group">
                      <legend className="sb-legend">Add what you need</legend>
                      <div className="sb-choices sb-choices--2">
                        {catalog.services.map((service) => (
                          <label key={service.label} className="sb-choice">
                            <input
                              type="checkbox"
                              checked={selection.services.includes(service.label)}
                              onChange={() => toggleService(service.label)}
                            />
                            <span className="sb-choice__text">
                              <span className="sb-choice__title">{service.label}</span>
                              <span className="sb-choice__meta">
                                {formatMinorUnits(service.priceCents)}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="sb-inline-actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() =>
                          update({
                            services: allServicesSelected
                              ? []
                              : catalog.services.map((service) => service.label),
                          })
                        }
                      >
                        {allServicesSelected ? "Clear the extras" : "Select all five"}
                      </button>
                      {allServicesSelected ? (
                        <span className="sb-total-chip">
                          All five: {formatMinorUnits(catalog.servicesSheetTotalCents)} — the
                          sheet&rsquo;s own total
                        </span>
                      ) : (
                        <span className="sb-total-chip">
                          {servicesSelected} of {catalog.services.length} selected
                        </span>
                      )}
                    </div>
                  </>
                )}
                <p className="sb-note">
                  The office arranges these — ask for a price:{" "}
                  {catalog.arrangedByOffice.join(" · ")}.
                </p>
              </div>
            </section>

            {/* 06 — the plan, an instalment product shown apart from the one-time total. */}
            <section className="card capture-section sb-step" aria-labelledby="sb-step-plan">
              <div className="capture-section__head">
                <span className="capture-section__num" aria-hidden="true">
                  06
                </span>
                <div className="sb-step__head">
                  <h2 className="capture-section__title" id="sb-step-plan">
                    The plan
                  </h2>
                  <p className="capture-section__blurb">
                    Optional — paid in instalments, not counted in the total.
                  </p>
                </div>
                <span className="sb-step__sofar">
                  So far <strong>{total}</strong>
                </span>
              </div>
              <div className="capture-section__body">
                <div className="sb-field-grid">
                  <div className="sb-field">
                    <label htmlFor="sb-plan-tier">Tier</label>
                    <select
                      id="sb-plan-tier"
                      className="select"
                      value={selection.planTier ?? ""}
                      onChange={(e) =>
                        update({ planTier: e.target.value === "" ? null : e.target.value })
                      }
                    >
                      <option value="">Not planning now</option>
                      {catalog.planTiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sb-field">
                    <label htmlFor="sb-plan-term">Payment mode</label>
                    <select
                      id="sb-plan-term"
                      className="select"
                      value={selection.planTerm}
                      onChange={(e) => update({ planTerm: e.target.value })}
                    >
                      {catalog.planTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {planCents !== null ? (
                  <p className="sb-amount">
                    {catalog.planTiers.find((tier) => tier.id === selection.planTier)?.name} plan
                    — <strong>{formatMinorUnits(planCents)}</strong>{" "}
                    {catalog.planTerms.find((term) => term.id === selection.planTerm)?.per}
                    {selection.senior ? " senior rate" : ""}
                  </p>
                ) : (
                  <p className="sb-note">Choose a tier to see the amount.</p>
                )}
                {planCents !== null ? (
                  <p className="sb-note">
                    {selection.senior ? "Standard" : "Senior-citizen"} rate for this mode:{" "}
                    {formatMinorUnits(
                      planRateCents(catalog, selection.planTier, selection.planTerm, !selection.senior) ??
                        planCents,
                    )}
                  </p>
                ) : null}
                <p className="sb-note">{catalog.planNote}</p>
              </div>
            </section>
          </>
        )}

        <p className="sb-note sb-sources">
          Figures are the client&rsquo;s 2026 sheets. Items the sheets do not price are never
          given a figure.
        </p>
      </div>

      <BuilderEstimatePanel
        catalog={catalog}
        selection={selection}
        contact={contact}
        onReset={reset}
      />
    </div>
  );
}
