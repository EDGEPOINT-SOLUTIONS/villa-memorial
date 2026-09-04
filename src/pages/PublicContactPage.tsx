// Public contact page — reach the Villa Memorial care team. Demo: submission
// is stored in the in-memory inbox and shown in staff Inquiries.

import { useState, type FormEvent } from "react";
import { usePublicForm } from "./publicForm";

export function PublicContactPage() {
  const { sent, send } = usePublicForm("Contact");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    send({ name, contact, subject: "General enquiry", note: phone ? `Phone: ${phone}\n${note}` : note });
  }

  return (
    <div className="text-on-background">
      <section className="py-14 md:py-20 max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-6 text-center">
          Contact Us
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl mx-auto text-center mb-12">
          Our compassionate team is available 24/7. Reach out any way you prefer — we are here to
          guide you with care.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
          {/* Contact cards */}
          <div className="flex flex-col gap-4">
            {[
              { icon: "call", title: "Phone", body: "24/7 assistance\n(062) 000-0000\n0917 000 0000" },
              { icon: "mail", title: "Email", body: "care@villamemorial.ph" },
              { icon: "location_on", title: "Visit", body: "Sanctuario de Mercedes y Gloria\nIsabela City, Basilan" },
              { icon: "schedule", title: "Office hours", body: "Mon – Sun · 8:00am – 6:00pm\n24/7 for immediate assistance" },
            ].map((c) => (
              <div key={c.title} className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant flex gap-4 shadow-[0_8px_30px_rgb(51,51,51,0.04)]">
                <div className="w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" aria-hidden="true">{c.icon}</span>
                </div>
                <div>
                  <h2 className="text-headline-sm font-headline-sm text-on-surface mb-1">{c.title}</h2>
                  <p className="text-body-md font-body-md text-on-surface-variant whitespace-pre-line">{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined" style={{ fontSize: 36 }}>check</span>
                </div>
                <h2 className="text-headline-md font-headline-md text-primary mb-2">Message received</h2>
                <p className="text-body-md font-body-md text-on-surface-variant max-w-md mx-auto">
                  Thank you for reaching out. Our care team will contact you shortly. (Demo: your
                  message now appears in the staff app under Inquiries.)
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-surface-container-lowest rounded-xl p-8 border border-surface-variant shadow-[0_8px_30px_rgb(51,51,51,0.06)] space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="ct-name" className="block text-label-md font-label-md text-on-surface-variant mb-1">Your name</label>
                    <input id="ct-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Dela Cruz"
                      className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
                  </div>
                  <div>
                    <label htmlFor="ct-phone" className="block text-label-md font-label-md text-on-surface-variant mb-1">Phone (optional)</label>
                    <input id="ct-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 917 000 0000"
                      className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
                  </div>
                </div>
                <div>
                  <label htmlFor="ct-email" className="block text-label-md font-label-md text-on-surface-variant mb-1">Email address</label>
                  <input id="ct-email" required type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com"
                    className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
                </div>
                <div>
                  <label htmlFor="ct-note" className="block text-label-md font-label-md text-on-surface-variant mb-1">How can we help?</label>
                  <textarea id="ct-note" rows={5} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Tell us what you need — a plan, a lot, a service, or just guidance."
                    className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
                </div>
                <button type="submit"
                  className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[52px] cursor-pointer">
                  SEND MESSAGE
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
