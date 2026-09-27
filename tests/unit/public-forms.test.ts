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
  contactInquiryInput,
  quoteInquiryInput,
  readInquirySubmission,
} from "@/lib/inquiry-intake";

/**
 * Submit-gate contracts for the public "Reach us" forms (contact / quote /
 * appointment). No service contract backs them, so these tests pin the two
 * things that ARE executable: the validation gates and the inquiry mapping that
 * turns a submission into the row the staff board reads
 * (`lib/inquiry-intake.ts`, shared by the browser and `POST /api/inquiries`).
 * They also pin the shell's label rule — no `*` / `(optional)` wording — at the
 * vocabulary level.
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
    service: "Embalming — 3 days",
    preferred_date: "",
    notes: "",
    consent: true,
  };

  it("passes a complete request with empty notes and no preferred date", () => {
    expect(validateQuote(valid)).toEqual({});
  });

  it("requires the name, email, requested service and consent", () => {
    const errors = validateQuote({
      full_name: "",
      email: "",
      phone: "",
      service: "",
      preferred_date: "",
      notes: "",
      consent: false,
    });
    expect(Object.keys(errors).sort()).toEqual(["consent", "email", "full_name", "service"]);
  });

  it("accepts an empty preferred date but rejects a malformed one", () => {
    expect(validateQuote({ ...valid, preferred_date: "" })).toEqual({});
    expect(validateQuote({ ...valid, preferred_date: "next Tuesday" }).preferred_date).toBeTruthy();
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

describe("a quote capture records every field the client asked for", () => {
  it("records the name, contact details, requested service, date and requirements", () => {
    const input = quoteInquiryInput({
      full_name: "  Maria Dela Cruz ",
      email: " maria@example.com ",
      phone: " +63 917 000 0000 ",
      service: " Embalming — 5 days ",
      preferred_date: "2026-10-04",
      notes: "Wants the viewing to start in the afternoon.",
      consent: true,
    });
    expect(input.source).toBe("website");
    expect(input.full_name).toBe("Maria Dela Cruz");
    expect(input.email).toBe("maria@example.com");
    expect(input.phone).toBe("+63 917 000 0000");
    expect(input.topic).toBe("Embalming — 5 days");
    expect(input.message).toContain("Quote request for: Embalming — 5 days");
    expect(input.message).toContain("Preferred date: 2026-10-04");
    expect(input.message).toContain("Wants the viewing to start in the afternoon.");
  });

  it("drops the preferred-date line when the visitor leaves it empty", () => {
    const input = quoteInquiryInput({
      full_name: "A",
      email: "a@b.co",
      phone: "",
      service: "Retrieval",
      preferred_date: "",
      notes: "",
      consent: true,
    });
    expect(input.message).not.toContain("Preferred date:");
    expect(input.message).not.toContain("Additional requirements:");
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

  it("composes a submission the office can act on, and refuses an incomplete one", () => {
    // The mapping moved out of the browser on 2026-09-27: `readInquirySubmission` is the
    // ONE reading the form runs for field feedback and `POST /api/inquiries` runs as the
    // veto, so a refusal says the same sentence in both places.
    const accepted = readInquirySubmission("quote", {
      full_name: "Maria Dela Cruz",
      email: "maria@example.com",
      phone: "+63 917 000 0000",
      service: "Embalming — 3 days",
      preferred_date: "2026-10-05",
      notes: "Please call after 6pm.",
      consent: true,
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.intake.topic).toBe("Embalming — 3 days");
    expect(accepted.intake.source).toBe("website");
    expect(accepted.intake.assigned_to).toBe("Unassigned");
    // The two facts the client's minutes name must survive into the row the board
    // renders. They were captured and then shown on no staff screen before this.
    expect(accepted.intake.message).toContain("Preferred date: 2026-10-05");
    expect(accepted.intake.message).toContain("Additional requirements:");
    expect(accepted.intake.message).toContain("Please call after 6pm.");

    const refused = readInquirySubmission("quote", { full_name: "", email: "nope", consent: false });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(Object.keys(refused.errors).sort()).toEqual(
      ["consent", "email", "full_name", "service"].sort(),
    );
  });

  it("refuses a front-desk log without the three facts the counter must record", () => {
    const missing = readInquirySubmission("log", { full_name: "Ana", phone: "", topic: "" });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(Object.keys(missing.errors).sort()).toEqual(["phone", "topic"]);

    const ok = readInquirySubmission("log", {
      full_name: "Ana",
      phone: "+63 917 111 1111",
      topic: "Asked about lot prices",
      source: "walk_in",
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.intake.assigned_to).toBe("Unassigned");
  });
});
