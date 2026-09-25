import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAYMENT_REMINDER_ADAPTERS,
  PAYMENT_REMINDER_CHANNELS,
  PAYMENT_REMINDER_CHANNEL_NOTES,
  WIRED_PAYMENT_REMINDER_CHANNELS,
  isPaymentReminderChannel,
  paymentReminderChannelWired,
} from "@/lib/payment-reminder-channels";

/**
 * The client's minute allows other channels "where supported". The platform's
 * notification service (P4) does not exist in this build, so the seam must stay a
 * declaration: only the in-app surface is wired, and the module must carry no provider,
 * no network call and no credential path.
 */
describe("the payment-reminder channel seam", () => {
  it("wires only the in-app surface", () => {
    expect(PAYMENT_REMINDER_CHANNELS).toEqual(["in_app", "email", "sms", "messenger", "push"]);
    expect(WIRED_PAYMENT_REMINDER_CHANNELS).toEqual(["in_app"]);
    for (const channel of PAYMENT_REMINDER_CHANNELS) {
      expect(paymentReminderChannelWired(channel)).toBe(channel === "in_app");
      expect(PAYMENT_REMINDER_CHANNEL_NOTES[channel].length).toBeGreaterThan(10);
    }
  });

  it("registers no provider adapter of its own", () => {
    // The platform service supplies these; the app never sends a reminder itself.
    expect(PAYMENT_REMINDER_ADAPTERS).toEqual([]);
  });

  it("guards the vocabulary", () => {
    expect(isPaymentReminderChannel("email")).toBe(true);
    expect(isPaymentReminderChannel("carrier-pigeon")).toBe(false);
    expect(isPaymentReminderChannel(7)).toBe(false);
  });

  it("carries no live integration in its source", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "lib", "payment-reminder-channels.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/twilio|sendgrid|nexmo|firebase/i);
  });
});
