import { redirect } from "next/navigation";

/**
 * /checkout retired 2026-09-29 (the office's own direction): the office takes
 * inquiries, not orders, so there is no checkout step any more — the quote page
 * submits the basket as one Request-for-Quote and the office confirms it by
 * hand. The old URL redirects to the quote page.
 */
export default function CheckoutRedirect() {
  redirect("/quote");
}
