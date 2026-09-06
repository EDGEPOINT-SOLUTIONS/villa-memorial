// New inquiry — Module A lead capture. Mirrors the CaseNewPage demo pattern.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { INQUIRIES } from "../lib/data";

export function InquiryNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("Walk-in");
  const [subject, setSubject] = useState("");
  const [contact, setContact] = useState("");

  const ref = `INQ-${300 + INQUIRIES.length + 1}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) {
      toast("Please add a name and a subject.", "danger");
      return;
    }
    setDone(true);
    toast(`Inquiry captured · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/inquiries">Inquiries</Link>} title={done ? "Inquiry captured" : "New inquiry"} />

      {done ? (
        <Card title="Inquiry captured">
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{subject}</strong> from {name} is logged as a new lead. Move it along the
              funnel: Inquiry → Consultation → Arrangement → Customer.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/inquiries")}>Back to inquiries</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Log an inquiry">
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Lead name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marites Aquino" />
              </Field>
              <Field label="Channel">
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option>Walk-in</option>
                  <option>Phone</option>
                  <option>Facebook</option>
                  <option>Referral</option>
                  <option>Website</option>
                </Select>
              </Field>
              <Field label="Subject">
                <Input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Pre-need plan for couple" />
              </Field>
              <Field label="Contact / notes">
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone, email, or notes" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/inquiries")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Capture inquiry
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
