import { redirect } from "next/navigation";

/**
 * /staff/plans → /staff/pricing.
 *
 * Consolidated by the content-catalogue Phase 4 nav pass (captain's §6.1 shape):
 * the plan-rate editor and the lot-price editor edit ONE pricing document, so
 * they share one home — Pricing rules at /staff/pricing. This route is a
 * redirect, not a second editor, and the two retired stubs that used to hang
 * under it (/staff/plans/[id], /staff/plans/new) are gone. The membership
 * folio keeps its own /staff/plans/membership route.
 */
export default function PlansPage() {
  redirect("/staff/pricing");
}
