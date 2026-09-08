// ============================================================================
// ClientPaymentsPage — Client (family) Portal → My Payments.
// Installment schedule + receipts for the Dela Cruz family account.
// ============================================================================

import { useToast } from "../components/toast";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_PAYMENTS, CLIENT_CONTRACT } from "../lib/portalData";

function toNumber(amount: string): number {
  return Number(amount.replace(/[^\d]/g, ""));
}

function formatPeso(n: number): string {
  return "₱" + n.toLocaleString("en-US");
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-surface-container-lowest p-6 shadow-ambient border border-outline-variant/30 ${className}`}>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">{label}</p>
      <p className="mt-2 text-headline-md font-headline-md font-semibold text-primary">{value}</p>
      {sub ? <p className="mt-1 text-sm text-on-surface-variant">{sub}</p> : null}
    </Card>
  );
}

export function ClientPaymentsPage() {
  const { toast } = useToast();

  const upcoming = CLIENT_PAYMENTS.filter((p) => p.status === "Upcoming");
  const next = upcoming[0];
  const paid = toNumber(CLIENT_CONTRACT.paid);
  const total = toNumber(CLIENT_CONTRACT.total);
  const balance = total - paid;

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Page header */}
      <div className="mb-8">
        <p className="text-label-md font-label-md uppercase tracking-widest text-on-surface-variant">Family portal</p>
        <h1 className="mt-1 font-serif text-3xl md:text-4xl font-semibold text-on-background">My Payments</h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Installment schedule and receipts for the Dela Cruz family account.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label="Next payment due"
          value={next ? next.amount : "—"}
          sub={next ? `Due ${next.date}` : "No upcoming payments"}
        />
        <Kpi label="Amount paid to date" value={CLIENT_CONTRACT.paid} sub={`of ${CLIENT_CONTRACT.total} contract value`} />
        <Kpi label="Balance" value={formatPeso(balance)} sub="Remaining after scheduled payments" />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => toast("Payment (demo) — our team will confirm your payment options.", "success")}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-label-md font-label-md text-[#1b1c1c] shadow-ambient transition-colors hover:bg-gold-hover cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            payments
          </span>
          Make a payment
        </button>
        <button
          type="button"
          onClick={() => toast("Receipts will be emailed to family@example.com (demo).")}
          className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-6 py-3 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            download
          </span>
          Download receipts
        </button>
      </div>

      {/* Payments table */}
      <Card className="mt-8 overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <h2 className="font-serif text-xl font-semibold text-on-background">Payment history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-on-surface-variant/70 border-b border-outline-variant/40">
                <th className="px-6 py-3 font-semibold">Ref</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold text-right">Amount</th>
                <th className="px-6 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {CLIENT_PAYMENTS.map((p) => {
                const completed = p.status === "Completed";
                return (
                  <tr key={p.id} className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-low/60">
                    <td className="px-6 py-4 font-medium text-on-surface-variant">{p.id}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{p.date}</td>
                    <td className="px-6 py-4 text-on-background">{p.description}</td>
                    <td className="px-6 py-4 text-right font-semibold text-on-background">{p.amount}</td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          completed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-primary-container/70 text-on-primary-container"
                        }`}
                      >
                        {completed ? (
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            schedule
                          </span>
                        )}
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Note */}
      <Card className="mt-6 bg-surface-container-low/50">
        <p className="flex items-start gap-2 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
            info
          </span>
          Payments are applied to your balance automatically. Contact the billing office for adjustments.
        </p>
      </Card>
    </PortalFrame>
  );
}
