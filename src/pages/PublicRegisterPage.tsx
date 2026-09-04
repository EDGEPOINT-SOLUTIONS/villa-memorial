// Public register — visitor registers interest in pre-need planning and
// receives demo family-portal access. Demo: entry goes to the in-memory inbox
// (shows in staff Inquiries) and the visitor is pointed at the family portal.

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { usePublicForm } from "./publicForm";

export function PublicRegisterPage() {
  const { sent, send } = usePublicForm("Registration");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [preferPlan, setPreferPlan] = useState(true);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    send({
      name,
      contact,
      subject: preferPlan ? "Interested in pre-need planning" : "Interested in a memorial lot",
      note: phone ? `Phone: ${phone}\nWishes a follow-up call.` : "Wishes a follow-up email.",
    });
  }

  return (
    <div className="text-on-background">
      <section className="py-14 md:py-20 max-w-[760px] mx-auto px-margin-mobile md:px-margin-desktop">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-4 text-center">
          Register with Villa Memorial
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant text-center mb-12">
          Start your planning journey. Register your details and our care team will help you set up
          a family account for managing plans, lots, and payments.
        </p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined" style={{ fontSize: 36 }}>person_add</span>
            </div>
            <h2 className="text-headline-md font-headline-md text-primary mb-2">Registration received</h2>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-md mx-auto mb-6">
              Welcome! Our care team will contact you to set up your family account. Meanwhile,
              explore the family portal with our demo account.
            </p>
            <Link
              to="/client/login"
              className="inline-flex items-center gap-2 bg-secondary text-on-secondary hover:bg-secondary-fixed-dim hover:text-on-secondary-fixed px-6 py-3 rounded-lg text-label-md font-label-md transition-colors hover:no-underline!"
            >
              Open the family portal
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-surface-container-lowest rounded-xl p-8 border border-surface-variant shadow-[0_8px_30px_rgb(51,51,51,0.06)] space-y-5">
            <div>
              <label htmlFor="rg-name" className="block text-label-md font-label-md text-on-surface-variant mb-1">Full name</label>
              <input id="rg-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Dela Cruz"
                className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="rg-email" className="block text-label-md font-label-md text-on-surface-variant mb-1">Email address</label>
                <input id="rg-email" required type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
              </div>
              <div>
                <label htmlFor="rg-phone" className="block text-label-md font-label-md text-on-surface-variant mb-1">Phone</label>
                <input id="rg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 917 000 0000"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
              </div>
            </div>
            <div>
              <span className="block text-label-md font-label-md text-on-surface-variant mb-2">What interests you most?</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`border rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-3 ${preferPlan ? "border-secondary bg-secondary-fixed/30" : "border-outline-variant hover:border-primary-container"}`}>
                  <input type="radio" name="interest" className="sr-only" checked={preferPlan} onChange={() => setPreferPlan(true)} />
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">description</span>
                  <span className="text-body-md font-body-md text-on-surface">Pre-need memorial plans</span>
                </label>
                <label className={`border rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-3 ${!preferPlan ? "border-secondary bg-secondary-fixed/30" : "border-outline-variant hover:border-primary-container"}`}>
                  <input type="radio" name="interest" className="sr-only" checked={!preferPlan} onChange={() => setPreferPlan(false)} />
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">park</span>
                  <span className="text-body-md font-body-md text-on-surface">Memorial lots</span>
                </label>
              </div>
            </div>
            <button type="submit"
              className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[52px] cursor-pointer">
              REGISTER
            </button>
            <p className="text-xs text-on-surface-variant">
              Already a family member? <Link to="/client/login" className="text-primary hover:underline">Sign in to the family portal</Link>.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
