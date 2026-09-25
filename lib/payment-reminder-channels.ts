/**
 * The payment-reminder CHANNEL seam — the client's "where supported" half, declared and
 * not faked.
 *
 * The minute (Villa Memorial, 2026-09-21, item 1) says reminders must be visible inside the
 * system and "where supported, may be delivered through other configured notification
 * channels". The platform's notification service (P4, `docs/04-modules/documents-contracts.md`
 * §Notifications) owns email · SMS · Messenger · push and DOES NOT EXIST in this build. So
 * this module declares the interface that service will implement — nothing here performs a
 * network call, reads a provider key or sends anything. `in_app` is the one wired channel:
 * the family portal's own surface, rendered from the same pure `paymentDueNotices` selection.
 *
 * `tests/unit/payment-reminder-channels.test.ts` pins both facts: only `in_app` is wired, and
 * this module carries no provider/fetch/credential path.
 */
import type { PaymentDueNotice } from "@/lib/payment-schedule";

export const PAYMENT_REMINDER_CHANNELS = [
  "in_app",
  "email",
  "sms",
  "messenger",
  "push",
] as const;

export type PaymentReminderChannel = (typeof PAYMENT_REMINDER_CHANNELS)[number];

/** The only channel this build can deliver: the reminder shown in the family portal. */
export const WIRED_PAYMENT_REMINDER_CHANNELS: readonly PaymentReminderChannel[] = ["in_app"];

/** What a channel must implement for the platform service to deliver a reminder. */
export interface PaymentReminderChannelAdapter {
  channel: Exclude<PaymentReminderChannel, "in_app">;
  /** The words a staff configuration screen would show. */
  label: string;
  /** Deliver one reminder; resolve true only when the channel accepted it. */
  deliver(notice: PaymentDueNotice): Promise<boolean>;
}

/**
 * Configured external adapters. Empty by construction — the platform service (P4) supplies
 * them; the app never registers a provider of its own. A caller adds one only together with
 * the contract that governs it.
 */
export const PAYMENT_REMINDER_ADAPTERS: readonly PaymentReminderChannelAdapter[] = [];

/** What each channel still needs, said once so no surface has to guess. */
export const PAYMENT_REMINDER_CHANNEL_NOTES: Record<PaymentReminderChannel, string> = {
  in_app: "Shown in the family portal — the only channel this build delivers.",
  email: "Waits on the platform's notification service (P4).",
  sms: "Waits on the platform's notification service (P4).",
  messenger: "Waits on the platform's notification service (P4).",
  push: "Waits on the platform's notification service (P4).",
};

export function isPaymentReminderChannel(value: unknown): value is PaymentReminderChannel {
  return (
    typeof value === "string" &&
    (PAYMENT_REMINDER_CHANNELS as readonly string[]).includes(value)
  );
}

/** Whether a channel can deliver today. One answer for the UI and the tests. */
export function paymentReminderChannelWired(channel: PaymentReminderChannel): boolean {
  return WIRED_PAYMENT_REMINDER_CHANNELS.includes(channel);
}
