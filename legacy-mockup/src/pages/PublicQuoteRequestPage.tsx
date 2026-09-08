// Public quote request — visitor asks for a personalised quote on plans, lots,
// packages, products, or services. Demo: submission goes to the in-memory inbox
// (visible in staff Inquiries) and a success panel replaces the form.

import { useState, type FormEvent } from "react";
import { usePublicForm } from "./publicForm";

const INTERESTS = [
  "Pre-need memorial plan",
  "Memorial lot",
  "Wake / funeral package",
  "Product (casket, urn, flowers…)",
  "Transportation",
  "Other / not sure yet",
];

export function PublicQuoteRequestPage() {
  const { sent, send } = usePublicForm("Quote request");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState(INTERESTS[0]);
  const [note, setNote] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    send({
      name,
      contact,
      subject: `Quote request · ${interest}`,
      note: phone ? `Phone: ${phone}\n${note}` : note,
    });
  }

  return (
    <div className="text-on-background">
      <section className="py-14 md:py-20 max-w-[760px] mx-auto px-margin-mobile md:px-margin-desktop">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-4 text-center">
          Request a Quote
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant text-center mb-12">
          Tell us what you're planning and we'll prepare a clear, personal quote — no pressure,
          no obligation.
        </p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined" style={{ fontSize: 36 }}>check</span>
            </div>
            <h2 className="text-headline-md font-headline-md text-primary mb-2">Quote requested</h2>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-md mx-auto">
              Thank you! A member of our care team will prepare your quote and reach out shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-surface-container-lowest rounded-xl p-8 border border-surface-variant shadow-[0_8px_30px_rgb(51,51,51,0.06)] space-y-5">
            <div>
              <label htmlFor="qr-name" className="block text-label-md font-label-md text-on-surface-variant mb-1">Your name</label>
              <input id="qr-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Dela Cruz"
                className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="qr-email" className="block text-label-md font-label-md text-on-surface-variant mb-1">Email address</label>
                <input id="qr-email" required type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
              </div>
              <div>
                <label htmlFor="qr-phone" className="block text-label-md font-label-md text-on-surface-variant mb-1">Phone (optional)</label>
                <input id="qr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 917 000 0000"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
              </div>
            </div>
            <div>
              <label htmlFor="qr-interest" className="block text-label-md font-label-md text-on-surface-variant mb-1">I'm interested in</label>
              <select id="qr-interest" value={interest} onChange={(e) => setInterest(e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface">
                {INTERESTS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qr-note" className="block text-label-md font-label-md text-on-surface-variant mb-1">Anything we should know?</label>
              <textarea id="qr-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Preferred area, budget, timing…"
                className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
            </div>
            <button type="submit"
              className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[52px] cursor-pointer">
              REQUEST QUOTE
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
