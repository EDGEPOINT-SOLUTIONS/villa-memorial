// Wizard stepper: shows all steps with done / current / todo states.

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper" aria-label="Progress">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <div key={step} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 ? <div className="step__sep" aria-hidden /> : null}
            <div className={`step step--${state}`}>
              <span className="step__dot" aria-hidden>
                {state === "done" ? "✓" : i + 1}
              </span>
              <span>{step}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
