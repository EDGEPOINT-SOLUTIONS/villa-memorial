import { Answer, CallAction, WhatThisShows } from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { AddLovedOneForm } from "@/components/family/family-loved-one-form";
import { FAMILY_HELP } from "@/lib/family/contact";

/**
 * The honest empty state for a family account with nobody on it yet.
 *
 * The family portal starts clean (captain, 2026-10-02), so every screen whose
 * subject is a loved one shows this instead of a blank panel or a crash: one
 * plain sentence about this screen, the office phone, and the ONE action that
 * starts the workflow — adding the person. The action posts through
 * `AddLovedOneForm`; a page refresh then shows the new person everywhere.
 */
export function FamilyEmptyState({
  kicker,
  headline,
  sub,
}: {
  kicker: string;
  headline: string;
  sub: string;
}) {
  return (
    <div className="dash">
      <Answer
        kicker={kicker}
        headline={headline}
        sub={sub}
        actions={<CallAction label={`Call ${FAMILY_HELP.phone}`} />}
      />

      <div className="dash-grid">
        <DashPanel role="place" className="dash-span-12" label="Start here" title="Add a loved one">
          <p className="dash-note">
            Add the person you look after. Their plans, papers, lot and memorial all follow from
            here, and you can add more at any time.
          </p>
          <AddLovedOneForm />
        </DashPanel>
      </div>

      <WhatThisShows>
        Nobody is on your account yet, so there is nothing to show on this screen. Call{" "}
        {FAMILY_HELP.phone} if you would rather we add someone for you.
      </WhatThisShows>
    </div>
  );
}
