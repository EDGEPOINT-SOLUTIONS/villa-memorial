import Link from "next/link";
import { FAMILY_HELP } from "@/lib/family/contact";
import { familyAskHref, parseFamilyAsk } from "@/lib/family/ask";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { PortalCard, PortalChip } from "@/components/portal/portal-ui";
import { FamilyAskForm } from "@/components/family/family-ask-form";
import { Answer, CallAction, QuietLink } from "@/components/family/family-ui";

export const metadata = { title: "Ask about a plan or a lot — Villa Funeraria" };

/**
 * The family plan/lot inquiry gate (captain, 2026-10-02).
 *
 * "people will not be able to inquire plans and lots until they created their
 * family account… then after they logged in, all their inquiries will now be
 * tracked in their family portal."
 *
 * Every plan and lot action on the storefront points HERE, carrying WHAT was
 * clicked. The page first requires a family session: a signed-out visitor is sent
 * to the family sign-in with this exact URL as the return path, so the round trip
 * never loses the intent. A signed-in visitor sees what they were asking about and
 * records it against their account with one press — afterwards it lives in
 * `/client/inquiries` AND on the office board, because both read the one store.
 *
 * Services and products never come here: their public request/quote paths are
 * unchanged.
 */
export default async function FamilyAskPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ask = parseFamilyAsk((await searchParams) ?? {});
  // Require the family session before rendering the gate; the return path is the
  // ask itself, so signing in lands right back on this confirmation.
  await requirePortalSessionOrRedirect("family", ask ? familyAskHref(ask) : undefined);

  if (!ask) {
    return (
      <div className="dash">
        <Answer
          kicker="Ask us"
          headline="What would you like to ask about?"
          sub="Choose a plan or a lot and we’ll keep the inquiry in your portal."
          actions={
            <>
              <QuietLink href="/plans" label="See the plans" />
              <QuietLink href="/map?tab=lots" label="See the lots" />
            </>
          }
        />
      </div>
    );
  }

  const isPlan = ask.kind === "plan";
  const title = isPlan ? "Ask about this plan" : "Ask about this lot";

  return (
    <div className="dash">
      <Answer
        kicker={isPlan ? "Plan" : "Lot"}
        headline={title}
        sub={ask.item}
        chips={ask.price ? <PortalChip>{ask.price}</PortalChip> : null}
        actions={
          <>
            <CallAction label={`Call ${FAMILY_HELP.phone}`} />
            <QuietLink
              href={isPlan ? "/plans" : "/map?tab=lots"}
              label={isPlan ? "Back to the plans" : "Back to the lots"}
            />
          </>
        }
      />

      <PortalCard title="What you are asking about">
        <p>{ask.item}</p>
        {ask.price ? <p className="text-sm text-muted">{ask.price}</p> : null}
        {ask.note ? <p className="text-sm text-muted">{ask.note}</p> : null}
      </PortalCard>

      <FamilyAskForm ask={ask} />

      <p className="text-sm text-muted">
        Your inquiries live in{" "}
        <Link href="/client/inquiries">Your inquiries</Link> once you send them.
      </p>
    </div>
  );
}
