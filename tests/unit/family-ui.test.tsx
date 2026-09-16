import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FamilyDocRow,
  FamilyHero,
  FamilyMoney,
  FamilyNeeds,
  FamilyPlannedPage,
  FamilyQuickActions,
  FamilySection,
  FamilySteps,
} from "@/components/family/family-ui";
import { FAMILY_JARGON, type FamilyNeed } from "@/lib/family/family-view";

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

const DUE: FamilyNeed = {
  id: "balance",
  kind: "due",
  band: "Money that matters now",
  title: "₱22,000 is still open on Premium Lawn · Lawn A-01",
  detail: "Next due Sep 15, 2026 · ₱12,000. It can be paid in parts.",
  action: { label: "See how to pay", href: "/client/payments" },
  quiet: { label: "Talk to us first", href: "/client/support" },
};

describe("family portal blocks", () => {
  it("renders the hero with the loved one's name, life dates and chips", () => {
    const html = render(
      <FamilyHero
        eyebrow="Your family's arrangement"
        title="Ernesto Dela Cruz"
        dates="1948 – 2026"
        lead="We are with your family through this."
        chips={["Premium Lawn · Lawn A-01"]}
      />,
    );
    expect(html).toContain("Ernesto Dela Cruz");
    expect(html).toContain("1948 – 2026");
    expect(html).toContain("Premium Lawn · Lawn A-01");
    expect(html).toContain("fp-hero");
  });

  it("renders a need card with one primary action and a quiet alternative", () => {
    const html = render(<FamilyNeeds needs={[DUE]} />);
    expect(html).toContain("Money that matters now");
    expect(html).toContain("₱22,000");
    expect(html).toContain('href="/client/payments"');
    expect(html).toContain('href="/client/support"');
  });

  it("says nothing needs the family when the feed is empty", () => {
    const html = render(<FamilyNeeds needs={[]} />);
    expect(html).toContain("Nothing needs you today");
    expect(html).toContain("empty-state");
  });

  it("renders money with the amount as given and a severity tone", () => {
    const html = render(
      <FamilyMoney label="Still open" value="₱22,000" note="Next due Sep 15" tone="due" />,
    );
    expect(html).toContain("₱22,000");
    expect(html).toContain("fp-money--due");
  });

  it("renders document rows in family words", () => {
    const html = render(
      <FamilyDocRow
        title="Official receipt"
        meta="You can open it here at any time."
        status="Ready"
        tone="success"
      />,
    );
    expect(html).toContain("Official receipt");
    expect(html).toContain("Ready");
  });

  it("renders the arrangement steps without a workflow diagram", () => {
    const html = render(
      <FamilySteps
        steps={[
          { state: "done", label: "We bring your loved one into our care", note: "10 September" },
          { state: "now", label: "The viewing, at the chapel you chose" },
          { state: "todo", label: "The interment, at your family's lot" },
        ]}
      />,
    );
    expect(html).toContain("fp-step--done");
    expect(html).toContain("fp-step--now");
    expect(html).toContain("We bring your loved one into our care");
  });

  it("renders quick actions as real links", () => {
    const html = render(
      <FamilyQuickActions
        items={[{ label: "Call us", note: "7am – 9pm daily", href: "tel:+639176178489" }]}
      />,
    );
    expect(html).toContain('href="tel:+639176178489"');
    expect(html).toContain("Call us");
  });

  it("states what is missing on a planned page instead of faking data", () => {
    const html = render(
      <FamilyPlannedPage
        eyebrow="Remembering"
        title="Memorials"
        lead="The pages your family keeps."
        missing="There is no memorial service yet."
        blocks={[{ heading: "Your family's memorial pages", detail: "Private by default" }]}
        help={<p>Call 0917 617 8489</p>}
      />,
    );
    expect(html).toContain("not wired yet");
    expect(html).toContain("What will be on this page");
    expect(html).toContain("0917 617 8489");
  });

  it("never prints ledger-speak on a family surface", () => {
    const html = render(
      <FamilySection title="Money and papers">
        <FamilyNeeds needs={[DUE]} />
      </FamilySection>,
    ).toLowerCase();
    for (const word of FAMILY_JARGON) {
      expect(html).not.toContain(word.toLowerCase());
    }
  });
});
