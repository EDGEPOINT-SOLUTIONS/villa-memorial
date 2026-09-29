"use client";

/**
 * HomeCostBuilder — the home's arrangement builder (section 3 of the approved
 * home-rebuild plan).
 *
 * Three choices and the five services, with a live one-time total. Every figure
 * arrives in the `model` prop, which the server built from the live catalogue and
 * the 2026 sheets (`lib/home-model.ts`); this component only adds up what it is
 * handed, so it can never publish an amount the office does not sell at. The
 * plan is an instalment product and deliberately stays out of the total.
 *
 * The call action is the office's own 24/7 line from the contact document, and
 * the closing action is the full builder.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { php } from "@/lib/villa-pricing";
import type { Cta } from "@/lib/api-client/landing";
import type { HomeBuilderChoice, HomeBuilderModel } from "@/lib/home-model";

type Contact = { phoneDisplay: string; phoneHref: string };

/** One radio/checkbox row: a name, its figure, and an optional detail line. */
function Option({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  detail,
  amountCents,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  detail: string | null;
  amountCents: number;
  children?: ReactNode;
}) {
  return (
    <label className="home-opt">
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} />
      <span className="home-opt__label">
        {label}
        {detail ? <span className="home-opt__detail">({detail})</span> : null}
        {children}
      </span>
      <b className="home-opt__amount">{amountCents > 0 ? php(amountCents / 100) : "—"}</b>
    </label>
  );
}

function chosen<C extends HomeBuilderChoice>(list: C[]): C | null {
  return list.find((choice) => choice.initial) ?? list[0] ?? null;
}

export function HomeCostBuilder({
  model,
  title,
  note,
  secondary,
  contact,
}: {
  model: HomeBuilderModel;
  title: string;
  note: string;
  secondary: Cta;
  contact: Contact;
}) {
  const id = useId();
  const [casket, setCasket] = useState(() => chosen(model.caskets)?.id ?? "");
  const [days, setDays] = useState(() => chosen(model.days)?.id ?? "");
  const [chapel, setChapel] = useState(() => chosen(model.chapels)?.id ?? "");
  const [services, setServices] = useState(false);

  const lines = useMemo(() => {
    const pick = (list: HomeBuilderChoice[], id: string): HomeBuilderChoice | null =>
      list.find((choice) => choice.id === id) ?? null;
    const selections: Array<HomeBuilderChoice | null> = [
      pick(model.caskets, casket),
      pick(model.days, days),
      pick(model.chapels, chapel),
      services && model.services ? model.services : null,
    ];
    return selections
      .filter((choice): choice is HomeBuilderChoice => choice !== null && choice.amountCents > 0)
      .map((choice) => ({
        id: choice.id,
        label: choice.id === "five-services" ? "The five services" : choice.label,
        amountCents: choice.amountCents,
      }));
  }, [model, casket, days, chapel, services]);

  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);

  return (
    <form className="home-builder" onSubmit={(event) => event.preventDefault()}>
      <p className="home-builder__title">{title}</p>
      <p className="home-builder__note">{note}</p>

      <fieldset className="home-builder__group">
        <legend>The casket</legend>
        {model.caskets.map((choice) => (
          <Option
            key={choice.id}
            type="radio"
            name={`${id}-casket`}
            value={choice.id}
            checked={casket === choice.id}
            onChange={() => setCasket(choice.id)}
            label={choice.label}
            detail={choice.detail}
            amountCents={choice.amountCents}
          />
        ))}
      </fieldset>

      <fieldset className="home-builder__group">
        <legend>Days of preparation</legend>
        {model.days.map((choice) => (
          <Option
            key={choice.id}
            type="radio"
            name={`${id}-days`}
            value={choice.id}
            checked={days === choice.id}
            onChange={() => setDays(choice.id)}
            label={choice.label}
            detail={choice.detail}
            amountCents={choice.amountCents}
          />
        ))}
      </fieldset>

      {model.chapels.length > 1 ? (
        <fieldset className="home-builder__group">
          <legend>The chapel</legend>
          {model.chapels.map((choice) => (
            <Option
              key={choice.id}
              type="radio"
              name={`${id}-chapel`}
              value={choice.id}
              checked={chapel === choice.id}
              onChange={() => setChapel(choice.id)}
              label={choice.label}
              detail={choice.detail}
              amountCents={choice.amountCents}
            />
          ))}
        </fieldset>
      ) : null}

      {model.services ? (
        <fieldset className="home-builder__group">
          <legend>The five services</legend>
          <Option
            type="checkbox"
            name={`${id}-services`}
            value={model.services.id}
            checked={services}
            onChange={() => setServices((on) => !on)}
            label={model.services.label}
            detail={model.services.detail}
            amountCents={model.services.amountCents}
          />
        </fieldset>
      ) : null}

      <div className="home-builder__sum">
        <ul className="home-builder__lines">
          {lines.map((line) => (
            <li key={line.id}>
              <span>{line.label}</span>
              <b>{php(line.amountCents / 100)}</b>
            </li>
          ))}
        </ul>
        <div className="home-builder__total">
          <span>One-time total</span>
          <b aria-live="polite">{php(totalCents / 100)}</b>
        </div>
      </div>

      <div className="home-builder__actions">
        <a className="btn btn--accent home-call" href={contact.phoneHref}>
          Call {contact.phoneDisplay}
        </a>
        <Link className="btn btn--secondary" href={secondary.href}>
          {secondary.label}
        </Link>
      </div>
    </form>
  );
}
