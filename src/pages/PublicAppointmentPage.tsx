// Public appointment booking — schedule a visit, chapel viewing, or planning
// consultation. Demo: submission goes to the in-memory inbox.

import { useState, type FormEvent } from "react";
import { usePublicForm } from "./publicForm";

const REASONS = [
  "Planning consultation (pre-need)",
  "Visit a memorial lot",
  "Chapel / facility viewing",
  "Discuss a service arrangement",
  "Other",
];

export function PublicAppointmentPage() {
  const { sent, send } = usePublicForm("Appointment");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    send({
      name,
      contact,
      subject: `Appointment · ${reason}${date ? ` · ${date}` : ""}${time ? ` ${time}` : ""}`,
      note: phone ? `Phone: ${phone}` : "No phone provided",
    });
  }

  return (
    <div className="text-on-background">
      <section className="py-14 md:py-20 max-w-[760px] mx-auto px-margin-mobile md:px-margin-desktop">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-4 text-center">
          Book an Appointment
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant text-center mb-12">
          Visit us at Sanctuario de Mercedes y Gloria, or meet with our care team. Choose a time
          and we'll confirm by phone or email.
        </p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined" style={{ fontSize: 36 }}>event_available</span>
            </div>
            <h2 className="text-headline-md font-headline-md text-primary mb-2">Appointment requested</h2>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-md mx-auto">
              Thank you! We'll confirm your visit shortly. Need something sooner? Call our 24/7
              line for immediate assistance.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-surface-container-lowest rounded-xl p-8 border border-surface-variant shadow-[0_8px_30px_rgb(51,51,51,0.06)] space-y-5">
            <div>
              <label htmlFor="ap-name" className="block text-label-md font-label-md text-on-surface-variant mb-1">Your name</label>
              <input id="ap-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Dela Cruz"
                className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="ap-email" className="block text-label-md font-label-md text-on-surface-variant mb-1">Email address</label>
                <input id="ap-email" required type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
              </div>
              <div>
                <label htmlFor="ap-phone" className="block text-label-md font-label-md text-on-surface-variant mb-1">Phone</label>
                <input id="ap-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 917 000 0000"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
              </div>
            </div>
            <div>
              <label htmlFor="ap-reason" className="block text-label-md font-label-md text-on-surface-variant mb-1">Reason for visit</label>
              <select id="ap-reason" value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface">
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="ap-date" className="block text-label-md font-label-md text-on-surface-variant mb-1">Preferred date</label>
                <input id="ap-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
              </div>
              <div>
                <label htmlFor="ap-time" className="block text-label-md font-label-md text-on-surface-variant mb-1">Preferred time</label>
                <select id="ap-time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface">
                  <option value="">Anytime</option>
                  <option value="09:00">9:00 am</option>
                  <option value="11:00">11:00 am</option>
                  <option value="14:00">2:00 pm</option>
                  <option value="16:00">4:00 pm</option>
                </select>
              </div>
            </div>
            <button type="submit"
              className="bg-[#D4AF37] hover:bg-[#c29f32] text-white px-8 py-4 rounded-lg text-label-md font-label-md transition-colors min-h-[52px] cursor-pointer">
              REQUEST APPOINTMENT
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
