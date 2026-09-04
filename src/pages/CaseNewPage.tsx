import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { Stepper } from "../components/Stepper";
import { useToast } from "../components/toast";

const STEPS = ["Deceased", "Family", "Services", "Schedule", "Documents", "Bill"];

export function CaseNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  function saveDraft() {
    toast("Draft saved", "success");
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function confirm() {
    setDone(true);
    toast("Case created · CS-1043", "success");
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/cases">Cases</Link>}
        title="New arrangement"
        actions={<Button variant="secondary" size="sm" onClick={saveDraft}>Save draft</Button>}
      />

      <Stepper steps={STEPS} current={step} />

      {done ? (
        <Card title="Arrangement created">
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              Case <strong>CS-1043</strong> was created for the deceased. The service order and
              billing draft were generated and are ready for review.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/cases")}>Go to cases</Button>
              <Button variant="secondary" onClick={() => navigate("/billing")}>
                View billing
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          title={STEPS[step]}
          actions={<Badge tone="neutral">Step {step + 1} of {STEPS.length}</Badge>}
        >
          {step === 0 && (
            <div className="form-grid">
              <Field label="Full name of the deceased">
                <Input placeholder="e.g. Ernesto Dela Cruz" />
              </Field>
              <Field label="Relationship to the deceased">
                <Select defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option>Spouse</option>
                  <option>Child</option>
                  <option>Parent</option>
                  <option>Sibling</option>
                </Select>
              </Field>
              <Field label="Date of birth">
                <Input type="date" />
              </Field>
              <Field label="Date of passing">
                <Input type="date" />
              </Field>
              <Field label="Location" hint="Facility where the service will be held">
                <Select defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option>Main Chapel</option>
                  <option>Chapel B</option>
                  <option>Crematorium</option>
                </Select>
              </Field>
              <Field label="Service type">
                <Select defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option>Burial</option>
                  <option>Cremation</option>
                  <option>Transfer</option>
                </Select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <Field label="Next of kin">
                <Input placeholder="Full name" />
              </Field>
              <Field label="Relationship">
                <Select defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option>Spouse</option>
                  <option>Child</option>
                  <option>Sibling</option>
                </Select>
              </Field>
              <Field label="Contact number">
                <Input placeholder="09xx xxx xxxx" />
              </Field>
              <Field label="Authorized representative">
                <Input placeholder="Name (if different)" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <p className="small muted">Select services and merchandise for this arrangement.</p>
              {["Traditional embalming", "Chapel viewing (3 days)", "Interment service", "Flower arrangement"].map((s) => (
                <label key={s} className="checkbox">
                  <input type="checkbox" /> {s}
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <Field label="Chapel">
                <Select defaultValue=""><option value="" disabled>Select…</option><option>Main Chapel</option><option>Chapel B</option></Select>
              </Field>
              <Field label="Viewing date">
                <Input type="date" />
              </Field>
              <Field label="Vehicle">
                <Select defaultValue=""><option value="" disabled>Select…</option><option>Van 1</option><option>Van 2</option></Select>
              </Field>
              <Field label="Embalming slot">
                <Input type="datetime-local" />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="stack">
              <p className="small muted">Documents required for this stage (workflow-defined).</p>
              {[
                { name: "Death certificate", status: "Attached" },
                { name: "Authorization", status: "Missing" },
              ].map((d) => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{d.name}</span>
                  <Badge tone={d.status === "Attached" ? "success" : "danger"}>{d.status}</Badge>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="stack">
              <p className="small muted">Review before creating the case. Nothing is charged yet.</p>
              <div className="kv">
                <div className="kv__k">Deceased</div><div className="kv__v">Ernesto Dela Cruz</div>
                <div className="kv__k">Service type</div><div className="kv__v">Burial</div>
                <div className="kv__k">Estimated total</div><div className="kv__v">₱ 42,000</div>
                <div className="kv__k">Billing</div><div className="kv__v">Deposit + 2 installments</div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-5)" }}>
            <Button variant="secondary" onClick={back} disabled={step === 0}>
              ← Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Continue →</Button>
            ) : (
              <Button variant="accent" onClick={confirm}>Review & confirm</Button>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
