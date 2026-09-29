import { redirect } from "next/navigation";

/**
 * /cart retired 2026-09-29 (the office's own direction): the cart is a QUOTE
 * BASKET now, and the quote page owns the accumulated lines. The old URL stays
 * a redirect so a bookmark or a link in an older page still lands the visitor
 * on their quote.
 */
export default function CartRedirect() {
  redirect("/quote");
}
