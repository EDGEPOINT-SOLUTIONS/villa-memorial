"use client";

import { useCallback, useState } from "react";
import type { ContactInfo } from "@/lib/api-client/landing";
import { formatMinorUnits } from "@/lib/money";
import { CHAPEL_SAMPLE_NOTE, casketSamplePhoto } from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { PublicDisclosure } from "@/components/public/public-disclosure";
import { PublicImage } from "@/components/public/public-image";
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
  type BuilderChapelOption,
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
 * THE APPROVED COMPOSITION (2026-09-30). The workbench is the home's own builder
 * grammar scaled up: each step is a question with the home's option rows (label
 * left, the sheet's figure hard right, tabular), the running total lives in ONE
 * sticky sheet, and the plan is its own instalment band after the five priced
 * questions. The old page repeated the total in every step header ("So far …")
 * because on a phone the sticky rail fell 3,760px below — that is gone: the
 * sheet now moves to the top of the flow on a phone and sticks under the header,
 * so the figure is on the first screen. The per-step cards are gone; the step
 * titles promote to `h3` under the band's `h2`, so the ladder never skips.
 *
 * WHAT IT IS NOT: a quote, and not a rules engine. No pricing/availability
 * service exists (see lib/service-builder.ts), so every figure comes from the
 * catalog the server resolved from the sheets and the pricing store, the total
 * is one-time items only (the plan's instalment amount is printed separately),
 * and the panel one screen away says plainly that the office confirms the final
 * figures. The hand-over is the existing /contact request path with the
 * arrangement written in — nothing is reserved, ordered or sent to a service.
 *
 * IMAGERY, HONEST: the casket step shows the chosen model's SAMPLE photograph
 * from the client's own photographs (the sheet's substitution line travels with
 * it, exactly as /products does); the chapel step shows the two client room
 * photographs /facilities publishes, captioned as samples. No photograph claims
 * to be the exact model or the exact room a family gets.
 *
 * INTERACTION / A11Y: every control is a native radio, checkbox, select, number
 * or button inside its own fieldset+legend, so the whole flow is keyboard
 * operable with the app's single focus ring. The total is a polite live region
 * (builder-estimate.tsx). The sheet-legalese (the chapel's scope and misc-fee
 * notes, the plan's fine print) stays reachable behind a native `<details>`.
 */
const CHAPEL_ROOMS: Readonly<
  Record<string, { photo: ReturnType<typeof clientPhotoWide>; alt: string }>
> = {
  common: {
    photo: clientPhotoWide("chapel-hall-candle-pedestals"),
    alt: "The chapel hall in the client's own photograph — a draped side table, tall candle pedestals on a green carpet, the hall's platform behind",
  },
  private: {
    photo: clientPhotoWide("wake-setup-lamp-alcove"),
    alt: "A decorated private viewing room in the client's own photograph — purple and white drapes, hanging flowers and lit lamp stands",
  },
};

/** One option row: a native control, a label with its detail, and the figure hard right. */
function Choice({
  type,
  name,
  checked,
  onChange,
  title,
  detail,
  amount,
}: {
  type: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  detail?: string;
  amount?: string;
}) {
  return (
    <label className="sb-opt">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span className="sb-opt__label">
        <span className="sb-opt__title">{title}</span>
        {detail ? <span className="sb-opt__detail">{detail}</span> : null}
      </span>
      {amount ? <span className="sb-opt__amount">{amount}</span> : null}
    </label>
  );
}

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

  const planApplies = builderEstimate(catalog, selection).planApplies;
  const casket = casketOptionOf(catalog, selection.casketModel);
  const sample = casket ? casketSamplePhoto(casket) : null;
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
        {/* 01 — the situation first: who this is for, and what is already in place. */}
        <section className="sb-step" id="sb-step-situation" aria-labelledby="sb-step-situation-title">
          <div className="sb-step__head">
            <span className="sb-step__num" aria-hidden="true">
              01
            </span>
            <div>
              <h3 className="sb-step__title" id="sb-step-situation-title">
                Your situation
              </h3>
              <p className="sb-step__blurb">Who this is for, and what is already in place.</p>
            </div>
          </div>
          <div className="sb-step__body">
            <fieldset className="sb-group">
              <legend className="sb-legend">Rates</legend>
              <div className="sb-opts sb-opts--2">
                <Choice
                  type="radio"
                  name="sb-senior"
                  checked={!selection.senior}
                  onChange={() => update({ senior: false })}
                  title="Standard rates"
                  detail="The sheet&rsquo;s regular columns"
                />
                <Choice
                  type="radio"
                  name="sb-senior"
                  checked={selection.senior}
                  onChange={() => update({ senior: true })}
                  title="Senior-citizen rates"
                  detail="61&ndash;100, no insurance benefit"
                />
              </div>
              <p className="sb-note">
                Senior rates apply where the 2026 sheets print a senior column.
              </p>
            </fieldset>

            <fieldset className="sb-group">
              <legend className="sb-legend">Already in place</legend>
              <div className="sb-opts sb-opts--2">
                <Choice
                  type="checkbox"
                  checked={selection.hasPlan}
                  onChange={() => update({ hasPlan: !selection.hasPlan })}
                  title="A Villa Memorial Plan"
                  detail="Covers the package lines"
                />
                <Choice
                  type="checkbox"
                  checked={selection.hasCasket}
                  onChange={() => update({ hasCasket: !selection.hasCasket })}
                  title="A casket"
                  detail="You already have it"
                />
                <Choice
                  type="checkbox"
                  checked={selection.hasLot}
                  onChange={() => update({ hasLot: !selection.hasLot })}
                  title="A burial lot"
                  detail="No lot cost in this estimate"
                />
                <Choice
                  type="checkbox"
                  checked={selection.alreadyArranged}
                  onChange={() => update({ alreadyArranged: !selection.alreadyArranged })}
                  title="An arrangement with the office"
                  detail="The office holds the file"
                />
              </div>
            </fieldset>
          </div>
        </section>

        {selection.alreadyArranged ? (
          <section className="sb-arranged" aria-labelledby="sb-arranged-title">
            <h3 className="sb-arranged__title" id="sb-arranged-title">
              Already arranged
            </h3>
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
            <section className="sb-step" id="sb-step-casket" aria-labelledby="sb-step-casket-title">
              <div className="sb-step__head">
                <span className="sb-step__num" aria-hidden="true">
                  02
                </span>
                <div>
                  <h3 className="sb-step__title" id="sb-step-casket-title">
                    The casket
                  </h3>
                  <p className="sb-step__blurb">24 models from the 2026 casket catalogue.</p>
                </div>
              </div>
              <div className="sb-step__body">
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
                    {casket && sample ? (
                      <div className="sb-picked">
                        <PublicImage
                          role="band-lead"
                          src={sample.wide.src}
                          srcSet={sample.wide.srcSet}
                          sizes="(max-width: 62rem) 92vw, 12rem"
                          alt={sample.alt}
                          width={sample.wide.width}
                          height={sample.wide.height}
                          caption={sample.note}
                        />
                        <div className="sb-picked__detail">
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
                      </div>
                    ) : null}
                    <p className="sb-note">{catalog.substitutionNote}</p>
                  </>
                )}
              </div>
            </section>

            {/* 03 — the service and its days: the sheet's per-day preparation ladder. */}
            <section className="sb-step" id="sb-step-service" aria-labelledby="sb-step-service-title">
              <div className="sb-step__head">
                <span className="sb-step__num" aria-hidden="true">
                  03
                </span>
                <div>
                  <h3 className="sb-step__title" id="sb-step-service-title">
                    The service and its days
                  </h3>
                  <p className="sb-step__blurb">
                    Preparation &amp; casketing, priced by the day.
                  </p>
                </div>
              </div>
              <div className="sb-step__body">
                {planApplies ? (
                  <p className="sb-note">
                    Your plan includes preparation &amp; casketing — the office confirms the
                    days it covers.
                  </p>
                ) : (
                  <>
                    <fieldset className="sb-group">
                      <legend className="sb-legend">Days</legend>
                      <div className="sb-opts">
                        {catalog.embalming.map((row) => (
                          <Choice
                            key={row.days}
                            type="radio"
                            name="sb-embalming-days"
                            checked={selection.embalmingDays === row.days}
                            onChange={() => update({ embalmingDays: row.days })}
                            title={`${row.days} days`}
                            amount={formatMinorUnits(row.priceCents)}
                          />
                        ))}
                        <Choice
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
                          title="More than nine days"
                          amount={
                            catalog.embalmingExtraDayCents === null
                              ? "ask the office"
                              : `+${formatMinorUnits(catalog.embalmingExtraDayCents)} / day`
                          }
                        />
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
            <section className="sb-step" id="sb-step-chapel" aria-labelledby="sb-step-chapel-title">
              <div className="sb-step__head">
                <span className="sb-step__num" aria-hidden="true">
                  04
                </span>
                <div>
                  <h3 className="sb-step__title" id="sb-step-chapel-title">
                    The chapel
                  </h3>
                  <p className="sb-step__blurb">
                    Common or private, {CHAPEL_MIN_DAYS} to {CHAPEL_MAX_DAYS} days.
                  </p>
                </div>
              </div>
              <div className="sb-step__body">
                <fieldset className="sb-group">
                  <legend className="sb-legend">The room</legend>
                  <div className="sb-rooms">
                    {catalog.chapels.map((option: BuilderChapelOption) => {
                      const room = CHAPEL_ROOMS[option.id];
                      const roomStay = chapelStay(option, selection.chapelDays);
                      const selected = selection.chapelId === option.id;
                      return (
                        <label className="sb-room" key={option.id} data-selected={selected ? "" : undefined}>
                          <input
                            type="radio"
                            name="sb-chapel"
                            checked={selected}
                            onChange={() =>
                              update({ chapelId: selected ? null : option.id })
                            }
                          />
                          {room ? (
                            <PublicImage
                              role="band-lead"
                              src={room.photo.src}
                              srcSet={room.photo.srcSet}
                              sizes="(max-width: 62rem) 92vw, 30rem"
                              alt={room.alt}
                              width={room.photo.width}
                              height={room.photo.height}
                            />
                          ) : null}
                          <span className="sb-room__body">
                            <span className="sb-room__name">{option.label}</span>
                            <span className="sb-room__rate">
                              {formatMinorUnits(option.perDayCents)} / day
                            </span>
                            {roomStay ? (
                              <span className="sb-room__stay">
                                {roomStay.days} days —{" "}
                                {formatMinorUnits(
                                  selection.senior ? roomStay.seniorCents : roomStay.regularCents,
                                )}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="sb-note">{CHAPEL_SAMPLE_NOTE}</p>
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
                <PublicDisclosure summary="Chapel conditions">
                  <p className="sb-note">{catalog.chapelScopeNote}</p>
                  <p className="sb-note">{catalog.chapelMiscFeeNote}</p>
                </PublicDisclosure>
              </div>
            </section>

            {/* 05 — the extras: the five fees the sheet prices a-la-carte. */}
            <section className="sb-step" id="sb-step-extras" aria-labelledby="sb-step-extras-title">
              <div className="sb-step__head">
                <span className="sb-step__num" aria-hidden="true">
                  05
                </span>
                <div>
                  <h3 className="sb-step__title" id="sb-step-extras-title">
                    The extras
                  </h3>
                  <p className="sb-step__blurb">The five at-need fees the 2026 sheet prices.</p>
                </div>
              </div>
              <div className="sb-step__body">
                {planApplies ? (
                  <p className="sb-note">Your plan includes these service lines.</p>
                ) : (
                  <>
                    <fieldset className="sb-group">
                      <legend className="sb-legend">Add what you need</legend>
                      <div className="sb-opts sb-opts--2">
                        {catalog.services.map((service) => (
                          <Choice
                            key={service.label}
                            type="checkbox"
                            checked={selection.services.includes(service.label)}
                            onChange={() => toggleService(service.label)}
                            title={service.label}
                            amount={formatMinorUnits(service.priceCents)}
                          />
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
                {/* The four catalogue lines no 2026 sheet prices: named, never
                    given a figure, and kept out of the reading column. */}
                <div className="sb-office-items">
                  <p className="sb-note">The office arranges these — ask for a price.</p>
                  <PublicDisclosure summary="Four more items the office arranges">
                    <ul className="sb-chips">
                      {catalog.arrangedByOffice.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </PublicDisclosure>
                </div>
              </div>
            </section>

            {/* Band 3 — the plan, an instalment product shown apart from the
                one-time total. Its own band, not step 06. */}
            <section className="sb-plan" id="sb-plan" aria-labelledby="sb-plan-title">
              <div className="sb-plan__head">
                <p className="sb-plan__kicker">The Villa Memorial Plan · Optional</p>
                <h3 className="sb-plan__title" id="sb-plan-title">
                  Or pay for it over time
                </h3>
                <p className="sb-plan__lead">
                  An instalment product — paid in instalments, not counted in the total above.
                </p>
              </div>
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
                  {catalog.planTiers.find((tier) => tier.id === selection.planTier)?.name} plan —{" "}
                  <strong>{formatMinorUnits(planCents)}</strong>{" "}
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
              <PublicDisclosure summary="Read the plan's fine print">
                <p className="sb-note">{catalog.planNote}</p>
              </PublicDisclosure>
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
