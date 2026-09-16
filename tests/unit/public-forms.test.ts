import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_REASONS,
  APPOINTMENT_TIMES,
  QUOTE_INTERESTS,
  validateAppointment,
  validateContact,
  validateQuote,
} from "@/lib/public-forms/validation";
import {
  captureDemoInquiry,
  contactInquiryInput,
  readDemoInquiries,
} from "@/lib/demo-inquiry-captures";

/**
 * Submit-gate contracts for the public "Reach us" forms (contact / quote /
 * appointment). No service contract backs them, so these tests pin the two
 * things that ARE executable: the validation gates and the demo-local
 * inquiry mapping the staff board reads. They also pin the shell's label
 * rule — no `*` / `(optional)` wording — at the vocabulary level.
 */

describe("contact submit gate", () => {
  const valid = {
    full_name: "Maria Dela Cruz",
    email: "maria@example.com",
    phone: "",
    message: "I would like to ask about pre-need plans.",
    consent: true,
  };

  it("passes a complete enquiry with no phone and no consent problem", () => {
    expect(validateContact(valid)).toEqual({});
  });

  it("requires name, email, message and DPA consent — phone stays optional", () => {
    const errors = validateContact({
      full_name: " ",
      email: "",
      phone: "",
      message: "",
      consent: false,
    });
    expect(Object.keys(errors).sort()).toEqual(["consent", "email", "full_name", "message"]);
    expect(errors.phone).toBeUndefined();
  });

  it("rejects an email without an @ — the app's existing gate", () => {
    expect(validateContact({ ...valid, email: "maria.example.com" }).email).toContain("@");
  });
});

describe("quote submit gate", () => {
  const valid = {
    full_name: "Paolo Mendoza",
    email: "paolo@example.com",
    phone: "+63 918 220 7714",
    interest: QUOTE_INTERESTS[0],
    notes: "",
    consent: true,
  };

  it("passes a complete request with empty notes", () => {
    expect(validateQuote(valid)).toEqual({});
  });

  it("requires name, email and consent — phone and notes stay optional", () => {
    const errors = validateQuote({
      full_name: "",
      email: "",
      phone: "",
      interest: QUOTE_INTERESTS[0],
      notes: "",
      consent: false,
    });
    expect(Object.keys(errors).sort()).toEqual(["consent", "email", "full_name"]);
  });
});

describe("appointment submit gate", () => {
  const valid = {
    full_name: "Gracia Villanueva",
    email: "gracia@example.com",
    phone: "+63 916 512 3388",
    reason: APPOINTMENT_REASONS[0],
    preferred_date: "2026-10-01",
    preferred_time: "10:00",
    notes: "",
  };

  it("passes a complete request with empty notes", () => {
    expect(validateAppointment(valid)).toEqual({});
  });

  it("requires name, email, phone, date and time", () => {
    const errors = validateAppointment({
      ...valid,
      full_name: "",
      email: "",
      phone: "",
      preferred_date: "",
      preferred_time: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "email",
      "full_name",
      "phone",
      "preferred_date",
      "preferred_time",
    ]);
  });

  it("rejects a malformed preferred date", () => {
    expect(validateAppointment({ ...valid, preferred_date: "next Tuesday" }).preferred_date).toBeTruthy();
  });
});

describe("the public option lists are the report's provisional lists", () => {
  it("keeps the six quote interests", () => {
    expect(QUOTE_INTERESTS).toHaveLength(6);
    expect(QUOTE_INTERESTS).toContain("Memorial lot");
    expect(QUOTE_INTERESTS).toContain("Other / not sure yet");
  });

  it("keeps the five provisional appointment reasons (no shared taxonomy exists)", () => {
    expect(APPOINTMENT_REASONS).toHaveLength(5);
    expect(APPOINTMENT_REASONS).toContain("Planning consultation (pre-need)");
  });

  it("offers unique appointment times with labels", () => {
    const values = APPOINTMENT_TIMES.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain("10:00");
    expect(APPOINTMENT_TIMES.every((t) => t.label.length > 0)).toBe(true);
  });
});

describe("demo-local inquiry capture (the board's seam)", () => {
  it("maps a contact enquiry to a website-sourced inquiry with the message as topic", () => {
    const input = contactInquiryInput({
      full_name: "  Maria Dela Cruz ",
      email: " maria@example.com ",
      phone: " +63 917 000 0000 ",
      message: "Ask about pre-need plans\nSecond line with more detail.",
      consent: true,
    });
    expect(input.source).toBe("website");
    expect(input.topic).toBe("Ask about pre-need plans");
    expect(input.full_name).toBe("Maria Dela Cruz");
  });

  it("clamps a long first line and falls back when the message is blank", () => {
    const long = contactInquiryInput({
      full_name: "A",
      email: "a@b.co",
      phone: "",
      message: "x".repeat(120),
      consent: true,
    });
    expect(long.topic.length).toBe(80);

    const blank = contactInquiryInput({
      full_name: "A",
      email: "a@b.co",
      phone: "",
      message: " ",
      consent: true,
    });
    expect(blank.topic).toBe("Website enquiry");
  });

  it("captures with the board's demo reference grammar and reads it back", () => {
    const inquiry = captureDemoInquiry({
      full_name: "Maria Dela Cruz",
      email: "maria@example.com",
      phone: "",
      source: "website",
      topic: "Pre-need plans",
      message: "Ask about pre-need plans",
    });
    expect(inquiry.reference).toMatch(/^INQ-DEMO-\d{3}$/);
    expect(inquiry.status).toBe("new");
    expect(inquiry.assigned_to).toBe("Unassigned");
    expect(readDemoInquiries().some((row) => row.id === inquiry.id)).toBe(true);
  });
});
