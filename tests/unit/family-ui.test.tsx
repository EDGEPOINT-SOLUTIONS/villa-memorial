import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Answer,
  Chain,
  Money,
  Note,
  PaidSoFar,
  PlannedAnswer,
  PrimaryAction,
  QuietAction,
  Row,
  Rows,
  Section,
  WhenList,
} from "@/components/family/family-ui";
import { FAMILY_JARGON } from "@/lib/family/family-view";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

describe("the family Answer (one dominant fact, one action)", () => {
  it("renders the kicker, one headline, the supporting line and one primary action", () => {
    const html = render(
      <Answer
        kicker="Payments"
        headline="₱22,000 is still to pay on your family’s plan."
        sub="That is what is left of ₱42,000."
        actions={<PrimaryAction href="/client/payments" label="See how to pay" />}
      />,
    );
    expect(html).toContain("Payments");
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("₱22,000 is still to pay");
    expect(html).toContain("That is what is left of ₱42,000.");
    expect(html.match(/btn--primary/g)).toHaveLength(1);
    // The agent portal's own hero classes — one house style.
    expect(html).toContain('class="ag-hero"');
    expect(html).toContain('class="ag-hero__title"');
  });

  it("carries the facts as chips when the page has them", () => {
    const html = render(
      <Answer
        kicker="Home"
        headline="Nothing needs you today."
        sub="All is well."
        chips={<span className="ag-chip">Premium Lawn</span>}
        actions={<PrimaryAction href="/client/documents" label="See your papers" />}
      />,
    );
    expect(html).toContain('class="ag-hero__chips"');
    expect(html).toContain("Premium Lawn");
  });

  it("keeps the human line off by default and shows the number when asked", () => {
    const without = render(
      <Answer kicker="Home" headline="Nothing needs you today." sub="All is well." actions={null} />,
    );
    expect(without).not.toContain("fv-help");

    const withHelp = render(
      <Answer
        kicker="Help"
        headline="Call us."
        sub="Someone answers every day."
        actions={<PrimaryAction href="/client/payments" label="See how to pay" />}
        help
      />,
    );
    expect(withHelp).toContain("fv-help");
    expect(withHelp).toContain("0917 617 8489");
  });
});

describe("the five-step chain", () => {
  it("names the current step in words, not with a badge or a colour alone", () => {
    const html = render(<Chain current={2} />);
    expect(html).toContain("1 Arrangement");
    expect(html).toContain("2 Viewing");
    expect(html).toContain("· you are here");
    expect(html).toContain("fv-chain__done");
    expect(html).toContain("fv-chain__now");
  });

  it("renders the steps without a marker when the case service is not wired", () => {
    const html = render(<Chain />);
    expect(html).toContain("5 Papers");
    expect(html).not.toContain("you are here");
    expect(html).not.toContain("fv-chain__now");
  });
});

describe("the schedule (day · what · where)", () => {
  it("prints three lines per moment", () => {
    const html = render(
      <WhenList
        items={[
          {
            day: "Saturday, 19 September · 10:00 AM",
            what: "Ernesto’s funeral",
            where: "Sanctuario de Mercedes y Gloria",
          },
        ]}
      />,
    );
    expect(html).toContain("Saturday, 19 September · 10:00 AM");
    expect(html).toContain("Ernesto’s funeral");
    expect(html).toContain("Sanctuario de Mercedes y Gloria");
  });
});

describe("rows, money and notes", () => {
  it("gives every row one plain state word and one action", () => {
    const html = render(
      <Rows>
        <Row
          title="Official receipt"
          meta="₱12,000 received 12 September"
          state="Ready"
          action={<QuietAction href="tel:+639176178489" label="Ask for a copy" />}
        />
      </Rows>,
    );
    expect(html).toContain("Official receipt");
    expect(html).toContain('class="ag-stage"');
    expect(html).toContain("Ready");
    expect(html).toContain("Ask for a copy");
    expect(html).toContain("btn--secondary");
  });

  it("makes waiting states a warm chip, never a red hue alone", () => {
    const html = render(
      <Row title="LGU burial assistance form" state="Waiting on you" wait />,
    );
    expect(html).toContain("ag-stage--warm");
    expect(html).toContain("Waiting on you");
  });

  it("prints a figure with its meaning, never a bare number", () => {
    const html = render(
      <Money
        figure="₱22,000 still to pay"
        meaning="That is what is left of ₱42,000."
        actions={<QuietAction href="/client/payments" label="How to pay" />}
      />,
    );
    expect(html).toContain("₱22,000 still to pay");
    expect(html).toContain("That is what is left of ₱42,000.");
    expect(html).toContain('class="ag-money ag-money--hero"');
  });

  it("says the paid share in words as well as a bar", () => {
    const html = render(
      <PaidSoFar paid="₱20,000" total="₱42,000" words="almost half" percent={48} />,
    );
    expect(html).toContain("₱20,000 paid");
    expect(html).toContain("almost half");
    expect(html).toContain('role="img"');
    expect(html).toContain("ag-target__fill");
  });

  it("renders the honest note as calm prose, never an alert", () => {
    const html = render(
      <Note>
        <p>
          <strong>About this page.</strong> The schedule updates here when the case service is on.
        </p>
      </Note>,
    );
    expect(html).toContain('class="ag-note"');
    expect(html).not.toContain("alert");
    assertNoParagraphNesting(html, "Note");
  });
});

describe("a page whose service is not switched on", () => {
  const page = (
    <PlannedAnswer
      kicker="The funeral"
      headline="Ernesto’s funeral plan is kept by our office."
      sub="The records are not connected to this page yet."
      planned={[{ label: "The viewing", detail: "Where to go and the hours" }]}
      note="The arrangement records service is not switched on yet."
    />
  );

  it("renders one answer, the planned rows and the shared gap disclosure", () => {
    const html = render(page);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("The viewing");
    expect(html).toContain("What this page can’t show yet");
    expect(html).not.toContain("About this page.");
    expect(html).toContain("0917 617 8489");
    assertNoParagraphNesting(html, "PlannedAnswer");
  });

  it("uses the shared portal grammar, not a family-only shell", () => {
    const html = render(page);
    expect(html).not.toContain("fp-");
    expect(html).toContain('class="ag-hero"');
    expect(html).toContain('class="fv-gap"');
    assertNoParagraphNesting(html, "PlannedAnswer grammar");
  });
});

describe("plain words only", () => {
  it("never prints ledger-speak on a family surface", () => {
    const html = render(
      <Section title="Money and papers">
        <Money figure="₱22,000 still to pay" meaning="Next due Sep 15." />
        <Note>
          <p>All good.</p>
        </Note>
      </Section>,
    ).toLowerCase();
    for (const word of FAMILY_JARGON) {
      expect(html).not.toContain(word.toLowerCase());
    }
  });
});
