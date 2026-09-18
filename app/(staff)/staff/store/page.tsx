import { redirect } from "next/navigation";

/**
 * /staff/store → /staff/landing.
 *
 * Merged by captain decision (2026-09-18, audit §7.1 G5): the old "Store &
 * content" stub promised a second content surface while the real content editor
 * already lives at /staff/landing — so the stub is gone and this route is a
 * redirect, not a not-wired page. There is no separate "global store settings"
 * document behind it today: the content document IS the storefront content, and
 * storefront COMMERCE settings live on the real admin screens (/staff/catalog,
 * /staff/pricing, /staff/plans). Nothing is lost by the redirect; the landing
 * page's own scope gate answers a session without catalog:write with the
 * designed 403 state.
 */
export default function StorePage() {
  redirect("/staff/landing");
}
