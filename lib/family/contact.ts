/**
 * Family-facing contact details — the numbers and places a grieving family is
 * told on the phone, shown in the portal so they never have to hunt for them.
 *
 * ⚠ Source: docs/07-client-villa/client-profile.md (the client's own hotlines:
 * 09176178489 / 09171839262, Villa Agency 09395507965, the Capilla de San Jose
 * office and the Sanctuario de Mercedes y Gloria park). Display-only copy — no
 * service contract is involved, and the coordinator's name is not asserted here
 * (the case projection will carry the assigned coordinator when it exists).
 */
export const FAMILY_HELP = {
  /** Main office / coordinator line. */
  phone: "0917 617 8489",
  phoneHref: "tel:+639176178489",
  /** Second published line. */
  secondPhone: "0917 183 9262",
  secondPhoneHref: "tel:+639171839262",
  /** Villa Agency — plan questions. */
  agencyPhone: "0939 550 7965",
  agencyPhoneHref: "tel:+639395507965",
  hours: "7am – 9pm daily",
  office: "Capilla de San Jose Bldg., Sunrise, Isabela City",
  park: "Sanctuario de Mercedes y Gloria, Purok 3, Begang, Isabela City",
} as const;
